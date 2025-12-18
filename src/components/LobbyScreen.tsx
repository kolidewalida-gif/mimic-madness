import { GameLogo } from "@/components/GameLogo";
import { PlayersList } from "@/components/PlayersList";
import { LobbyChat } from "@/components/LobbyChat";
import { GameModeSelector } from "@/components/GameModeSelector";
import { TeamDisplay } from "@/components/TeamDisplay";
import { Button } from "@/components/ui/button";
import { DeviceSettings } from "@/components/DeviceSettings";
import { ArrowLeft, Settings, Wifi, Sparkles } from "lucide-react";
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
      {/* Dark gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-background-secondary -z-20" />
      
      {/* Animated gradient orbs */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px] animate-float -z-10" />
      <div className="fixed bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[150px] animate-float -z-10" style={{ animationDelay: '2s' }} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px] animate-float -z-10" style={{ animationDelay: '4s' }} />
      
      {/* Subtle grid overlay */}
      <div 
        className="fixed inset-0 opacity-[0.02] pointer-events-none -z-10"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      <div className="w-full max-w-6xl mx-auto space-y-8 animate-fadeIn relative z-10">
        {/* Header */}
        <header className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={onLeaveGame}
            className="gap-2 hover:bg-white/10 transition-all duration-300"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Quitter</span>
          </Button>
          
          <GameLogo size="md" />
          
          <Button
            variant="ghost"
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "gap-2 transition-all duration-300",
              showSettings ? "bg-primary/20 text-primary" : "hover:bg-white/10"
            )}
          >
            <Settings className={cn("h-4 w-4", showSettings && "animate-spin")} />
            <span className="hidden sm:inline">Audio/Vidéo</span>
          </Button>
        </header>

        {/* Status Banner */}
        <div className="text-center space-y-3">
          <div className={cn(
            "inline-flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-300",
            "bg-gradient-to-r from-primary/20 to-purple-500/20",
            "border border-primary/30 backdrop-blur-sm"
          )}>
            <Wifi className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-sm font-medium text-primary">
              {isHost ? "Vous êtes l'hôte" : "Connecté au lobby"}
            </span>
            <Sparkles className="h-4 w-4 text-purple-400" />
          </div>
          
          <h2 className="text-3xl font-display font-bold text-foreground">
            Salle d'attente
          </h2>
          <p className="text-foreground-muted font-body max-w-md mx-auto">
            {isHost 
              ? "Choisissez le mode de jeu et lancez la partie quand tout le monde est prêt" 
              : "En attente que l'hôte lance la partie..."
            }
          </p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-6 items-start">
          {/* Left Column - Players List */}
          <div className="space-y-6">
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
          <div className="space-y-6">
            {isHost && (
              <GameModeSelector
                gameMode={gameMode}
                onGameModeChange={handleGameModeChange}
                playerCount={players.length}
              />
            )}

            {!isHost && (
              <div className="relative rounded-2xl p-6 backdrop-blur-xl bg-background-secondary/40 border border-white/10">
                <div className="text-center">
                  <p className="text-foreground-muted text-sm mb-2">Mode sélectionné</p>
                  <p className="text-xl font-display font-bold text-primary">
                    {gameMode === 'normal' ? '🎮 Normal' : gameMode === '2v2' ? '⚔️ 2v2' : '🧠 Quiz'}
                  </p>
                </div>
              </div>
            )}

            {gameMode === '2v2' && (
              <TeamDisplay
                teams={teams}
                currentPlayerId={currentPlayer.id}
                lobbyId={lobbyId}
                isHost={isHost}
                onShuffleTeams={handleShuffleTeams}
                isLoading={teamsLoading}
              />
            )}

            {showSettings && (
              <div className="animate-slideInRight">
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
