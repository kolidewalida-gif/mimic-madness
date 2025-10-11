import { GameLogo } from "@/components/GameLogo";
import { PlayersList } from "@/components/PlayersList";
import { Button } from "@/components/ui/button";
import { DeviceSettings } from "@/components/DeviceSettings";
import { ArrowLeft, Settings } from "lucide-react";
import { useState } from "react";

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
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="min-h-screen animated-bg flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-4xl space-y-8 animate-fadeIn">
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
          <Button
            variant="ghost"
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Audio/Vidéo
          </Button>
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

        <div className="grid md:grid-cols-2 gap-6">
          <div className="flex justify-center">
            <PlayersList
              players={players}
              lobbyCode={lobbyCode}
              isHost={isHost}
              onStartGame={onStartGame}
            />
          </div>

          {showSettings && (
            <div className="animate-fadeIn">
              <DeviceSettings showPreview={true} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};