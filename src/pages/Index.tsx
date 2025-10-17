import { useState, useEffect } from "react";
import { HomeScreen } from "@/components/HomeScreen";
import { LobbyScreen } from "@/components/LobbyScreen";
import { VideoSubmissionScreen } from "@/components/VideoSubmissionScreen";
import { GamePlayScreen } from "@/components/GamePlayScreen";
import { useToast } from "@/hooks/use-toast";
import { VideoClip } from "@/lib/videoStorage";
import { useLobbySync } from "@/hooks/useLobbySync";
import { supabase } from "@/integrations/supabase/client";

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

type GameState = "home" | "lobby" | "preparation" | "playing";

const Index = () => {
  const [gameState, setGameState] = useState<GameState>("home");
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [submittedChallenges, setSubmittedChallenges] = useState<VideoClip[]>([]);
  const { toast } = useToast();
  const { lobby, players, createLobby, joinLobby, leaveLobby, updateLobbyStatus } = useLobbySync();

  // Listen for lobby status changes
  useEffect(() => {
    if (!lobby) return;

    const channel = supabase
      .channel(`lobby-status:${lobby.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lobbies',
          filter: `id=eq.${lobby.id}`
        },
        (payload: any) => {
          console.log('Lobby update:', payload);
          const newPhase = payload.new.game_phase;
          
          if (newPhase === 'preparation' && gameState !== 'preparation') {
            console.log('Transitioning to preparation');
            setGameState('preparation');
            toast({
              title: "La partie commence !",
              description: "Préparez vos défis vidéo.",
            });
          } else if (newPhase === 'playing' && gameState !== 'playing') {
            console.log('Transitioning to playing');
            setGameState('playing');
            toast({
              title: "🎮 Que le jeu commence !",
              description: "Tous les joueurs sont prêts. C'est parti !",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lobby?.id, gameState, toast]);

  const handleCreateGame = async (playerName: string) => {
    console.log('Creating game for:', playerName);
    const playerId = crypto.randomUUID();
    const hostPlayer: Player = {
      id: playerId,
      name: playerName,
      isHost: true,
    };
    
    setCurrentPlayer(hostPlayer);
    const result = await createLobby(playerId, playerName);
    
    if (result) {
      console.log('Lobby created, changing state to lobby');
      setGameState("lobby");
    } else {
      console.error('Failed to create lobby');
    }
  };

  const handleJoinGame = async (playerName: string, code: string) => {
    console.log('Joining game with code:', code);
    const playerId = crypto.randomUUID();
    const newPlayer: Player = {
      id: playerId,
      name: playerName,
      isHost: false,
    };
    
    setCurrentPlayer(newPlayer);
    const result = await joinLobby(code, playerId, playerName);
    
    if (result) {
      console.log('Joined lobby, changing state to lobby');
      setGameState("lobby");
    } else {
      console.error('Failed to join lobby');
    }
  };

  const handleStartGame = async () => {
    console.log('Starting game...');
    
    // Update lobby status and phase
    if (lobby && currentPlayer?.isHost) {
      try {
        await supabase
          .from('lobbies')
          .update({ 
            status: 'playing',
            game_phase: 'preparation'
          })
          .eq('id', lobby.id);
      } catch (error) {
        console.error('Error updating lobby status:', error);
      }
    }
    
    // Don't set state here - let the realtime listener handle it
  };

  const handleSubmitChallenges = (challenges: VideoClip[]) => {
    setSubmittedChallenges(challenges);
    
    toast({
      title: "Défis soumis !",
      description: `${challenges.length} défi(s) envoyé(s). En attente des autres joueurs...`,
    });
  };
  
  const handleStartActualGame = async () => {
    if (lobby && currentPlayer?.isHost) {
      try {
        await supabase
          .from('lobbies')
          .update({ game_phase: 'playing' })
          .eq('id', lobby.id);
      } catch (error) {
        console.error('Error updating game phase:', error);
      }
    }
    
    // Don't set state here - let the realtime listener handle it
  };

  const handleBackToLobby = () => {
    setGameState("lobby");
    setSubmittedChallenges([]);
  };

  const handleLeaveGame = async () => {
    if (currentPlayer) {
      await leaveLobby(currentPlayer.id);
    }
    setGameState("home");
    setCurrentPlayer(null);
    setSubmittedChallenges([]);
    
    toast({
      title: "Partie quittée",
      description: "Vous avez quitté la partie",
    });
  };

  if (gameState === "home") {
    return (
      <HomeScreen 
        onCreateGame={handleCreateGame}
        onJoinGame={handleJoinGame}
      />
    );
  }

  if (gameState === "lobby" && currentPlayer && lobby) {
    return (
      <LobbyScreen
        players={players}
        lobbyCode={lobby.code}
        isHost={currentPlayer.isHost}
        currentPlayer={currentPlayer}
        onStartGame={handleStartGame}
        onLeaveGame={handleLeaveGame}
      />
    );
  }

  if (gameState === "preparation" && currentPlayer && lobby) {
    return (
      <VideoSubmissionScreen
        currentPlayer={currentPlayer}
        lobbyId={lobby.id}
        players={players}
        isHost={currentPlayer.isHost}
        onBackToLobby={handleBackToLobby}
        onSubmitChallenges={handleSubmitChallenges}
        onStartActualGame={handleStartActualGame}
      />
    );
  }

  if (gameState === "playing" && currentPlayer && lobby) {
    return (
      <GamePlayScreen
        currentPlayer={currentPlayer}
        players={players}
        lobbyId={lobby.id}
        onEndGame={handleLeaveGame}
      />
    );
  }

  // Fallback to home screen
  return (
    <HomeScreen 
      onCreateGame={handleCreateGame}
      onJoinGame={handleJoinGame}
    />
  );
};

export default Index;