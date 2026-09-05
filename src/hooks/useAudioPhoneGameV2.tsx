import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { reverseAudioBufferWithInfo } from '@/lib/audioReverser';
import {
  assertVoiceUploadAllowed,
  noteOrphanedVoiceUpload,
  voiceContentType,
} from '@/lib/voiceUpload';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import { emitXpGain } from '@/components/XpGainPopup';
import { emitLevelUpNotification } from '@/components/RewardNotification';
import { usePlayerLevel, XP_REWARDS } from '@/hooks/usePlayerLevel';
import {
  canSubmitOriginalPhrase,
  canSubmitImitation,
  computePlayerOrderIndex,
  allOriginalPhrasesSubmitted as allOriginalPhrasesSubmittedFn,
  getPendingOriginalPlayers as getPendingOriginalPlayersFn,
  getPlayersToImitate,
  shouldImitate,
  allImitationsForPhraseDone,
  computePhraseProgress,
  computeNextPhraseIndex,
  sortRecordingsByOrder,
  rosterForRound,
  canParticipateInRound,
  canStartImitationPhase,
  isValidPhaseTransition,
  type AudioPhonePhase,
} from '@/lib/audioPhoneLogic';

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

// New phase types for the v2 game flow
type GamePhase = 
  | 'instructions'      // Explaining the game
  | 'recording_all'     // All players recording their phrases
  | 'reversing'         // System reversing all phrases (automatic)
  | 'imitation'         // Players imitating other players' reversed phrases
  | 'waiting_reveal'    // Waiting for host to start reveal
  | 'reveal'            // Synchronized playback
  | 'scores'            // Voting/scores
  | 'finished';

type AudioPhoneRoundRow = Database['public']['Tables']['audio_phone_rounds']['Row'];
type AudioPhoneRecordingRow = Database['public']['Tables']['audio_phone_recordings']['Row'];
type AudioPhoneImitationRow = Database['public']['Tables']['audio_phone_imitations']['Row'];

type AudioPhoneRoundV2 = Omit<
  AudioPhoneRoundRow,
  'phase' | 'current_phrase_index' | 'reveal_is_playing' | 'reveal_phrase_index' | 'reveal_step'
> & {
  phase: GamePhase;
  current_phrase_index: number;
  reveal_is_playing: boolean;
  reveal_phrase_index: number;
  reveal_step: string;
};

type OriginalRecording = AudioPhoneRecordingRow;
type Imitation = AudioPhoneImitationRow;

interface UseAudioPhoneGameV2Props {
  lobbyId: string;
  currentPlayer: Player;
  players: Player[];
}

interface UploadError {
  timestamp: Date;
  message: string;
  details?: string;
}

const normalizeRound = (round: AudioPhoneRoundRow): AudioPhoneRoundV2 => ({
  ...round,
  phase: round.phase as GamePhase,
  current_phrase_index: round.current_phrase_index ?? 0,
  reveal_is_playing: round.reveal_is_playing ?? false,
  reveal_phrase_index: round.reveal_phrase_index ?? 0,
  reveal_step: round.reveal_step ?? 'idle',
});

/** Strict total order used as a client-side high-water mark for round adoption. */
const compareRoundIdentity = (left: AudioPhoneRoundV2, right: AudioPhoneRoundV2) => {
  if (left.round_number !== right.round_number) {
    return left.round_number - right.round_number;
  }
  const createdAtOrder = left.created_at.localeCompare(right.created_at);
  if (createdAtOrder !== 0) return createdAtOrder;
  return left.id.localeCompare(right.id);
};

const mergeRowsById = <Row extends { id: string }>(snapshot: Row[], streamed: Row[]) => {
  const rows = new Map<string, Row>();
  for (const row of snapshot) rows.set(row.id, row);
  // Realtime rows may have arrived after the SQL snapshot was taken.
  for (const row of streamed) rows.set(row.id, row);
  return [...rows.values()];
};

const sortImitations = (rows: Imitation[]) => [...rows].sort((left, right) => {
  const createdAtOrder = left.created_at.localeCompare(right.created_at);
  return createdAtOrder || left.id.localeCompare(right.id);
});

