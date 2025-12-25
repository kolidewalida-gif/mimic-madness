import { GameLogo } from "@/components/GameLogo";
import { PlayersList } from "@/components/PlayersList";
import { LobbyChat } from "@/components/LobbyChat";
import { GameModeSelector } from "@/components/GameModeSelector";
import { TeamDisplay } from "@/components/TeamDisplay";
import { Button } from "@/components/ui/button";
import { DeviceSettings } from "@/components/DeviceSettings";
import { ArrowLeft, Settings, Users, Wifi } from "lucide-react";
import { useState, useEffect } from "react";
import { useGameTeams } from "@/hooks/useGameTeams";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isDisconnected?: boolean;
  disconnectedTimeLeft?: number;
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
    ? players.filter(p => !p.isDisconnected).length >= 2 
    : (players.filter(p => !p.isDisconnected).length >= 4 && players.filter(p => !p.isDisconnected).length % 2 === 0 && teams.length > 0);

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-6 relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background-secondary to-background" />
      
      {/* Floating orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] right-[-5%] w-[500px] h-[500px] rounded-full bg-primary/15 blur-[100px] animate-pulse" />
        <div className="absolute bottom-[-15%] left-[-5%] w-[400px] h-[400px] rounded-full bg-accent/10 blur-[80px] animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      {/* Subtle grid */}
      <div className="fixed inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />

      <div className="w-full max-w-6xl mx-auto space-y-6 relative z-10 flex-1">
        {/* Header */}
        <header className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={onLeaveGame}
            className="gap-2 rounded-xl hover:bg-destructive/10 hover:text-destructive group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            <span className="hidden sm:inline">Quitter</span>
          </Button>
          
          <GameLogo size="sm" animated />
          
          <Button
            variant="ghost"
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "gap-2 rounded-xl",
              showSettings && "bg-primary/10 text-primary"
            )}
          >
            <Settings className={cn(
              "h-4 w-4 transition-transform duration-500",
              showSettings && "rotate-180"
            )} />
            <span className="hidden sm:inline">Audio/Vidéo</span>
          </Button>
        </header>

        {/* Status Banner */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-card/60 backdrop-blur-sm border border-border/30">
            <Wifi className="h-4 w-4 text-success" />
            <span className="text-sm font-medium text-foreground-muted">
              {isHost ? "Vous êtes l'hôte" : "Connecté au lobby"}
            </span>
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
            Salle d'attente
          </h1>
          <p className="text-foreground-muted text-sm max-w-md mx-auto">
            {isHost 
              ? "Choisissez le mode de jeu et lancez la partie quand tout le monde est prêt" 
              : "En attente que l'hôte lance la partie..."
            }
          </p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-6 items-start">
          {/* Left Column - Players List */}
          <div className="space-y-4">
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
          <div className="space-y-4">
            {isHost && (
              <GameModeSelector
                gameMode={gameMode}
                onGameModeChange={handleGameModeChange}
                playerCount={players.filter(p => !p.isDisconnected).length}
              />
            )}

            {!isHost && (
              <div className="bg-card/60 backdrop-blur-sm border border-border/30 rounded-2xl p-6">
                <div className="text-center space-y-2">
                  <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider flex items-center justify-center gap-2">
                    <Users className="h-3.5 w-3.5" />
                    Mode sélectionné
                  </p>
                  <p className="text-2xl font-bold">
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
              <DeviceSettings 
                showPreview={true} 
                playerId={currentPlayer.id}
                playerName={currentPlayer.name}
                lobbyId={lobbyId}
              />
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
