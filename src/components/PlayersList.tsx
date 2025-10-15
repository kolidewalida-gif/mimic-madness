import { Users, Crown, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GameCard } from "@/components/GameCard";
import { useToast } from "@/hooks/use-toast";

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface PlayersListProps {
  players: Player[];
  lobbyCode?: string;
  isHost?: boolean;
  onStartGame?: () => void;
}

export const PlayersList = ({ 
  players, 
  lobbyCode, 
  isHost = false, 
  onStartGame 
}: PlayersListProps) => {
  const { toast } = useToast();
  const canStart = players.length >= 2 && players.length <= 8;

  const copyLobbyCode = async () => {
    if (!lobbyCode) return;
    
    try {
      await navigator.clipboard.writeText(lobbyCode);
      toast({
        title: "Code copié !",
        description: "Le code du lobby a été copié dans le presse-papiers",
      });
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
    <GameCard className="w-full max-w-md">
      <div className="space-y-6">
        {lobbyCode && (
          <div className="text-center space-y-2">
            <p className="text-foreground-secondary text-sm">Code du lobby</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-4xl font-bold text-gradient tracking-[0.3em]">
                {lobbyCode}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyLobbyCode}
                className="hover:glow-primary"
                title="Copier le code"
              >
                <Copy className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-xs text-foreground-secondary">
              Code court et facile à partager (4 caractères)
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between text-foreground-secondary">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span className="font-medium">
                Joueurs ({players.length}/8)
              </span>
            </div>
            {players.length >= 8 && (
              <span className="text-xs text-yellow-600 dark:text-yellow-400">
                Lobby complet
              </span>
            )}
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {players.length === 0 ? (
              <div className="text-center py-8 text-foreground-secondary">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Aucun joueur dans le lobby</p>
              </div>
            ) : (
              players.map((player, index) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-background-secondary/50 animate-slideInLeft hover:bg-background-secondary/70 transition-colors"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-2">
                    {player.isHost && (
                      <Crown className="h-4 w-4 text-secondary" />
                    )}
                    <span className="font-medium text-foreground">
                      {player.name}
                    </span>
                  </div>
                  {player.isHost && (
                    <span className="text-xs text-secondary bg-secondary/20 px-2 py-1 rounded">
                      Hôte
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {isHost && onStartGame && (
          <div className="space-y-2">
            <Button
              variant="hero"
              size="lg"
              onClick={onStartGame}
              disabled={!canStart}
              className="w-full"
            >
              {players.length < 2 
                ? "En attente d'au moins 2 joueurs..." 
                : players.length > 8
                ? "Trop de joueurs (max 8)"
                : `Lancer la Partie (${players.length} joueurs)`
              }
            </Button>
            {players.length < 2 && (
              <p className="text-xs text-center text-foreground-secondary">
                Invitez au moins 1 autre joueur pour commencer
              </p>
            )}
          </div>
        )}

        {!isHost && (
          <div className="text-center p-4 bg-background-secondary/30 rounded-lg">
            <p className="text-foreground-secondary">
              En attente du lancement par l'hôte...
            </p>
            <p className="text-xs text-foreground-secondary mt-1">
              {players.length} {players.length === 1 ? 'joueur' : 'joueurs'} connecté{players.length > 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </GameCard>
  );
};