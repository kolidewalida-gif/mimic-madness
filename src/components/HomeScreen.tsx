import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GameLogo } from "@/components/GameLogo";
import { VolumeControl } from "@/components/VolumeControl";
import { SoundEffectsVolumeControl } from "@/components/SoundEffectsVolumeControl";
import { DeviceSettings } from "@/components/DeviceSettings";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import { Play, Users, Settings, User, Sparkles, Zap, ArrowRight, Gamepad2 } from "lucide-react";
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
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-mesh">
      {/* Animated orbs */}
      <div className="orb-container">
        <div className="orb orb-primary" />
        <div className="orb orb-accent" />
        <div className="orb orb-secondary" />
      </div>
      
      {/* Grid overlay */}
      <div className="fixed inset-0 bg-grid-modern pointer-events-none" />

      <div className="w-full max-w-lg space-y-10 relative z-10">
        {/* Logo Section */}
        <div className="text-center space-y-6 animate-fadeInDown">
          <div className="relative inline-block">
            {/* Glow ring behind logo */}
            <div className="absolute inset-0 -m-12 bg-primary/20 rounded-full blur-[80px] animate-pulse-slow" />
            <GameLogo className="justify-center mb-4 relative" animated />
          </div>
          
          <p className="text-foreground-secondary text-lg font-medium flex items-center justify-center gap-3 animate-fadeIn" style={{ animationDelay: '0.2s' }}>
            <Gamepad2 className="h-5 w-5 text-accent animate-bounce-slow" />
            Le jeu d'imitation ultime
            <Gamepad2 className="h-5 w-5 text-accent animate-bounce-slow" style={{ animationDelay: '0.5s' }} />
          </p>
        </div>

        {/* Main Card */}
        <div className="animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
          <div className="card-premium">
            {/* Decorative corner accents */}
            <div className="absolute top-0 left-0 w-20 h-20 border-l-2 border-t-2 border-primary/30 rounded-tl-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-20 h-20 border-r-2 border-b-2 border-accent/30 rounded-br-3xl pointer-events-none" />
            
            <div className="space-y-6 relative">
              {/* Player Name Input */}
              <div className="space-y-3">
                <label className="text-foreground-secondary text-sm font-semibold flex items-center gap-2 uppercase tracking-wider">
                  <User className="h-4 w-4 text-primary" />
                  Votre pseudo
                </label>
                <div className={cn(
                  "relative transition-all duration-500",
                  isInputFocused && "scale-[1.02]"
                )}>
                  {/* Input glow effect */}
                  <div className={cn(
                    "absolute -inset-1 rounded-xl blur-md opacity-0 transition-all duration-500",
                    "bg-gradient-to-r from-primary/50 via-accent/30 to-primary/50",
                    isInputFocused && "opacity-100"
                  )} />
                  
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground-muted z-10 transition-colors duration-300" />
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
                      className="pl-12 h-14 text-base bg-background/60 border-border/50 focus:border-primary focus:ring-primary/30 backdrop-blur-sm transition-all duration-300 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {viewMode === "home" && (
                <div className="space-y-4 pt-2">
                  {/* Create Game Button */}
                  <Button
                    variant="hero"
                    size="xl"
                    onClick={handleCreateGame}
                    disabled={!playerName.trim()}
                    className="w-full group animate-fadeIn rounded-xl h-16"
                    style={{ animationDelay: '0.4s' }}
                  >
                    <div className="relative flex items-center justify-center gap-3">
                      <Play className="h-6 w-6 transition-transform group-hover:scale-110" fill="currentColor" />
                      <span className="text-lg font-bold tracking-wide">Créer une Partie</span>
                      <ArrowRight className="h-5 w-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                    </div>
                  </Button>
                  
                  {/* Join Game Button */}
                  <Button
                    variant="glass"
                    size="lg"
                    onClick={() => setViewMode("join")}
                    disabled={!playerName.trim()}
                    className="w-full group animate-fadeIn rounded-xl h-14"
                    style={{ animationDelay: '0.5s' }}
                  >
                    <Users className="h-5 w-5 transition-transform group-hover:scale-110" />
                    <span className="font-semibold">Rejoindre une Partie</span>
                  </Button>

                  {/* Divider */}
                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border/50" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-card px-4 text-xs text-foreground-muted uppercase tracking-widest">
                        Paramètres
                      </span>
                    </div>
                  </div>

                  {/* Settings Section */}
                  <div className="space-y-3 animate-fadeIn" style={{ animationDelay: '0.6s' }}>
                    <VolumeControl />
                    <SoundEffectsVolumeControl />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSettings(true)}
                      className="w-full justify-start text-foreground-muted hover:text-foreground group rounded-xl"
                    >
                      <Settings className="h-4 w-4 transition-transform group-hover:rotate-90 duration-500" />
                      <span>Paramètres audio/vidéo</span>
                    </Button>
                  </div>
                </div>
              )}

              {viewMode === "join" && (
                <div className="space-y-5 pt-2 animate-fadeInUp">
                  <div className="space-y-3">
                    <label className="text-foreground-secondary text-sm font-semibold flex items-center gap-2 uppercase tracking-wider">
                      <Sparkles className="h-4 w-4 text-accent" />
                      Code du Lobby
                    </label>
                    <div className="relative group">
                      {/* Animated border */}
                      <div className="absolute -inset-1 bg-gradient-to-r from-primary via-accent to-primary rounded-xl opacity-50 blur group-focus-within:opacity-100 animate-gradient transition-opacity" />
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
                        className="relative text-center text-4xl tracking-[0.5em] uppercase font-bold h-20 bg-background/80 border-0 focus:ring-2 focus:ring-primary rounded-xl"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      variant="ghost"
                      onClick={resetToHome}
                      className="flex-1 rounded-xl h-12"
                    >
                      Retour
                    </Button>
                    <Button
                      variant="hero"
                      onClick={handleJoinGame}
                      disabled={!playerName.trim() || !lobbyCode.trim()}
                      className="flex-1 rounded-xl h-12"
                    >
                      <Zap className="h-5 w-5" />
                      <span className="font-bold">Rejoindre</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom accent line */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-gradient-to-r from-transparent via-primary/60 to-transparent rounded-full" />
          </div>
        </div>

        {/* Settings Modal */}
        {showSettings && (
          <div className="animate-zoomInBounce">
            <DeviceSettings showPreview={true} onClose={() => setShowSettings(false)} />
          </div>
        )}
      </div>
    </div>
  );
};
