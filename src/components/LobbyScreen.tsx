import { GameLogo } from "@/components/GameLogo";
import { PlayersList } from "@/components/PlayersList";
import { LobbyChat } from "@/components/LobbyChat";
import { GameModeSelector } from "@/components/GameModeSelector";
import { TeamDisplay } from "@/components/TeamDisplay";
import { LobbyInvitePanel } from "@/components/LobbyInvitePanel";
import { DeviceSettings } from "@/components/DeviceSettings";
import { 
  HolographicCard, 
  NeonText, 
  FloatingParticles, 
  PremiumButton, 
  InteractiveWrapper,
  GlowingOrb,
  CyberGrid
} from "@/components/premium";
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
  onStartGame: (gameMode: 'normal' | '2v2' | 'quiz' | 'audiophone' | 'pixoguess') => void;
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
  const [gameMode, setGameMode] = useState<'normal' | '2v2' | 'quiz' | 'audiophone' | 'pixoguess'>('normal');
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
        setGameMode(data.game_mode as 'normal' | '2v2' | 'quiz' | 'audiophone' | 'pixoguess');
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
            setGameMode(payload.new.game_mode as 'normal' | '2v2' | 'quiz' | 'audiophone' | 'pixoguess');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lobbyId]);

  const handleGameModeChange = async (mode: 'normal' | '2v2' | 'quiz' | 'audiophone' | 'pixoguess') => {
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

  const canStart = gameMode === 'normal' || gameMode === 'quiz' || gameMode === 'audiophone' || gameMode === 'pixoguess'
    ? players.filter(p => !p.isDisconnected).length >= 2 
    : (players.filter(p => !p.isDisconnected).length >= 4 && players.filter(p => !p.isDisconnected).length % 2 === 0 && teams.length > 0);

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-6 pb-28 relative overflow-hidden">
      {/* Premium Cyber Grid Background */}
      <CyberGrid color="primary" opacity={0.04} animated />
      
      {/* Floating Particles */}
      <FloatingParticles count={50} color="mixed" speed="slow" size="small" glow />
      
      {/* Enhanced Glowing Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <GlowingOrb size="xl" color="primary" className="absolute top-[-15%] right-[-5%]" animated />
        <GlowingOrb size="lg" color="accent" className="absolute bottom-[-15%] left-[-5%]" animated />
        <GlowingOrb size="md" color="accent" className="absolute top-[40%] left-[30%]" intensity="low" />
      </div>

      <div className="w-full max-w-6xl mx-auto space-y-6 relative z-10 flex-1">
        {/* Header with premium animations */}
        <header className="flex items-center justify-between animate-fade-in">
          <InteractiveWrapper hoverLift clickSound="click">
            <PremiumButton
              variant="default"
              onClick={onLeaveGame}
              className="gap-2 bg-transparent hover:bg-destructive/10 hover:text-destructive"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-300" />
              <span className="hidden sm:inline">Quitter</span>
            </PremiumButton>
          </InteractiveWrapper>
          
          <div className="relative">
            <div className="absolute inset-0 -m-4 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <GameLogo size="sm" animated />
          </div>
          
          <InteractiveWrapper glow glowColor="hsl(var(--primary))" clickSound="click">
            <PremiumButton
              variant={showSettings ? "holographic" : "default"}
              onClick={() => setShowSettings(!showSettings)}
              className={cn("gap-2", !showSettings && "bg-transparent hover:bg-primary/10")}
            >
              <Settings className={cn(
                "h-4 w-4 transition-transform duration-500",
                showSettings && "rotate-180"
              )} />
              <span className="hidden sm:inline">Audio/Vidéo</span>
            </PremiumButton>
          </InteractiveWrapper>
        </header>

        {/* Enhanced Status Banner */}
        <div className="text-center space-y-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <InteractiveWrapper glow glowIntensity="low">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-card/70 backdrop-blur-md border border-primary/20 shadow-lg shadow-primary/5 group cursor-default">
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
          </InteractiveWrapper>
          
          <NeonText color="primary" size="4xl" animate="pulse">
            Salle d'attente
          </NeonText>
          
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
              <HolographicCard intensity="medium" className="p-0">
                <LobbyInvitePanel
                  lobbyCode={lobbyCode}
                  lobbyId={lobbyId}
                  players={players}
                  maxPlayers={8}
                  isHost={isHost}
                />
              </HolographicCard>
            )}
            
            <HolographicCard intensity="low" className="p-0 overflow-hidden">
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
            </HolographicCard>
          </div>

          {/* Right Column - Game Mode & Teams / Settings */}
          <div className="space-y-4">
            {isHost && (
              <HolographicCard intensity="medium" className="p-0 overflow-hidden">
                <GameModeSelector
                  gameMode={gameMode}
                  onGameModeChange={handleGameModeChange}
                  playerCount={players.filter(p => !p.isDisconnected).length}
                />
              </HolographicCard>
            )}

            {!isHost && (
              <HolographicCard intensity="low">
                <div className="text-center space-y-2 p-6">
                  <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider flex items-center justify-center gap-2">
                    <Users className="h-3.5 w-3.5" />
                    Mode sélectionné
                  </p>
                  <NeonText color="accent" size="2xl">
                    {gameMode === 'normal' ? '🎮 Normal' : gameMode === '2v2' ? '⚔️ 2v2' : gameMode === 'quiz' ? '🧠 Quiz' : '📞 Audio Phone'}
                  </NeonText>
                </div>
              </HolographicCard>
            )}

            {gameMode === '2v2' && (
              <HolographicCard intensity="medium" className="p-0 overflow-hidden">
                <TeamDisplay
                  teams={teams}
                  currentPlayerId={currentPlayer.id}
                  lobbyId={lobbyId}
                  isHost={isHost}
                  onShuffleTeams={handleShuffleTeams}
                  isLoading={teamsLoading}
                />
              </HolographicCard>
            )}

            {showSettings && (
              <HolographicCard intensity="high">
                <DeviceSettings 
                  showPreview={true} 
                  playerId={currentPlayer.id}
                  playerName={currentPlayer.name}
                  lobbyId={lobbyId}
                />
              </HolographicCard>
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
