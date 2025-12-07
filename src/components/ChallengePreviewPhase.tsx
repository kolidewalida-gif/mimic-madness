import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { GameCard } from "@/components/GameCard";
import { VideoPreview } from "@/components/VideoPreview";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Play, Check, Users, Eye } from "lucide-react";
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
        }, {
          onConflict: 'lobby_id,round_number,player_id'
        });

      if (error) throw error;
      setIsReady(true);
    } catch (error) {
      console.error('Error marking ready:', error);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/30">
          <Eye className="h-4 w-4 text-secondary" />
          <span className="text-sm font-display uppercase tracking-wider text-secondary">
            Phase d'observation
          </span>
        </div>
        
        <h2 className="text-4xl font-display font-black text-gradient">
          Aperçu du Défi
        </h2>
        
        <p className="text-foreground-secondary font-body text-lg">
          Vidéo de <span className="font-semibold text-primary neon-text">{currentChallenge.playerName}</span>
        </p>
        
        <p className="text-sm text-foreground-muted">
          ⚠️ La vidéo peut être sans son
        </p>
      </div>

      {/* Video Card */}
      <GameCard variant="highlight">
        <div className="space-y-6">
          <div className="flex items-center gap-3 justify-center">
            <div className="p-2 rounded-xl bg-secondary/20">
              <Play className="h-5 w-5 text-secondary" />
            </div>
            <h3 className="text-xl font-display font-bold">Vidéo à Imiter</h3>
          </div>
          
          <div className="rounded-xl overflow-hidden border border-glass-border">
            <VideoPreview
              clipId={currentChallenge.id}
              className="w-full aspect-video"
            />
          </div>

          <div className="text-center space-y-4">
            <Button
              onClick={handleReady}
              disabled={isReady}
              variant={isReady ? "outline" : "hero"}
              size="xl"
              className="w-full max-w-md"
            >
              {isReady ? (
                <>
                  <Check className="h-5 w-5" />
                  En attente des autres...
                </>
              ) : (
                <>
                  <Check className="h-5 w-5" />
                  J'ai vu, je suis prêt !
                </>
              )}
            </Button>

            {isReady && (
              <div className="flex items-center justify-center gap-2 text-foreground-secondary">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-body">
                  {readyPlayers.length}/{players.length} joueurs prêts
                </span>
              </div>
            )}
          </div>
        </div>
      </GameCard>

      {/* Players Status */}
      <GameCard>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="font-display font-bold uppercase tracking-wider text-sm">
              Statut des Joueurs
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
                  <div className="flex flex-col items-center gap-2">
                    <PlayerAvatar
                      playerId={player.id}
                      playerName={player.name}
                      size="sm"
                      isHost={player.isHost}
                    />
                    <p className="font-semibold text-sm truncate font-body">{player.name}</p>
                    <p className="text-xs font-display">
                      {ready ? (
                        <span className="text-success">✓ PRÊT</span>
                      ) : (
                        <span className="text-foreground-muted">En cours...</span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </GameCard>
    </div>
  );
};