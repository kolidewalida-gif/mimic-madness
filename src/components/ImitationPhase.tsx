import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { GameCard } from "@/components/GameCard";
import { VideoPreview } from "@/components/VideoPreview";
import { VideoRecorder } from "@/components/VideoRecorder";
import { DeviceSettings } from "@/components/DeviceSettings";
import { Play, Check, Users, Settings } from "lucide-react";
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
  const [showPreview, setShowPreview] = useState(false);
  const [uploadKey, setUploadKey] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [challengeClipData, setChallengeClipData] = useState<any>(null);
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
    const fetchReadyPlayers = async () => {
      const { data } = await supabase
        .from('player_imitations')
        .select('player_id, is_ready')
        .eq('lobby_id', lobbyId)
        .eq('round_number', roundNumber);

      if (data) {
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
          fetchReadyPlayers();
        }
      )
      .subscribe();

    return () => {
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
    setHasRecorded(true);
    setRecordedClipId(clip.id);
    setShowPreview(true);
    toast({
      title: "Vidéo enregistrée !",
      description: "Écoutez votre imitation et recommencez si besoin.",
    });
  };

  const handleRetry = async () => {
    // Delete existing clip if any
    if (recordedClipId) {
      try {
        await videoStorage.deleteVideoClip(recordedClipId);
      } catch (error) {
        console.error('Error deleting clip:', error);
      }
    }
    
    setShowPreview(false);
    setHasRecorded(false);
    setRecordedClipId(null);
    setUploadKey(prev => prev + 1); // Force remount VideoUpload
  };

  const handleRecordingStart = () => {
    // Restart the challenge video at the correct start time when recording starts
    if (challengeVideoRef.current) {
      const startTime = challengeClipData?.startTime ?? 0;
      challengeVideoRef.current.currentTime = startTime;
      challengeVideoRef.current.play();
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1" />
        <div className="text-center space-y-2 flex-1">
          <h2 className="text-3xl font-bold text-gradient">
            🎬 Phase d'Imitation
          </h2>
          <p className="text-foreground-secondary">
            Imitez la vidéo de <span className="font-semibold text-secondary">{currentChallenge.playerName}</span>
          </p>
        </div>
        <div className="flex-1 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Audio
          </Button>
        </div>
      </div>

      {showSettings && (
        <div className="animate-fadeIn mb-6">
          <DeviceSettings onClose={() => setShowSettings(false)} showPreview={false} />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Challenge Video */}
        <GameCard>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Play className="h-5 w-5 text-secondary" />
              <h3 className="text-xl font-semibold">Vidéo à Imiter</h3>
            </div>
            <VideoPreview
              clipId={currentChallenge.id}
              className="w-full aspect-video rounded-lg"
              videoRef={challengeVideoRef}
            />
          </div>
        </GameCard>

        {/* Recording Interface */}
        <GameCard>
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">Votre Imitation</h3>
            
            {!showPreview ? (
              <>
                {/* Video Recorder with audio */}
                <VideoRecorder
                  key={uploadKey}
                  playerId={currentPlayer.id}
                  playerName={currentPlayer.name}
                  onVideoSaved={handleVideoSaved}
                  lobbyId={lobbyId}
                  onRecordingStart={handleRecordingStart}
                  onRecordingStop={() => console.log("Stopped recording")}
                />

                {/* Submit Button - always visible */}
                <div className="border-t border-border pt-4 mt-4">
                  <Button
                    onClick={handleSubmit}
                    disabled={hasSubmitted}
                    variant="hero"
                    className="w-full"
                    size="lg"
                  >
                    <Check className="h-5 w-5 mr-2" />
                    {hasSubmitted ? "Soumis" : "Soumettre mon imitation"}
                  </Button>
                  
                  {hasSubmitted && (
                    <p className="text-center text-sm text-foreground-secondary mt-3">
                      ⏳ Attente des autres joueurs ({readyPlayers.length}/{players.length})
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Preview Recorded Imitation */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Votre Imitation</h4>
                    <Button
                      onClick={handleRetry}
                      variant="outline"
                      size="sm"
                      disabled={hasSubmitted}
                    >
                      Recommencer
                    </Button>
                  </div>
                  
                  {recordedClipId && (
                    <VideoPreview
                      clipId={recordedClipId}
                      className="w-full aspect-video rounded-lg"
                    />
                  )}
                </div>
                
                <div className="space-y-3 pt-4">
                  <Button
                    onClick={handleSubmit}
                    disabled={hasSubmitted}
                    variant="hero"
                    className="w-full"
                    size="lg"
                  >
                    <Check className="h-5 w-5 mr-2" />
                    {hasSubmitted ? "Soumis" : "Soumettre mon imitation"}
                  </Button>

                  {hasSubmitted && (
                    <p className="text-center text-sm text-foreground-secondary">
                      ⏳ Attente des autres joueurs ({readyPlayers.length}/{players.length})
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </GameCard>
      </div>

      {/* Players Status */}
      <GameCard>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-secondary" />
            <h3 className="font-semibold">Statut des Joueurs</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {players.map((player) => {
              const ready = readyPlayers.includes(player.id);
              return (
                <div
                  key={player.id}
                  className={`p-3 rounded-lg text-center transition-all ${
                    ready
                      ? "bg-secondary/20 border border-secondary"
                      : "bg-background-secondary/30"
                  }`}
                >
                  <p className="font-medium text-sm truncate">{player.name}</p>
                  <p className="text-xs mt-1">
                    {ready ? "✅ Soumis" : "⏳ En cours"}
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
