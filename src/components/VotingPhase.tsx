import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VideoWithAudioOverlay, VideoWithAudioOverlayRef } from "@/components/VideoWithAudioOverlay";
import { TeamVideoOverlay, TeamVideoOverlayRef } from "@/components/TeamVideoOverlay";
import { CountdownOverlay } from "@/components/CountdownOverlay";
import {
  ThumbsUp, ThumbsDown, Trophy, Play, Pause, ChevronRight, Swords, Sparkles, Zap,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { videoStorage } from "@/lib/videoStorageSupabase";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { emitXpGain } from "@/components/XpGainPopup";
import { emitLevelUpNotification } from "@/components/RewardNotification";
import { usePlayerLevel, XP_REWARDS } from "@/hooks/usePlayerLevel";
import { useQuestTracker } from "@/hooks/useQuestTracker";
import { juice, centerOf } from "@/lib/juice";
import { playInkSound } from "@/hooks/useInkSoundEffects";
import { equalJitterBackoff } from "@/lib/syncState";
import { diagnose } from "@/lib/diagnostics";
import {
  canCommitVotingSession,
  expectedPlaybackPositionMs,
  localPlaybackStartMs,
  parseVotingSessionSnapshot,
  type VotingSessionSnapshot,
} from "@/lib/votingSessionState";
import {
  castImitationVote,
  ensureVotingSession,
  mutateVotingSession,
  readVotingSession,
} from "@/lib/imitationSyncClient";
import {
  hasPlayableAudio,
  resolveVoteAvailability,
  type VotableImitation,
} from "@/lib/imitationVoting";
import { playSample } from "@/lib/sfx/samples";
interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface Team {
  teamNumber: number;
  players: { id: string; name: string }[];
}

interface VotingPhaseProps {
  lobbyId: string;
  gameRoundId: string;
  roundNumber: number;
  currentPlayer: Player;
  players: Player[];
  challengeVideoClipId: string;
  gameMode?: 'normal' | '2v2' | 'quiz';
  teams?: Team[];
  onVotingComplete: () => void;
  variant?: 'default' | 'inkBeta';
}

interface ImitationWithClip {
  playerId: string;
  playerName: string;
  clipId: string | null;
  likes: number;
  dislikes: number;
  userVote: 'like' | 'dislike' | null;
  includeOriginalAudio: boolean;
  originalAudioVolume: number;
}

interface TeamImitation {
  teamNumber: number;
  players: { id: string; name: string }[];
  clipIds: (string | null)[];
  likes: number;
  dislikes: number;
  userVote: 'like' | 'dislike' | null;
  includeOriginalAudio: boolean;
  originalAudioVolume: number;
}

export const VotingPhase = ({
  lobbyId,
  gameRoundId,
  roundNumber,
  currentPlayer,
  players,
  challengeVideoClipId,
  gameMode = 'normal',
  teams = [],
  onVotingComplete,
  variant = 'default',
}: VotingPhaseProps) => {
  const isInkBeta = variant === 'inkBeta';
  const [imitations, setImitations] = useState<ImitationWithClip[]>([]);
  const [teamImitations, setTeamImitations] = useState<TeamImitation[]>([]);
  const [votingSession, setVotingSession] = useState<VotingSessionSnapshot | null>(null);
  const [isSessionSynchronized, setIsSessionSynchronized] = useState(false);
  /** False while the deployed schema still lacks the server-time anchor. */
  const [isPlaybackAuthoritative, setIsPlaybackAuthoritative] = useState(true);
  const [sessionRetryKey, setSessionRetryKey] = useState(0);
  const [imitationRetryKey, setImitationRetryKey] = useState(0);
  const [hasVotedAll, setHasVotedAll] = useState(false);
  const [isPlayingSynced, setIsPlayingSynced] = useState(false);
  const [playbackPositionSeconds, setPlaybackPositionSeconds] = useState(0);
  const [hasVotedCurrent, setHasVotedCurrent] = useState(false);
  const [isVotePending, setIsVotePending] = useState(false);
  const votePendingRef = useRef(false);
  const sessionActionPendingRef = useRef(false);
  const [isSessionActionPending, setIsSessionActionPending] = useState(false);
  const votingSessionRef = useRef<VotingSessionSnapshot | null>(null);
  const requestSessionSnapshotRef = useRef<() => Promise<void>>(async () => undefined);
  const [showCountdown, setShowCountdown] = useState(false);
  const [pendingPlay, setPendingPlay] = useState(false);
  const [countdownCompleteAt, setCountdownCompleteAt] = useState<number | null>(null);
  const { toast } = useToast();
  const { pause, play, setSituation, clearSituationOverride, autoMode } = useBackgroundMusic();
  const videoRef = useRef<VideoWithAudioOverlayRef>(null);
  const teamVideoRef = useRef<TeamVideoOverlayRef>(null);
  const { playSound } = useSoundEffects();
  const { addXp } = usePlayerLevel();
  const questTracker = useQuestTracker();
  const votingSessionId = votingSession?.id ?? null;
  const currentIndex = votingSession?.currentIndex ?? 0;

  useEffect(() => {
    votingSessionRef.current = votingSession;
  }, [votingSession]);

  // Determine what to show based on game mode
  const displayItems = gameMode === '2v2' ? teamImitations : imitations;
  const totalItems = displayItems.length;

  // Switch music to "voting" situation (tense theme) during voting phase.
  // When autoMode is OFF, fall back to pausing the music entirely.
  useEffect(() => {
    if (autoMode) {
      setSituation("voting", { priority: 2, source: "voting-phase" });
    } else {
      pause();
    }
    return () => {
      if (autoMode) {
        clearSituationOverride("voting-phase");
      } else {
        play();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMode]);

  // Subscribe first, then read the SQL row. Realtime is only an invalidation
  // signal; every applied state comes from read_voting_session/ensure RPC.
  useEffect(() => {
    let active = true;
    let subscribed = false;
    let channelEpoch = 0;
    let latestRequest = 0;
    let retryAttempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    const generation = sessionRetryKey + 1;

    const clearRetry = () => {
      if (!retryTimer) return;
      clearTimeout(retryTimer);
      retryTimer = null;
    };
    const scheduleSnapshotRetry = () => {
      if (!active || retryTimer) return;
      retryTimer = setTimeout(() => {
        retryTimer = null;
        retryAttempt = Math.min(retryAttempt + 1, 8);
        if (subscribed) void reconcileSession();
        else setSessionRetryKey((value) => value + 1);
      }, equalJitterBackoff(retryAttempt, 1_000, 10_000));
    };

    async function reconcileSession() {
      /*
       * Volontairement PAS conditionné à l'abonnement du canal.
       *
       * Les lignes SQL sont la source de vérité ; le temps réel n'est qu'une
       * notification — c'est le principe posé par la migration de durcissement.
       * Exiger l'abonnement avant de lire rendait cet écran définitivement
       * bloqué sur « Synchronisation de la session de vote… » dès que le
       * WebSocket ne passait pas : VPN de navigateur, proxy d'entreprise, réseau
       * filtré. Le joueur n'avait alors aucune issue, alors que la donnée était
       * lisible et correcte.
       */
      if (!active) return;
      const requestId = ++latestRequest;
      const requestEpoch = channelEpoch;
      const token = { generation, requestId, channelEpoch: requestEpoch };
      const requestStartedAt = Date.now();
      try {
        let read = await readVotingSession(lobbyId, roundNumber);
        if (!read.row && currentPlayer.isHost && gameRoundId) {
          read = await ensureVotingSession(gameRoundId, lobbyId, roundNumber);
        }

        const responseReceivedAt = Date.now();
        // `active` et non `subscribed && active` : la comparaison d'époque
        // suffit à écarter une réponse périmée, sans exiger un canal vivant.
        if (!canCommitVotingSession(
          token,
          generation,
          latestRequest,
          channelEpoch,
          active,
        )) return;

        const snapshot = parseVotingSessionSnapshot(
          read.row,
          // The legacy path has no game_round_id to compare against.
          { lobbyId, roundNumber, gameRoundId: read.degraded ? undefined : gameRoundId },
          requestStartedAt,
          responseReceivedAt,
        );
        if (!snapshot) {
          /*
           * Rejet silencieux jusqu'ici : l'écran repartait en attente sans dire
           * ce qui n'allait pas, et la seule issue visible était une boucle de
           * reprise infinie. On consigne la ligne reçue et le garde attendu,
           * c'est exactement ce qu'il faut pour trancher entre « pas de ligne »,
           * « manche remplacée » et « champ manquant ».
           */
          diagnose.error('voting', 'Instantané de session refusé', {
            aUneLigne: Boolean(read.row),
            degrade: read.degraded,
            gardeAttendu: { lobbyId, roundNumber, gameRoundId },
            ligneRecue: read.row ?? null,
          });
          setIsSessionSynchronized(false);
          scheduleSnapshotRetry();
          return;
        }
        diagnose.info('voting', 'Session synchronisée', {
          version: snapshot.version,
          index: snapshot.currentIndex,
          enLecture: snapshot.isPlaying,
          decalageServeurMs: Math.round(snapshot.serverOffsetMs),
          degrade: read.degraded,
        });
        setIsPlaybackAuthoritative(!read.degraded);

        setVotingSession(snapshot);
        setIsSessionSynchronized(true);
        retryAttempt = 0;
        clearRetry();
      } catch (error) {
        if (!active || requestId !== latestRequest || requestEpoch !== channelEpoch) return;
        diagnose.error('voting', 'Lecture de la session en échec', {
          erreur: error,
          lobbyId,
          roundNumber,
        });
        setIsSessionSynchronized(false);
        scheduleSnapshotRetry();
      }
    }

    requestSessionSnapshotRef.current = reconcileSession;

    const channel = supabase
      .channel(`voting-session:${lobbyId}:${roundNumber}:${sessionRetryKey}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'voting_session',
          filter: `lobby_id=eq.${lobbyId}`,
        },
        (payload) => {
          const row = (payload.new && Object.keys(payload.new).length > 0 ? payload.new : payload.old) as {
            round_number?: number;
          };
          if (row.round_number !== undefined && row.round_number !== roundNumber) return;
          void reconcileSession();
        },
      )
      .subscribe((status) => {
        if (!active) return;
        diagnose.info('voting', `Canal session : ${status}`, { lobbyId, roundNumber });
        if (status === 'SUBSCRIBED') {
          subscribed = true;
          channelEpoch += 1;
          void reconcileSession();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          subscribed = false;
          channelEpoch += 1;
          latestRequest += 1;
          /*
           * L'instantané déjà lu reste valide, seulement moins frais : le
           * remettre à zéro faisait clignoter l'écran entre le contenu et
           * l'attente à chaque perte de canal, ce qui est fréquent derrière un
           * VPN. La relecture périodique se charge de le rafraîchir.
           */
          scheduleSnapshotRetry();
        }
      });

    // Première lecture immédiate, sans attendre l'abonnement.
    void reconcileSession();

    /*
     * Filet de sécurité : tant que le canal n'est pas abonné, on relit
     * périodiquement. La partie continue donc d'avancer même sans WebSocket,
     * simplement avec un peu de latence au lieu d'un blocage définitif.
     */
    const fallbackTimer = setInterval(() => {
      if (!active || subscribed) return;
      void reconcileSession();
    }, 4_000);

    const resync = () => {
      if (navigator.onLine) void reconcileSession();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') resync();
    };
    window.addEventListener('online', resync);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      active = false;
      subscribed = false;
      channelEpoch += 1;
      latestRequest += 1;
      clearRetry();
      clearInterval(fallbackTimer);
      requestSessionSnapshotRef.current = async () => undefined;
      window.removeEventListener('online', resync);
      document.removeEventListener('visibilitychange', handleVisibility);
      void supabase.removeChannel(channel);
    };
  }, [currentPlayer.isHost, gameRoundId, lobbyId, roundNumber, sessionRetryKey]);

  // Translate the server playback anchor to this clock once, then seek before
  // starting. A late/reconnected client joins at the elapsed server position.
  useEffect(() => {
    let startTimer: ReturnType<typeof setTimeout> | null = null;
    if (!isSessionSynchronized || !votingSession) {
      setIsPlayingSynced(false);
      setShowCountdown(false);
      setPendingPlay(false);
      return;
    }

    setPlaybackPositionSeconds(expectedPlaybackPositionMs(votingSession) / 1000);
    if (!votingSession.isPlaying) {
      setIsPlayingSynced(false);
      setShowCountdown(false);
      setPendingPlay(false);
      setCountdownCompleteAt(null);
      return;
    }

    const localStart = localPlaybackStartMs(votingSession);
    if (localStart !== null && localStart > Date.now()) {
      setIsPlayingSynced(false);
      setPendingPlay(true);
      setCountdownCompleteAt(localStart);
      setShowCountdown(true);
      startTimer = setTimeout(() => {
        setPlaybackPositionSeconds(expectedPlaybackPositionMs(votingSession) / 1000);
        setShowCountdown(false);
        setPendingPlay(false);
        setCountdownCompleteAt(null);
        setIsPlayingSynced(true);
      }, Math.max(0, localStart - Date.now()));
    } else {
      setShowCountdown(false);
      setPendingPlay(false);
      setCountdownCompleteAt(null);
      setIsPlayingSynced(true);
    }

    return () => {
      if (startTimer) clearTimeout(startTimer);
    };
  }, [isSessionSynchronized, votingSession]);

  // Voting completion is derived from the certified SQL index only.
  useEffect(() => {
    if (!isSessionSynchronized) return;
    const totalItems = gameMode === '2v2' ? teamImitations.length : imitations.length;
    if (totalItems === 0 || currentIndex < totalItems) return;

    setHasVotedAll(true);
    if (!currentPlayer.isHost) return;
    const timer = setTimeout(() => onVotingComplete(), 2000);
    return () => clearTimeout(timer);
  }, [
    currentIndex,
    currentPlayer.isHost,
    gameMode,
    imitations.length,
    isSessionSynchronized,
    onVotingComplete,
    teamImitations.length,
  ]);

  // Load imitations and their clips - using round_number for accurate tracking
  useEffect(() => {
    let isMounted = true;
    let subscribed = false;
    let channelEpoch = 0;
    let latestRequest = 0;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    
    const loadImitations = async (retryCount = 0) => {
      // Même principe que la session : la liste des imitations se lit en SQL et
      // ne dépend pas du canal. L'exiger laissait l'écran sur « Chargement des
      // imitations… » indéfiniment quand le WebSocket ne passait pas.
      if (!isMounted) return;
      const requestId = ++latestRequest;
      const requestEpoch = channelEpoch;
      const imitationsData: ImitationWithClip[] = [];
      
      // select('*'), never a named clip_id: if the harden migration is not
      // applied, naming the missing column fails the whole query, the error is
      // swallowed, and every player is stuck on "Chargement des imitations…".
      // '*' returns whatever columns exist; a missing clip_id simply resolves
      // to undefined and we fall back to getClipByPlayerAndRound below.
      const { data: imitationRecords, error: imitationError } = await supabase
        .from('player_imitations')
        .select('*')
        .eq('lobby_id', lobbyId)
        .eq('round_number', roundNumber)
        .eq('is_ready', true);

      // Single query for ALL votes this round (eliminates N+1 per-player queries)
      const { data: allVotes, error: votesError } = await supabase
        .from('imitation_votes')
        .select('imitation_player_id, voter_player_id, vote_type')
        .eq('lobby_id', lobbyId)
        .eq('round_number', roundNumber);

      if (imitationError) throw imitationError;
      if (votesError) throw votesError;
      if (!isMounted || requestId !== latestRequest || requestEpoch !== channelEpoch) return;

      // Pre-compute vote tallies in memory
      const voteTally = new Map<string, { likes: number; dislikes: number; userVote: 'like' | 'dislike' | null }>();
      for (const v of allVotes ?? []) {
        const entry = voteTally.get(v.imitation_player_id) ?? { likes: 0, dislikes: 0, userVote: null };
        if (v.vote_type === 'like') entry.likes++;
        else if (v.vote_type === 'dislike') entry.dislikes++;
        if (v.voter_player_id === currentPlayer.id) entry.userVote = v.vote_type as 'like' | 'dislike';
        voteTally.set(v.imitation_player_id, entry);
      }

      // Resolve clip IDs in parallel (only for players who have an imitation record)
      const playerPromises = players.map(async (player) => {
        const imitationRecord = imitationRecords?.find(r => r.player_id === player.id);
        
        let clipId: string | null = imitationRecord?.clip_id ?? null;
        const includeOriginalAudio = imitationRecord?.include_original_audio ?? false;
        const originalAudioVolume = imitationRecord?.original_audio_volume ?? 50;

        // Legacy in-flight rows created before clip_id existed may still be
        // recovered by the exact lobby/player/round key, never by time.
        if (imitationRecord && !clipId) {
          const roundClip = await videoStorage.getClipByPlayerAndRound(
            player.id,
            lobbyId,
            roundNumber,
          );
          clipId = roundClip?.id ?? null;
        }

        const v = voteTally.get(player.id) ?? { likes: 0, dislikes: 0, userVote: null };
        return {
          playerId: player.id,
          playerName: player.name,
          clipId,
          likes: v.likes,
          dislikes: v.dislikes,
          userVote: v.userVote,
          includeOriginalAudio,
          originalAudioVolume
        };
      });

      const results = await Promise.all(playerPromises);
      imitationsData.push(...results);

      if (isMounted && requestId === latestRequest && requestEpoch === channelEpoch) {
        // Skip retry for bots (no clip will ever exist).
        // (le commit reste protégé par la comparaison d'époque)
        const hasMissingClips = imitationsData.some(im => {
          if (im.playerId.startsWith('bot-')) return false;
          const hasRecord = imitationRecords?.some(r => r.player_id === im.playerId);
          return hasRecord && !im.clipId;
        });

        if (hasMissingClips && retryCount < 3) {
          retryTimeout = setTimeout(() => loadImitations(retryCount + 1), 1500);
          return;
        }

        diagnose.info('voting', 'Imitations chargées', {
          total: imitationsData.length,
          avecClip: imitationsData.filter((entry) => entry.clipId).length,
          lignesPretes: imitationRecords?.length ?? 0,
          tentative: retryCount,
        });
        setImitations(imitationsData);
      }
    };

    // Debounce SQL invalidation signals; payloads are never applied directly.
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const requestDebouncedLoad = (payload: { new: Record<string, unknown>; old: Record<string, unknown> }) => {
      const row = Object.keys(payload.new).length > 0 ? payload.new : payload.old;
      if (typeof row.round_number === 'number' && row.round_number !== roundNumber) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        void loadImitations().catch((error) => {
          console.error('Error loading imitations:', error);
        });
      }, 300);
    };

    const channel = supabase
      .channel(`votes:${lobbyId}:${roundNumber}:${imitationRetryKey}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'imitation_votes',
          filter: `lobby_id=eq.${lobbyId}`,
        },
        requestDebouncedLoad,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_imitations',
          filter: `lobby_id=eq.${lobbyId}`,
        },
        requestDebouncedLoad,
      )
      .subscribe((status) => {
        if (!isMounted) return;
        if (status === 'SUBSCRIBED') {
          subscribed = true;
          channelEpoch += 1;
          void loadImitations().catch((error) => {
            console.error('Error loading imitations:', error);
          });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          subscribed = false;
          channelEpoch += 1;
          latestRequest += 1;
          if (!retryTimeout) {
            retryTimeout = setTimeout(() => {
              retryTimeout = null;
              setImitationRetryKey((value) => value + 1);
            }, equalJitterBackoff(imitationRetryKey, 1_000, 10_000));
          }
        }
      });

    // Premier chargement immédiat, puis relance tant que le canal est absent.
    void loadImitations().catch((error) => {
      console.error('Error loading imitations:', error);
    });
    const fallbackTimer = setInterval(() => {
      if (!isMounted || subscribed) return;
      void loadImitations().catch((error) => {
        console.error('Error loading imitations:', error);
      });
    }, 4_000);

    return () => {
      isMounted = false;
      subscribed = false;
      channelEpoch += 1;
      latestRequest += 1;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (debounceTimer) clearTimeout(debounceTimer);
      clearInterval(fallbackTimer);
      void supabase.removeChannel(channel);
    };
  }, [currentPlayer.id, imitationRetryKey, lobbyId, players, roundNumber]);

  // Group imitations by team for 2v2 mode
  useEffect(() => {
    if (gameMode !== '2v2' || teams.length === 0 || imitations.length === 0) {
      setTeamImitations([]);
      return;
    }

    const grouped: TeamImitation[] = teams.map(team => {
      const teamPlayers = team.players;
      const teamImitationsData = teamPlayers.map(p => 
        imitations.find(im => im.playerId === p.id)
      );
      
      // Calculate team votes (sum of both players)
      const totalLikes = teamImitationsData.reduce((sum, im) => sum + (im?.likes || 0), 0);
      const totalDislikes = teamImitationsData.reduce((sum, im) => sum + (im?.dislikes || 0), 0);
      
      // Check if current player voted for any team member
      const userVote = teamImitationsData.find(im => im?.userVote)?.userVote || null;
      
      // Use first player's audio settings
      const firstImitation = teamImitationsData[0];
      
      return {
        teamNumber: team.teamNumber,
        players: teamPlayers,
        clipIds: teamImitationsData.map(im => im?.clipId || null),
        likes: totalLikes,
        dislikes: totalDislikes,
        userVote,
        includeOriginalAudio: firstImitation?.includeOriginalAudio ?? false,
        originalAudioVolume: firstImitation?.originalAudioVolume ?? 50,
      };
    }).filter(team => team.clipIds.some(id => id !== null)); // Only show teams with at least one clip

    setTeamImitations(grouped);
  }, [gameMode, teams, imitations]);

  // Reset hasVotedCurrent when index changes — derive from loaded data
  useEffect(() => {
    const current = gameMode === '2v2' ? teamImitations[currentIndex] : imitations[currentIndex];
    setHasVotedCurrent(!!current?.userVote);
  }, [currentIndex, imitations, teamImitations, gameMode]);

  const currentImitation = imitations[currentIndex];
  const currentTeamImitation = gameMode === '2v2' ? teamImitations[currentIndex] : null;

  /**
   * Vue commune aux deux modes de jeu, pour ne décider qu'une fois.
   *
   * Déclarée avant `handleVote` à dessein : la garde du clic et la condition
   * d'affichage des boutons doivent lire exactement la même valeur. C'est leur
   * séparation qui rendait le vote impossible sans aucun message.
   */
  const votableCurrent: VotableImitation | null = gameMode === '2v2'
    ? currentTeamImitation
      ? {
          playerIds: currentTeamImitation.players.map((player) => player.id),
          clipIds: currentTeamImitation.clipIds,
          userVote: currentTeamImitation.userVote ?? null,
        }
      : null
    : currentImitation
      ? {
          playerIds: [currentImitation.playerId],
          clipIds: [currentImitation.clipId],
          userVote: currentImitation.userVote ?? null,
        }
      : null;

  const voteAvailability = resolveVoteAvailability(
    votableCurrent,
    currentPlayer.id,
    isSessionSynchronized,
  );
  const currentHasAudio = hasPlayableAudio(votableCurrent);

  const handleVote = async (voteType: 'like' | 'dislike', evt?: React.MouseEvent) => {
    if (
      votePendingRef.current ||
      hasVotedCurrent ||
      !isSessionSynchronized ||
      !votingSessionId
    ) return;

    // Même décision que celle qui gouverne l'affichage des boutons : c'est leur
    // divergence qui rendait le clic inopérant et muet.
    const availability = resolveVoteAvailability(
      votableCurrent,
      currentPlayer.id,
      isSessionSynchronized,
    );
    if (availability.kind !== 'votable') return;
    const targetIds = availability.targetIds;

    const origin = centerOf(evt?.currentTarget ?? null);
    const targetElement = evt?.currentTarget as HTMLElement | undefined;
    votePendingRef.current = true;
    setIsVotePending(true);
    try {
      const inserted = await castImitationVote(
        lobbyId,
        roundNumber,
        currentPlayer.id,
        targetIds,
        voteType,
      );
      if (!inserted) {
        await requestSessionSnapshotRef.current();
        toast({
          title: 'Vote déjà traité',
          description: 'Le vote ou la manche avait déjà changé.',
        });
        return;
      }

      setHasVotedCurrent(true);
      // Approuver et désapprouver sonnaient exactement pareil : un seul appel
      // `vote` servait les deux. Deux échantillons distincts maintenant, avec
      // repli sur l'ancien son si les fichiers ne sont pas encore chargés.
      if (!playSample(voteType === 'like' ? 'voteUp' : 'voteDown', 0.5)) {
        playSound('vote');
      }
      if (origin) {
        juice.burst({
          x: origin.x,
          y: origin.y,
          color: voteType === 'like' ? 'hsl(140 70% 55%)' : 'hsl(0 84% 60%)',
          intensity: voteType === 'like' ? 1.2 : 0.9,
        });
        if (targetElement) juice.pop(targetElement, voteType === 'like' ? 1.18 : 1.1);
      }
      if (voteType === 'like') juice.flash('success', 180);
      else juice.shake(160, 0.7);

      const xpResult = await addXp('voteLike');
      emitXpGain(XP_REWARDS.voteLike, 'voteLike');
      if (xpResult?.leveledUp) emitLevelUpNotification(xpResult.newLevel);
      void questTracker.track('vote_imitation');

      toast({
        title: voteType === 'like' ? '👍 Like !' : '👎 Dislike',
        description: gameMode === '2v2' ? "Vote pour l'équipe enregistré" : 'Vote enregistré',
      });
    } catch (error) {
      console.error('Error voting:', error);
      toast({ title: 'Erreur', description: "Impossible d'enregistrer le vote", variant: 'destructive' });
    } finally {
      votePendingRef.current = false;
      setIsVotePending(false);
    }
  };

  const mutateSession = async (
    action: 'start' | 'pause' | 'advance',
    countdownMs = 0,
  ): Promise<boolean> => {
    const snapshot = votingSessionRef.current;
    if (
      !currentPlayer.isHost ||
      !isSessionSynchronized ||
      !snapshot ||
      sessionActionPendingRef.current
    ) return false;

    sessionActionPendingRef.current = true;
    setIsSessionActionPending(true);
    try {
      const changed = await mutateVotingSession(
        snapshot.id,
        snapshot.version,
        snapshot.currentIndex,
        action,
        countdownMs,
      );
      await requestSessionSnapshotRef.current();
      if (!changed) {
        toast({
          title: 'Commande déjà dépassée',
          description: 'La session a été resynchronisée.',
        });
      }
      return changed;
    } catch (error) {
      console.error('Error mutating voting session:', error);
      setIsSessionSynchronized(false);
      toast({
        title: 'Synchronisation impossible',
        description: 'La commande a été annulée puis la session va être relue.',
        variant: 'destructive',
      });
      await requestSessionSnapshotRef.current();
      return false;
    } finally {
      sessionActionPendingRef.current = false;
      setIsSessionActionPending(false);
    }
  };

  const handleTogglePlay = async () => {
    if (pendingPlay || showCountdown) return;
    if (isPlayingSynced) {
      await mutateSession('pause');
    } else {
      // PostgreSQL chooses the actual start instant 3.5 s in the future.
      await mutateSession('start', 3_500);
    }
  };

  const handleCountdownComplete = () => {
    const snapshot = votingSessionRef.current;
    setShowCountdown(false);
    setPendingPlay(false);
    setCountdownCompleteAt(null);
    if (snapshot?.isPlaying) {
      setPlaybackPositionSeconds(expectedPlaybackPositionMs(snapshot) / 1000);
      setIsPlayingSynced(true);
    }
  };

  const handleNext = async () => {
    await mutateSession('advance');
  };

  const displayLength = gameMode === '2v2' ? teamImitations.length : imitations.length;

  /*
   * Fin de phase, testée AVANT le garde-fou de chargement.
   *
   * Au dernier index, `imitations[currentIndex]` est indéfini par construction :
   * le garde-fou concluait « imitations non chargées » et affichait le spinner à
   * la place de l'écran de fin, pendant les deux secondes qui précèdent les
   * résultats. Très visible en solo, où il n'y a qu'une seule imitation.
   */
  const votingFinished =
    isSessionSynchronized && displayLength > 0 && (hasVotedAll || currentIndex >= displayLength);

  // Nothing renders until the durable session snapshot is certified.
  if (!votingFinished && (
      !isSessionSynchronized ||
      (gameMode === 'normal' && (!currentImitation || imitations.length === 0)) ||
      (gameMode === '2v2' && teamImitations.length === 0))) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-foreground-secondary font-body">
          {isSessionSynchronized
            ? 'Chargement des imitations...'
            : 'Synchronisation de la session de vote...'}
        </p>
      </div>
    );
  }

  // Completed state
  if (votingFinished) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-secondary/30 blur-2xl rounded-full animate-pulse" />
          <Trophy className="h-20 w-20 text-secondary relative" />
        </div>
        <h2 className="text-4xl font-display font-black text-gradient">
          Votes Terminés !
        </h2>
        <p className="text-foreground-secondary font-body">Calcul des résultats...</p>
      </div>
    );
  }

  // Determine if it's own video/team — dérivé de la même vue que le vote.
  const isOwnVideo = voteAvailability.kind === 'own';

  return (
    <div
      className={isInkBeta ? 'contents' : 'h-[100dvh] text-white relative overflow-hidden flex flex-col'}
      style={isInkBeta ? undefined : { background: "linear-gradient(180deg, #0f0820, #0a0510, #160a26)" }}
    >
      {/* Animated background — la beta a déjà ses couches de scène. */}
      {!isInkBeta && (
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div animate={{ x: [0, 20, 0], y: [0, -15, 0] }} transition={{ duration: 9, repeat: Infinity }}
          className="absolute top-[-5%] left-[15%] w-[450px] h-[450px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #f8717155, transparent 70%)", filter: "blur(80px)" }} />
        <Sparkles className="absolute top-[12%] right-[6%] w-5 h-5 text-amber-400/30" />
        <Zap className="absolute bottom-[25%] left-[4%] w-4 h-4 text-pink-400/25" />
      </div>
      )}

      {/* Countdown overlay */}
      <CountdownOverlay isActive={showCountdown} onComplete={handleCountdownComplete} duration={3}
        title="La vidéo commence dans..." completeAt={countdownCompleteAt ?? undefined} />

      <div className={isInkBeta ? 'contents' : 'relative z-10 flex-1 overflow-y-auto custom-scrollbar max-w-4xl mx-auto w-full px-4 py-5 pb-[120px] space-y-5'}>
        {/* Header — en beta, la pastille de phase vit dans la barre de marque. */}
        <div className={isInkBeta ? 'hidden' : 'text-center space-y-3'}>
          <motion.div initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: -2 }}
            transition={{ type: "spring", stiffness: 280, damping: 16 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
            style={{ background: "linear-gradient(180deg, #f87171, #ef4444)", border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
            <span className="text-sm font-black uppercase tracking-wider text-white" style={{ fontFamily: "'Outfit', sans-serif", textShadow: 'none' }}>
              ⚡ Phase de vote {gameMode === '2v2' && '· 2v2'}
            </span>
          </motion.div>
          <h2 className="text-5xl font-black text-white" style={{ fontFamily: "'Outfit', sans-serif", textShadow: 'none' }}>
            Votez {gameMode === '2v2' && 'pour les équipes'} !
          </h2>
          <p className="text-sm text-white/60" style={{ fontFamily: "'Outfit', sans-serif" }}>
            {gameMode === '2v2' ? 'Équipe' : 'Imitation'}{' '}
            <span className="font-black text-red-400">{currentIndex + 1}</span>/{displayLength}
          </p>
        </div>

        {/* Video card */}
        <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", damping: 22 }}
          className={isInkBeta ? 'ik-gpanel is-featured' : 'relative rounded-3xl overflow-hidden'}
          style={isInkBeta ? undefined : { background: "linear-gradient(180deg, #1a0d2e, #0f0820)", border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
          {isInkBeta && (
            <div className="ik-gpanel-head">
              <div>
                <span>Manche {roundNumber}</span>
                <h2>{gameMode === '2v2' ? 'Votez pour les équipes' : 'À vous de juger'}</h2>
              </div>
              <div className="ik-gpanel-aside">
                <p className="ik-lobby-count">
                  <strong>{String(currentIndex + 1).padStart(2, '0')}</strong>
                  <span>/ {String(displayLength).padStart(2, '0')}</span>
                </p>
              </div>
            </div>
          )}
          {!isInkBeta && <div className="absolute inset-1.5 rounded-[1.2rem] pointer-events-none" style={{ border: "2px solid rgba(248,113,113,0.3)" }} />}
          {!isInkBeta && <Sparkles className="absolute top-3 left-4 w-4 h-4 text-amber-400 z-10" style={{ filter: "none" }} />}

          <div className={isInkBeta ? 'ik-gpanel-body' : 'relative p-5 space-y-4'}>
            {/* Player/team name */}
            <div className="text-center">
              {gameMode === '2v2' && currentTeamImitation ? (
                <div className="space-y-2">
                  <div className="flex justify-center items-center gap-3">
                    {currentTeamImitation.players.map((p) => (
                      <div key={p.id} className="flex flex-col items-center gap-1">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center"
                          style={{ background: "var(--ink-accent)", border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
                          <span className="text-xl font-black text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>{p.name[0]?.toUpperCase()}</span>
                        </div>
                        <span className="text-sm font-black text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>{p.name}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Swords className="w-4 h-4 text-red-400" />
                    <h3 className="text-2xl font-black text-red-400" style={{ fontFamily: "'Outfit', sans-serif", textShadow: 'none' }}>
                      {isOwnVideo ? "Votre équipe" : `Équipe ${currentTeamImitation.teamNumber}`}
                    </h3>
                  </div>
                </div>
              ) : currentImitation ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{ background: "var(--ink-accent)", border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
                    <span className="text-2xl font-black text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>{currentImitation.playerName[0]?.toUpperCase()}</span>
                  </div>
                  <h3 className="text-2xl font-black" style={{ fontFamily: "'Outfit', sans-serif", color: isOwnVideo ? "#34d399" : "white", textShadow: 'none' }}>
                    {isOwnVideo ? "Votre imitation" : currentImitation.playerName}
                  </h3>
                  {isOwnVideo && <p className="text-sm text-white/50" style={{ fontFamily: "'Outfit', sans-serif" }}>Vous ne pouvez pas voter pour vous-même</p>}
                </div>
              ) : null}
            </div>

            {/* Video */}
            <div className={isInkBeta ? 'ik-gvideo' : 'rounded-2xl overflow-hidden'} style={isInkBeta ? undefined : { border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
              {gameMode === '2v2' && currentTeamImitation?.clipIds[0] ? (
                <TeamVideoOverlay ref={teamVideoRef} videoClipId={challengeVideoClipId}
                  audioClipId1={currentTeamImitation.clipIds[0]} audioClipId2={currentTeamImitation.clipIds[1] || null}
                  className="w-full" externalControl isPlayingExternal={isPlayingSynced}
                  playbackPositionSeconds={playbackPositionSeconds}
                  includeOriginalAudio={currentTeamImitation.includeOriginalAudio} originalAudioVolume={currentTeamImitation.originalAudioVolume} />
              ) : currentImitation?.clipId ? (
                <VideoWithAudioOverlay ref={videoRef} videoClipId={challengeVideoClipId} audioClipId={currentImitation.clipId}
                  className="w-full" externalControl isPlayingExternal={isPlayingSynced}
                  playbackPositionSeconds={playbackPositionSeconds}
                  includeOriginalAudio={currentImitation?.includeOriginalAudio ?? false} originalAudioVolume={currentImitation?.originalAudioVolume ?? 50}
                  onPlayStateChange={(playing) => {
                    // Media end is a hint. Only the host attempts the versioned
                    // SQL pause; guests never command global playback.
                    if (!playing && isPlayingSynced && currentPlayer.isHost) {
                      void mutateSession('pause');
                    }
                  }} />
              ) : (
                <div className="aspect-video flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
                  <p className="text-white/50 font-bold" style={{ fontFamily: "'Outfit', sans-serif" }}>Aucun audio disponible</p>
                </div>
              )}
            </div>

            {/* Host play control */}
            {currentPlayer.isHost && (
              <div className="flex justify-center">
                {/* Sans clip, aucun lecteur n'est monté : lancer la lecture
                    laisserait la session en `is_playing` sans jamais se
                    terminer, puisque rien ne signale la fin du média. */}
                <motion.button onClick={handleTogglePlay}
                  disabled={!votingSessionId || !isSessionSynchronized || pendingPlay
                    || showCountdown || !currentHasAudio || isSessionActionPending}
                  whileHover={!isSessionActionPending ? { scale: 1.05, rotate: -2 } : undefined}
                  whileTap={!isSessionActionPending ? { scale: 0.95 } : undefined}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl disabled:opacity-50"
                  style={{ background: isPlayingSynced ? "linear-gradient(180deg, #6b7280, #4b5563)" : "var(--ink-accent)", border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
                  {isSessionActionPending
                    ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                    : isPlayingSynced
                      ? <Pause className="w-5 h-5 text-white" />
                      : <Play className="w-5 h-5 text-white" />}
                  <span className="text-lg font-black text-white" style={{ fontFamily: "'Outfit', sans-serif", textShadow: 'none' }}>
                    {isSessionActionPending
                      ? 'Synchronisation…'
                      : isPlayingSynced ? "Pause" : "Lancer pour tous 🎬"}
                  </span>
                </motion.button>
              </div>
            )}

            {/* Honest about the weaker guarantee until the migration is applied. */}
            {!isPlaybackAuthoritative && (
              <p className="text-center text-[11px] font-bold text-amber-300/80"
                style={{ fontFamily: "'Outfit', sans-serif" }}>
                Synchronisation de lecture approximative : l'horodatage serveur n'est pas encore disponible.
              </p>
            )}

            {/* Vote buttons */}
            <div className="flex flex-col gap-3 items-center">
              {/* Rien à juger : on le dit, au lieu d'afficher deux boutons
                  vivants dont le clic ne produit aucun effet. */}
              {voteAvailability.kind === 'no-audio' && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl"
                  style={{ background: "rgba(251,191,36,0.12)", border: '1px solid var(--ink-line)' }}>
                  <span className="text-sm font-black text-amber-300" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    Aucun audio à juger —{' '}
                    {currentPlayer.isHost ? 'passe à la suivante' : "en attente de l'hôte"}
                  </span>
                </div>
              )}

              {voteAvailability.kind === 'votable' && !hasVotedCurrent && (
                <div className="flex gap-4 w-full max-w-sm">
                  <motion.button onClick={(e) => handleVote('dislike', e)}
                    disabled={!votingSessionId || !isSessionSynchronized || isVotePending}
                    whileHover={{ scale: 1.05, rotate: 2 }} whileTap={{ scale: 0.95 }}
                    className={isInkBeta ? 'ik-vote ik-vote--down menu-focus flex-1' : 'flex-1 py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50'}
                    style={isInkBeta ? undefined : { background: "linear-gradient(180deg, #ef4444, #b91c1c)", border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
                    <ThumbsDown className="w-6 h-6 text-white" />
                    <span className="text-xl font-black text-white" style={{ fontFamily: "'Outfit', sans-serif", textShadow: 'none' }}>Bof</span>
                  </motion.button>
                  <motion.button onClick={(e) => handleVote('like', e)}
                    disabled={!votingSessionId || !isSessionSynchronized || isVotePending}
                    whileHover={{ scale: 1.05, rotate: -2 }} whileTap={{ scale: 0.95 }}
                    className={isInkBeta ? 'ik-vote menu-focus flex-1' : 'flex-1 py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50'}
                    style={isInkBeta ? undefined : { background: "linear-gradient(180deg, #34d399, #059669)", border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
                    <ThumbsUp className="w-6 h-6 text-white" />
                    <span className="text-xl font-black text-white" style={{ fontFamily: "'Outfit', sans-serif", textShadow: 'none' }}>Top !</span>
                  </motion.button>
                </div>
              )}

              {(hasVotedCurrent || isOwnVideo) && !currentPlayer.isHost && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl"
                  style={{ background: "rgba(52,211,153,0.12)", border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-sm font-black text-emerald-300" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    {isOwnVideo ? "Votre imitation" : "Vote enregistré"} — En attente de l'hôte
                  </span>
                </div>
              )}

              {currentPlayer.isHost && (
                <motion.button onClick={handleNext}
                  disabled={!votingSessionId || !isSessionSynchronized || isSessionActionPending}
                  whileHover={!isSessionActionPending ? { scale: 1.05, rotate: -1 } : undefined}
                  whileTap={!isSessionActionPending ? { scale: 0.97 } : undefined}
                  className={isInkBeta ? 'ik-primary-action menu-focus' : 'flex items-center gap-2 px-6 py-3 rounded-2xl disabled:opacity-50'}
                  style={isInkBeta ? undefined : { background: "linear-gradient(180deg, #fbbf24, #d97706)", border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
                  {isSessionActionPending && <Loader2 className="w-5 h-5 text-white animate-spin" />}
                  <span className="text-xl font-black text-white" style={{ fontFamily: "'Outfit', sans-serif", textShadow: 'none' }}>
                    {isSessionActionPending ? 'Passage…' : 'Suivant'}
                  </span>
                  {!isSessionActionPending && <ChevronRight className="w-5 h-5 text-white" />}
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Progress dots */}
        <div className="flex gap-2 justify-center">
          {Array.from({ length: displayLength }).map((_, i) => (
            <motion.div key={i} animate={{ scale: i === currentIndex ? 1.3 : 1 }}
              className="h-2.5 rounded-full transition-all duration-300"
              style={{
                width: i === currentIndex ? 32 : 20,
                background: i < currentIndex ? "#34d399" : i === currentIndex ? "#f87171" : "rgba(255,255,255,0.15)",
                border: '1px solid var(--ink-line)',
                boxShadow: i === currentIndex ? "0 0 8px rgba(248,113,113,0.6)" : "none",
              }} />
          ))}
        </div>
      </div>
    </div>
  );
};
