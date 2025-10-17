import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { GameCard } from "@/components/GameCard";
import { VideoPreview } from "@/components/VideoPreview";
import { VideoUpload } from "@/components/VideoUpload";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { Play, Check, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const [isReady, setIsReady] = useState(false);
  const [readyPlayers, setReadyPlayers] = useState<string[]>([]);
  const { toast } = useToast();

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

  const handleMarkReady = async () => {
    try {
      const { error } = await supabase
        .from('player_imitations')
        .upsert({
          lobby_id: lobbyId,
          round_number: roundNumber,
          player_id: currentPlayer.id,
          player_name: currentPlayer.name,
          is_ready: true
        });

      if (error) throw error;

      setIsReady(true);
      toast({
        title: "Prêt !",
        description: "En attente des autres joueurs...",
      });
    } catch (error) {
      console.error('Error marking ready:', error);
      toast({
        title: "Erreur",
        description: "Impossible de marquer comme prêt",
        variant: "destructive",
      });
    }
  };

  const handleVideoSaved = () => {
    setHasRecorded(true);
    toast({
      title: "Vidéo enregistrée !",
      description: "Vous pouvez recommencer ou terminer.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gradient">
          🎬 Phase d'Imitation
        </h2>
        <p className="text-foreground-secondary">
          Imitez la vidéo de <span className="font-semibold text-secondary">{currentChallenge.playerName}</span>
        </p>
      </div>

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
              startTime={0}
              endTime={25}
              className="w-full aspect-video rounded-lg"
            />
          </div>
        </GameCard>

        {/* Recording Interface */}
        <GameCard>
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">Votre Imitation</h3>
            
            {/* Voice Recorder */}
            <div className="flex justify-center py-4">
              <VoiceRecorder
                onRecordingStart={() => console.log("Started recording")}
                onRecordingStop={() => console.log("Stopped recording")}
              />
            </div>

            {/* Video Upload */}
            <div className="border-t border-border pt-4">
              <VideoUpload
                playerId={currentPlayer.id}
                maxVideos={1}
                onVideoSaved={handleVideoSaved}
              />
            </div>
            
            <div className="space-y-3 pt-4">
              <Button
                onClick={handleMarkReady}
                disabled={!hasRecorded || isReady}
                variant="hero"
                className="w-full"
                size="lg"
              >
                <Check className="h-5 w-5 mr-2" />
                {isReady ? "En attente..." : "Terminer"}
              </Button>

              {isReady && (
                <p className="text-center text-sm text-foreground-secondary">
                  ⏳ Attente des autres joueurs ({readyPlayers.length}/{players.length})
                </p>
              )}
            </div>
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
                    {ready ? "✅ Prêt" : "⏳ En cours"}
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
