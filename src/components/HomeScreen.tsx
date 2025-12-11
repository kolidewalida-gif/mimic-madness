import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GameLogo } from "@/components/GameLogo";
import { GameCard } from "@/components/GameCard";
import { VolumeControl } from "@/components/VolumeControl";
import { DeviceSettings } from "@/components/DeviceSettings";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import { Play, Users, Settings, User } from "lucide-react";

interface HomeScreenProps {
  onCreateGame: (playerName: string) => void;
  onJoinGame: (playerName: string, lobbyCode: string) => void;
}

type ViewMode = "home" | "join";

export const HomeScreen = ({ onCreateGame, onJoinGame }: HomeScreenProps) => {
  const [playerName, setPlayerName] = useState("");
  const [lobbyCode, setLobbyCode] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("home");
  const [showSettings, setShowSettings] = useState(false);
  const { play } = useBackgroundMusic();

  const handleCreateGame = () => {
    if (playerName.trim()) {
      play();
      onCreateGame(playerName.trim());
    }
  };

  const handleJoinGame = () => {
    if (playerName.trim() && lobbyCode.trim()) {
      play();
      onJoinGame(playerName.trim(), lobbyCode.trim().toUpperCase());
    }
  };

  const resetToHome = () => {
    setViewMode("home");
    setLobbyCode("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative z-10">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />

      <div className="w-full max-w-md space-y-8 animate-fadeIn relative z-10">
        {/* Logo Section */}
        <div className="text-center space-y-6">
          <GameLogo className="justify-center mb-6" />
          <p className="text-foreground-secondary text-base font-body">
            Le jeu d'imitation multijoueur ultime
          </p>
        </div>

        {/* Main Card */}
        <GameCard variant="default" glowing={false} animated={false}>
          <div className="space-y-5">
            {/* Player Name Input */}
            <div className="space-y-2">
              <label className="text-foreground-secondary text-sm font-medium">
                Votre pseudo
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
                <Input
                  placeholder="Entrez votre pseudo..."
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      if (viewMode === "home") {
                        setViewMode("join");
                      } else if (viewMode === "join") {
                        handleJoinGame();
                      }
                    }
                  }}
                  className="pl-10 h-12 text-base bg-muted border-border focus:border-primary focus:ring-primary/20"
                />
              </div>
            </div>

            {viewMode === "home" && (
              <div className="space-y-3 pt-2">
                <Button
                  variant="hero"
                  size="lg"
                  onClick={handleCreateGame}
                  disabled={!playerName.trim()}
                  className="w-full"
                >
                  <Play className="h-5 w-5" fill="currentColor" />
                  Créer une Partie
                </Button>
                
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setViewMode("join")}
                  disabled={!playerName.trim()}
                  className="w-full"
                >
                  <Users className="h-5 w-5" />
                  Rejoindre une Partie
                </Button>

                <div className="pt-4 border-t border-border space-y-3">
                  <VolumeControl />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSettings(true)}
                    className="w-full justify-start text-foreground-muted hover:text-foreground"
                  >
                    <Settings className="h-4 w-4" />
                    Paramètres audio/vidéo
                  </Button>
                </div>
              </div>
            )}

            {viewMode === "join" && (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-foreground-secondary text-sm font-medium">
                    Code du Lobby
                  </label>
                  <Input
                    placeholder="XXXX"
                    value={lobbyCode}
                    onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleJoinGame();
                      }
                    }}
                    maxLength={4}
                    className="text-center text-2xl tracking-[0.4em] uppercase font-bold h-14 bg-muted border-border focus:border-primary"
                  />
                </div>
                
                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    onClick={resetToHome}
                    className="flex-1"
                  >
                    Retour
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleJoinGame}
                    disabled={!playerName.trim() || !lobbyCode.trim()}
                    className="flex-1"
                  >
                    Rejoindre
                  </Button>
                </div>
              </div>
            )}
          </div>
        </GameCard>

        {showSettings && (
          <div className="animate-fadeIn">
            <DeviceSettings showPreview={true} onClose={() => setShowSettings(false)} />
          </div>
        )}
      </div>
    </div>
  );
};
