import { GameLogo } from "@/components/GameLogo";
import { PlayersList } from "@/components/PlayersList";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface LobbyScreenProps {
  players: Player[];
  lobbyCode: string;
  isHost: boolean;
  currentPlayer: Player;
  onStartGame: () => void;
  onLeaveGame: () => void;
}

export const LobbyScreen = ({ 
  players, 
  lobbyCode, 
  isHost, 
  currentPlayer, 
  onStartGame, 
  onLeaveGame 
}: LobbyScreenProps) => {
  return (
    <div className="min-h-screen animated-bg flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-8 animate-fadeIn">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={onLeaveGame}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Quitter
          </Button>
          <GameLogo size="md" />
          <div className="w-20" /> {/* Spacer for centering */}
        </div>

        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-foreground">
            Lobby de la partie
          </h2>
          <p className="text-foreground-secondary">
            {isHost 
              ? "Vous êtes l'hôte de cette partie. Attendez que d'autres joueurs rejoignent." 
              : "En attente que l'hôte lance la partie..."
            }
          </p>
        </div>

        <div className="flex justify-center">
          <PlayersList
            players={players}
            lobbyCode={lobbyCode}
            isHost={isHost}
            onStartGame={onStartGame}
          />
        </div>
      </div>
    </div>
  );
};