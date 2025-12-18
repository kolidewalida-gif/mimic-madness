import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GameLogo } from "@/components/GameLogo";
import { GameCard } from "@/components/GameCard";
import { VolumeControl } from "@/components/VolumeControl";
import { SoundEffectsVolumeControl } from "@/components/SoundEffectsVolumeControl";
import { DeviceSettings } from "@/components/DeviceSettings";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import { Play, Users, Settings, User, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [isInputFocused, setIsInputFocused] = useState(false);
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
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Animated background particles */}
      <div className="floating-particles" />
      
      {/* Premium gradient overlays */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-[150px] animate-float -z-10" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[150px] animate-float -z-10" style={{ animationDelay: '3s' }} />
      
      {/* Animated grid pattern */}
      <div 
        className="fixed inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />

      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Logo Section with premium animation */}
        <div className="text-center space-y-6 animate-fadeInDown">
          <div className="relative inline-block">
            {/* Glow ring behind logo */}
            <div className="absolute inset-0 -m-8 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />
            <GameLogo className="justify-center mb-6 relative" animated />
          </div>
          
          <p className="text-foreground-secondary text-base font-body flex items-center justify-center gap-2 animate-fadeIn" style={{ animationDelay: '0.2s' }}>
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            Le jeu d'imitation multijoueur ultime
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          </p>
        </div>

        {/* Main Card with premium styling */}
        <div className="animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
          <GameCard variant="premium" hover3D className="backdrop-blur-xl bg-card/80">
            <div className="space-y-5">
              {/* Player Name Input with glow effect */}
              <div className="space-y-2">
                <label className="text-foreground-secondary text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Votre pseudo
                </label>
                <div className={cn(
                  "relative transition-all duration-300",
                  isInputFocused && "scale-[1.02]"
                )}>
                  {/* Input glow effect */}
                  <div className={cn(
                    "absolute -inset-1 bg-gradient-to-r from-primary/50 to-purple-500/50 rounded-lg blur opacity-0 transition-opacity duration-300",
                    isInputFocused && "opacity-100"
                  )} />
                  
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted z-10" />
                    <Input
                      placeholder="Entrez votre pseudo..."
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      onFocus={() => setIsInputFocused(true)}
                      onBlur={() => setIsInputFocused(false)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          if (viewMode === "home") {
                            setViewMode("join");
                          } else if (viewMode === "join") {
                            handleJoinGame();
                          }
                        }
                      }}
                      className="pl-10 h-12 text-base bg-background/50 border-border/50 focus:border-primary focus:ring-primary/20 backdrop-blur-sm transition-all duration-300"
                    />
                  </div>
                </div>
              </div>

              {viewMode === "home" && (
                <div className="space-y-3 pt-2">
                  {/* Create Game Button - Premium */}
                  <Button
                    variant="hero"
                    size="xl"
                    onClick={handleCreateGame}
                    disabled={!playerName.trim()}
                    className="w-full group animate-fadeIn"
                    style={{ animationDelay: '0.4s' }}
                  >
                    <div className="relative flex items-center justify-center gap-2">
                      <Play className="h-5 w-5 transition-transform group-hover:scale-110" fill="currentColor" />
                      <span>Créer une Partie</span>
                      <Zap className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity absolute -right-6" />
                    </div>
                  </Button>
                  
                  {/* Join Game Button */}
                  <Button
                    variant="glass"
                    size="lg"
                    onClick={() => setViewMode("join")}
                    disabled={!playerName.trim()}
                    className="w-full group animate-fadeIn"
                    style={{ animationDelay: '0.5s' }}
                  >
                    <Users className="h-5 w-5 transition-transform group-hover:scale-110" />
                    <span>Rejoindre une Partie</span>
                  </Button>

                  {/* Settings Section */}
                  <div className="pt-4 border-t border-border/50 space-y-3 animate-fadeIn" style={{ animationDelay: '0.6s' }}>
                    <VolumeControl />
                    <SoundEffectsVolumeControl />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSettings(true)}
                      className="w-full justify-start text-foreground-muted hover:text-foreground group"
                    >
                      <Settings className="h-4 w-4 transition-transform group-hover:rotate-90 duration-500" />
                      Paramètres audio/vidéo
                    </Button>
                  </div>
                </div>
              )}

              {viewMode === "join" && (
                <div className="space-y-4 pt-2 animate-fadeInUp">
                  <div className="space-y-2">
                    <label className="text-foreground-secondary text-sm font-medium">
                      Code du Lobby
                    </label>
                    <div className="relative">
                      {/* Animated border */}
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-purple-500 to-primary rounded-lg opacity-50 blur animate-gradient" />
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
                        className="relative text-center text-3xl tracking-[0.5em] uppercase font-bold h-16 bg-background/80 border-0 focus:ring-2 focus:ring-primary"
                      />
                    </div>
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
                      variant="hero"
                      onClick={handleJoinGame}
                      disabled={!playerName.trim() || !lobbyCode.trim()}
                      className="flex-1"
                    >
                      <Zap className="h-4 w-4" />
                      Rejoindre
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </GameCard>
        </div>

        {/* Settings Modal */}
        {showSettings && (
          <div className="animate-fadeInScale">
            <DeviceSettings showPreview={true} onClose={() => setShowSettings(false)} />
          </div>
        )}
      </div>
    </div>
  );
};
