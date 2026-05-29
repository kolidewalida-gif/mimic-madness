import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VideoPreview } from "@/components/VideoPreview";
import { AudioRecorder } from "@/components/AudioRecorder";
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
import { videoStorage } from "@/lib/videoStorageSupabase";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { playInkSound } from "@/hooks/useInkSoundEffects";
import { useQuestTracker } from "@/hooks/useQuestTracker";
import { cn } from "@/lib/utils";

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
}

const ACCENT = '#f87171';
const SHADOW = "2px 2px 0 #0a0810, -1.5px -1.5px 0 #0a0810, 1.5px -1.5px 0 #0a0810, -1.5px 1.5px 0 #0a0810";
const SHADOW_SM = "1.5px 1.5px 0 #0a0810, -1px -1px 0 #0a0810, 1px -1px 0 #0a0810, -1px 1px 0 #0a0810";
const FONT = "'Caveat', cursive";

export const ImitationPhase = ({
  lobbyId,
  roundNumber,
  currentPlayer,
  players,
  currentChallenge,
  gameMode = 'normal',
  getTeammate,
  onAllReady,
}: ImitationPhaseProps) => {
  const [hasRecorded, setHasRecorded] = useState(false);
  const [readyPlayers, setReadyPlayers] = useState<string[]>([]);
  // Derive hasSubmitted from DB state — survives page reloads
  const hasSubmitted = readyPlayers.includes(currentPlayer.id);
  const [recordedClipId, setRecordedClipId] = useState<string | null>(null);
  const [uploadKey, setUploadKey] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [challengeClipData, setChallengeClipData] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [includeOriginalAudio, setIncludeOriginalAudio] = useState(false);
  const [originalAudioVolume, setOriginalAudioVolume] = useState(50);
  const { toast } = useToast();
  const { setSituation, clearSituationOverride, autoMode } = useBackgroundMusic();
  const questTracker = useQuestTracker();
  const challengeVideoRef = useRef<HTMLVideoElement>(null);

  const teammate = gameMode === '2v2' && getTeammate ? getTeammate(currentPlayer.id) : null;
  const { broadcastStatus } = useBroadcastRecordingStatus(
    lobbyId,
    roundNumber,
    currentPlayer.id,
    teammate?.id || null,
  );

  useEffect(() => {
    const loadChallengeData = async () => {
      try {
        const clip = await videoStorage.getVideoClip(currentChallenge.id);
        if (clip) setChallengeClipData(clip);
      } catch (error) {
        console.error('Error loading challenge clip:', error);
      }
    };
    loadChallengeData();
  }, [currentChallenge.id]);

  useEffect(() => {
    // Switch to the "round" situation track during the imitation phase.
    // When auto-mode is OFF the user is in charge — we don't fight their
    // choice. The previous behaviour was to brute-force `pause()` which
    // killed any music the user had selected manually.
    if (autoMode) {
      setSituation("round", { priority: 2, source: "imitation-phase" });
    }
    return () => {
      if (autoMode) clearSituationOverride("imitation-phase");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMode]);

  useEffect(() => {
    let isMounted = true;
    const fetchReadyPlayers = async () => {
      const { data } = await supabase
        .from('player_imitations')
        .select('player_id, is_ready')
        .eq('lobby_id', lobbyId)
        .eq('round_number', roundNumber);

      if (data && isMounted) {
        setReadyPlayers(data.filter((p) => p.is_ready).map((p) => p.player_id));
      }
    };

    fetchReadyPlayers();

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
        () => {
          if (isMounted) fetchReadyPlayers();
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [lobbyId, roundNumber]);

  // Guard: don't fire onAllReady in the first 2s after mount — gives time for
  // the host's reset (is_ready=false) to propagate before we check readiness.
  // Without this, at round 2+ the ImitationPhase can mount, fetch stale
  // is_ready=true from the preview phase, and immediately skip to voting.
  const mountedAtRef = useRef(Date.now());
  useEffect(() => { mountedAtRef.current = Date.now(); }, [roundNumber]);

  useEffect(() => {
    if (
      currentPlayer.isHost &&
      readyPlayers.length === players.length &&
      readyPlayers.length > 0 &&
      Date.now() - mountedAtRef.current > 2000
    ) {
      onAllReady();
    }
  }, [readyPlayers.length, players.length, onAllReady, currentPlayer.isHost]);

  const handleSubmit = async () => {
    if (hasSubmitted) return;
    try {
      playInkSound('cartoonDing', 0.5);
      // Optimistic update
      setReadyPlayers((prev) => prev.includes(currentPlayer.id) ? prev : [...prev, currentPlayer.id]);

      const { error } = await supabase
        .from('player_imitations')
        .upsert(
          {
            lobby_id: lobbyId,
            round_number: roundNumber,
            player_id: currentPlayer.id,
            player_name: currentPlayer.name,
            is_ready: true,
            include_original_audio: includeOriginalAudio,
            original_audio_volume: originalAudioVolume,
          },
          { onConflict: 'lobby_id,round_number,player_id' },
        );

      if (error) {
        setReadyPlayers((prev) => prev.filter((id) => id !== currentPlayer.id));
        throw error;
      }

      void questTracker.track('submit_imitation');
      void questTracker.track('play_imitation');
      toast({
        title: 'Imitation soumise !',
        description: 'En attente des autres joueurs...',
      });
    } catch (error) {
      setReadyPlayers((prev) => prev.filter((id) => id !== currentPlayer.id));
      console.error('Error submitting:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de soumettre',
        variant: 'destructive',
      });
    }
  };

  const handleVideoSaved = (clip: any) => {
    setHasRecorded(true);
    setRecordedClipId(clip.id);
    setIsRecording(false);
    playInkSound('cartoonPop', 0.4);
    // Tag the clip with round_number immediately so VotingPhase can find it
    // even if the player hasn't clicked "Soumettre" yet (e.g. host force-advance).
    supabase.from('video_clips').update({ round_number: roundNumber }).eq('id', clip.id).then(() => {});
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

  // Host-only escape hatch: when a player is stuck (mic permission, browser
  // bug, network issue), the host can force-skip not-ready players and move
  // the round forward. This avoids dead rounds when one user can't record.
  const handleForceAdvance = async () => {
    if (!currentPlayer.isHost) return;
    const notReady = players.filter((p) => !readyPlayers.includes(p.id));
    if (notReady.length === 0) return;
    try {
      // Mark every missing player as ready (with no clip) so the round can
      // close. The voting phase already tolerates players without a clip.
      const rows = notReady.map((p) => ({
        lobby_id: lobbyId,
        round_number: roundNumber,
        player_id: p.id,
        player_name: p.name,
        is_ready: true,
        include_original_audio: false,
        original_audio_volume: 50,
      }));
      await supabase
        .from('player_imitations')
        .upsert(rows, { onConflict: 'lobby_id,round_number,player_id' });
      toast({
        title: 'Manche débloquée',
        description: `${notReady.length} joueur${notReady.length > 1 ? 's' : ''} ignoré${notReady.length > 1 ? 's' : ''}.`,
      });
    } catch (err) {
      console.error('Error force-advancing:', err);
      toast({ title: 'Erreur', description: 'Impossible de débloquer la manche.', variant: 'destructive' });
    }
  };

  const teammateReady = teammate ? readyPlayers.includes(teammate.id) : false;

  return (
    <div className="h-[100dvh] text-white relative overflow-hidden flex flex-col" style={{ background: "linear-gradient(180deg, #0f0820, #0a0510, #160a26)" }}>
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div animate={{ x: [0, -20, 0], y: [0, 20, 0] }} transition={{ duration: 10, repeat: Infinity }}
          className="absolute top-[-5%] right-[10%] w-[400px] h-[400px] rounded-full opacity-20"
          style={{ background: `radial-gradient(circle, ${ACCENT}55, transparent 70%)`, filter: "blur(80px)" }} />
        <Sparkles className="absolute top-[15%] left-[5%] w-5 h-5 text-amber-400/30" />
        <Zap className="absolute bottom-[30%] right-[4%] w-4 h-4 text-pink-400/25" />
      </div>
      <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar px-4 pt-4 pb-[100px]">
        {/* Header */}
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4 mb-4">
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-full flex items-center gap-2"
              style={{ background: `linear-gradient(180deg, ${ACCENT}, ${ACCENT}cc)`, border: "3px solid #0a0810", boxShadow: "0 4px 0 #0a0810" }}>
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

          <motion.button type="button" onClick={() => setShowSettings(!showSettings)}
            whileHover={{ scale: 1.05, rotate: showSettings ? -90 : 90 }} whileTap={{ scale: 0.95 }}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: showSettings ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)` : "rgba(255,255,255,0.08)", border: "2.5px solid #0a0810", boxShadow: "0 3px 0 #0a0810" }}>
            <Settings className="w-4 h-4 text-white" strokeWidth={2.5} />
          </motion.button>
        </div>

        <AnimatePresence>
          {showSettings && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="max-w-[1600px] mx-auto mb-4 overflow-hidden rounded-2xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "3px solid #0a0810", boxShadow: "0 4px 0 #0a0810" }}>
              <div className="p-4">
                <DeviceSettings onClose={() => setShowSettings(false)} showPreview={false} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MAIN 2-COLUMN LAYOUT — video LEFT (big), imitation panel RIGHT */}
        <motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="max-w-[1600px] mx-auto grid lg:grid-cols-[1.55fr_1fr] gap-4 items-start pt-4">
          {/* LEFT — Video to imitate (big) */}
          <div className="relative rounded-3xl"
            style={{ background: "linear-gradient(180deg, #1a0d2e, #0f0820)", border: "4px solid #0a0810", boxShadow: `0 8px 0 #0a0810, 0 0 30px ${ACCENT}22` }}>
            <div className="absolute inset-1.5 rounded-[1.2rem] pointer-events-none" style={{ border: `2px solid ${ACCENT}33` }} />
            <div className="absolute -top-3 left-6 z-20">
              <motion.div initial={{ scale: 0, rotate: -8 }} animate={{ scale: 1, rotate: -4 }}
                transition={{ type: "spring", stiffness: 200, damping: 14 }}
                className="px-3 py-1 rounded-full flex items-center gap-1.5"
                style={{ background: `linear-gradient(180deg, ${ACCENT}, ${ACCENT}cc)`, border: "2.5px solid #0a0810", boxShadow: "0 3px 0 #0a0810" }}>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>🎬 Vidéo à imiter</span>
              </motion.div>
            </div>
            <AnimatePresence>
              {isRecording && (
                <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, rotate: 6, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
                  className="absolute -top-3 right-6 z-20 px-3 py-1 rounded-full flex items-center gap-1.5"
                  style={{ background: "linear-gradient(180deg, #ef4444, #b91c1c)", border: "2.5px solid #0a0810", boxShadow: "0 3px 0 #0a0810" }}>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75 animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-400" />
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white" style={{ fontFamily: FONT }}>REC</span>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="relative p-4 pt-6">
              <div className="rounded-2xl overflow-hidden"
                style={{ border: "3px solid #0a0810", boxShadow: `0 4px 0 #0a0810${isRecording ? ", 0 0 0 3px #ef4444" : ""}` }}>
                <VideoPreview clipId={currentChallenge.id} className="w-full aspect-video" videoRef={challengeVideoRef} />
              </div>
            </div>
          </div>

          {/* RIGHT — Imitation panel */}
          <div className="relative rounded-3xl"
            style={{ background: "linear-gradient(180deg, #1a0d2e, #0f0820)", border: "4px solid #0a0810", boxShadow: `0 8px 0 #0a0810, 0 0 30px ${ACCENT}22` }}>
            <div className="absolute inset-1.5 rounded-[1.2rem] pointer-events-none" style={{ border: `2px solid ${ACCENT}33` }} />
            <div className="absolute -top-3 left-6 z-20">
              <motion.div initial={{ scale: 0, rotate: 8 }} animate={{ scale: 1, rotate: 4 }}
                transition={{ type: "spring", stiffness: 200, damping: 14 }}
                className="px-3 py-1 rounded-full flex items-center gap-1.5"
                style={{ background: "linear-gradient(180deg, #fbbf24, #d97706)", border: "2.5px solid #0a0810", boxShadow: "0 3px 0 #0a0810" }}>
                <Mic className="w-3 h-3 text-white" strokeWidth={2.5} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white" style={{ fontFamily: FONT, textShadow: SHADOW_SM }}>Imitation</span>
              </motion.div>
            </div>
            <div className="relative p-4 pt-6 space-y-3">
              {!hasRecorded ? (
                <AudioRecorder key={uploadKey} playerId={currentPlayer.id} playerName={currentPlayer.name}
                  onAudioSaved={handleVideoSaved} lobbyId={lobbyId}
                  onRecordingStart={handleRecordingStart} onRecordingStop={handleRecordingStop}
                  showVoiceFilters />
              ) : (
                <>
                  <div className="rounded-2xl p-3 space-y-2"
                    style={{ background: "rgba(52,211,153,0.08)", border: "3px solid #0a0810", boxShadow: "0 4px 0 #0a0810" }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-base font-black" style={{ fontFamily: FONT, color: "#34d399", textShadow: SHADOW_SM }}>Imitation enregistrée !</h3>
                      </div>
                      <motion.button type="button" onClick={handleRetry} disabled={hasSubmitted}
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-xl disabled:opacity-40"
                        style={{ background: "rgba(255,255,255,0.06)", border: "2px solid #0a0810", boxShadow: "0 2px 0 #0a0810" }}>
                        <RotateCcw className="w-3 h-3 text-white/70" />
                        <span className="text-xs font-black text-white/70" style={{ fontFamily: FONT }}>Rejouer</span>
                      </motion.button>
                    </div>
                    {recordedClipId && (
                      <div className="rounded-xl overflow-hidden" style={{ border: "2px solid #0a0810" }}>
                        <VideoWithAudioOverlay videoClipId={currentChallenge.id} audioClipId={recordedClipId}
                          includeOriginalAudio={includeOriginalAudio} originalAudioVolume={originalAudioVolume} />
                      </div>
                    )}
                  </div>
                  <div className="rounded-2xl p-3 space-y-2"
                    style={{ background: "rgba(255,255,255,0.03)", border: "3px solid #0a0810", boxShadow: "0 4px 0 #0a0810" }}>
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
                  <motion.button type="button" onClick={handleSubmit} disabled={hasSubmitted}
                    whileHover={!hasSubmitted ? { scale: 1.03, rotate: -1 } : undefined}
                    whileTap={!hasSubmitted ? { scale: 0.97 } : undefined}
                    className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-70"
                    style={{
                      background: hasSubmitted ? "linear-gradient(180deg, #34d399, #059669)" : `linear-gradient(180deg, ${ACCENT}, ${ACCENT}cc)`,
                      border: "4px solid #0a0810", boxShadow: "0 6px 0 #0a0810, inset 0 2px 0 rgba(255,255,255,0.25)",
                    }}>
                    <Check className="w-5 h-5 text-white" strokeWidth={3} />
                    <span className="text-xl font-black text-white" style={{ fontFamily: FONT, textShadow: SHADOW }}>
                      {hasSubmitted ? "Soumis !" : "Soumettre"}
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

      {/* PLAYERS PROGRESS BAR — sticky bottom-left/right, but leaves a centered gap
          for the floating MusicPlayerBar (which is centered ~560px wide at bottom-4).
          Two pills (left/right) instead of one full-width bar avoids overlap. */}
      <div className="fixed bottom-3 left-3 right-3 z-30 pointer-events-none flex justify-between gap-3">
        {/* LEFT pill — count + avatars (scrollable) */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="pointer-events-auto rounded-2xl px-3 py-2 flex items-center gap-2 max-w-[calc(50%-300px)] min-w-[200px]"
          style={{
            background: "linear-gradient(180deg, rgba(26,13,46,0.95), rgba(15,8,32,0.95))",
            border: "3px solid #0a0810",
            boxShadow: "0 4px 0 #0a0810",
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
                    border: ready ? "1.5px solid #34d399" : "1.5px solid #0a0810",
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
        {currentPlayer.isHost && readyPlayers.length < players.length && readyPlayers.length > 0 && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            type="button"
            onClick={handleForceAdvance}
            whileHover={{ scale: 1.05, rotate: -1 }}
            whileTap={{ scale: 0.95 }}
            className="pointer-events-auto px-3 py-2 rounded-2xl flex items-center gap-1.5 flex-shrink-0"
            style={{
              background: "linear-gradient(180deg, #fbbf24, #d97706)",
              border: "3px solid #0a0810",
              boxShadow: "0 4px 0 #0a0810",
              backdropFilter: "blur(8px)",
            }}
            title="Ignorer les joueurs bloqués et passer au vote"
          >
            <span
              className="text-xs font-black uppercase tracking-wider text-white whitespace-nowrap"
              style={{ fontFamily: FONT, textShadow: SHADOW_SM }}
            >
              ⏭ Skip
            </span>
          </motion.button>
        )}
      </div>
    </div>
  );
};
