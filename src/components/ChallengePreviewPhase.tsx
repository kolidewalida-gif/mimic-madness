import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { GameCard } from "@/components/GameCard";
import { VideoPreview } from "@/components/VideoPreview";
import { Play, Check, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

interface ChallengePreviewPhaseProps {
  lobbyId: string;
  roundNumber: number;
  currentPlayer: Player;
  players: Player[];
  currentChallenge: Challenge;
  onAllReady: () => void;
}

export const ChallengePreviewPhase = ({
  lobbyId,
  roundNumber,
  currentPlayer,
  players,
  currentChallenge,
  onAllReady
}: ChallengePreviewPhaseProps) => {
  const [isReady, setIsReady] = useState(false);
  const [readyPlayers, setReadyPlayers] = useState<string[]>([]);

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
      .channel(`preview:${lobbyId}:${roundNumber}`)
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

  const handleReady = async () => {
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
    } catch (error) {
      console.error('Error marking ready:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gradient">
          🎬 Aperçu du Défi
        </h2>
        <p className="text-foreground-secondary text-lg">
          Regardez la vidéo de <span className="font-semibold text-secondary">{currentChallenge.playerName}</span>
        </p>
        <p className="text-sm text-foreground-secondary">
          Attention : Cette vidéo peut être <span className="font-medium">sans son</span>
        </p>
      </div>

      <GameCard>
        <div className="space-y-6">
          <div className="flex items-center gap-2 justify-center">
            <Play className="h-6 w-6 text-secondary" />
            <h3 className="text-xl font-semibold">Vidéo à Imiter</h3>
          </div>
          
          <VideoPreview
            clipId={currentChallenge.id}
            className="w-full aspect-video rounded-lg"
          />

          <div className="text-center space-y-4">
            <Button
              onClick={handleReady}
              disabled={isReady}
              variant="hero"
              size="lg"
              className="w-full max-w-md"
            >
              <Check className="h-5 w-5 mr-2" />
              {isReady ? "En attente..." : "J'ai vu la vidéo, je suis prêt !"}
            </Button>

            {isReady && (
              <p className="text-sm text-foreground-secondary">
                ⏳ Attente des autres joueurs ({readyPlayers.length}/{players.length})
              </p>
            )}
          </div>
        </div>
      </GameCard>

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
                    {ready ? "✅ Prêt" : "⏳ Regarde"}
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
