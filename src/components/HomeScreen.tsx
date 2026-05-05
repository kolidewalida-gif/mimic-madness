import { useState, memo, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { VolumeControl } from "@/components/VolumeControl";
import { SoundEffectsVolumeControl } from "@/components/SoundEffectsVolumeControl";
import { DeviceSettings } from "@/components/DeviceSettings";
import { ThemeSelector } from "@/components/ThemeSelector";
import { ProfileSidebar } from "@/components/ProfileSidebar";
import { FriendsSidebar } from "@/components/FriendsSidebar";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import { useAuth } from "@/hooks/useAuth";
import { 
  HolographicCard, 
  NeonText, 
  FloatingParticles, 
  PremiumButton, 
  InteractiveWrapper,
  GlowingOrb,
  CyberGrid
} from "@/components/premium";
import { Play, Users, Settings, User, Zap, ArrowRight, ChevronLeft, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

interface HomeScreenProps {
  onCreateGame: (playerName: string) => void;
  onJoinGame: (playerName: string, lobbyCode: string) => void;
}

type ViewMode = "home" | "join";

const HomeScreenComponent = ({ onCreateGame, onJoinGame }: HomeScreenProps) => {
  const { profile } = useAuth();
  const [playerName, setPlayerName] = useState("");
  const [lobbyCode, setLobbyCode] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("home");
  const [showSettings, setShowSettings] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const { play } = useBackgroundMusic();

  // Pre-fill player name from profile if logged in
  useEffect(() => {
    if (profile?.display_name && !playerName) {
      setPlayerName(profile.display_name);
    }
  }, [profile?.display_name]);

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

  const handleJoinFriend = useCallback((code: string) => {
    if (playerName.trim()) {
      setLobbyCode(code);
      play();
      onJoinGame(playerName.trim(), code);
    } else {
      setLobbyCode(code);
      setViewMode("join");
    }
  }, [playerName, play, onJoinGame]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 pb-28 relative overflow-y-auto overflow-x-hidden">
      {/* Cyber Grid Background */}
      <CyberGrid color="primary" opacity={0.03} animated />
      
      {/* Floating Particles */}
      <FloatingParticles count={60} color="mixed" speed="slow" size="medium" glow />
      
      {/* Enhanced Glowing Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <GlowingOrb size="xl" color="primary" className="absolute top-[-10%] right-[-5%]" />
        <GlowingOrb size="lg" color="accent" className="absolute bottom-[-10%] left-[-5%]" />
        <GlowingOrb size="md" color="accent" className="absolute top-[30%] left-[20%]" intensity="low" />
      </div>

      {/* Main Layout */}
      <div className="relative z-10 flex items-start justify-center gap-6 w-full max-w-6xl my-auto py-8">
        {/* Left Panel - Profile */}
        <div className="hidden lg:flex flex-shrink-0">
          <ProfileSidebar />
        </div>

        {/* Center Content - Scrollable */}
        <div className="w-full max-w-md space-y-6 max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-thin pr-2">
          {/* Curved Logo Text with NeonText */}
          <div className="text-center mb-2">
            <div className="relative inline-block">
              <div className="absolute inset-0 -m-8 bg-primary/20 rounded-full blur-[60px] animate-pulse-glow" />
              {/* Curved MIMIC MASTER text */}
              <svg viewBox="0 0 300 80" className="w-72 h-auto mx-auto relative">
                <defs>
                  <path id="curve" d="M 20,60 Q 150,0 280,60" fill="transparent" />
                  <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="50%" stopColor="hsl(var(--accent))" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                {/* Glow layer */}
                <text fill="url(#textGradient)" filter="url(#glow)" opacity="0.6">
                  <textPath href="#curve" startOffset="50%" textAnchor="middle" className="text-3xl font-black tracking-wider" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    MIMIC MASTER
                  </textPath>
                </text>
                {/* Main text */}
                <text fill="url(#textGradient)">
                  <textPath href="#curve" startOffset="50%" textAnchor="middle" className="text-3xl font-black tracking-wider" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    MIMIC MASTER
                  </textPath>
                </text>
              </svg>
            </div>
          </div>

          {/* Main Card - HolographicCard */}
          <HolographicCard intensity="high" className="p-6">
            <div className="space-y-5">
              {/* Player Name Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground-muted uppercase tracking-wider flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-primary" />
                  Votre pseudo
                </label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted z-10" />
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
                      "transition-all duration-300",
                      isInputFocused && "border-primary/50 shadow-lg shadow-primary/20"
                    )}
                  />
                  {isInputFocused && (
                    <div className="absolute inset-0 -m-0.5 bg-gradient-to-r from-primary/30 via-accent/20 to-primary/30 rounded-xl blur-sm -z-10 animate-pulse" />
                  )}
                </div>
              </div>

              {viewMode === "home" && (
                <div className="space-y-3 pt-1">
                  <InteractiveWrapper magnetic hoverScale={1.03} clickSound="click">
                    <PremiumButton
                      variant="neon"
                      size="lg"
                      onClick={handleCreateGame}
                      disabled={!playerName.trim()}
                      className="w-full"
                    >
                      <Play className="h-5 w-5 mr-2" fill="currentColor" />
                      Créer une Partie
                      <ArrowRight className="h-4 w-4 ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </PremiumButton>
                  </InteractiveWrapper>
                  
                  <InteractiveWrapper hoverLift hoverScale={1.02} clickSound="click">
                    <PremiumButton
                      variant="holographic"
                      size="md"
                      onClick={() => setViewMode("join")}
                      disabled={!playerName.trim()}
                      className="w-full"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Rejoindre une Partie
                    </PremiumButton>
                  </InteractiveWrapper>

                  <div className="relative py-3">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border/30" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-card/80 px-3 text-xs text-foreground-muted uppercase tracking-wider backdrop-blur-sm">
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
                    
                    <InteractiveWrapper glow glowColor="hsl(var(--primary))" clickSound="click">
                      <PremiumButton
                        variant="default"
                        size="sm"
                        onClick={() => setShowSettings(true)}
                        className="w-full justify-start bg-transparent hover:bg-primary/10"
                      >
                        <Settings className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform duration-500" />
                        Paramètres audio/vidéo
                      </PremiumButton>
                    </InteractiveWrapper>
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
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-accent to-primary rounded-xl opacity-50 blur-sm animate-gradient" />
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
                    <InteractiveWrapper hoverLift clickSound="click">
                      <PremiumButton
                        variant="default"
                        onClick={resetToHome}
                        className="flex-1 bg-transparent hover:bg-muted"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                        Retour
                      </PremiumButton>
                    </InteractiveWrapper>
                    <InteractiveWrapper magnetic clickSound="success">
                      <PremiumButton
                        variant="cyber"
                        onClick={handleJoinGame}
                        disabled={!playerName.trim() || lobbyCode.length !== 4}
                        className="flex-1"
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        Rejoindre
                      </PremiumButton>
                    </InteractiveWrapper>
                  </div>
                </div>
              )}
            </div>
          </HolographicCard>

          {showSettings && (
            <div className="animate-fadeIn">
              <HolographicCard intensity="medium">
                <DeviceSettings showPreview={true} onClose={() => setShowSettings(false)} />
              </HolographicCard>
            </div>
          )}
        </div>

        {/* Right Panel - Friends */}
        <div className="hidden lg:flex flex-shrink-0">
          <FriendsSidebar onJoinFriend={handleJoinFriend} />
        </div>
      </div>
    </div>
  );
};

export const HomeScreen = memo(HomeScreenComponent);
