import { GameLogo } from "@/components/GameLogo";
import { PlayersList } from "@/components/PlayersList";
import { Button } from "@/components/ui/button";
import { DeviceSettings } from "@/components/DeviceSettings";
import { ArrowLeft, Settings, Wifi } from "lucide-react";
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
    <div className="min-h-screen animated-bg flex flex-col p-6 relative">
      {/* Decorative elements */}
      <div className="absolute top-40 right-20 w-48 h-48 bg-primary/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-40 left-20 w-56 h-56 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />

      <div className="w-full max-w-6xl mx-auto space-y-8 animate-fadeIn relative z-10">
        {/* Header */}
        <header className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={onLeaveGame}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Quitter</span>
          </Button>
          
          <GameLogo size="md" />
          
          <Button
            variant="ghost"
            onClick={() => setShowSettings(!showSettings)}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Audio/Vidéo</span>
          </Button>
        </header>

        {/* Status Banner */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30">
            <Wifi className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-sm font-medium text-primary">
              {isHost ? "Vous êtes l'hôte" : "Connecté au lobby"}
            </span>
          </div>
          
          <h2 className="text-2xl font-display font-bold text-foreground">
            Salle d'attente
          </h2>
          <p className="text-foreground-secondary font-body">
            {isHost 
              ? "Partagez le code avec vos amis et lancez la partie quand tout le monde est prêt" 
              : "En attente que l'hôte lance la partie..."
            }
          </p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-6 items-start">
          {/* Players List */}
          <div className="flex justify-center">
            <PlayersList
              players={players}
              lobbyCode={lobbyCode}
              isHost={isHost}
              onStartGame={onStartGame}
            />
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="animate-slideInRight">
              <DeviceSettings showPreview={true} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};