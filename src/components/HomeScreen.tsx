import { useState, memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GameLogo } from "@/components/GameLogo";
import { VolumeControl } from "@/components/VolumeControl";
import { SoundEffectsVolumeControl } from "@/components/SoundEffectsVolumeControl";
import { DeviceSettings } from "@/components/DeviceSettings";
import { ThemeSelector } from "@/components/ThemeSelector";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import { Play, Users, Settings, User, Zap, ArrowRight, Gamepad2, ChevronLeft, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

interface HomeScreenProps {
  onCreateGame: (playerName: string) => void;
  onJoinGame: (playerName: string, lobbyCode: string) => void;
}

type ViewMode = "home" | "join";

const HomeScreenComponent = ({ onCreateGame, onJoinGame }: HomeScreenProps) => {
  const [playerName, setPlayerName] = useState("");
  const [lobbyCode, setLobbyCode] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("home");
  const [showSettings, setShowSettings] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const { play } = useBackgroundMusic();

  const handleCreateGame = useCallback(() => {
    if (playerName.trim()) {
      play();
      onCreateGame(playerName.trim());
    }
  }, [playerName, play, onCreateGame]);

  const handleJoinGame = useCallback(() => {
    if (playerName.trim() && lobbyCode.trim()) {
      play();
      onJoinGame(playerName.trim(), lobbyCode.trim().toUpperCase());
    }
  }, [playerName, lobbyCode, play, onJoinGame]);

  const resetToHome = useCallback(() => {
    setViewMode("home");
    setLobbyCode("");
  }, []);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (viewMode === "home" && playerName.trim()) handleCreateGame();
      else if (viewMode === "join") handleJoinGame();
    }
  }, [viewMode, playerName, handleCreateGame, handleJoinGame]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 pb-28 relative">
      {/* Simplified background */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background-secondary to-background" />
      
      {/* Reduced floating orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-accent/10 blur-[100px]" />
      </div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Logo Section */}
        <div className="text-center space-y-2">
          <div className="relative inline-block">
            <div className="absolute inset-0 -m-8 bg-primary/20 rounded-full blur-[60px]" />
            <GameLogo className="justify-center relative" animated />
          </div>
        </div>

        {/* Main Card */}
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20 rounded-3xl blur-xl opacity-60" />
          
          <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-2xl">
            <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 border-primary/40 rounded-tl-2xl" />
            <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 border-accent/40 rounded-br-2xl" />

            <div className="space-y-5">
              {/* Player Name Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground-muted uppercase tracking-wider flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-primary" />
                  Votre pseudo
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
                  <Input
                    placeholder="Entrez votre pseudo..."
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    onKeyPress={handleKeyPress}
                    className={cn(
                      "pl-10 h-12 bg-background/50 border-border/50 rounded-xl",
                      "focus:border-primary focus:ring-2 focus:ring-primary/20",
                      "transition-all duration-200",
                      isInputFocused && "border-primary/50 shadow-lg shadow-primary/10"
                    )}
                  />
                </div>
              </div>

              {viewMode === "home" && (
                <div className="space-y-3 pt-1">
                  <Button
                    onClick={handleCreateGame}
                    disabled={!playerName.trim()}
                    className={cn(
                      "w-full h-14 rounded-xl font-bold text-base",
                      "bg-gradient-to-r from-primary to-primary-hover",
                      "hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.02]",
                      "active:scale-[0.98] transition-all duration-200",
                      "disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none",
                      "group relative overflow-hidden"
                    )}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <Play className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" fill="currentColor" />
                    Créer une Partie
                    <ArrowRight className="h-4 w-4 ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => setViewMode("join")}
                    disabled={!playerName.trim()}
                    className={cn(
                      "w-full h-12 rounded-xl font-semibold",
                      "bg-background/50 border-border/50",
                      "hover:bg-background hover:border-primary/50 hover:shadow-md",
                      "transition-all duration-200 group"
                    )}
                  >
                    <Users className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                    Rejoindre une Partie
                  </Button>

                  <div className="relative py-3">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border/30" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-card px-3 text-xs text-foreground-muted uppercase tracking-wider">
                        Options
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <VolumeControl />
                    <SoundEffectsVolumeControl />
                    
                    <div className="pt-1">
                      <ThemeSelector variant="compact" className="justify-center" />
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSettings(true)}
                      className="w-full justify-start text-foreground-muted hover:text-foreground rounded-xl group"
                    >
                      <Settings className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform duration-500" />
                      Paramètres audio/vidéo
                    </Button>
                  </div>
                </div>
              )}

              {viewMode === "join" && (
                <div className="space-y-4 pt-1 animate-fadeIn">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground-muted uppercase tracking-wider flex items-center gap-2">
                      <Hash className="h-3.5 w-3.5 text-accent" />
                      Code du Lobby
                    </label>
                    <div className="relative">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-accent to-primary rounded-xl opacity-50 blur-sm" />
                      <Input
                        placeholder="XXXX"
                        value={lobbyCode}
                        onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
                        onKeyPress={(e) => e.key === "Enter" && handleJoinGame()}
                        maxLength={4}
                        className={cn(
                          "relative text-center text-3xl sm:text-4xl tracking-[0.3em] uppercase font-bold",
                          "h-16 sm:h-20 bg-background/90 border-0 rounded-xl",
                          "focus:ring-2 focus:ring-primary"
                        )}
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      variant="ghost"
                      onClick={resetToHome}
                      className="flex-1 h-11 rounded-xl group"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                      Retour
                    </Button>
                    <Button
                      onClick={handleJoinGame}
                      disabled={!playerName.trim() || lobbyCode.length !== 4}
                      className={cn(
                        "flex-1 h-11 rounded-xl font-bold",
                        "bg-gradient-to-r from-accent to-primary",
                        "hover:shadow-lg hover:shadow-accent/30 hover:scale-[1.02]",
                        "transition-all duration-200"
                      )}
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Rejoindre
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {showSettings && (
          <div className="animate-fadeIn">
            <DeviceSettings showPreview={true} onClose={() => setShowSettings(false)} />
          </div>
        )}
      </div>
    </div>
  );
};

export const HomeScreen = memo(HomeScreenComponent);