export const useAudioPhoneGameV2 = ({ lobbyId, currentPlayer, players }: UseAudioPhoneGameV2Props) => {
  const [currentRound, setCurrentRound] = useState<AudioPhoneRoundV2 | null>(null);
  const [originalRecordings, setOriginalRecordings] = useState<OriginalRecording[]>([]);
  const [imitations, setImitations] = useState<Imitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<UploadError[]>([]);
  const { toast } = useToast();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const mountedRef = useRef(false);
  const currentRoundRef = useRef<AudioPhoneRoundV2 | null>(null);
  const currentRoundIdRef = useRef<string | null>(null);
  const roundHighWaterRef = useRef<AudioPhoneRoundV2 | null>(null);
  const hydrationGenerationRef = useRef(0);
  const fetchSequenceRef = useRef(0);
  
  // XP system
  const { addXp } = usePlayerLevel();

  useEffect(() => {
    mountedRef.current = true;
    currentRoundRef.current = null;
    currentRoundIdRef.current = null;
    roundHighWaterRef.current = null;
    hydrationGenerationRef.current += 1;
    setCurrentRound(null);
    setOriginalRecordings([]);
    setImitations([]);
    setIsLoading(true);

    return () => {
      mountedRef.current = false;
      fetchSequenceRef.current += 1;
      hydrationGenerationRef.current += 1;
      currentRoundRef.current = null;
      currentRoundIdRef.current = null;
    };
  }, [lobbyId]);

  /**
   * Recharge les enfants d'une manche sans écraser les INSERT realtime reçus
   * pendant le snapshot. La génération rend tout résultat d'une ancienne
   * manche inerte.
   */
  const hydrateRound = useCallback(async (roundId: string, generation: number) => {
    const [recordingsResult, imitationsResult] = await Promise.all([
      supabase
        .from('audio_phone_recordings')
        .select('*')
        .eq('round_id', roundId)
        .order('player_order_index', { ascending: true }),
      supabase
        .from('audio_phone_imitations')
        .select('*')
        .eq('round_id', roundId)
        .order('created_at', { ascending: true }),
    ]);

    if (recordingsResult.error) throw recordingsResult.error;
    if (imitationsResult.error) throw imitationsResult.error;
    if (
      !mountedRef.current
      || currentRoundIdRef.current !== roundId
      || hydrationGenerationRef.current !== generation
    ) {
      return;
    }

    const snapshotRecordings = recordingsResult.data ?? [];
    const snapshotImitations = imitationsResult.data ?? [];
    setOriginalRecordings((streamed) => sortRecordingsByOrder(
      mergeRowsById(snapshotRecordings, streamed.filter((row) => row.round_id === roundId)),
    ));
    setImitations((streamed) => sortImitations(
      mergeRowsById(snapshotImitations, streamed.filter((row) => row.round_id === roundId)),
    ));
  }, []);

  /**
   * Adopte immédiatement une manche plus récente, avant tout rendu/effect.
   * Les UPDATE d'une ancienne id sont rejetés par le high-water mark et ne
   * peuvent donc jamais ressusciter un replay terminé.
   */
  const adoptRound = useCallback((row: AudioPhoneRoundRow) => {
    if (!mountedRef.current) return null;
    const nextRound = normalizeRound(row);
    const current = currentRoundRef.current;

    if (current?.id === nextRound.id) {
      currentRoundRef.current = nextRound;
      currentRoundIdRef.current = nextRound.id;
      roundHighWaterRef.current = nextRound;
      setCurrentRound(nextRound);
      return { round: nextRound, generation: hydrationGenerationRef.current, changed: false };
    }

    const highWater = roundHighWaterRef.current;
    if (highWater && compareRoundIdentity(nextRound, highWater) <= 0) return null;

    roundHighWaterRef.current = nextRound;
    currentRoundRef.current = nextRound;
    currentRoundIdRef.current = nextRound.id;
    const generation = hydrationGenerationRef.current + 1;
    hydrationGenerationRef.current = generation;

    // Never expose children from the previous round under the new round id.
    setOriginalRecordings([]);
    setImitations([]);
    setCurrentRound(nextRound);
    return { round: nextRound, generation, changed: true };
  }, []);

  const clearCurrentRound = useCallback((expectedRoundId?: string) => {
    if (expectedRoundId && currentRoundIdRef.current !== expectedRoundId) return;
    hydrationGenerationRef.current += 1;
    currentRoundRef.current = null;
    currentRoundIdRef.current = null;
    if (!mountedRef.current) return;
    setOriginalRecordings([]);
    setImitations([]);
    setCurrentRound(null);
  }, []);

  // Fetch the newest known round. A concurrent, newer realtime adoption wins.
  const fetchGameState = useCallback(async () => {
    const requestSequence = fetchSequenceRef.current + 1;
    fetchSequenceRef.current = requestSequence;
    try {
      const { data: round, error: roundError } = await supabase
        .from('audio_phone_rounds')
        .select('*')
        .eq('lobby_id', lobbyId)
        .order('round_number', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (roundError) throw roundError;
      if (!mountedRef.current || fetchSequenceRef.current !== requestSequence) return;

      if (round) {
        const adoption = adoptRound(round);
        if (adoption?.changed) {
          await hydrateRound(adoption.round.id, adoption.generation);
        }
      } else if (!currentRoundRef.current) {
        clearCurrentRound();
      }
    } catch (error) {
      console.error('Error fetching game state:', error);
    } finally {
      if (mountedRef.current && fetchSequenceRef.current === requestSequence) {
        setIsLoading(false);
      }
    }
  }, [adoptRound, clearCurrentRound, hydrateRound, lobbyId]);

  // Initial fetch only — realtime subscriptions below keep state in sync.
  useEffect(() => {
    void fetchGameState();
  }, [fetchGameState]);

  /*
   * L'effectif de la manche, et non celui du salon.
   *
   * `player_order` est figé au tirage : un joueur parti y reste, un joueur
   * arrivé après n'y est pas. Compter les envois sur `players` gelait la manche
   * dans les deux cas — on attendait indéfiniment quelqu'un qui ne pouvait plus
   * répondre. Tout ce qui suit raisonne donc sur l'intersection.
   */
  const roster = useMemo(
    () => rosterForRound(players, currentRound?.player_order ?? []),
    [players, currentRound?.player_order],
  );

  /* Un joueur hors de l'ordre regarde la manche : son envoi serait refusé. */
  const isSpectator = !canParticipateInRound(
    currentRound?.player_order ?? [],
    currentPlayer.id,
  );

  /**
   * Écrit une phase, mais seulement si la transition est légale et si personne
   * ne l'a déjà écrite.
   *
   * Deux gardes, pour deux problèmes distincts :
   *
   * - `isValidPhaseTransition` existait dans la logique pure, était testé, et
   *   n'était appelé par personne : la machine à états n'était pas appliquée à
   *   l'exécution. Un ordre qui arrive en retard pouvait ramener la manche en
   *   arrière.
   * - `.eq('phase', from)` rend l'écriture conditionnelle côté serveur. Deux
   *   clients qui avancent en même temps — l'hôte et son avance automatique, par
   *   exemple — n'appliquent plus la transition deux fois.
   */
  const writePhase = useCallback(
    async (
      from: GamePhase,
      to: GamePhase,
      extra: Record<string, unknown> = {},
    ): Promise<boolean> => {
      if (!currentRound) return false;
      if (from === to) return false;

      if (!isValidPhaseTransition(from as AudioPhonePhase, to as AudioPhonePhase)) {
        console.warn(`[AudioPhoneV2] Transition refusée : ${from} → ${to}`);
        return false;
      }

      const { error } = await supabase
        .from('audio_phone_rounds')
        .update({ phase: to, ...extra })
        .eq('id', currentRound.id)
        .eq('phase', from);

      if (error) {
        console.error(`[AudioPhoneV2] Écriture de phase ${from} → ${to} échouée :`, error);
        return false;
      }
      return true;
    },
    [currentRound],
  );

  // Realtime subscriptions — Bug fix #7 + #8: filter by lobby's current round
  // (cannot filter by round_id directly because it changes; we filter client-side)
  // Bug fix: stable session ID to disambiguate channels on remount
  const sessionIdRef = useRef<string>(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`
  );

  useEffect(() => {
    if (!lobbyId) return;

    const channelName = `audio-phone-v2:${lobbyId}:${sessionIdRef.current}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'audio_phone_rounds', filter: `lobby_id=eq.${lobbyId}` },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const adoption = adoptRound(payload.new as unknown as AudioPhoneRoundRow);
            if (adoption?.changed) {
              void hydrateRound(adoption.round.id, adoption.generation).catch((error) => {
                console.error('[AudioPhoneV2] Round hydration failed:', error);
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audio_phone_recordings' },
        (payload) => {
          const newRec = payload.new as unknown as OriginalRecording;
          if (currentRoundIdRef.current && newRec.round_id === currentRoundIdRef.current) {
            setOriginalRecordings((previous) => {
              if (previous.some((recording) => recording.id === newRec.id)) return previous;
              return sortRecordingsByOrder([...previous, newRec]);
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audio_phone_imitations' },
        (payload) => {
          const newImitation = payload.new as unknown as Imitation;
          if (
            currentRoundIdRef.current
            && newImitation.round_id === currentRoundIdRef.current
          ) {
            setImitations((previous) => {
              if (previous.some((imitation) => imitation.id === newImitation.id)) return previous;
              return sortImitations([...previous, newImitation]);
            });
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current === channel) channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [adoptRound, hydrateRound, lobbyId]);

  // Lock to prevent double startGame calls
  const startGameLockRef = useRef(false);
  const moveToNextPhraseLockRef = useRef(false);

  /** Creates and immediately adopts a newer round. */
  const createRound = useCallback(async (
    skipInstructions = true,
    previousRoundNumber?: number,
  ): Promise<boolean> => {
    if (startGameLockRef.current) return false;
    startGameLockRef.current = true;

    try {
      if (mountedRef.current) setIsLoading(true);

      const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
      const playerOrder = shuffledPlayers.map((player) => player.id);
      const initialPhase: GamePhase = skipInstructions ? 'recording_all' : 'instructions';
      const knownRoundNumber = previousRoundNumber
        ?? currentRoundRef.current?.round_number
        ?? roundHighWaterRef.current?.round_number
        ?? 0;

      const { data, error } = await supabase
        .from('audio_phone_rounds')
        .insert({
          lobby_id: lobbyId,
          round_number: knownRoundNumber + 1,
          phase: initialPhase,
          current_player_index: 0,
          player_order: playerOrder,
        })
        .select()
        .single();

      if (error) throw error;
      const adoption = adoptRound(data);
      if (adoption?.changed) {
        // A fresh round is empty, but this snapshot also covers a concurrent
        // server-side insertion and keeps every client on the same data path.
        await hydrateRound(adoption.round.id, adoption.generation);
      }

      playSoundEffect('start', 0.5);
      toast({
        title: 'Nouvelle partie !',
        description: 'Audio Phone V2 commence !',
      });
      return true;
    } catch (error) {
      console.error('Error starting game:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de démarrer',
        variant: 'destructive',
      });
      return false;
    } finally {
      if (mountedRef.current) setIsLoading(false);
      // Release lock after a delay so duplicate clicks within 2s don't fire twice.
      setTimeout(() => { startGameLockRef.current = false; }, 2000);
    }
  }, [adoptRound, hydrateRound, lobbyId, players, toast]);

  // Start a new game. The V2 launch skips the duplicate instructions phase.
  const startGame = useCallback(
    async (skipInstructions = true) => createRound(skipInstructions),
    [createRound],
  );

  // Start recording phase (all players record)
  const startRecordingPhase = useCallback(async () => {
    if (!currentRound) return;
    await writePhase(currentRound.phase, 'recording_all');
  }, [currentRound, writePhase]);

  /*
   * L'XP ne fait plus attendre le joueur.
   *
   * Elle était accordée avant le `return`, donc le voile d'envoi restait à
   * l'écran pendant un aller-retour de plus, sans aucun effet sur la manche. Elle
   * part maintenant en arrière-plan ; un échec se journalise sans rien bloquer.
   */
  const awardRecordingXp = useCallback(() => {
    void (async () => {
      try {
        const result = await addXp('recordingMade');
        emitXpGain(XP_REWARDS.recordingMade, 'recordingMade');
        if (result?.leveledUp) emitLevelUpNotification(result.newLevel);
      } catch (error) {
        console.warn('[AudioPhoneV2] XP non accordée :', error);
      }
    })();
  }, [addXp]);

  // Submit original phrase recording — Bug fix #1, #2, #6
  const submitOriginalPhrase = useCallback(async (
    audioBlob: Blob,
    /** Permet à l'appelant d'afficher l'étape en cours pendant l'attente. */
    onStage?: (label: string) => void,
  ): Promise<boolean> => {
    if (!currentRound) return false;

    // Bug fix #1 + #2: validate phase + no duplicate submission
    if (!canSubmitOriginalPhrase({
      phase: currentRound.phase,
      playerId: currentPlayer.id,
      recordings: originalRecordings,
    })) {
      console.warn('[AudioPhoneV2] Original phrase submission blocked');
      return false;
    }

    try {
      setIsSubmitting(true);
      onStage?.('Inversion de ta phrase…');

      // Reverse the audio
      const { reversedBlob, durationSeconds } = await reverseAudioBufferWithInfo(audioBlob);

      const timestamp = Date.now();
      const originalPath = `${lobbyId}/${currentRound.id}/${currentPlayer.id}_${timestamp}_original.webm`;
      const reversedPath = `${lobbyId}/${currentRound.id}/${currentPlayer.id}_${timestamp}_reversed.wav`;

      onStage?.('Envoi de ta phrase…');

      /*
       * Les deux fichiers partent ensemble. En série, on payait deux allers-retours
       * complets alors qu'ils ne dépendent pas l'un de l'autre — et c'est l'attente
       * dont se plaignaient les joueurs. Le nettoyage retire ce qui a été déposé
       * quand l'un des deux échoue.
       */
      assertVoiceUploadAllowed(audioBlob, 'Ta phrase');
      assertVoiceUploadAllowed(reversedBlob, 'La version inversée de ta phrase');

      const [originalUpload, reversedUpload] = await Promise.all([
        supabase.storage
          .from('audio-phone')
          .upload(originalPath, audioBlob, { contentType: voiceContentType(audioBlob) }),
        supabase.storage
          .from('audio-phone')
          .upload(reversedPath, reversedBlob, { contentType: 'audio/wav' }),
      ]);

      if (originalUpload.error || reversedUpload.error) {
        const landed = [
          originalUpload.error ? null : originalPath,
          reversedUpload.error ? null : reversedPath,
        ].filter((path): path is string => path !== null);
        noteOrphanedVoiceUpload(landed, 'envoi partiel');
        throw originalUpload.error ?? reversedUpload.error;
      }

      // Bug fix #6: handle missing player gracefully (don't silently fall to 0)
      const playerIndex = computePlayerOrderIndex(currentRound.player_order, currentPlayer.id);
      if (playerIndex < 0) {
        console.error('[AudioPhoneV2] Player not in round order — aborting submission');
        noteOrphanedVoiceUpload([originalPath, reversedPath], 'joueur absent de l ordre du tour');
        return false;
      }

      // Save to DB
      const { error: insertError } = await supabase
        .from('audio_phone_recordings')
        .insert({
          round_id: currentRound.id,
          player_id: currentPlayer.id,
          player_name: currentPlayer.name,
          player_order_index: playerIndex,
          storage_path: originalPath,
          reversed_storage_path: reversedPath,
          duration_seconds: durationSeconds,
        });

      if (insertError) {
        noteOrphanedVoiceUpload([originalPath, reversedPath], 'echec d insertion des metadonnees');
        throw insertError;
      }

      awardRecordingXp();
      playSoundEffect('success', 0.5);
      return true;
    } catch (error: any) {
      console.error('[AudioPhoneV2] submitOriginalPhrase failed:', error);
      setUploadErrors(prev => [...prev.slice(-9), {
        timestamp: new Date(),
        message: error?.message || 'Unknown error',
      }]);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer l'enregistrement",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [currentRound, currentPlayer, lobbyId, toast, awardRecordingXp, originalRecordings]);

  // Check if current player has submitted their original phrase
  const hasSubmittedOriginalPhrase = useCallback(() => {
    return originalRecordings.some(r => r.player_id === currentPlayer.id);
  }, [originalRecordings, currentPlayer.id]);

  // Check if all players have submitted their original phrases
  const allPhrasesSubmitted = useCallback(() => {
    return allOriginalPhrasesSubmittedFn(roster, originalRecordings);
  }, [roster, originalRecordings]);

  const getSubmittedOriginalPlayerIds = useCallback(() => {
    return originalRecordings.map((recording) => recording.player_id);
  }, [originalRecordings]);

  const getPendingOriginalPlayers = useCallback(() => {
    return getPendingOriginalPlayersFn(roster, originalRecordings);
  }, [roster, originalRecordings]);

  /*
   * Y a-t-il de quoi imiter ? C'est cette borne qui permet à l'hôte de passer
   * outre un joueur muet sans ouvrir une phase d'imitation vide.
   */
  const canStartImitation = useCallback(
    () => canStartImitationPhase({ roster, recordings: originalRecordings }),
    [roster, originalRecordings],
  );

  // Start imitation phase (host only)
  const startImitationPhase = useCallback(async () => {
    if (!currentRound) return;
    if (!canStartImitationPhase({ roster, recordings: originalRecordings })) {
      console.warn('[AudioPhoneV2] Imitation refusée : pas de quoi imiter');
      return;
    }

    await writePhase(currentRound.phase, 'imitation', {
      current_phrase_index: 0,
      current_player_index: 0,
    });
  }, [currentRound, roster, originalRecordings, writePhase]);

  // Get the current phrase being imitated
  const getCurrentPhraseToImitate = useCallback(() => {
    if (!currentRound) return null;
    const phraseIndex = currentRound.current_phrase_index ?? 0;
    return originalRecordings[phraseIndex] || null;
  }, [currentRound, originalRecordings]);

  // Get players who need to imitate current phrase (everyone except author)
  const getPlayersToImitateCurrentPhrase = useCallback(() => {
    const currentPhrase = getCurrentPhraseToImitate();
    if (!currentPhrase) return [];
    return getPlayersToImitate(roster, currentPhrase.player_id);
  }, [getCurrentPhraseToImitate, roster]);

  // Check if current player needs to imitate the current phrase
  const shouldImitateCurrentPhrase = useCallback(() => {
    const currentPhrase = getCurrentPhraseToImitate();
    if (!currentPhrase) return false;
    return shouldImitate({
      playerId: currentPlayer.id,
      originalAuthorId: currentPhrase.player_id,
      originalRecordingId: currentPhrase.id,
      imitations,
    });
  }, [getCurrentPhraseToImitate, currentPlayer.id, imitations]);

  // Submit an imitation — Bug fix #3, #4, #5
  const submitImitation = useCallback(async (
    audioBlob: Blob,
    originalRecordingId: string,
    /** Permet à l'appelant d'afficher l'étape en cours pendant l'attente. */
    onStage?: (label: string) => void,
  ): Promise<boolean> => {
    if (!currentRound) return false;

    // Bug fix #3, #4, #5: validate phase + not author + no duplicate
    const original = originalRecordings.find((r) => r.id === originalRecordingId);
    if (!original) {
      console.warn('[AudioPhoneV2] Imitation rejected: original not found');
      return false;
    }
    if (!canSubmitImitation({
      phase: currentRound.phase,
      playerId: currentPlayer.id,
      originalRecordingId,
      originalAuthorId: original.player_id,
      imitations,
    })) {
      console.warn('[AudioPhoneV2] Imitation submission blocked');
      return false;
    }

    try {
      setIsSubmitting(true);
      onStage?.('Inversion de ton imitation…');

      // Reverse the imitation
      const { reversedBlob, durationSeconds } = await reverseAudioBufferWithInfo(audioBlob);

      const timestamp = Date.now();
      const imitationPath = `${lobbyId}/${currentRound.id}/imitation_${currentPlayer.id}_${originalRecordingId}_${timestamp}.webm`;
      const reversedPath = `${lobbyId}/${currentRound.id}/imitation_${currentPlayer.id}_${originalRecordingId}_${timestamp}_reversed.wav`;

      onStage?.('Envoi de ton imitation…');

      assertVoiceUploadAllowed(audioBlob, 'Ton imitation');
      assertVoiceUploadAllowed(reversedBlob, 'La version inversée de ton imitation');

      /* Les deux fichiers partent ensemble, comme pour la phrase originale. */
      const [imitationUpload, reversedUpload] = await Promise.all([
        supabase.storage
          .from('audio-phone')
          .upload(imitationPath, audioBlob, { contentType: voiceContentType(audioBlob) }),
        supabase.storage
          .from('audio-phone')
          .upload(reversedPath, reversedBlob, { contentType: 'audio/wav' }),
      ]);

      if (imitationUpload.error || reversedUpload.error) {
        const landed = [
          imitationUpload.error ? null : imitationPath,
          reversedUpload.error ? null : reversedPath,
        ].filter((path): path is string => path !== null);
        noteOrphanedVoiceUpload(landed, 'envoi partiel d une imitation');
        throw imitationUpload.error ?? reversedUpload.error;
      }

      // Save to DB
      const { error: insertError } = await supabase
        .from('audio_phone_imitations')
        .insert({
          round_id: currentRound.id,
          original_recording_id: originalRecordingId,
          imitator_player_id: currentPlayer.id,
          imitator_player_name: currentPlayer.name,
          storage_path: imitationPath,
          reversed_storage_path: reversedPath,
          duration_seconds: durationSeconds,
        });

      if (insertError) {
        noteOrphanedVoiceUpload(
          [imitationPath, reversedPath],
          'echec d insertion des metadonnees d imitation',
        );
        throw insertError;
      }

      awardRecordingXp();
      playSoundEffect('success', 0.5);
      return true;
    } catch (error: any) {
      console.error('[AudioPhoneV2] submitImitation failed:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer l'imitation",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [currentRound, currentPlayer, lobbyId, toast, awardRecordingXp, originalRecordings, imitations]);

  // Check if all imitations for current phrase are done
  const allImitationsForCurrentPhraseDone = useCallback(() => {
    const currentPhrase = getCurrentPhraseToImitate();
    if (!currentPhrase) return false;
    return allImitationsForPhraseDone({
      players: roster,
      originalAuthorId: currentPhrase.player_id,
      originalRecordingId: currentPhrase.id,
      imitations,
    });
  }, [getCurrentPhraseToImitate, roster, imitations]);

  const getCurrentPhraseProgress = useCallback(() => {
    const currentPhrase = getCurrentPhraseToImitate();
    const progress = computePhraseProgress({
      players: roster,
      originalAuthorId: currentPhrase?.player_id ?? null,
      originalRecordingId: currentPhrase?.id ?? null,
      imitations,
    });
    return {
      requiredCount: progress.requiredCount,
      completedCount: progress.completedCount,
      pendingPlayers: roster.filter((p) => progress.pendingPlayerIds.includes(p.id)),
    };
  }, [getCurrentPhraseToImitate, roster, imitations]);

  // Move to next phrase (host only) — Bug fix #9: lock
  const moveToNextPhrase = useCallback(async () => {
    if (!currentRound) return;
    if (moveToNextPhraseLockRef.current) return;
    moveToNextPhraseLockRef.current = true;

    try {
      const current = currentRound.current_phrase_index ?? 0;
      const next = computeNextPhraseIndex(current, originalRecordings.length);

      if (next === -1) {
        // Toutes les phrases sont passées : on attend la révélation.
        await writePhase(currentRound.phase, 'waiting_reveal');
      } else {
        /*
         * `.eq('current_phrase_index', current)` : l'avance ne s'applique que si
         * personne ne l'a déjà faite. Sans cette condition, l'hôte et son avance
         * automatique pouvaient sauter deux phrases d'un coup — le verrou de
         * 500 ms ne protège que ce client, pas la manche.
         */
        const { error } = await supabase
          .from('audio_phone_rounds')
          .update({ current_phrase_index: next })
          .eq('id', currentRound.id)
          .eq('current_phrase_index', current);
        if (error) console.error('Error moving to next phrase:', error);
      }
    } finally {
      setTimeout(() => { moveToNextPhraseLockRef.current = false; }, 500);
    }
  }, [currentRound, originalRecordings.length, writePhase]);

  /*
   * AVANCE AUTOMATIQUE
   * ------------------------------------------------------------------
   * Deux étapes n'avançaient que sur un clic de l'hôte : le passage aux
   * imitations quand tout le monde avait enregistré, et le passage à la phrase
   * suivante quand toutes les imitations étaient déposées. Hôte parti, onglet en
   * veille ou simple distraction, et la manche restait figée sur un écran qui
   * disait pourtant que tout était prêt.
   *
   * Maintenant que `writePhase` et l'avance de phrase sont conditionnées côté
   * serveur — `.eq('phase', from)` et `.eq('current_phrase_index', current)` —
   * une écriture répétée est sans effet. On peut donc laisser n'importe quel
   * client pousser l'étape : le premier arrivé l'emporte, les autres ne font
   * rien. L'hôte garde la main en agissant plus tôt ; les autres ne prennent le
   * relais que s'il ne l'a pas fait.
   */
  const autoAdvanceRef = useRef<string | null>(null);
  const isHost = currentPlayer.isHost;

  useEffect(() => {
    if (!currentRound) return;

    const phase = currentRound.phase;
    let key: string | null = null;
    let action: (() => Promise<void>) | null = null;

    if (phase === 'recording_all' && allPhrasesSubmitted() && canStartImitation()) {
      key = `${currentRound.id}:to-imitation`;
      action = startImitationPhase;
    } else if (phase === 'imitation' && allImitationsForCurrentPhraseDone()) {
      key = `${currentRound.id}:phrase:${currentRound.current_phrase_index ?? 0}`;
      action = moveToNextPhrase;
    }

    if (!key || !action) return;
    /* Déjà poussée depuis ce client : ne pas insister. */
    if (autoAdvanceRef.current === key) return;

    /* L'hôte agit vite ; les autres laissent passer sa fenêtre d'abord. */
    const delay = isHost ? 2000 : 6500;
    const stepKey = key;
    const run = action;

    const timer = setTimeout(() => {
      autoAdvanceRef.current = stepKey;
      void run();
    }, delay);

    return () => clearTimeout(timer);
  }, [
    currentRound,
    isHost,
    allPhrasesSubmitted,
    canStartImitation,
    allImitationsForCurrentPhraseDone,
    startImitationPhase,
    moveToNextPhrase,
  ]);

  // Start reveal (host only)
  const startReveal = useCallback(async () => {
    if (!currentRound) return;
    await writePhase(currentRound.phase, 'reveal', {
      reveal_phrase_index: 0,
      reveal_step: 'idle',
      reveal_is_playing: false,
    });
  }, [currentRound, writePhase]);

  // Control reveal playback (host only) - synced for all players
  const setRevealPlaybackState = useCallback(async (
    isPlaying: boolean, 
    phraseIndex: number, 
    step: string
  ) => {
    if (!currentRound) return;

    const { error } = await supabase
      .from('audio_phone_rounds')
      .update({ 
        reveal_is_playing: isPlaying,
        reveal_phrase_index: phraseIndex,
        reveal_step: step,
      })
      .eq('id', currentRound.id);

    if (error) console.error('Error updating reveal state:', error);
  }, [currentRound]);

  // Get reveal data for a phrase
  const getRevealDataForPhrase = useCallback(async (phraseIndex: number) => {
    const recording = originalRecordings[phraseIndex];
    if (!recording) return null;

    const { data: originalData } = supabase.storage
      .from('audio-phone')
      .getPublicUrl(recording.storage_path);

    const reversedUrl = recording.reversed_storage_path
      ? supabase.storage.from('audio-phone').getPublicUrl(recording.reversed_storage_path).data.publicUrl
      : null;

    // Get all imitations for this phrase
    const phraseImitations = imitations.filter(im => im.original_recording_id === recording.id);
    
    const imitationsWithUrls = await Promise.all(
      phraseImitations.map(async (im) => {
        const reversedImUrl = im.reversed_storage_path
          ? supabase.storage.from('audio-phone').getPublicUrl(im.reversed_storage_path).data.publicUrl
          : null;
        
        return {
          ...im,
          reversedUrl: reversedImUrl,
        };
      })
    );

    return {
      original: {
        ...recording,
        originalUrl: originalData.publicUrl,
        reversedUrl,
      },
      imitations: imitationsWithUrls,
    };
  }, [originalRecordings, imitations]);

  // Get player by ID
  const getPlayerById = useCallback((playerId: string): Player | undefined => {
    return players.find(p => p.id === playerId);
  }, [players]);

  const awardCompletionXp = useCallback(() => {
    void (async () => {
      try {
        const result = await addXp('audioPhoneComplete');
        emitXpGain(XP_REWARDS.audioPhoneComplete, 'audioPhoneComplete');
        if (result?.leveledUp) emitLevelUpNotification(result.newLevel);
      } catch (error) {
        // The round is already finished. Rewards must never roll back or block
        // navigation/replay when the profile service is unavailable.
        console.warn('[AudioPhoneV2] Completion XP not awarded:', error);
      }
    })();
  }, [addXp]);

  const markRoundFinished = useCallback(async (
    round: AudioPhoneRoundV2,
    clearAfterWrite: boolean,
  ): Promise<boolean> => {
    const { error } = await supabase
      .from('audio_phone_rounds')
      .update({ phase: 'finished' })
      .eq('id', round.id);

    if (error) {
      console.error('Error ending Audio Phone round:', error);
      return false;
    }

    // A newer round may have arrived while the UPDATE was in flight. Never
    // clear or overwrite it when finishing the captured predecessor.
    if (currentRoundIdRef.current === round.id) {
      const finishedRound: AudioPhoneRoundV2 = { ...round, phase: 'finished' };
      if (roundHighWaterRef.current?.id === round.id) {
        roundHighWaterRef.current = finishedRound;
      }
      if (clearAfterWrite) {
        clearCurrentRound(round.id);
      } else {
        currentRoundRef.current = finishedRound;
        currentRoundIdRef.current = finishedRound.id;
        if (mountedRef.current) setCurrentRound(finishedRound);
      }
    }
    return true;
  }, [clearCurrentRound]);

  /** Normal completion: persist first, then award XP out of band. */
  const endRound = useCallback(async (): Promise<boolean> => {
    if (!currentPlayer.isHost) return false;
    const round = currentRoundRef.current;
    if (!round) return true;

    const finished = await markRoundFinished(round, true);
    if (finished) awardCompletionXp();
    return finished;
  }, [awardCompletionXp, currentPlayer.isHost, markRoundFinished]);

  /** Host toolbar exit: finish for everyone, deliberately without completion XP. */
  const abandonRound = useCallback(async (): Promise<boolean> => {
    if (!currentPlayer.isHost) return false;
    const round = currentRoundRef.current;
    if (!round) return true;
    return markRoundFinished(round, true);
  }, [currentPlayer.isHost, markRoundFinished]);

  /** Finish then create the successor as one client action; guests adopt its INSERT. */
  const restartRound = useCallback(async (): Promise<boolean> => {
    if (!currentPlayer.isHost) return false;
    const round = currentRoundRef.current;
    if (!round) return createRound(true);

    const finished = await markRoundFinished(round, false);
    if (!finished) return false;
    awardCompletionXp();
    return createRound(true, round.round_number);
  }, [awardCompletionXp, createRound, currentPlayer.isHost, markRoundFinished]);

  // Get reversed audio URL for imitation
  const getReversedAudioUrl = useCallback((recording: OriginalRecording) => {
    if (!recording.reversed_storage_path) return null;
    const { data } = supabase.storage
      .from('audio-phone')
      .getPublicUrl(recording.reversed_storage_path);
    return data.publicUrl;
  }, []);

  return {
    currentRound,
    originalRecordings,
    imitations,
    isLoading,
    isSubmitting,
    uploadErrors,

    /** Effectif réel de la manche : présents dans le salon ET dans l'ordre tiré. */
    roster,
    /** Ce joueur est arrivé après le tirage : il regarde cette manche. */
    isSpectator,

    // Actions
    startGame,
    startRecordingPhase,
    submitOriginalPhrase,
    startImitationPhase,
    submitImitation,
    moveToNextPhrase,
    startReveal,
    setRevealPlaybackState,
    endRound,
    abandonRound,
    restartRound,
    
    // Helpers
    hasSubmittedOriginalPhrase,
    allPhrasesSubmitted,
    canStartImitation,
    getSubmittedOriginalPlayerIds,
    getPendingOriginalPlayers,
    getCurrentPhraseToImitate,
    getPlayersToImitateCurrentPhrase,
    shouldImitateCurrentPhrase,
    allImitationsForCurrentPhraseDone,
    getCurrentPhraseProgress,
    getRevealDataForPhrase,
    getPlayerById,
    getReversedAudioUrl,
  };
};
