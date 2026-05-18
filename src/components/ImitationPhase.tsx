import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
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
      <div className="relative z-10 min-h-screen px-5 py-5 pb-[120px]">
        <div className="max-w-7xl mx-auto space-y-5">
          {/* HEADER */}
          <div className="flex items-center justify-between">
            <div className="flex-1" />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-2 flex-1"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 relative">
                <DoodleBorder color={ACCENT} filled />
                <Mic className="relative w-3.5 h-3.5 animate-pulse" style={{ color: ACCENT }} />
                <span
                  className="relative text-xs uppercase tracking-[0.25em] font-bold"
                  style={{ color: ACCENT, fontFamily: "'Caveat', cursive" }}
                >
                  Phase d'imitation {gameMode === '2v2' && '· 2v2'}
                </span>
              </div>

              <h2
                className="text-3xl md:text-4xl font-black leading-none text-white"
                style={{
                  fontFamily: "'Caveat', cursive",
                  textShadow: `0 0 18px ${ACCENT}33, 0 2px 8px rgba(0,0,0,0.5)`,
                }}
              >
                À toi de jouer !
              </h2>

              <p className="text-sm text-white/60">
                Imite{' '}
                <span style={{ color: ACCENT }} className="font-bold">
                  {currentChallenge.playerName}
                </span>
                {gameMode === '2v2' && teammate && (
                  <span className="block text-xs mt-1 text-white/50">
                    <Swords className="w-3 h-3 inline mr-1" />
                    avec{' '}
                    <span style={{ color: ACCENT }} className="font-bold">
                      {teammate.name}
                    </span>
                  </span>
                )}
              </p>
            </motion.div>
            <div className="flex-1 flex justify-end">
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

          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="relative px-4 py-4"
            >
              <DoodleBorder color="rgba(255,255,255,0.18)" />
              <div className="relative">
                <DeviceSettings onClose={() => setShowSettings(false)} showPreview={false} />
              </div>
            </motion.div>
          )}

          {/* MAIN GRID */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Challenge Video */}
            <div className="relative px-4 py-4">
              <DoodleBorder color="rgba(255,255,255,0.18)" rotation={-1} />
              <div className="relative space-y-3">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-white/60" />
                  <h3
                    className="text-base font-black"
                    style={{ fontFamily: "'Caveat', cursive", color: 'white' }}
                  >
                    Vidéo à imiter
                  </h3>
                </div>
                <div className="rounded-xl overflow-hidden border border-white/10">
                  <VideoPreview
                    clipId={currentChallenge.id}
                    className="w-full aspect-video"
                    videoRef={challengeVideoRef}
                  />
                </div>
              </div>
            </div>

            {/* Recording */}
            <div className="relative px-4 py-4">
              <DoodleBorder color={ACCENT} rotation={1} />
              <div className="relative space-y-4">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4" style={{ color: ACCENT }} />
                  <h3
                    className="text-base font-black"
                    style={{ fontFamily: "'Caveat', cursive", color: ACCENT }}
                  >
                    Ton imitation
                  </h3>
                </div>

                {!hasRecorded ? (
                  <AudioRecorder
                    key={uploadKey}
                    playerId={currentPlayer.id}
                    playerName={currentPlayer.name}
                    onAudioSaved={handleVideoSaved}
                    lobbyId={lobbyId}
                    onRecordingStart={handleRecordingStart}
                    onRecordingStop={handleRecordingStop}
                  />
                ) : (
                  <div className="space-y-3">
                    <div className="relative px-3 py-2 flex items-center justify-between">
                      <DoodleBorder color="#34d399" filled />
                      <div className="relative flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span
                          className="text-sm font-black"
                          style={{
                            fontFamily: "'Caveat', cursive",
                            color: '#34d399',
                          }}
                        >
                          Enregistré !
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRetry}
                        disabled={hasSubmitted}
                        className="relative text-xs font-bold text-white/60 hover:text-white transition-colors disabled:opacity-40"
                      >
                        Recommencer
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

                    {/* Audio overlay options */}
                    <div className="relative px-3 py-3 space-y-3">
                      <DoodleBorder color="rgba(255,255,255,0.12)" rotation={-1} />
                      <div className="relative space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            {includeOriginalAudio ? (
                              <Volume2 className="w-4 h-4 flex-shrink-0" style={{ color: ACCENT }} />
                            ) : (
                              <VolumeX className="w-4 h-4 flex-shrink-0 text-white/40" />
                            )}
                            <div className="min-w-0">
                              <Label
                                htmlFor="include-audio"
                                className="text-sm font-bold text-white cursor-pointer"
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
                        'relative w-full px-5 py-3 disabled:opacity-50',
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
                          className="w-4 h-4"
                          style={{ color: hasSubmitted ? '#34d399' : ACCENT }}
                        />
                        <span
                          className="text-base font-black"
                          style={{
                            fontFamily: "'Caveat', cursive",
                            color: hasSubmitted ? '#34d399' : ACCENT,
                          }}
                        >
                          {hasSubmitted ? 'Soumis !' : 'Soumettre'}
                        </span>
                      </div>
                    </motion.button>

                    {hasSubmitted && (
                      <div className="flex items-center justify-center gap-2 text-white/55">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span className="text-xs font-bold">
                          {readyPlayers.length}/{players.length} prêts
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2v2 Teammate */}
          {gameMode === '2v2' && teammate && (
            <TeammateStatusPanel
              currentPlayerId={currentPlayer.id}
              currentPlayerName={currentPlayer.name}
              teammate={teammate}
              lobbyId={lobbyId}
              roundNumber={roundNumber}
              isReady={hasSubmitted}
              teammateReady={teammateReady}
            />
          )}

          {/* Players progress */}
          <div className="relative px-4 py-4">
            <DoodleBorder color="rgba(255,255,255,0.18)" rotation={1} />
            <div className="relative space-y-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-white/60" />
                <h3
                  className="text-base font-black"
                  style={{ fontFamily: "'Caveat', cursive", color: 'white' }}
                >
                  Progression {gameMode === '2v2' && '(équipes)'}
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
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
                      className="relative px-3 py-3 text-center"
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
                      <div className="relative flex flex-col items-center gap-2">
                        <PlayerAvatar
                          playerId={player.id}
                          playerName={player.name}
                          size="sm"
                          isHost={player.isHost}
                        />
                        <p
                          className="text-sm font-bold truncate text-white"
                          style={{ fontFamily: "'Caveat', cursive" }}
                        >
                          {player.name}
                          {isTeammate && (
                            <span className="ml-1" style={{ color: ACCENT }}>
                              🤝
                            </span>
                          )}
                        </p>
                        <span
                          className="text-[10px] uppercase tracking-wider font-bold"
                          style={{ color: ready ? '#34d399' : 'rgba(255,255,255,0.4)' }}
                        >
                          {ready ? '✓ Soumis' : 'En cours'}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DoodleStage>
  );
};
