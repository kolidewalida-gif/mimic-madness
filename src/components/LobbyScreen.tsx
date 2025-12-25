import { GameLogo } from "@/components/GameLogo";
import { PlayersList } from "@/components/PlayersList";
import { LobbyChat } from "@/components/LobbyChat";
import { GameModeSelector } from "@/components/GameModeSelector";
import { TeamDisplay } from "@/components/TeamDisplay";
import { Button } from "@/components/ui/button";
import { DeviceSettings } from "@/components/DeviceSettings";
import { ArrowLeft, Settings, Sparkles, Users, Radio } from "lucide-react";
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
  onKickPlayer?: (playerId: string) => void;
  onTransferHost?: (playerId: string) => void;
}

export const LobbyScreen = ({ 
  players, 
  lobbyCode,
  lobbyId,
  isHost, 
  currentPlayer, 
  onStartGame, 
  onLeaveGame,
  onKickPlayer,
  onTransferHost
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
    <div className="min-h-screen flex flex-col p-6 relative overflow-hidden bg-mesh">
      {/* Animated orbs */}
      <div className="orb-container">
        <div className="orb orb-primary" />
        <div className="orb orb-accent" />
        <div className="orb orb-secondary" />
      </div>
      
      {/* Grid overlay */}
      <div className="fixed inset-0 bg-grid-modern pointer-events-none" />

      <div className="w-full max-w-7xl mx-auto space-y-8 relative z-10">
        {/* Header */}
        <header className="flex items-center justify-between animate-fadeInDown">
          <Button
            variant="glass"
            onClick={onLeaveGame}
            className="gap-2 group rounded-xl"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span className="hidden sm:inline font-medium">Quitter</span>
          </Button>
          
          <GameLogo size="md" animated />
          
          <Button
            variant="glass"
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "gap-2 group rounded-xl",
              showSettings && "bg-primary/20 border-primary/50"
            )}
          >
            <Settings className={cn(
              "h-4 w-4 transition-transform duration-500",
              showSettings && "rotate-180"
            )} />
            <span className="hidden sm:inline font-medium">Audio/Vidéo</span>
          </Button>
        </header>

        {/* Status Banner */}
        <div className="text-center space-y-5 animate-fadeIn" style={{ animationDelay: '0.1s' }}>
          <div className={cn(
            "inline-flex items-center gap-4 px-8 py-4 rounded-2xl",
            "glass-ultra",
            "shadow-lg"
          )}>
            <div className="relative">
              <Radio className="h-5 w-5 text-accent" />
              <div className="absolute inset-0 animate-ping">
                <Radio className="h-5 w-5 text-accent opacity-50" />
              </div>
            </div>
            <span className="text-sm font-semibold text-accent uppercase tracking-wider">
              {isHost ? "Vous êtes l'hôte" : "Connecté au lobby"}
            </span>
            <div className="w-2 h-2 rounded-full bg-success animate-pulse-glow" />
          </div>
          
          <div className="space-y-3">
            <h2 className="text-5xl font-bold text-foreground flex items-center justify-center gap-4 tracking-tight">
              <Sparkles className="h-10 w-10 text-primary animate-pulse" />
              <span className="text-gradient">Salle d'attente</span>
              <Sparkles className="h-10 w-10 text-primary animate-pulse" />
            </h2>
            <p className="text-foreground-muted font-medium max-w-lg mx-auto text-lg">
              {isHost 
                ? "Choisissez le mode de jeu et lancez la partie quand tout le monde est prêt" 
                : "En attente que l'hôte lance la partie..."
              }
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Left Column - Players List */}
          <div className="space-y-6 animate-slideInLeft" style={{ animationDelay: '0.2s' }}>
            <PlayersList
              players={players}
              lobbyCode={lobbyCode}
              lobbyId={lobbyId}
              isHost={isHost}
              currentPlayerId={currentPlayer.id}
              onStartGame={handleStartGame}
              onKickPlayer={isHost ? onKickPlayer : undefined}
              onTransferHost={isHost ? onTransferHost : undefined}
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
              <div className="card-premium">
                <div className="text-center space-y-4">
                  <p className="text-foreground-muted text-sm font-medium flex items-center justify-center gap-2 uppercase tracking-wider">
                    <Users className="h-4 w-4 text-primary" />
                    Mode sélectionné
                  </p>
                  <p className="text-3xl font-bold text-gradient">
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