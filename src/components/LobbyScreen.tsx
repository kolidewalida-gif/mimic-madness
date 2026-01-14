import { GameLogo } from "@/components/GameLogo";
import { PlayersList } from "@/components/PlayersList";
import { LobbyChat } from "@/components/LobbyChat";
import { GameModeSelector } from "@/components/GameModeSelector";
import { TeamDisplay } from "@/components/TeamDisplay";
import { LobbyInvitePanel } from "@/components/LobbyInvitePanel";
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
  onStartGame: (gameMode: 'normal' | '2v2' | 'quiz' | 'audiophone') => void;
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
  const [gameMode, setGameMode] = useState<'normal' | '2v2' | 'quiz' | 'audiophone'>('normal');
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
        setGameMode(data.game_mode as 'normal' | '2v2' | 'quiz' | 'audiophone');
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
            setGameMode(payload.new.game_mode as 'normal' | '2v2' | 'quiz' | 'audiophone');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lobbyId]);

  const handleGameModeChange = async (mode: 'normal' | '2v2' | 'quiz' | 'audiophone') => {
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

  const canStart = gameMode === 'normal' || gameMode === 'quiz' || gameMode === 'audiophone'
    ? players.filter(p => !p.isDisconnected).length >= 2 
    : (players.filter(p => !p.isDisconnected).length >= 4 && players.filter(p => !p.isDisconnected).length % 2 === 0 && teams.length > 0);

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-6 pb-28 relative overflow-hidden">
      {/* Enhanced Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background-secondary to-background" />
      
      {/* Animated floating orbs with glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute top-[-15%] right-[-5%] w-[600px] h-[600px] rounded-full bg-primary/20 blur-[120px]"
          style={{ animation: 'float 8s ease-in-out infinite' }}
        />
        <div 
          className="absolute bottom-[-15%] left-[-5%] w-[500px] h-[500px] rounded-full bg-accent/15 blur-[100px]"
          style={{ animation: 'float 10s ease-in-out infinite reverse' }}
        />
        <div 
          className="absolute top-[40%] left-[30%] w-[300px] h-[300px] rounded-full bg-secondary/10 blur-[80px]"
          style={{ animation: 'pulse 6s ease-in-out infinite' }}
        />
      </div>

      {/* Animated grid pattern */}
      <div 
        className="fixed inset-0 opacity-[0.03]" 
        style={{
          backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
          animation: 'gridMove 20s linear infinite'
        }} 
      />

      {/* Floating particles */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/40"
            style={{
              left: `${10 + (i * 7)}%`,
              top: `${20 + (i * 5) % 60}%`,
              animation: `floatParticle ${4 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`
            }}
          />
        ))}
      </div>

      <div className="w-full max-w-6xl mx-auto space-y-6 relative z-10 flex-1">
        {/* Header with enhanced animation */}
        <header className="flex items-center justify-between animate-fade-in">
          <Button
            variant="ghost"
            onClick={onLeaveGame}
            className="gap-2 rounded-xl hover:bg-destructive/10 hover:text-destructive group transition-all duration-300 hover:scale-105"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-300" />
            <span className="hidden sm:inline">Quitter</span>
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 -m-4 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <GameLogo size="sm" animated />
          </div>
          
          <Button
            variant="ghost"
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "gap-2 rounded-xl transition-all duration-300 hover:scale-105",
              showSettings && "bg-primary/10 text-primary shadow-lg shadow-primary/20"
            )}
          >
            <Settings className={cn(
              "h-4 w-4 transition-transform duration-500",
              showSettings && "rotate-180"
            )} />
            <span className="hidden sm:inline">Audio/Vidéo</span>
          </Button>
        </header>

        {/* Enhanced Status Banner */}
        <div className="text-center space-y-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-card/70 backdrop-blur-md border border-primary/20 shadow-lg shadow-primary/5 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 hover:scale-105 group">
            <div className="relative">
              <Wifi className="h-4 w-4 text-success" />
              <div className="absolute inset-0 bg-success/50 rounded-full blur-md animate-ping" />
            </div>
            <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              {isHost ? "Vous êtes l'hôte" : "Connecté au lobby"}
            </span>
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-success" />
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-success animate-ping" />
            </div>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-bold">
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
              Salle d'attente
            </span>
          </h1>
          <p className="text-foreground-muted text-sm max-w-md mx-auto leading-relaxed">
            {isHost 
              ? "Choisissez le mode de jeu et lancez la partie quand tout le monde est prêt" 
              : "En attente que l'hôte lance la partie..."
            }
          </p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-6 items-start">
          {/* Left Column - Players List + Invite Panel */}
          <div className="space-y-4">
            {/* Fortnite-style Invite Slots */}
            {isHost && (
              <LobbyInvitePanel
                lobbyCode={lobbyCode}
                lobbyId={lobbyId}
                players={players}
                maxPlayers={8}
                isHost={isHost}
              />
            )}
            
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
                    {gameMode === 'normal' ? '🎮 Normal' : gameMode === '2v2' ? '⚔️ 2v2' : gameMode === 'quiz' ? '🧠 Quiz' : '📞 Audio Phone'}
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
