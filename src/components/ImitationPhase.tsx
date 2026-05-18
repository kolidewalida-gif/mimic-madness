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
  Play,
  Check,
  Users,
  Settings,
  Mic,
  Volume2,
  VolumeX,
  Swords,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { videoStorage } from "@/lib/videoStorageSupabase";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DoodleBorder, DoodleStage } from "@/components/doodle/Doodle";
import { playInkSound } from "@/hooks/useInkSoundEffects";
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
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [readyPlayers, setReadyPlayers] = useState<string[]>([]);
  const [recordedClipId, setRecordedClipId] = useState<string | null>(null);
  const [uploadKey, setUploadKey] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [challengeClipData, setChallengeClipData] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [includeOriginalAudio, setIncludeOriginalAudio] = useState(false);
  const [originalAudioVolume, setOriginalAudioVolume] = useState(50);
  const { toast } = useToast();
  const { pause } = useBackgroundMusic();
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
    pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  useEffect(() => {
    if (
      currentPlayer.isHost &&
      readyPlayers.length === players.length &&
      readyPlayers.length > 0
    ) {
      onAllReady();
    }
  }, [readyPlayers.length, players.length, onAllReady, currentPlayer.isHost]);

  const handleSubmit = async () => {
    try {
      playInkSound('cartoonDing', 0.5);
      if (recordedClipId) {
        await supabase
          .from('video_clips')
          .update({ round_number: roundNumber })
          .eq('id', recordedClipId);
      }

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

      if (error) throw error;

      setHasSubmitted(true);
      toast({
        title: 'Imitation soumise !',
        description: 'En attente des autres joueurs...',
      });
    } catch (error) {
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
    if (challengeVideoRef.current) {
      challengeVideoRef.current.pause();
      const startTime = challengeClipData?.startTime ?? 0;
      try {
        challengeVideoRef.current.currentTime = startTime;
      } catch {}
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
      } catch {}
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
      } catch {}
    }
  };

  const teammateReady = teammate ? readyPlayers.includes(teammate.id) : false;

  return (
    <DoodleStage accent={ACCENT}>
      <div className="relative z-10 min-h-screen px-4 sm:px-6 py-4 pb-[140px]">
        {/* COMPACT HEADER STRIP */}
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4 mb-3">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 min-w-0"
          >
            <div className="relative px-3 py-1.5 flex-shrink-0">
              <DoodleBorder color={ACCENT} filled />
              <div className="relative flex items-center gap-1.5">
                <Mic
                  className={cn(
                    'w-3.5 h-3.5',
                    isRecording && 'animate-pulse',
                  )}
                  style={{ color: ACCENT }}
                />
                <span
                  className="text-[10px] uppercase tracking-[0.25em] font-bold"
                  style={{ color: ACCENT, fontFamily: "'Caveat', cursive" }}
                >
                  Imitation {gameMode === '2v2' && '· 2v2'}
                </span>
              </div>
            </div>

            <div className="min-w-0">
              <h2
                className="text-2xl sm:text-3xl font-black leading-none text-white truncate"
                style={{
                  fontFamily: "'Caveat', cursive",
                  textShadow: `0 0 14px ${ACCENT}33, 0 2px 6px rgba(0,0,0,0.5)`,
                }}
              >
                Imite{' '}
                <span style={{ color: ACCENT }}>{currentChallenge.playerName}</span>
                {gameMode === '2v2' && teammate && (
                  <span className="text-base text-white/60 font-bold ml-2">
                    <Swords className="w-3 h-3 inline mx-1 -mt-0.5" />
                    avec <span style={{ color: ACCENT }}>{teammate.name}</span>
                  </span>
                )}
              </h2>
            </div>
          </motion.div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 text-white/55 text-xs font-bold">
              <Users className="w-3.5 h-3.5" />
              <span>
                {readyPlayers.length}/{players.length} prêts
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className="relative px-3 py-1.5 group"
            >
              <DoodleBorder color="rgba(255,255,255,0.15)" />
              <div className="relative flex items-center gap-1.5 text-white/60 group-hover:text-white transition-colors">
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">
                  Audio
                </span>
              </div>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="max-w-[1600px] mx-auto mb-3 overflow-hidden"
            >
              <div className="relative px-4 py-3">
                <DoodleBorder color="rgba(255,255,255,0.18)" />
                <div className="relative">
                  <DeviceSettings
                    onClose={() => setShowSettings(false)}
                    showPreview={false}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* HERO VIDEO — la star de cette phase */}
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="max-w-[1280px] mx-auto"
        >
          <div className="relative">
            {/* Sketchy frame around the video — thicker, more present */}
            <div className="relative p-3 sm:p-4">
              <DoodleBorder color={ACCENT} thick rotation={-0.5} />

              {/* "VIDÉO À IMITER" stamp ribbon */}
              <div className="absolute -top-3 left-6 z-20">
                <motion.div
                  initial={{ scale: 0, rotate: -8 }}
                  animate={{ scale: 1, rotate: -4 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 14 }}
                  className="relative px-3 py-1"
                >
                  <DoodleBorder color={ACCENT} filled />
                  <div className="relative flex items-center gap-1.5">
                    <Play className="w-3 h-3" style={{ color: ACCENT }} />
                    <span
                      className="text-[10px] font-black uppercase tracking-[0.2em]"
                      style={{ color: ACCENT, fontFamily: "'Caveat', cursive" }}
                    >
                      Vidéo à imiter
                    </span>
                  </div>
                </motion.div>
              </div>

              {/* RECORDING indicator overlay */}
              <AnimatePresence>
                {isRecording && (
                  <motion.div
                    initial={{ scale: 0, rotate: 0, opacity: 0 }}
                    animate={{ scale: 1, rotate: 6, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute -top-3 right-6 z-20"
                  >
                    <div className="relative px-3 py-1">
                      <DoodleBorder color="#ff5050" filled />
                      <div className="relative flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                        </span>
                        <span
                          className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400"
                          style={{ fontFamily: "'Caveat', cursive" }}
                        >
                          REC
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div
                className={cn(
                  'relative rounded-xl overflow-hidden border border-white/10 bg-black',
                  'shadow-[0_20px_80px_-20px_rgba(248,113,113,0.45)]',
                  isRecording && 'ring-2 ring-red-500/60',
                )}
              >
                <VideoPreview
                  clipId={currentChallenge.id}
                  className="w-full aspect-video"
                  videoRef={challengeVideoRef}
                />
              </div>

              <p
                className="relative text-center mt-3 text-xs sm:text-sm text-white/50 italic"
                style={{ fontFamily: "'Caveat', cursive" }}
              >
                {hasRecorded
                  ? '↓ Écoute le résultat ou recommence ↓'
                  : '↓ Lance l\'enregistrement quand tu es prêt ↓'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* RECORDING / PREVIEW PANEL — sous la vidéo */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="max-w-[1280px] mx-auto mt-5"
        >
          {!hasRecorded ? (
            // BEFORE recording — single big mic
            <div className="relative px-5 py-4">
              <DoodleBorder color={ACCENT} rotation={1} />
              <div className="relative flex flex-col sm:flex-row items-center gap-4">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Mic className="w-5 h-5" style={{ color: ACCENT }} />
                  <h3
                    className="text-xl font-black"
                    style={{ fontFamily: "'Caveat', cursive", color: ACCENT }}
                  >
                    Ton imitation
                  </h3>
                </div>
                <div className="flex-1 w-full">
                  <AudioRecorder
                    key={uploadKey}
                    playerId={currentPlayer.id}
                    playerName={currentPlayer.name}
                    onAudioSaved={handleVideoSaved}
                    lobbyId={lobbyId}
                    onRecordingStart={handleRecordingStart}
                    onRecordingStop={handleRecordingStop}
                  />
                </div>
              </div>
            </div>
          ) : (
            // AFTER recording — preview + actions
            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-4">
              {/* Preview side */}
              <div className="relative px-4 py-4">
                <DoodleBorder color="#34d399" rotation={-1} />
                <div className="relative space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <h3
                        className="text-lg font-black"
                        style={{
                          fontFamily: "'Caveat', cursive",
                          color: '#34d399',
                        }}
                      >
                        Ton imitation enregistrée
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={handleRetry}
                      disabled={hasSubmitted}
                      className="relative px-2.5 py-1 group disabled:opacity-40"
                    >
                      <DoodleBorder color="rgba(255,255,255,0.25)" />
                      <div className="relative flex items-center gap-1 text-white/70 group-hover:text-white transition-colors">
                        <RotateCcw className="w-3 h-3" />
                        <span
                          className="text-[11px] font-bold uppercase tracking-wider"
                          style={{ fontFamily: "'Caveat', cursive" }}
                        >
                          Recommencer
                        </span>
                      </div>
                    </button>
                  </div>

                  {recordedClipId && (
                    <div className="rounded-xl overflow-hidden border border-white/10">
                      <VideoWithAudioOverlay
                        videoClipId={currentChallenge.id}
                        audioClipId={recordedClipId}
                        includeOriginalAudio={includeOriginalAudio}
                        originalAudioVolume={originalAudioVolume}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Audio overlay options + submit */}
              <div className="space-y-3">
                <div className="relative px-4 py-3.5">
                  <DoodleBorder color="rgba(255,255,255,0.18)" rotation={1} />
                  <div className="relative space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {includeOriginalAudio ? (
                          <Volume2
                            className="w-4 h-4 flex-shrink-0"
                            style={{ color: ACCENT }}
                          />
                        ) : (
                          <VolumeX className="w-4 h-4 flex-shrink-0 text-white/40" />
                        )}
                        <div className="min-w-0">
                          <Label
                            htmlFor="include-audio"
                            className="text-base font-bold text-white cursor-pointer"
                            style={{ fontFamily: "'Caveat', cursive" }}
                          >
                            Audio original
                          </Label>
                          <p className="text-[10px] text-white/40 truncate">
                            {includeOriginalAudio
                              ? 'Joué avec ton imitation'
                              : 'Seule ton imitation est entendue'}
                          </p>
                        </div>
                      </div>
                      <Switch
                        id="include-audio"
                        checked={includeOriginalAudio}
                        onCheckedChange={setIncludeOriginalAudio}
                        disabled={hasSubmitted}
                      />
                    </div>

                    {includeOriginalAudio && (
                      <VolumeSlider
                        value={originalAudioVolume}
                        onChange={setOriginalAudioVolume}
                        disabled={hasSubmitted}
                        label="Volume audio original"
                      />
                    )}
                  </div>
                </div>

                <motion.button
                  type="button"
                  onClick={handleSubmit}
                  disabled={hasSubmitted}
                  whileHover={!hasSubmitted ? { scale: 1.02, y: -2 } : undefined}
                  whileTap={!hasSubmitted ? { scale: 0.98 } : undefined}
                  className={cn(
                    'relative w-full px-6 py-4 disabled:opacity-50',
                  )}
                >
                  <DoodleBorder
                    color={hasSubmitted ? '#34d399' : ACCENT}
                    filled
                    rotation={-1}
                    thick
                  />
                  <div className="relative flex items-center justify-center gap-2">
                    <Check
                      className="w-5 h-5"
                      style={{ color: hasSubmitted ? '#34d399' : ACCENT }}
                    />
                    <span
                      className="text-2xl font-black"
                      style={{
                        fontFamily: "'Caveat', cursive",
                        color: hasSubmitted ? '#34d399' : ACCENT,
                      }}
                    >
                      {hasSubmitted ? 'Soumis !' : 'Soumettre mon imitation'}
                    </span>
                  </div>
                </motion.button>

                {hasSubmitted && (
                  <div className="flex items-center justify-center gap-2 text-white/55">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span
                      className="text-xs font-bold"
                      style={{ fontFamily: "'Caveat', cursive" }}
                    >
                      {readyPlayers.length}/{players.length} joueurs prêts
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>

        {/* 2v2 Teammate */}
        {gameMode === '2v2' && teammate && (
          <div className="max-w-[1280px] mx-auto mt-5">
            <TeammateStatusPanel
              currentPlayerId={currentPlayer.id}
              currentPlayerName={currentPlayer.name}
              teammate={teammate}
              lobbyId={lobbyId}
              roundNumber={roundNumber}
              isReady={hasSubmitted}
              teammateReady={teammateReady}
            />
          </div>
        )}

        {/* PLAYERS PROGRESS — compact bottom strip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="max-w-[1280px] mx-auto mt-5"
        >
          <div className="relative px-4 py-3">
            <DoodleBorder color="rgba(255,255,255,0.18)" rotation={1} />
            <div className="relative space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-white/60" />
                  <h3
                    className="text-sm font-black uppercase tracking-wider"
                    style={{
                      fontFamily: "'Caveat', cursive",
                      color: 'white',
                      letterSpacing: '0.15em',
                    }}
                  >
                    Progression {gameMode === '2v2' && '(équipes)'}
                  </h3>
                </div>
                <span
                  className="text-xs font-bold"
                  style={{
                    fontFamily: "'Caveat', cursive",
                    color: '#34d399',
                  }}
                >
                  {readyPlayers.length}/{players.length}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {players.map((player, idx) => {
                  const ready = readyPlayers.includes(player.id);
                  const isTeammate = teammate?.id === player.id;
                  const isCurrentPlayer = player.id === currentPlayer.id;

                  return (
                    <motion.div
                      key={player.id}
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.04 }}
                      className="relative px-2.5 py-1.5 flex items-center gap-2"
                    >
                      <DoodleBorder
                        color={
                          ready
                            ? '#34d399'
                            : isTeammate || isCurrentPlayer
                              ? ACCENT
                              : 'rgba(255,255,255,0.12)'
                        }
                        filled={ready}
                        rotation={idx % 2 === 0 ? -1 : 1}
                      />
                      <div className="relative flex items-center gap-2">
                        <PlayerAvatar
                          playerId={player.id}
                          playerName={player.name}
                          size="sm"
                          isHost={player.isHost}
                        />
                        <span
                          className="text-sm font-bold text-white truncate max-w-[8rem]"
                          style={{ fontFamily: "'Caveat', cursive" }}
                        >
                          {player.name}
                          {isTeammate && (
                            <span className="ml-1" style={{ color: ACCENT }}>
                              🤝
                            </span>
                          )}
                          {isCurrentPlayer && (
                            <span className="ml-1 text-[10px] uppercase tracking-wider opacity-60">
                              (toi)
                            </span>
                          )}
                        </span>
                        {ready ? (
                          <Check
                            className="w-3.5 h-3.5 flex-shrink-0"
                            style={{ color: '#34d399' }}
                          />
                        ) : (
                          <Loader2 className="w-3 h-3 flex-shrink-0 text-white/30 animate-spin" />
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </DoodleStage>
  );
};
