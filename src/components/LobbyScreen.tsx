import { GameLogo } from "@/components/GameLogo";
import { PlayersList } from "@/components/PlayersList";
import { LobbyChat } from "@/components/LobbyChat";
import { GameModeSelector } from "@/components/GameModeSelector";
import { TeamDisplay } from "@/components/TeamDisplay";
import { Button } from "@/components/ui/button";
import { DeviceSettings } from "@/components/DeviceSettings";
import { ArrowLeft, Settings, Wifi, Sparkles, Zap, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { useGameTeams } from "@/hooks/useGameTeams";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface LobbyScreenProps {
  players: Player[];
  lobbyCode: string;
  lobbyId: string;
  isHost: boolean;
  currentPlayer: Player;
  onStartGame: (gameMode: 'normal' | '2v2' | 'quiz') => void;
  onLeaveGame: () => void;
}

export const LobbyScreen = ({ 
  players, 
  lobbyCode,
  lobbyId,
  isHost, 
  currentPlayer, 
  onStartGame, 
  onLeaveGame 
}: LobbyScreenProps) => {
  const [showSettings, setShowSettings] = useState(false);
  const [gameMode, setGameMode] = useState<'normal' | '2v2' | 'quiz'>('normal');
  const { teams, isLoading: teamsLoading, assignRandomTeams } = useGameTeams(lobbyId);
  const { toast } = useToast();

  // Subscribe to game mode changes from the lobby
  useEffect(() => {
    const fetchGameMode = async () => {
      const { data } = await supabase
        .from('lobbies')
        .select('game_mode')
        .eq('id', lobbyId)
        .single();
      
      if (data?.game_mode) {
        setGameMode(data.game_mode as 'normal' | '2v2' | 'quiz');
      }
    };

    fetchGameMode();

    const channel = supabase
      .channel(`lobby-mode:${lobbyId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lobbies',
          filter: `id=eq.${lobbyId}`
        },
        (payload: any) => {
          if (payload.new.game_mode) {
            setGameMode(payload.new.game_mode as 'normal' | '2v2' | 'quiz');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lobbyId]);

  const handleGameModeChange = async (mode: 'normal' | '2v2' | 'quiz') => {
    if (!isHost) return;

    try {
      await supabase
        .from('lobbies')
        .update({ game_mode: mode })
        .eq('id', lobbyId);

      setGameMode(mode);

      // Auto-assign teams if switching to 2v2
      if (mode === '2v2' && players.length >= 4 && players.length % 2 === 0) {
        await assignRandomTeams(players);
      }
    } catch (error) {
      console.error('Error updating game mode:', error);
      toast({
        title: "Erreur",
        description: "Impossible de changer le mode de jeu",
        variant: "destructive",
      });
    }
  };

  const handleShuffleTeams = async () => {
    await assignRandomTeams(players);
  };

  const handleStartGame = () => {
    if (gameMode === '2v2' && teams.length === 0) {
      toast({
        title: "Équipes requises",
        description: "Veuillez d'abord former les équipes",
        variant: "destructive",
      });
      return;
    }
    onStartGame(gameMode);
  };

  const canStart = gameMode === 'normal' || gameMode === 'quiz'
    ? players.length >= 2 
    : (players.length >= 4 && players.length % 2 === 0 && teams.length > 0);

  return (
    <div className="min-h-screen flex flex-col p-6 relative overflow-hidden">
      {/* Premium animated background */}
      <div className="floating-particles" />
      
      {/* Gradient overlays */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-background-secondary -z-20" />
      
      {/* Animated gradient orbs */}
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[180px] animate-float -z-10" />
      <div className="fixed bottom-0 left-0 w-[700px] h-[700px] bg-purple-500/10 rounded-full blur-[180px] animate-float -z-10" style={{ animationDelay: '2s' }} />
      <div className="fixed top-1/2 left-1/3 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[120px] animate-float -z-10" style={{ animationDelay: '4s' }} />
      
      {/* Animated grid overlay */}
      <div 
        className="fixed inset-0 opacity-[0.02] pointer-events-none -z-10"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      <div className="w-full max-w-6xl mx-auto space-y-8 relative z-10">
        {/* Header with premium styling */}
        <header className="flex items-center justify-between animate-fadeInDown">
          <Button
            variant="glass"
            onClick={onLeaveGame}
            className="gap-2 group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span className="hidden sm:inline">Quitter</span>
          </Button>
          
          <GameLogo size="md" animated />
          
          <Button
            variant="glass"
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "gap-2 group",
              showSettings && "bg-primary/20 border-primary/50"
            )}
          >
            <Settings className={cn(
              "h-4 w-4 transition-transform duration-500",
              showSettings && "rotate-180"
            )} />
            <span className="hidden sm:inline">Audio/Vidéo</span>
          </Button>
        </header>

        {/* Status Banner with premium animation */}
        <div className="text-center space-y-4 animate-fadeIn" style={{ animationDelay: '0.1s' }}>
          <div className={cn(
            "inline-flex items-center gap-3 px-6 py-3 rounded-full",
            "bg-gradient-to-r from-primary/20 via-purple-500/20 to-primary/20",
            "border border-primary/30 backdrop-blur-xl",
            "animate-shimmer shadow-lg shadow-primary/10"
          )}>
            <div className="relative">
              <Wifi className="h-4 w-4 text-primary" />
              <div className="absolute inset-0 animate-ping">
                <Wifi className="h-4 w-4 text-primary opacity-50" />
              </div>
            </div>
            <span className="text-sm font-medium text-primary">
              {isHost ? "Vous êtes l'hôte" : "Connecté au lobby"}
            </span>
            <Sparkles className="h-4 w-4 text-purple-400 animate-pulse" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-4xl font-display font-bold text-foreground flex items-center justify-center gap-3">
              <Zap className="h-8 w-8 text-primary animate-pulse" />
              Salle d'attente
              <Zap className="h-8 w-8 text-primary animate-pulse" />
            </h2>
            <p className="text-foreground-muted font-body max-w-md mx-auto">
              {isHost 
                ? "Choisissez le mode de jeu et lancez la partie quand tout le monde est prêt" 
                : "En attente que l'hôte lance la partie..."
              }
            </p>
          </div>
        </div>

        {/* Main Content with staggered animations */}
        <div className="grid lg:grid-cols-2 gap-6 items-start">
          {/* Left Column - Players List */}
          <div className="space-y-6 animate-slideInLeft" style={{ animationDelay: '0.2s' }}>
            <PlayersList
              players={players}
              lobbyCode={lobbyCode}
              lobbyId={lobbyId}
              isHost={isHost}
              onStartGame={handleStartGame}
              canStart={canStart}
              gameMode={gameMode}
            />
          </div>

          {/* Right Column - Game Mode & Teams / Settings */}
          <div className="space-y-6 animate-slideInRight" style={{ animationDelay: '0.3s' }}>
            {isHost && (
              <GameModeSelector
                gameMode={gameMode}
                onGameModeChange={handleGameModeChange}
                playerCount={players.length}
              />
            )}

            {!isHost && (
              <div className="relative rounded-2xl p-6 backdrop-blur-xl bg-background-secondary/40 border border-white/10 overflow-hidden group hover:border-white/20 transition-all duration-500">
                {/* Animated background */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative text-center space-y-3">
                  <p className="text-foreground-muted text-sm flex items-center justify-center gap-2">
                    <Users className="h-4 w-4" />
                    Mode sélectionné
                  </p>
                  <p className="text-2xl font-display font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                    {gameMode === 'normal' ? '🎮 Normal' : gameMode === '2v2' ? '⚔️ 2v2' : '🧠 Quiz'}
                  </p>
                </div>
              </div>
            )}

            {gameMode === '2v2' && (
              <div className="animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
                <TeamDisplay
                  teams={teams}
                  currentPlayerId={currentPlayer.id}
                  lobbyId={lobbyId}
                  isHost={isHost}
                  onShuffleTeams={handleShuffleTeams}
                  isLoading={teamsLoading}
                />
              </div>
            )}

            {showSettings && (
              <div className="animate-zoomInBounce">
                <DeviceSettings 
                  showPreview={true} 
                  playerId={currentPlayer.id}
                  playerName={currentPlayer.name}
                  lobbyId={lobbyId}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lobby Chat */}
      <LobbyChat
        lobbyId={lobbyId}
        playerId={currentPlayer.id}
        playerName={currentPlayer.name}
      />
    </div>
  );
};
