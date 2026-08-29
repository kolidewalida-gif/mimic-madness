import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VideoPreview } from "@/components/VideoPreview";
import { AudioRecorder, type AudioRecorderState } from "@/components/AudioRecorder";
import { DeviceSettings } from "@/components/DeviceSettings";
import { VideoWithAudioOverlay } from "@/components/VideoWithAudioOverlay";
import { VolumeSlider } from "@/components/VolumeSlider";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import {
  TeammateStatusPanel,
  useBroadcastRecordingStatus,
} from "@/components/TeammateStatusPanel";
import {
  Check, Users, Settings, Mic, Volume2, VolumeX,
  Swords, Loader2, RotateCcw, Sparkles, Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { videoStorage, type VideoClip } from "@/lib/videoStorageSupabase";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { playInkSound } from "@/hooks/useInkSoundEffects";
import { useQuestTracker } from "@/hooks/useQuestTracker";
import { cn } from "@/lib/utils";
import { RhythmoBand } from "@/components/rhythmo/RhythmoBand";
import { loadRhythmoTrack } from "@/lib/rhythmo/store";
import type { RhythmoTrack } from "@/lib/rhythmo/types";
import { sanitizeRhythmoLeadSeconds } from "@/lib/rhythmo/timeline";
import { canCommitSyncToken, equalJitterBackoff } from "@/lib/syncState";
import { skipMissingImitations, submitPlayerImitation } from "@/lib/imitationSyncClient";
import {
  canLeaveImitationPhase,
  deliveredPlayerIds,
  hasDeliveredImitation,
} from "@/lib/imitationReadiness";
import { resolveResumePosition } from "@/lib/challengePlayback";
import { diagnose } from "@/lib/diagnostics";

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface Challenge {
  id: string;
  playerId: string;
  playerName: string;
}

interface ImitationPhaseProps {
  lobbyId: string;
  roundNumber: number;
  currentPlayer: Player;
  players: Player[];
  currentChallenge: Challenge;
  gameMode?: 'normal' | '2v2' | 'quiz';
  getTeammate?: (playerId: string) => { id: string; name: string } | null;
  onAllReady: () => void;
  variant?: 'default' | 'inkBeta';
}

const ACCENT = '#f87171';
const SHADOW = "2px 2px 0 var(--ink-line), -1.5px -1.5px 0 var(--ink-line), 1.5px -1.5px 0 var(--ink-line), -1.5px 1.5px 0 var(--ink-line)";
const SHADOW_SM = "1.5px 1.5px 0 var(--ink-line), -1px -1px 0 var(--ink-line), 1px -1px 0 var(--ink-line), -1px 1px 0 var(--ink-line)";
const FONT = "'Outfit', sans-serif";
const RHYTHMO_LEAD_STORAGE_KEY = 'mimic.rhythmo.lead-seconds';
const MAX_RHYTHMO_LEAD_SECONDS = 2;

const clampRhythmoLeadSeconds = (value: number) =>
  Math.min(MAX_RHYTHMO_LEAD_SECONDS, sanitizeRhythmoLeadSeconds(value));

const readRhythmoLeadSeconds = () => {
  if (typeof window === 'undefined') return 0;
  try {
    return clampRhythmoLeadSeconds(Number(window.localStorage.getItem(RHYTHMO_LEAD_STORAGE_KEY)));
  } catch {
    return 0;
  }
};

const saveRhythmoLeadSeconds = (value: number) => {
  try {
    window.localStorage.setItem(RHYTHMO_LEAD_STORAGE_KEY, value.toString());
  } catch {
    // Storage can be unavailable in private browsing; the in-memory setting
    // remains usable for the current imitation.
  }
};

export const ImitationPhase = ({
  lobbyId,
  roundNumber,
  currentPlayer,
  players,
  currentChallenge,
  gameMode = 'normal',
  getTeammate,
  onAllReady,
  variant = 'default',
}: ImitationPhaseProps) => {
  const isInkBeta = variant === 'inkBeta';
  const [hasRecorded, setHasRecorded] = useState(false);
  const [readyPlayers, setReadyPlayers] = useState<string[]>([]);
  const [isReadySynchronized, setIsReadySynchronized] = useState(false);
  const [readyRetryKey, setReadyRetryKey] = useState(0);
  const submitPendingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const forceAdvancePendingRef = useRef(false);
  const [isForceAdvancing, setIsForceAdvancing] = useState(false);
  // Derive hasSubmitted from DB state — survives page reloads
  const hasSubmitted = readyPlayers.includes(currentPlayer.id);
  const [recordedClipId, setRecordedClipId] = useState<string | null>(null);
  const [uploadKey, setUploadKey] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const settingsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const settingsDialogRef = useRef<HTMLDivElement | null>(null);
  const [challengeClipData, setChallengeClipData] = useState<VideoClip | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recorderState, setRecorderState] = useState<AudioRecorderState>('idle');
  const [includeOriginalAudio, setIncludeOriginalAudio] = useState(false);
  const [originalAudioVolume, setOriginalAudioVolume] = useState(50);
  const { toast } = useToast();
  const { setSituation, clearSituationOverride, autoMode } = useBackgroundMusic();
  const questTracker = useQuestTracker();
  const challengeVideoRef = useRef<HTMLVideoElement>(null);
  /** Position de la vidéo à imiter au moment où le joueur a suspendu. */
  const pausedVideoTimeRef = useRef<number | null>(null);
  /** Le passage à imiter était déjà terminé quand le joueur a suspendu. */
  const pausedClipFinishedRef = useRef(false);
  // Rythmo band for the challenge clip. Null when the clip has none, which is
  // normal: it is generated at import time and older clips predate it.
  const [rhythmoTrack, setRhythmoTrack] = useState<RhythmoTrack | null>(null);
  // Players can hide the band — an imperfect transcription is more of a
  // distraction than a help, and only they can judge that.
  const [showRhythmo, setShowRhythmo] = useState(true);
  // Per-device timing preference. Zero preserves exact media-time alignment;
  // positive values bring words to the playhead slightly earlier.
  const [rhythmoLeadSeconds, setRhythmoLeadSeconds] = useState(readRhythmoLeadSeconds);

  const closeSettings = useCallback(() => {
    setShowSettings(false);
    window.requestAnimationFrame(() => settingsTriggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!showSettings) return;

    const dialog = settingsDialogRef.current;
    const getFocusableElements = () => Array.from(dialog?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], audio[controls], [tabindex]:not([tabindex="-1"])',
    ) ?? []).filter((element) => element.getClientRects().length > 0);
    (getFocusableElements()[0] ?? dialog)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSettings();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog?.focus();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;
      if (event.shiftKey && (activeElement === first || !dialog?.contains(activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (activeElement === last || !dialog?.contains(activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeSettings, showSettings]);

  const teammate = gameMode === '2v2' && getTeammate ? getTeammate(currentPlayer.id) : null;
  const { broadcastStatus } = useBroadcastRecordingStatus(
    lobbyId,
    roundNumber,
    currentPlayer.id,
    teammate?.id || null,
  );

  useEffect(() => {
    let isMounted = true;
    const loadChallengeData = async () => {
      try {
        const clip = await videoStorage.getVideoClip(currentChallenge.id);
        if (clip && isMounted) setChallengeClipData(clip);
      } catch (error) {
        console.error('Error loading challenge clip:', error);
      }
    };
    loadChallengeData();

    // Loaded separately: a missing band must never delay or break the clip.
    setRhythmoTrack(null);
    setShowRhythmo(true);
    loadRhythmoTrack(currentChallenge.id)
      .then((track) => {
        if (isMounted) setRhythmoTrack(track);
      })
      .catch(() => {
        /* no band for this clip */
      });

    return () => {
      isMounted = false;
    };
  }, [currentChallenge.id]);

  useEffect(() => {
    // Switch to the "round" situation track during the imitation phase.
    // When auto-mode is OFF the user is in charge — we don't fight their
    // choice. The previous behaviour was to brute-force `pause()` which
    // killed any music the user had selected manually.
    if (autoMode) {
      setSituation(gameMode === '2v2' ? "team-showdown" : "round", { priority: 2, source: "imitation-phase" });
    }
    return () => {
      if (autoMode) clearSituationOverride("imitation-phase");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMode]);

  useEffect(() => {
    let active = true;
    let subscribed = false;
    let epoch = 0;
    let latestRequest = 0;
    let retryAttempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const clearRetry = () => {
      if (!retryTimer) return;
      clearTimeout(retryTimer);
      retryTimer = null;
    };

    const fetchReadyPlayers = async () => {
      /*
       * Comme pour la phase de vote : la lecture SQL ne dépend pas du canal
       * temps réel. L'exiger empêchait de connaître l'état des joueurs quand le
       * WebSocket ne passait pas, et la manche ne pouvait plus avancer du tout.
       */
      if (!active) return;
      const requestId = ++latestRequest;
      const requestEpoch = epoch;
      const token = { generation: requestEpoch, requestId };
      try {
        // `select('*')` plutôt que de nommer les colonnes : si la migration
        // n'est pas déployée, nommer une colonne absente fait échouer toute la
        // requête et la manche se bloque au lieu de se dégrader.
        const { data, error } = await supabase
          .from('player_imitations')
          .select('*')
          .eq('lobby_id', lobbyId)
          .eq('round_number', roundNumber);
        if (error) throw error;
        if (
          !active ||
          requestEpoch !== epoch ||
          !canCommitSyncToken(token, epoch, latestRequest)
        ) return;

        const delivered = deliveredPlayerIds(data ?? []);
        diagnose.info('imitation', 'État des joueurs relu', {
          lignes: data?.length ?? 0,
          rendus: delivered.length,
          joueursConnectes: players.length,
          detail: (data ?? []).map((row) => ({
            joueur: row.player_id,
            pret: row.is_ready,
            clip: Boolean((row as { clip_id?: string | null }).clip_id),
            ignore: (row as { skipped?: boolean }).skipped,
          })),
        });
        setReadyPlayers(delivered);
        setIsReadySynchronized(true);
        retryAttempt = 0;
        clearRetry();
      } catch (error) {
        if (!active || requestId !== latestRequest || requestEpoch !== epoch) return;
        console.error('Error synchronizing imitation readiness:', error);
        setIsReadySynchronized(false);
        if (!retryTimer) {
          retryTimer = setTimeout(() => {
            retryTimer = null;
            retryAttempt = Math.min(retryAttempt + 1, 8);
            void fetchReadyPlayers();
          }, equalJitterBackoff(retryAttempt, 1_000, 10_000));
        }
      }
    };

    const channel = supabase
      .channel(`imitations:${lobbyId}:${roundNumber}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_imitations',
          filter: `lobby_id=eq.${lobbyId}`,
        },
        () => { void fetchReadyPlayers(); },
      )
      .subscribe((status) => {
        if (!active) return;
        diagnose.info('imitation', `Canal état joueurs : ${status}`, { lobbyId, roundNumber });
        if (status === 'SUBSCRIBED') {
          subscribed = true;
          epoch += 1;
          void fetchReadyPlayers();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          subscribed = false;
          epoch += 1;
          latestRequest += 1;
          setIsReadySynchronized(false);
          if (!retryTimer) {
            retryTimer = setTimeout(() => {
              retryTimer = null;
              setReadyRetryKey((value) => value + 1);
            }, equalJitterBackoff(retryAttempt, 1_000, 10_000));
          }
        }
      });

    // Lecture immédiate, puis relecture périodique tant que le canal est absent.
    void fetchReadyPlayers();
    const fallbackTimer = setInterval(() => {
      if (!active || subscribed) return;
      void fetchReadyPlayers();
    }, 4_000);

    const resync = () => {
      if (document.visibilityState === 'visible') void fetchReadyPlayers();
    };
    window.addEventListener('online', resync);
    document.addEventListener('visibilitychange', resync);

    return () => {
      active = false;
      subscribed = false;
      epoch += 1;
      latestRequest += 1;
      clearRetry();
      clearInterval(fallbackTimer);
      window.removeEventListener('online', resync);
      document.removeEventListener('visibilitychange', resync);
      void supabase.removeChannel(channel);
    };
  }, [lobbyId, readyRetryKey, roundNumber]);

  // La lecture SQL ci-dessus certifie déjà chaque rendu (clip livré ou saut
  // explicite). Dès que tous les joueurs connectés y figurent, l'hôte peut
  // avancer sans ajouter deux secondes d'attente artificielle.
  const allReadyNotifiedRoundRef = useRef<number | null>(null);

  useEffect(() => {
    allReadyNotifiedRoundRef.current = null;
  }, [roundNumber]);

  useEffect(() => {
    const allPlayersReady =
      isReadySynchronized &&
      currentPlayer.isHost &&
      canLeaveImitationPhase(
        players,
        readyPlayers.map((id) => ({ player_id: id, is_ready: true, skipped: true })),
      );

    if (!allPlayersReady || allReadyNotifiedRoundRef.current === roundNumber) return;
    allReadyNotifiedRoundRef.current = roundNumber;
    onAllReady();
  }, [
    currentPlayer.isHost,
    isReadySynchronized,
    onAllReady,
    players,
    readyPlayers,
    roundNumber,
  ]);

  const handleSubmit = async () => {
    if (hasSubmitted || submitPendingRef.current) return;
    if (!recordedClipId) {
      toast({
        title: 'Imitation manquante',
        description: "Enregistre ton imitation avant de la soumettre.",
        variant: 'destructive',
      });
      return;
    }

    submitPendingRef.current = true;
    setIsSubmitting(true);
    try {
      const accepted = await submitPlayerImitation({
        lobbyId,
        roundNumber,
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        clipId: recordedClipId,
        includeOriginalAudio,
        originalAudioVolume,
      });
      if (!accepted) {
        const existing = await supabase
          .from('player_imitations')
          .select('*')
          .eq('lobby_id', lobbyId)
          .eq('round_number', roundNumber)
          .eq('player_id', currentPlayer.id)
          .maybeSingle();
        if (existing.error) throw existing.error;
        /*
         * Ne se déclarer déjà soumis que si un clip est bien attaché. Cette
         * branche se contentait de `is_ready`, si bien qu'un refus dû à une
         * ligne prête sans clip marquait le joueur comme rendu — sans vidéo.
         * Le refus est maintenant une vraie erreur, remontée au joueur.
         */
        if (existing.data?.clip_id && hasDeliveredImitation(existing.data)) {
          setReadyPlayers((previous) =>
            previous.includes(currentPlayer.id) ? previous : [...previous, currentPlayer.id],
          );
          toast({ title: 'Déjà soumise', description: 'Ton imitation était déjà enregistrée.' });
          return;
        }
        throw new Error("La manche a changé ou cette imitation est déjà soumise.");
      }

      // The RPC result is durable; Realtime will subsequently reconcile all clients.
      setReadyPlayers((previous) =>
        previous.includes(currentPlayer.id) ? previous : [...previous, currentPlayer.id],
      );
      playInkSound('cartoonDing', 0.5);
      void questTracker.track('submit_imitation');
      void questTracker.track('play_imitation');
      toast({
        title: 'Imitation soumise !',
        description: 'En attente des autres joueurs...',
      });
    } catch (error) {
      console.error('Error submitting:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de soumettre',
        variant: 'destructive',
      });
    } finally {
      submitPendingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleVideoSaved = (clip: VideoClip) => {
    setHasRecorded(true);
    setRecordedClipId(clip.id);
    setIsRecording(false);
    playInkSound('cartoonPop', 0.4);
    // round_number was persisted in the same insert as the uploaded clip.
    if (challengeVideoRef.current) {
      challengeVideoRef.current.pause();
      const startTime = challengeClipData?.startTime ?? 0;
      try {
        challengeVideoRef.current.currentTime = startTime;
      } catch { /* noop: video ready state may throw */ }
    }
    toast({
      title: 'Imitation enregistrée !',
      description: 'Vous pouvez maintenant la soumettre ou recommencer.',
    });
  };

  const handleRetry = async () => {
    if (recordedClipId) {
      try {
        await videoStorage.deleteVideoClip(recordedClipId);
      } catch (error) {
        console.error('Error deleting clip:', error);
      }
    }

    if (challengeVideoRef.current) {
      challengeVideoRef.current.pause();
      const startTime = challengeClipData?.startTime ?? 0;
      try {
        challengeVideoRef.current.currentTime = startTime;
      } catch { /* noop: video ready state may throw */ }
    }

    setHasRecorded(false);
    setRecordedClipId(null);
    setUploadKey((prev) => prev + 1);
  };

  const handleRecordingStart = () => {
    setIsRecording(true);
    broadcastStatus(true, 0.5);
    if (challengeVideoRef.current) {
      const startTime = challengeClipData?.startTime ?? 0;
      challengeVideoRef.current.currentTime = startTime;
      challengeVideoRef.current.play().catch(() => {});
    }
  };

  const handleRecordingStop = () => {
    setIsRecording(false);
    broadcastStatus(false, 0);
    if (challengeVideoRef.current) {
      challengeVideoRef.current.pause();
      const startTime = challengeClipData?.startTime ?? 0;
      try {
        challengeVideoRef.current.currentTime = startTime;
      } catch { /* noop: video ready state may throw */ }
    }
  };

  /*
   * Pause d'un segment : la vidéo à imiter se fige où elle en est.
   *
   * Volontairement différent de `handleRecordingStop`, qui la rembobine au
   * début. Rembobiner à chaque changement de voix ferait perdre le fil de ce
   * qu'on est en train d'imiter.
   */
  const handleRecordingPause = () => {
    setIsRecording(false);
    broadcastStatus(false, 0);
    const video = challengeVideoRef.current;
    if (!video) return;
    /*
     * Relever la position AVANT de mettre en pause, et s'en servir à la reprise.
     *
     * `VideoPreview` remet la lecture au début dès que le clip atteint sa fin.
     * Se contenter d'un `play()` à la reprise repartait donc du début à chaque
     * fois que le clip s'était terminé pendant le segment précédent.
     */
    /*
     * Si la vidéo est DÉJÀ arrêtée, ce n'est pas le joueur : c'est
     * `VideoPreview` qui l'a mise en pause et rembobinée en atteignant la fin du
     * passage à imiter. Sa position vaut alors le début du clip, et la relancer
     * rejouerait tout depuis le départ.
     */
    pausedClipFinishedRef.current = video.paused;
    pausedVideoTimeRef.current = video.paused ? null : video.currentTime;
    video.pause();
  };

  const handleRecordingResume = () => {
    setIsRecording(true);
    broadcastStatus(true, 0.5);
    const video = challengeVideoRef.current;
    if (!video) return;

    const captured = pausedVideoTimeRef.current;
    const clipFinished = pausedClipFinishedRef.current;
    pausedVideoTimeRef.current = null;
    pausedClipFinishedRef.current = false;
    const decision = resolveResumePosition(
      captured,
      Number.isFinite(video.duration) ? video.duration : 0,
      clipFinished,
    );

    if (decision.seekTo !== null) {
      try {
        video.currentTime = decision.seekTo;
      } catch { /* noop: video ready state may throw */ }
    }
    if (decision.shouldPlay) video.play().catch(() => {});
  };

  // Host-only escape hatch: when a player is stuck (mic permission, browser
  // bug, network issue), the host can force-skip not-ready players and move
  // the round forward. This avoids dead rounds when one user can't record.
  const handleForceAdvance = async () => {
    if (!currentPlayer.isHost || forceAdvancePendingRef.current) return;
    const notReady = players.filter((player) => !readyPlayers.includes(player.id));
    if (notReady.length === 0) return;

    forceAdvancePendingRef.current = true;
    setIsForceAdvancing(true);
    try {
      // Le saut est enregistré explicitement (`skipped`), et non plus déduit
      // d'une ligne prête sans clip — indistinguable d'une soumission ratée.
      const skipped = await skipMissingImitations(
        lobbyId,
        roundNumber,
        notReady.map((player) => ({ id: player.id, name: player.name })),
      );
      if (skipped > 0) {
        // La mutation est déjà durable : cette vue locale évite d'attendre le
        // prochain paquet Realtime avant de passer au vote.
        setReadyPlayers((previous) => Array.from(new Set([
          ...previous,
          ...notReady.map((player) => player.id),
        ])));
      }
      toast({
        title: skipped > 0 ? 'Manche débloquée' : 'Manche déjà synchronisée',
        description: skipped > 0
          ? `${skipped} joueur${skipped > 1 ? 's' : ''} ignoré${skipped > 1 ? 's' : ''}.`
          : 'Aucun joueur ne restait à ignorer.',
      });
    } catch (error) {
      console.error('Error force-advancing:', error);
      toast({ title: 'Erreur', description: 'Impossible de débloquer la manche.', variant: 'destructive' });
    } finally {
      forceAdvancePendingRef.current = false;
      setIsForceAdvancing(false);
    }
  };

  const teammateReady = teammate ? readyPlayers.includes(teammate.id) : false;
  const hasReachedReview = hasRecorded || recorderState === 'preview';

  return (
    <div
      className={isInkBeta ? 'contents' : 'h-[100dvh] text-white relative overflow-hidden flex flex-col'}
      style={isInkBeta ? undefined : { background: "linear-gradient(180deg, #0f0820, #0a0510, #160a26)" }}
    >
      {/* Animated background — la beta a déjà ses couches de scène. */}
      {!isInkBeta && (
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div animate={{ x: [0, -20, 0], y: [0, 20, 0] }} transition={{ duration: 10, repeat: Infinity }}
          className="absolute top-[-5%] right-[10%] w-[400px] h-[400px] rounded-full opacity-20"
          style={{ background: `radial-gradient(circle, ${ACCENT}55, transparent 70%)`, filter: "blur(80px)" }} />
        <Sparkles className="absolute top-[15%] left-[5%] w-5 h-5 text-amber-400/30" />
        <Zap className="absolute bottom-[30%] right-[4%] w-4 h-4 text-pink-400/25" />
      </div>
      )}
      <div className={isInkBeta ? 'contents' : 'relative z-10 flex-1 overflow-y-auto custom-scrollbar px-4 pt-4 pb-[100px]'}>
        {/* Header */}
        <div className={isInkBeta ? 'hidden' : 'max-w-[1600px] mx-auto flex items-center justify-between gap-4 mb-4'}>
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-full flex items-center gap-2"
              style={{ background: `linear-gradient(180deg, ${ACCENT}, ${ACCENT}cc)`, border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
              <Mic className={cn("w-4 h-4 text-white", isRecording && "animate-pulse")} strokeWidth={2.5} />
              <span className="text-sm font-black uppercase tracking-wider text-white" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>
                🎤 Imitation {gameMode === '2v2' && '· 2v2'} · Manche {roundNumber}
              </span>
            </div>
            <div>
              <h2 className="font-black text-white" style={{ fontFamily: FONT, textShadow: SHADOW, fontSize: "clamp(1.5rem, 2.4vw, 2rem)" }}>
                Imite <span style={{ color: ACCENT }}>{currentChallenge.playerName}</span>
                {gameMode === '2v2' && teammate && (
                  <span className="text-base text-white/60 font-bold ml-2">
                    <Swords className="w-3 h-3 inline mx-1 -mt-0.5" />
                    avec <span style={{ color: ACCENT }}>{teammate.name}</span>
                  </span>
                )}
              </h2>
            </div>
          </motion.div>

          <motion.button
            type="button"
            onClick={(event) => {
              settingsTriggerRef.current = event.currentTarget;
              setShowSettings(true);
            }}
            aria-haspopup="dialog"
            aria-expanded={showSettings}
            aria-controls="imitation-audio-settings"
            whileHover={{ scale: 1.05, rotate: 90 }} whileTap={{ scale: 0.95 }}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: showSettings ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)` : "rgba(255,255,255,0.08)", border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
            <Settings className="w-4 h-4 text-white" strokeWidth={2.5} />
          </motion.button>
        </div>

        {/* MAIN 2-COLUMN LAYOUT — video LEFT (big), imitation panel RIGHT */}
        <motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4 }}
          className={isInkBeta ? 'contents' : 'max-w-[1600px] mx-auto grid lg:grid-cols-[1.55fr_1fr] gap-4 items-start pt-4'}>
          {isInkBeta && (
            <ol className="ik-imitation-steps" aria-label="Progression de ton imitation">
              <li className="is-complete">
                <span aria-hidden="true">01</span>
                <strong>Observer</strong>
              </li>
              <li className={hasReachedReview ? 'is-complete' : 'is-current'} aria-current={!hasReachedReview ? 'step' : undefined}>
                <span aria-hidden="true">02</span>
                <strong>Enregistrer</strong>
              </li>
              <li className={hasSubmitted ? 'is-complete' : hasReachedReview ? 'is-current' : undefined} aria-current={hasReachedReview && !hasSubmitted ? 'step' : undefined}>
                <span aria-hidden="true">03</span>
                <strong>Écouter</strong>
              </li>
              <li className={hasSubmitted ? 'is-complete is-current' : undefined} aria-current={hasSubmitted ? 'step' : undefined}>
                <span aria-hidden="true">04</span>
                <strong>Soumettre</strong>
              </li>
            </ol>
          )}

          {/* LEFT — Video to imitate (big) */}
          <div className={isInkBeta ? 'ik-gpanel is-featured ik-imitation-reference' : 'relative rounded-3xl'}
            style={isInkBeta ? undefined : { background: "linear-gradient(180deg, #1a0d2e, #0f0820)", border: '1px solid var(--ink-line)', boxShadow: `0 0 0 rgba(0,0,0,0), 0 0 30px ${ACCENT}22` }}>
            {isInkBeta && (
              <div className="ik-gpanel-head">
                <div>
                  <span>Référence · Manche {roundNumber}</span>
                  <h2>Imite {currentChallenge.playerName}</h2>
                </div>
                <div className="ik-gpanel-aside">
                  <button
                    type="button"
                    onClick={(event) => {
                      settingsTriggerRef.current = event.currentTarget;
                      setShowSettings(true);
                    }}
                    className="ik-tool menu-focus"
                    aria-label="Ouvrir les réglages audio"
                    aria-haspopup="dialog"
                    aria-expanded={showSettings}
                    aria-controls="imitation-audio-settings"
                  >
                    <Settings aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
            {!isInkBeta && <div className="absolute inset-1.5 rounded-[1.2rem] pointer-events-none" style={{ border: `2px solid ${ACCENT}33` }} />}
            <div className={isInkBeta ? 'hidden' : 'absolute -top-3 left-6 z-20'}>
              <motion.div initial={{ scale: 0, rotate: -8 }} animate={{ scale: 1, rotate: -4 }}
                transition={{ type: "spring", stiffness: 200, damping: 14 }}
                className="px-3 py-1 rounded-full flex items-center gap-1.5"
                style={{ background: `linear-gradient(180deg, ${ACCENT}, ${ACCENT}cc)`, border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>🎬 Vidéo à imiter</span>
              </motion.div>
            </div>
            <AnimatePresence>
              {isRecording && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, rotate: isInkBeta ? 0 : 6, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className={isInkBeta ? 'ik-grec' : 'absolute -top-3 right-6 z-20 px-3 py-1 rounded-full flex items-center gap-1.5'}
                  style={isInkBeta ? undefined : { background: "linear-gradient(180deg, #ef4444, #b91c1c)", border: '1px solid var(--ink-line)', boxShadow: 'none' }}
                  role="status"
                  aria-live="polite"
                >
                  {isInkBeta ? (
                    <>
                      <span aria-hidden="true" />
                      <strong>REC</strong>
                    </>
                  ) : (
                    <>
                      <span className="relative flex h-2 w-2" aria-hidden="true">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75 animate-ping" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-400" />
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white" style={{ fontFamily: FONT }}>REC</span>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            <div className={isInkBeta ? 'ik-gpanel-body ik-imitation-reference-body' : 'relative p-4 pt-6'}>
              <div className={cn(isInkBeta ? 'ik-gvideo' : 'rounded-2xl overflow-hidden', isInkBeta && isRecording && 'is-recording')}
                style={isInkBeta ? undefined : { border: '1px solid var(--ink-line)', boxShadow: `0 0 0 rgba(0,0,0,0)${isRecording ? ", 0 0 0 3px #ef4444" : ""}` }}>
                <VideoPreview clipId={currentChallenge.id} className="w-full aspect-video" videoRef={challengeVideoRef} />
              </div>

              {/* Bande rythmo — words scroll past the playhead and must be
                  spoken as they cross it. Only rendered when the clip has a
                  transcription. */}
              {rhythmoTrack && (
                <div className="mt-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5 px-0.5">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em]"
                      style={{ fontFamily: FONT, color: 'var(--c-violet)' }}>
                      Bande rythmo
                    </span>
                    <div className="flex items-center gap-2">
                      {showRhythmo && (
                        <label className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-white/50"
                          style={{ fontFamily: FONT }}>
                          <span>Avance {rhythmoLeadSeconds.toFixed(1)} s</span>
                          <input
                            type="range"
                            aria-label="Avance de la bande rythmo"
                            min="0"
                            max={MAX_RHYTHMO_LEAD_SECONDS}
                            step="0.1"
                            value={rhythmoLeadSeconds}
                            onChange={(event) => {
                              const nextLead = clampRhythmoLeadSeconds(Number(event.target.value));
                              setRhythmoLeadSeconds(nextLead);
                              saveRhythmoLeadSeconds(nextLead);
                            }}
                            className="h-1 w-20 cursor-pointer"
                            style={{ accentColor: 'var(--c-violet)' }}
                          />
                        </label>
                      )}
                      <button type="button"
                        onClick={() => { playInkSound('cartoonPop', 0.35); setShowRhythmo((v) => !v); }}
                        className="text-[9px] font-black uppercase tracking-[0.16em] px-2 py-0.5 rounded-full transition-colors"
                        style={{
                          fontFamily: FONT,
                          color: showRhythmo ? 'rgba(255,255,255,0.5)' : 'var(--c-violet)',
                          border: '1px solid var(--ink-line)',
                        }}>
                        {showRhythmo ? 'Masquer' : 'Afficher'}
                      </button>
                    </div>
                  </div>

                  {showRhythmo && (
                    <RhythmoBand
                      track={rhythmoTrack}
                      videoRef={challengeVideoRef}
                      leadSeconds={rhythmoLeadSeconds}
                      accent="var(--c-violet)"
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — Imitation panel */}
          <div className={isInkBeta ? 'ik-gpanel ik-imitation-console' : 'relative rounded-3xl'}
            style={isInkBeta ? undefined : { background: "linear-gradient(180deg, #1a0d2e, #0f0820)", border: '1px solid var(--ink-line)', boxShadow: `0 0 0 rgba(0,0,0,0), 0 0 30px ${ACCENT}22` }}>
            {isInkBeta && (
              <div className="ik-gpanel-head">
                <div>
                  <span>Ton tour</span>
                  <h2>Ton imitation</h2>
                </div>
                <div className="ik-gpanel-aside">
                  <p className="ik-lobby-count">
                    <strong>{String(readyPlayers.length).padStart(2, '0')}</strong>
                    <span>/ {String(players.length).padStart(2, '0')}</span>
                  </p>
                </div>
              </div>
            )}
            {!isInkBeta && <div className="absolute inset-1.5 rounded-[1.2rem] pointer-events-none" style={{ border: `2px solid ${ACCENT}33` }} />}
            <div className={isInkBeta ? 'hidden' : 'absolute -top-3 left-6 z-20'}>
              <motion.div initial={{ scale: 0, rotate: 8 }} animate={{ scale: 1, rotate: 4 }}
                transition={{ type: "spring", stiffness: 200, damping: 14 }}
                className="px-3 py-1 rounded-full flex items-center gap-1.5"
                style={{ background: "linear-gradient(180deg, #fbbf24, #d97706)", border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
                <Mic className="w-3 h-3 text-white" strokeWidth={2.5} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>Imitation</span>
              </motion.div>
            </div>
            <div className={isInkBeta ? 'ik-gpanel-body ik-imitation-console-body' : 'relative p-4 pt-6 space-y-3'}>
              {!hasRecorded ? (
                <AudioRecorder key={uploadKey} playerId={currentPlayer.id} playerName={currentPlayer.name}
                  onAudioSaved={handleVideoSaved} lobbyId={lobbyId} roundNumber={roundNumber}
                  onRecordingStart={handleRecordingStart} onRecordingStop={handleRecordingStop}
                  onRecordingPause={handleRecordingPause} onRecordingResume={handleRecordingResume}
                  onStateChange={setRecorderState}
                  showVoiceFilters variant={variant} />
              ) : (
                <>
                  <div className={cn("rounded-2xl p-3 space-y-2", isInkBeta && "ik-imitation-review")}
                    style={isInkBeta ? undefined : { background: "rgba(52,211,153,0.08)", border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-base font-black" style={{ fontFamily: FONT, color: "#34d399", textShadow: SHADOW_SM }}>Imitation enregistrée !</h3>
                      </div>
                      <motion.button type="button" onClick={handleRetry} disabled={hasSubmitted}
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-xl disabled:opacity-40"
                        style={{ background: "rgba(255,255,255,0.06)", border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
                        <RotateCcw className="w-3 h-3 text-white/70" />
                        <span className="text-xs font-black text-white/70" style={{ fontFamily: FONT }}>Rejouer</span>
                      </motion.button>
                    </div>
                    {recordedClipId && (
                      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--ink-line)' }}>
                        <VideoWithAudioOverlay videoClipId={currentChallenge.id} audioClipId={recordedClipId}
                          includeOriginalAudio={includeOriginalAudio} originalAudioVolume={originalAudioVolume} />
                      </div>
                    )}
                  </div>
                  <div className={cn("rounded-2xl p-3 space-y-2", isInkBeta && "ik-imitation-mix")}
                    style={isInkBeta ? undefined : { background: "rgba(255,255,255,0.03)", border: '1px solid var(--ink-line)', boxShadow: 'none' }}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {includeOriginalAudio ? <Volume2 className="w-4 h-4" style={{ color: ACCENT }} /> : <VolumeX className="w-4 h-4 text-white/40" />}
                        <div>
                          <Label htmlFor="include-audio" className="text-base font-black text-white cursor-pointer" style={{ fontFamily: FONT }}>Audio original</Label>
                          <p className="text-[10px] text-white/40">{includeOriginalAudio ? "Joué avec ton imitation" : "Seule ton imitation"}</p>
                        </div>
                      </div>
                      <Switch id="include-audio" checked={includeOriginalAudio} onCheckedChange={setIncludeOriginalAudio} disabled={hasSubmitted} />
                    </div>
                    {includeOriginalAudio && <VolumeSlider value={originalAudioVolume} onChange={setOriginalAudioVolume} disabled={hasSubmitted} label="Volume" />}
                  </div>
                  <motion.button type="button" onClick={handleSubmit} disabled={hasSubmitted || isSubmitting}
                    whileHover={!hasSubmitted && !isSubmitting ? { scale: 1.03, rotate: -1 } : undefined}
                    whileTap={!hasSubmitted && !isSubmitting ? { scale: 0.97 } : undefined}
                    className={isInkBeta
                      ? 'ik-primary-action menu-focus'
                      : 'w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-70'}
                    style={isInkBeta ? undefined : {
                      background: hasSubmitted ? "linear-gradient(180deg, #34d399, #059669)" : `linear-gradient(180deg, ${ACCENT}, ${ACCENT}cc)`,
                      border: '1px solid var(--ink-line)', boxShadow: 'none',
                    }}>
                    <Check className="w-5 h-5 text-white" strokeWidth={3} />
                    <span className="text-xl font-black text-white" style={{ fontFamily: FONT, textShadow: SHADOW }}>
                      {hasSubmitted ? "Soumis !" : isSubmitting ? "Envoi…" : "Soumettre"}
                    </span>
                  </motion.button>
                  {hasSubmitted && (
                    <div className="flex items-center justify-center gap-2 text-white/55">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span className="text-xs font-black" style={{ fontFamily: FONT }}>En attente des autres joueurs...</span>
                    </div>
                  )}
                </>
              )}

              {/* Suivi de la manche, à sa place dans le panneau. */}
              {isInkBeta && (
                <div className={cn(
                  'ik-game-actions',
                  currentPlayer.isHost && readyPlayers.length < players.length && 'has-secondary',
                )}>
                  <p className={cn('ik-game-note', hasSubmitted && 'ik-game-note--done')}>
                    <Users aria-hidden="true" />
                    Soumis {readyPlayers.length}/{players.length}
                  </p>
                  {currentPlayer.isHost && readyPlayers.length < players.length && (
                    <button
                      type="button"
                      onClick={handleForceAdvance}
                      disabled={isForceAdvancing}
                      className="ik-secondary-action menu-focus"
                      title="Ignorer les joueurs bloqués et passer au vote"
                    >
                      {isForceAdvancing ? 'Synchronisation…' : 'Passer au vote'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {gameMode === '2v2' && teammate && (
          <div className="max-w-[1600px] mx-auto mt-4">
            <TeammateStatusPanel currentPlayerId={currentPlayer.id} currentPlayerName={currentPlayer.name}
              teammate={teammate} lobbyId={lobbyId} roundNumber={roundNumber} isReady={hasSubmitted} teammateReady={teammateReady} />
          </div>
        )}
      </div>

      <AnimatePresence>
        {showSettings && (
          <motion.div
            className="ik-imitation-settings-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeSettings();
            }}
          >
            <motion.div
              id="imitation-audio-settings"
              ref={settingsDialogRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label="Réglages audio de l’imitation"
              className="ik-imitation-settings-dialog custom-scrollbar menu-dialog"
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.97 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              <DeviceSettings onClose={closeSettings} showPreview={false} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PLAYERS PROGRESS BAR — sticky bottom-left/right, but leaves a centered gap
          for the floating MusicPlayerBar (which is centered ~560px wide at bottom-4).
          Two pills (left/right) instead of one full-width bar avoids overlap. */}
      {/* Sous `lg`, la barre de musique occupe presque toute la largeur : les
          pilules passent au-dessus d'elle au lieu de se battre pour la place. */}
      {/* En beta, ces pilules fixes passaient sous les boutons flottants Chat et
          Admin : le compteur et le bouton de déblocage vivent désormais dans le
          panneau d'imitation, où rien ne les recouvre. */}
      {!isInkBeta && (
      <div className="fixed bottom-24 lg:bottom-3 left-3 right-3 z-30 pointer-events-none flex justify-between gap-3">
        {/*
          LEFT pill — count + avatars (scrollable)

          Deux corrections de largeur.

          1. `min-w-[200px]` contredisait le `max-w` : en CSS la largeur minimale
             l'emporte toujours, donc dès que la fenêtre descendait sous ~1000 px
             le calcul donnait moins que 200 px et la pilule débordait de sa zone
             en rognant son contenu. `min-w-0` la laisse réellement se réduire.

          2. La réserve centrale valait 300 px alors que la barre de musique fait
             680 px centrée, soit 340 px de demi-largeur : la pilule empiétait de
             40 px dessus dès qu'elle s'allongeait. 352 px rétablit la
             demi-largeur plus l'écart de 12 px.
        */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="pointer-events-auto rounded-2xl px-3 py-2 flex items-center gap-2 min-w-0 max-w-full lg:max-w-[calc(50%-352px)]"
          style={{
            background: "linear-gradient(180deg, rgba(26,13,46,0.95), rgba(15,8,32,0.95))",
            border: '1px solid var(--ink-line)',
            boxShadow: 'none',
            backdropFilter: "blur(8px)",
          }}
        >
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Users className="w-3.5 h-3.5 text-white/60" />
            <span className="text-sm font-black uppercase tracking-wider text-white whitespace-nowrap" style={{ fontFamily: FONT }}>
              Soumis
            </span>
            <span className="text-sm font-black whitespace-nowrap" style={{ fontFamily: FONT, color: "#34d399" }}>
              {readyPlayers.length}/{players.length}
            </span>
          </div>
          <div className="flex-1 flex items-center gap-1 overflow-x-auto custom-scrollbar min-w-0">
            {players.map((player, idx) => {
              const ready = readyPlayers.includes(player.id);
              const isMe = player.id === currentPlayer.id;
              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.04 }}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg flex-shrink-0"
                  style={{
                    background: ready ? "rgba(52,211,153,0.18)" : isMe ? `${ACCENT}22` : "rgba(255,255,255,0.04)",
                    border: ready ? "1.5px solid #34d399" : "1.5px solid var(--ink-line)",
                  }}
                  title={player.name}
                >
                  <PlayerAvatar playerId={player.id} playerName={player.name} size="sm" isHost={player.isHost} />
                  {ready ? (
                    <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <Loader2 className="w-3 h-3 text-white/30 animate-spin flex-shrink-0" />
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* RIGHT pill — host skip button (only when relevant) */}
        {currentPlayer.isHost && readyPlayers.length < players.length && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            type="button"
            onClick={handleForceAdvance}
            disabled={isForceAdvancing}
            whileHover={!isForceAdvancing ? { scale: 1.05, rotate: -1 } : undefined}
            whileTap={!isForceAdvancing ? { scale: 0.95 } : undefined}
            className="pointer-events-auto px-3 py-2 rounded-2xl flex items-center gap-1.5 flex-shrink-0 disabled:opacity-70"
            style={{
              background: "linear-gradient(180deg, #fbbf24, #d97706)",
              border: '1px solid var(--ink-line)',
              boxShadow: 'none',
              backdropFilter: "blur(8px)",
            }}
            title="Ignorer les joueurs bloqués et passer au vote"
          >
            {isForceAdvancing && <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />}
            <span
              className="text-xs font-black uppercase tracking-wider text-white whitespace-nowrap"
              style={{ fontFamily: FONT, textShadow: SHADOW_SM }}
            >
              {isForceAdvancing ? 'Synchronisation…' : '⏭ Passer au vote'}
            </span>
          </motion.button>
        )}
      </div>
      )}
    </div>
  );
};
