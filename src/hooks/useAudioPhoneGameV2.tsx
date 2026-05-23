import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { reverseAudioBufferWithInfo } from '@/lib/audioReverser';
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

interface AudioPhoneRoundV2 {
  id: string;
  lobby_id: string;
  round_number: number;
  phase: GamePhase;
  current_player_index: number;
  current_phrase_index: number; // Which phrase is being imitated
  player_order: string[];
  max_recording_seconds: number;
  // Reveal sync fields
  reveal_is_playing: boolean;
  reveal_phrase_index: number;
  reveal_step: string; // 'idle' | 'original' | 'reversed' | 'imitation_0' | 'imitation_1' etc.
}

interface OriginalRecording {
  id: string;
  round_id: string;
  player_id: string;
  player_name: string;
  player_order_index: number;
  storage_path: string;
  reversed_storage_path: string | null;
  duration_seconds: number;
}

interface Imitation {
  id: string;
  round_id: string;
  original_recording_id: string;
  imitator_player_id: string;
  imitator_player_name: string;
  storage_path: string;
  reversed_storage_path: string | null;
  duration_seconds: number;
}

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

export const useAudioPhoneGameV2 = ({ lobbyId, currentPlayer, players }: UseAudioPhoneGameV2Props) => {
  const [currentRound, setCurrentRound] = useState<AudioPhoneRoundV2 | null>(null);
  const [originalRecordings, setOriginalRecordings] = useState<OriginalRecording[]>([]);
  const [imitations, setImitations] = useState<Imitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<UploadError[]>([]);
  const { toast } = useToast();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const currentRoundIdRef = useRef<string | null>(null);
  
  // XP system
  const { addXp } = usePlayerLevel();

  // Fetch current round and all recordings
  const fetchGameState = useCallback(async () => {
    try {
      const { data: round, error: roundError } = await supabase
        .from('audio_phone_rounds')
        .select('*')
        .eq('lobby_id', lobbyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (roundError) throw roundError;

      if (round) {
        const roundData: AudioPhoneRoundV2 = {
          ...round,
          phase: round.phase as GamePhase,
          current_phrase_index: (round as any).current_phrase_index ?? 0,
          reveal_is_playing: (round as any).reveal_is_playing ?? false,
          reveal_phrase_index: (round as any).reveal_phrase_index ?? 0,
          reveal_step: (round as any).reveal_step ?? 'idle',
        };
        setCurrentRound(roundData);

        // Fetch original recordings
        const { data: recordingsData, error: recordingsError } = await supabase
          .from('audio_phone_recordings')
          .select('*')
          .eq('round_id', round.id)
          .order('player_order_index', { ascending: true });

        if (recordingsError) throw recordingsError;
        setOriginalRecordings((recordingsData || []) as unknown as OriginalRecording[]);

        // Fetch imitations
        const { data: imitationsData, error: imitationsError } = await supabase
          .from('audio_phone_imitations')
          .select('*')
          .eq('round_id', round.id)
          .order('created_at', { ascending: true });

        if (imitationsError) throw imitationsError;
        setImitations((imitationsData || []) as unknown as Imitation[]);
      } else {
        setCurrentRound(null);
        setOriginalRecordings([]);
        setImitations([]);
      }
    } catch (error) {
      console.error('Error fetching game state:', error);
    } finally {
      setIsLoading(false);
    }
  }, [lobbyId]);

  // Initial fetch only — realtime subscriptions below keep state in sync.
  // (Removed 3s polling loop to prevent redundant network traffic and
  //  state races between poll vs realtime payloads.)
  useEffect(() => {
    fetchGameState();
  }, [fetchGameState]);

  // Keep round id ref updated
  useEffect(() => {
    currentRoundIdRef.current = currentRound?.id ?? null;
  }, [currentRound?.id]);

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
            const newRound = payload.new as any;
            setCurrentRound({
              ...newRound,
              phase: newRound.phase as GamePhase,
              current_phrase_index: newRound.current_phrase_index ?? 0,
              reveal_is_playing: newRound.reveal_is_playing ?? false,
              reveal_phrase_index: newRound.reveal_phrase_index ?? 0,
              reveal_step: newRound.reveal_step ?? 'idle',
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audio_phone_recordings' },
        (payload) => {
          const newRec = payload.new as unknown as OriginalRecording;
          // Bug fix #7: client-side filter by current round (Supabase realtime
          // filters don't support changing values via foreign key)
          if (currentRoundIdRef.current && newRec.round_id === currentRoundIdRef.current) {
            setOriginalRecordings(prev => {
              if (prev.some(r => r.id === newRec.id)) return prev;
              return sortRecordingsByOrder([...prev, newRec]);
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audio_phone_imitations' },
        (payload) => {
          const newIm = payload.new as unknown as Imitation;
          // Bug fix #8: client-side filter by current round
          if (currentRoundIdRef.current && newIm.round_id === currentRoundIdRef.current) {
            setImitations(prev => {
              if (prev.some(i => i.id === newIm.id)) return prev;
              return [...prev, newIm];
            });
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lobbyId]);

  // Lock to prevent double startGame calls
  const startGameLockRef = useRef(false);
  const moveToNextPhraseLockRef = useRef(false);

  // Start a new game.
  // When `skipInstructions` is true (default for V2 launch), the round is
  // created directly in 'recording_all' phase so the host doesn't have to
  // click "C'est parti" twice.
  const startGame = useCallback(async (skipInstructions = true) => {
    // Bug fix #10: idempotency lock
    if (startGameLockRef.current) return;
    startGameLockRef.current = true;

    try {
      setIsLoading(true);

      const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
      const playerOrder = shuffledPlayers.map(p => p.id);

      const initialPhase: GamePhase = skipInstructions ? 'recording_all' : 'instructions';

      const { data, error } = await supabase
        .from('audio_phone_rounds')
        .insert({
          lobby_id: lobbyId,
          round_number: (currentRound?.round_number || 0) + 1,
          phase: initialPhase,
          current_player_index: 0,
          player_order: playerOrder,
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentRound({
        ...data,
        phase: data.phase as GamePhase,
        current_phrase_index: 0,
      });
      setOriginalRecordings([]);
      setImitations([]);
      playSoundEffect('start', 0.5);
      
      toast({
        title: "Nouvelle partie !",
        description: "Audio Phone V2 commence !",
      });
    } catch (error) {
      console.error('Error starting game:', error);
      toast({
        title: "Erreur",
        description: "Impossible de démarrer",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      // Release lock after a delay so duplicate clicks within 2s don't fire twice
      setTimeout(() => { startGameLockRef.current = false; }, 2000);
    }
  }, [lobbyId, players, currentRound?.round_number, toast]);

  // Start recording phase (all players record)
  const startRecordingPhase = useCallback(async () => {
    if (!currentRound) return;
    
    const { error } = await supabase
      .from('audio_phone_rounds')
      .update({ phase: 'recording_all' })
      .eq('id', currentRound.id);

    if (error) console.error('Error starting recording phase:', error);
  }, [currentRound]);

  // Submit original phrase recording — Bug fix #1, #2, #6
  const submitOriginalPhrase = useCallback(async (audioBlob: Blob): Promise<boolean> => {
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

      // Reverse the audio
      const { reversedBlob, durationSeconds } = await reverseAudioBufferWithInfo(audioBlob);

      const timestamp = Date.now();
      const originalPath = `${lobbyId}/${currentRound.id}/${currentPlayer.id}_${timestamp}_original.webm`;
      const reversedPath = `${lobbyId}/${currentRound.id}/${currentPlayer.id}_${timestamp}_reversed.wav`;

      // Upload original
      const { error: uploadErr1 } = await supabase.storage
        .from('audio-phone')
        .upload(originalPath, audioBlob, { contentType: audioBlob.type || 'audio/webm', upsert: true });
      if (uploadErr1) throw uploadErr1;

      // Upload reversed
      const { error: uploadErr2 } = await supabase.storage
        .from('audio-phone')
        .upload(reversedPath, reversedBlob, { contentType: 'audio/wav', upsert: true });
      if (uploadErr2) {
        await supabase.storage.from('audio-phone').remove([originalPath]);
        throw uploadErr2;
      }

      // Bug fix #6: handle missing player gracefully (don't silently fall to 0)
      const playerIndex = computePlayerOrderIndex(currentRound.player_order, currentPlayer.id);
      if (playerIndex < 0) {
        console.error('[AudioPhoneV2] Player not in round order — aborting submission');
        await supabase.storage.from('audio-phone').remove([originalPath, reversedPath]);
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
        await supabase.storage.from('audio-phone').remove([originalPath, reversedPath]);
        throw insertError;
      }

      // Award XP for recording
      const result = await addXp('recordingMade');
      emitXpGain(XP_REWARDS.recordingMade, 'recordingMade');
      if (result?.leveledUp) {
        emitLevelUpNotification(result.newLevel);
      }

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
  }, [currentRound, currentPlayer, lobbyId, toast, addXp, originalRecordings]);

  // Check if current player has submitted their original phrase
  const hasSubmittedOriginalPhrase = useCallback(() => {
    return originalRecordings.some(r => r.player_id === currentPlayer.id);
  }, [originalRecordings, currentPlayer.id]);

  // Check if all players have submitted their original phrases
  const allPhrasesSubmitted = useCallback(() => {
    return allOriginalPhrasesSubmittedFn(players, originalRecordings);
  }, [players, originalRecordings]);

  const getSubmittedOriginalPlayerIds = useCallback(() => {
    return originalRecordings.map((recording) => recording.player_id);
  }, [originalRecordings]);

  const getPendingOriginalPlayers = useCallback(() => {
    return getPendingOriginalPlayersFn(players, originalRecordings);
  }, [players, originalRecordings]);

  // Start imitation phase (host only)
  const startImitationPhase = useCallback(async () => {
    if (!currentRound) return;

    const { error } = await supabase
      .from('audio_phone_rounds')
      .update({ 
        phase: 'imitation',
        current_phrase_index: 0,
        current_player_index: 0,
      })
      .eq('id', currentRound.id);

    if (error) console.error('Error starting imitation phase:', error);
  }, [currentRound]);

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
    return getPlayersToImitate(players, currentPhrase.player_id);
  }, [getCurrentPhraseToImitate, players]);

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
  const submitImitation = useCallback(async (audioBlob: Blob, originalRecordingId: string): Promise<boolean> => {
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

      // Reverse the imitation
      const { reversedBlob, durationSeconds } = await reverseAudioBufferWithInfo(audioBlob);

      const timestamp = Date.now();
      const imitationPath = `${lobbyId}/${currentRound.id}/imitation_${currentPlayer.id}_${originalRecordingId}_${timestamp}.webm`;
      const reversedPath = `${lobbyId}/${currentRound.id}/imitation_${currentPlayer.id}_${originalRecordingId}_${timestamp}_reversed.wav`;

      // Upload imitation
      const { error: uploadErr1 } = await supabase.storage
        .from('audio-phone')
        .upload(imitationPath, audioBlob, { contentType: audioBlob.type || 'audio/webm', upsert: true });
      if (uploadErr1) throw uploadErr1;

      // Upload reversed imitation
      const { error: uploadErr2 } = await supabase.storage
        .from('audio-phone')
        .upload(reversedPath, reversedBlob, { contentType: 'audio/wav', upsert: true });
      if (uploadErr2) {
        await supabase.storage.from('audio-phone').remove([imitationPath]);
        throw uploadErr2;
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
        await supabase.storage.from('audio-phone').remove([imitationPath, reversedPath]);
        throw insertError;
      }

      // Award XP for imitation recording
      const result = await addXp('recordingMade');
      emitXpGain(XP_REWARDS.recordingMade, 'recordingMade');
      if (result?.leveledUp) {
        emitLevelUpNotification(result.newLevel);
      }

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
  }, [currentRound, currentPlayer, lobbyId, toast, addXp, originalRecordings, imitations]);

  // Check if all imitations for current phrase are done
  const allImitationsForCurrentPhraseDone = useCallback(() => {
    const currentPhrase = getCurrentPhraseToImitate();
    if (!currentPhrase) return false;
    return allImitationsForPhraseDone({
      players,
      originalAuthorId: currentPhrase.player_id,
      originalRecordingId: currentPhrase.id,
      imitations,
    });
  }, [getCurrentPhraseToImitate, players, imitations]);

  const getCurrentPhraseProgress = useCallback(() => {
    const currentPhrase = getCurrentPhraseToImitate();
    const progress = computePhraseProgress({
      players,
      originalAuthorId: currentPhrase?.player_id ?? null,
      originalRecordingId: currentPhrase?.id ?? null,
      imitations,
    });
    return {
      requiredCount: progress.requiredCount,
      completedCount: progress.completedCount,
      pendingPlayers: players.filter((p) => progress.pendingPlayerIds.includes(p.id)),
    };
  }, [getCurrentPhraseToImitate, players, imitations]);

  // Move to next phrase (host only) — Bug fix #9: lock
  const moveToNextPhrase = useCallback(async () => {
    if (!currentRound) return;
    if (moveToNextPhraseLockRef.current) return;
    moveToNextPhraseLockRef.current = true;

    try {
      const next = computeNextPhraseIndex(
        currentRound.current_phrase_index ?? 0,
        originalRecordings.length
      );

      if (next === -1) {
        // All phrases done, go to waiting_reveal
        const { error } = await supabase
          .from('audio_phone_rounds')
          .update({ phase: 'waiting_reveal' })
          .eq('id', currentRound.id);
        if (error) console.error('Error moving to waiting_reveal:', error);
      } else {
        // Move to next phrase
        const { error } = await supabase
          .from('audio_phone_rounds')
          .update({ current_phrase_index: next })
          .eq('id', currentRound.id);
        if (error) console.error('Error moving to next phrase:', error);
      }
    } finally {
      setTimeout(() => { moveToNextPhraseLockRef.current = false; }, 500);
    }
  }, [currentRound, originalRecordings.length]);

  // Start reveal (host only)
  const startReveal = useCallback(async () => {
    if (!currentRound) return;

    const { error } = await supabase
      .from('audio_phone_rounds')
      .update({ 
        phase: 'reveal', 
        reveal_phrase_index: 0,
        reveal_step: 'idle',
        reveal_is_playing: false,
      })
      .eq('id', currentRound.id);

    if (error) console.error('Error starting reveal:', error);
  }, [currentRound]);

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

  // End round
  const endRound = useCallback(async () => {
    if (!currentRound) return;

    // Award XP for completing Audio Phone game
    const result = await addXp('audioPhoneComplete');
    emitXpGain(XP_REWARDS.audioPhoneComplete, 'audioPhoneComplete');
    if (result?.leveledUp) {
      emitLevelUpNotification(result.newLevel);
    }

    const { error } = await supabase
      .from('audio_phone_rounds')
      .update({ phase: 'finished' })
      .eq('id', currentRound.id);

    if (error) console.error('Error ending round:', error);

    setOriginalRecordings([]);
    setImitations([]);
    setCurrentRound(null);
  }, [currentRound, addXp]);

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
    
    // Helpers
    hasSubmittedOriginalPhrase,
    allPhrasesSubmitted,
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
