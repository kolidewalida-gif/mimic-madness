import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GameLogo } from "@/components/GameLogo";
import { GameCard } from "@/components/GameCard";
import { VolumeControl } from "@/components/VolumeControl";
import { DeviceSettings } from "@/components/DeviceSettings";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Sparkles, Users, Settings, Gamepad2, Download, CheckCircle } from "lucide-react";
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
  const { isInstallable, isInstalled, installApp } = usePWAInstall();
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
      {/* Install Button - Fixed Position */}
      <div className="fixed top-6 right-6 z-50">
        {isInstalled ? (
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-accent border border-accent/30 bg-accent/10"
            disabled
          >
            <CheckCircle className="h-4 w-4" />
            Installé
          </Button>
        ) : isInstallable ? (
          <Button
            variant="outline"
            size="sm"
            onClick={installApp}
            className="gap-2 border-primary/50 hover:border-primary hover:bg-primary/10 animate-pulse-glow"
          >
            <Download className="h-4 w-4" />
            Installer l'app
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-muted/50 text-muted-foreground opacity-70"
            onClick={() => {
              // Show instructions for manual install
              alert("Pour installer l'application:\n\n• Chrome/Edge: Cliquez sur l'icône d'installation dans la barre d'adresse\n• Safari: Partager → Ajouter à l'écran d'accueil\n• Firefox: Menu → Installer l'application");
            }}
          >
            <Download className="h-4 w-4" />
            Installer l'app
          </Button>
        )}
      </div>

      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-float pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-secondary/20 rounded-full blur-3xl animate-float pointer-events-none" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-accent/10 rounded-full blur-2xl animate-float pointer-events-none" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-lg space-y-8 animate-fadeIn relative z-10">
        {/* Logo Section */}
        <div className="text-center space-y-4">
          <GameLogo className="justify-center mb-8" />
          <p className="text-foreground-secondary text-lg font-body">
            Le jeu d'imitation multijoueur ultime
          </p>
          <div className="flex items-center justify-center gap-2 text-primary/80">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Créez • Imitez • Votez</span>
            <Sparkles className="h-4 w-4" />
          </div>
        </div>

        {/* Main Card */}
        <GameCard glowing variant="accent">
          <div className="space-y-6">
            {/* Player Name Input */}
            <div className="space-y-2">
              <label className="text-foreground font-display text-sm tracking-wider uppercase">
                Votre Pseudo
              </label>
              <div className="relative">
                <Gamepad2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/60" />
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
                  className="pl-12 h-14 text-lg bg-background-secondary/50 border-primary/20 focus:border-primary focus:shadow-neon/50 rounded-xl font-body"
                />
              </div>
            </div>

            {viewMode === "home" && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Button
                    variant="hero"
                    size="xl"
                    onClick={handleCreateGame}
                    disabled={!playerName.trim()}
                    className="w-full"
                  >
                    <Sparkles className="h-5 w-5" />
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

                <div className="pt-4 border-t border-border/50 space-y-4">
                  <VolumeControl />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSettings(true)}
                    className="w-full justify-start text-foreground-secondary"
                  >
                    <Settings className="h-4 w-4" />
                    Paramètres audio/vidéo
                  </Button>
                </div>
              </div>
            )}

            {viewMode === "join" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-foreground font-display text-sm tracking-wider uppercase">
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
                    className="text-center text-3xl tracking-[0.5em] uppercase font-display font-bold h-16 bg-background-secondary/50 border-secondary/30 focus:border-secondary focus:shadow-neon-pink/50 rounded-xl"
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
                    variant="secondary"
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