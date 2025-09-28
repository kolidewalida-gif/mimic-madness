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

  const copyLobbyCode = async () => {
    if (lobbyCode) {
      try {
        await navigator.clipboard.writeText(lobbyCode);
        toast({
          title: "Code copié !",
          description: "Le code du lobby a été copié dans le presse-papiers",
        });
      } catch (err) {
        toast({
          title: "Erreur",
          description: "Impossible de copier le code",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <GameCard className="w-full max-w-md">
      <div className="space-y-6">
        {lobbyCode && (
          <div className="text-center space-y-2">
            <p className="text-foreground-secondary text-sm">Code du lobby</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-3xl font-bold text-gradient tracking-widest">
                {lobbyCode}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyLobbyCode}
                className="hover:glow-primary"
              >
                <Copy className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-foreground-secondary">
            <Users className="h-5 w-5" />
            <span className="font-medium">
              Joueurs ({players.length})
            </span>
          </div>

          <div className="space-y-2">
            {players.map((player, index) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-3 rounded-lg bg-background-secondary/50 animate-slideInLeft"
                style={{ animationDelay: `${index * 100}ms` }}
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
            ))}
          </div>
        </div>

        {isHost && onStartGame && (
          <Button
            variant="hero"
            size="lg"
            onClick={onStartGame}
            disabled={players.length < 2}
            className="w-full"
          >
            {players.length < 2 
              ? "En attente d'autres joueurs..." 
              : "Lancer la Partie"
            }
          </Button>
        )}

        {!isHost && (
          <div className="text-center p-4 bg-background-secondary/30 rounded-lg">
            <p className="text-foreground-secondary">
              En attente du lancement par l'hôte...
            </p>
          </div>
        )}
      </div>
    </GameCard>
  );
};