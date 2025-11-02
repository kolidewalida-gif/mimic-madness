import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GameLogo } from "@/components/GameLogo";
import { GameCard } from "@/components/GameCard";
import { VolumeControl } from "@/components/VolumeControl";
import { DeviceSettings } from "@/components/DeviceSettings";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import { UserPlus, Users, Settings } from "lucide-react";

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
    <div className="min-h-screen animated-bg flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-8 animate-fadeIn">
        <div className="text-center">
          <GameLogo className="justify-center mb-6" />
          <p className="text-foreground-secondary text-lg">
            Le jeu d'imitation multijoueur ultime
          </p>
        </div>

        <GameCard glowing>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-foreground font-medium">
                Votre pseudo
              </label>
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
              />
            </div>

            {viewMode === "home" && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Button
                    variant="hero"
                    size="lg"
                    onClick={handleCreateGame}
                    disabled={!playerName.trim()}
                    className="w-full"
                  >
                    <UserPlus className="h-5 w-5" />
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
                </div>

                <div className="pt-2 border-t border-border space-y-3">
                  <VolumeControl />
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSettings(true)}
                      className="flex items-center gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      Paramètres audio/vidéo
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {viewMode === "join" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-foreground font-medium">
                    Code du lobby
                  </label>
                  <Input
                    placeholder="Ex: A4F1"
                    value={lobbyCode}
                    onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleJoinGame();
                      }
                    }}
                    maxLength={4}
                    className="text-center text-xl tracking-widest uppercase font-bold"
                  />
                </div>
                
                <div className="flex gap-3">
                  <Button
                    variant="outline"
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