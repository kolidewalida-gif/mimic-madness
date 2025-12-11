import { GameLogo } from "@/components/GameLogo";
import { PlayersList } from "@/components/PlayersList";
import { LobbyChat } from "@/components/LobbyChat";
import { GameModeSelector } from "@/components/GameModeSelector";
import { TeamDisplay } from "@/components/TeamDisplay";
import { Button } from "@/components/ui/button";
import { DeviceSettings } from "@/components/DeviceSettings";
import { ArrowLeft, Settings, Wifi } from "lucide-react";
import { useState, useEffect } from "react";
import { useGameTeams } from "@/hooks/useGameTeams";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  onStartGame: (gameMode: 'normal' | '2v2') => void;
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
  const [gameMode, setGameMode] = useState<'normal' | '2v2'>('normal');
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
        setGameMode(data.game_mode as 'normal' | '2v2');
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
            setGameMode(payload.new.game_mode as 'normal' | '2v2');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lobbyId]);

  const handleGameModeChange = async (mode: 'normal' | '2v2') => {
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

  const canStart = gameMode === 'normal' 
    ? players.length >= 2 
    : (players.length >= 4 && players.length % 2 === 0 && teams.length > 0);

  return (
    <div className="min-h-screen animated-bg flex flex-col p-6 relative">
      {/* Decorative elements */}
      <div className="absolute top-40 right-20 w-48 h-48 bg-primary/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-40 left-20 w-56 h-56 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />

      <div className="w-full max-w-6xl mx-auto space-y-8 animate-fadeIn relative z-10">
        {/* Header */}
        <header className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={onLeaveGame}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Quitter</span>
          </Button>
          
          <GameLogo size="md" />
          
          <Button
            variant="ghost"
            onClick={() => setShowSettings(!showSettings)}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Audio/Vidéo</span>
          </Button>
        </header>

        {/* Status Banner */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30">
            <Wifi className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-sm font-medium text-primary">
              {isHost ? "Vous êtes l'hôte" : "Connecté au lobby"}
            </span>
          </div>
          
          <h2 className="text-2xl font-display font-bold text-foreground">
            Salle d'attente
          </h2>
          <p className="text-foreground-secondary font-body">
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

            {!isHost && gameMode === '2v2' && (
              <div className="text-center p-4 rounded-xl bg-secondary/10 border border-secondary/20">
                <p className="text-secondary font-display font-bold">Mode 2v2 sélectionné</p>
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
