import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { GameCard } from "@/components/GameCard";
import { VideoPreview } from "@/components/VideoPreview";
import { AudioRecorder } from "@/components/AudioRecorder";
import { DeviceSettings } from "@/components/DeviceSettings";
import { VideoWithAudioOverlay } from "@/components/VideoWithAudioOverlay";
import { Play, Check, Users, Settings, Mic } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { videoStorage } from "@/lib/videoStorageSupabase";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";

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
  onAllReady: () => void;
}

export const ImitationPhase = ({
  lobbyId,
  roundNumber,
  currentPlayer,
  players,
  currentChallenge,
  onAllReady
}: ImitationPhaseProps) => {
  const [hasRecorded, setHasRecorded] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [readyPlayers, setReadyPlayers] = useState<string[]>([]);
  const [recordedClipId, setRecordedClipId] = useState<string | null>(null);
  const [uploadKey, setUploadKey] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [challengeClipData, setChallengeClipData] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const { toast } = useToast();
  const { pause, play } = useBackgroundMusic();
  const challengeVideoRef = useRef<HTMLVideoElement>(null);

  // Load challenge clip data
  useEffect(() => {
    const loadChallengeData = async () => {
      try {
        const clip = await videoStorage.getVideoClip(currentChallenge.id);
        if (clip) {
          setChallengeClipData(clip);
        }
      } catch (error) {
        console.error('Error loading challenge clip:', error);
      }
    };
    loadChallengeData();
  }, [currentChallenge.id]);

  // Pause music during imitation phase
  useEffect(() => {
    pause();
    return () => {
      play();
    };
  }, [pause, play]);

  // Subscribe to ready status
  useEffect(() => {
    let isMounted = true;
    
    const fetchReadyPlayers = async () => {
      const { data } = await supabase
        .from('player_imitations')
        .select('player_id, is_ready')
        .eq('lobby_id', lobbyId)
        .eq('round_number', roundNumber);

      if (data && isMounted) {
        setReadyPlayers(data.filter(p => p.is_ready).map(p => p.player_id));
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
          filter: `lobby_id=eq.${lobbyId}`
        },
        () => {
          if (isMounted) fetchReadyPlayers();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [lobbyId, roundNumber]);

  // Check if all players are ready
  useEffect(() => {
    if (readyPlayers.length === players.length && readyPlayers.length > 0) {
      onAllReady();
    }
  }, [readyPlayers.length, players.length, onAllReady]);

  const handleSubmit = async () => {
    try {
      const { error } = await supabase
        .from('player_imitations')
        .upsert({
          lobby_id: lobbyId,
          round_number: roundNumber,
          player_id: currentPlayer.id,
          player_name: currentPlayer.name,
          is_ready: true
        }, {
          onConflict: 'lobby_id,round_number,player_id'
        });

      if (error) throw error;

      setHasSubmitted(true);
      toast({
        title: "Imitation soumise !",
        description: "En attente des autres joueurs...",
      });
    } catch (error) {
      console.error('Error submitting:', error);
      toast({
        title: "Erreur",
        description: "Impossible de soumettre",
        variant: "destructive",
      });
    }
  };

  const handleVideoSaved = (clip: any) => {
    console.log("Imitation saved:", clip);
    setHasRecorded(true);
    setRecordedClipId(clip.id);
    setIsRecording(false);
    toast({
      title: "✅ Imitation enregistrée !",
      description: "Vous pouvez maintenant la soumettre ou recommencer.",
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
    
    setHasRecorded(false);
    setRecordedClipId(null);
    setUploadKey(prev => prev + 1);
  };

  const handleRecordingStart = () => {
    setIsRecording(true);
    if (challengeVideoRef.current) {
      const startTime = challengeClipData?.startTime ?? 0;
      challengeVideoRef.current.currentTime = startTime;
      challengeVideoRef.current.play();
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1" />
        <div className="text-center space-y-2 flex-1">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30">
            <Mic className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-sm font-display uppercase tracking-wider text-primary">
              Phase d'imitation
            </span>
          </div>
          
          <h2 className="text-3xl font-display font-black text-gradient">
            À Vous de Jouer !
          </h2>
          
          <p className="text-foreground-secondary font-body">
            Imitez <span className="font-semibold text-secondary neon-text-pink">{currentChallenge.playerName}</span>
          </p>
        </div>
        <div className="flex-1 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Audio</span>
          </Button>
        </div>
      </div>

      {showSettings && (
        <div className="animate-fadeIn">
          <DeviceSettings onClose={() => setShowSettings(false)} showPreview={false} />
        </div>
      )}

      {/* Main Content */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Challenge Video */}
        <GameCard variant="highlight">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-secondary/20">
                <Play className="h-5 w-5 text-secondary" />
              </div>
              <h3 className="text-lg font-display font-bold">Vidéo à Imiter</h3>
            </div>
            <div className="rounded-xl overflow-hidden border border-glass-border">
              <VideoPreview
                clipId={currentChallenge.id}
                className="w-full aspect-video"
                videoRef={challengeVideoRef}
              />
            </div>
          </div>
        </GameCard>

        {/* Recording Interface */}
        <GameCard variant="accent">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/20">
                <Mic className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-display font-bold">Votre Imitation</h3>
            </div>
            
            {!hasRecorded ? (
              <AudioRecorder
                key={uploadKey}
                playerId={currentPlayer.id}
                playerName={currentPlayer.name}
                onAudioSaved={handleVideoSaved}
                lobbyId={lobbyId}
                onRecordingStart={handleRecordingStart}
                onRecordingStop={() => setIsRecording(false)}
              />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-success/10 border border-success/30">
                  <span className="font-display text-sm text-success uppercase tracking-wider">
                    ✓ Enregistré
                  </span>
                  <Button
                    onClick={handleRetry}
                    variant="ghost"
                    size="sm"
                    disabled={hasSubmitted}
                  >
                    Recommencer
                  </Button>
                </div>
                
                {recordedClipId && (
                  <div className="rounded-xl overflow-hidden border border-glass-border">
                    <VideoWithAudioOverlay
                      videoClipId={currentChallenge.id}
                      audioClipId={recordedClipId}
                    />
                  </div>
                )}
                
                <Button
                  onClick={handleSubmit}
                  disabled={hasSubmitted}
                  variant="hero"
                  className="w-full"
                  size="lg"
                >
                  <Check className="h-5 w-5" />
                  {hasSubmitted ? "Soumis ✓" : "Soumettre"}
                </Button>

                {hasSubmitted && (
                  <div className="flex items-center justify-center gap-2 text-foreground-secondary">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-sm font-body">
                      {readyPlayers.length}/{players.length} joueurs prêts
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </GameCard>
      </div>

      {/* Players Status */}
      <GameCard>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="font-display font-bold uppercase tracking-wider text-sm">
              Progression
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {players.map((player) => {
              const ready = readyPlayers.includes(player.id);
              return (
                <div
                  key={player.id}
                  className={`p-3 rounded-xl text-center transition-all border ${
                    ready
                      ? "bg-success/10 border-success/30"
                      : "bg-background-secondary/30 border-transparent"
                  }`}
                >
                  <p className="font-semibold text-sm truncate font-body">{player.name}</p>
                  <p className="text-xs mt-1 font-display">
                    {ready ? (
                      <span className="text-success">✓ SOUMIS</span>
                    ) : (
                      <span className="text-foreground-muted">En cours...</span>
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </GameCard>
    </div>
  );
};