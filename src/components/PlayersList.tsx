import { Users, Crown, Copy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GameCard } from "@/components/GameCard";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface PlayersListProps {
  players: Player[];
  lobbyCode?: string;
  lobbyId?: string;
  isHost?: boolean;
  onStartGame?: () => void;
  canStart?: boolean;
  gameMode?: 'normal' | '2v2';
}

export const PlayersList = ({ 
  players, 
  lobbyCode,
  lobbyId,
  isHost = false, 
  onStartGame,
  canStart: externalCanStart,
  gameMode = 'normal',
}: PlayersListProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const canStart = externalCanStart ?? (players.length >= 2 && players.length <= 8);

  const copyLobbyCode = async () => {
    if (!lobbyCode) return;
    
    try {
      await navigator.clipboard.writeText(lobbyCode);
      setCopied(true);
      toast({
        title: "Code copié !",
        description: "Le code du lobby a été copié dans le presse-papiers",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error copying code:', err);
      toast({
        title: "Erreur",
        description: "Impossible de copier le code",
        variant: "destructive",
      });
    }
  };

  return (
    <GameCard className="w-full max-w-md" variant="accent">
      <div className="space-y-6">
        {/* Lobby Code Section */}
        {lobbyCode && (
          <div className="text-center space-y-3">
            <p className="text-foreground-secondary text-xs font-display uppercase tracking-widest">
              Code du Lobby
            </p>
            <div className="flex items-center justify-center gap-3">
              <div className="relative">
                <span className="text-5xl font-display font-black text-gradient tracking-[0.4em] neon-text">
                  {lobbyCode}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyLobbyCode}
                className="hover:bg-primary/20"
                title="Copier le code"
              >
                {copied ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <Copy className="h-5 w-5 text-primary" />
                )}
              </Button>
            </div>
            <p className="text-xs text-foreground-muted font-body">
              Partagez ce code avec vos amis
            </p>
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Players Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-foreground-secondary">
              <Users className="h-5 w-5 text-primary" />
              <span className="font-display text-sm uppercase tracking-wider">
                Joueurs
              </span>
            </div>
            <span className="text-sm font-display text-primary">
              {players.length}/8
            </span>
          </div>

          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {players.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-3 text-foreground-muted/50" />
                <p className="text-foreground-muted font-body">
                  Aucun joueur connecté
                </p>
              </div>
            ) : (
              players.map((player, index) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-background-secondary/40 border border-transparent hover:border-primary/20 transition-all animate-slideInLeft"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <PlayerAvatar
                      playerId={player.id}
                      playerName={player.name}
                      size="lg"
                      isHost={player.isHost}
                      animated
                    />
                    
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground font-body">
                        {player.name}
                      </span>
                      {player.isHost && (
                        <span className="text-xs text-secondary flex items-center gap-1">
                          <Crown className="h-3 w-3" />
                          Hôte
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_10px_hsl(150_100%_45%/0.5)]" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Start Button */}
        {isHost && onStartGame && (
          <div className="space-y-3 pt-2">
            <Button
              variant="hero"
              size="xl"
              onClick={onStartGame}
              disabled={!canStart}
              className="w-full"
            >
              {!canStart 
                ? gameMode === '2v2' 
                  ? "Conditions 2v2 non remplies"
                  : "En attente de joueurs..." 
                : `Lancer la Partie ${gameMode === '2v2' ? '2v2' : ''}`
              }
            </Button>
            {!canStart && (
              <p className="text-xs text-center text-foreground-muted font-body">
                {gameMode === '2v2' 
                  ? "Min. 4 joueurs pairs + équipes formées" 
                  : "Minimum 2 joueurs requis"}
              </p>
            )}
          </div>
        )}

        {!isHost && (
          <div className="text-center p-4 rounded-xl bg-secondary/10 border border-secondary/20">
            <p className="text-secondary font-body text-sm">
              ⏳ En attente du lancement...
            </p>
          </div>
        )}
      </div>
    </GameCard>
  );
};