import { useState, useEffect } from "react";
import { HomeScreen } from "@/components/HomeScreen";
import { LobbyScreen } from "@/components/LobbyScreen";
import { VideoSubmissionScreen } from "@/components/VideoSubmissionScreen";
import { GamePlayScreen } from "@/components/GamePlayScreen";
import { QuizGameScreen } from "@/components/QuizGameScreen";
import { DynamicBackground } from "@/components/DynamicBackground";
import { ScreenTransition } from "@/components/ScreenTransition";
import { MusicPlayerBar } from "@/components/MusicPlayerBar";
import { useToast } from "@/hooks/use-toast";
import { VideoClip } from "@/lib/videoStorageSupabase";
import { useLobbySync } from "@/hooks/useLobbySync";
import { supabase } from "@/integrations/supabase/client";
import { playSoundEffect } from "@/hooks/useSoundEffects";

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

type GameState = "home" | "lobby" | "preparation" | "playing" | "quiz";
type GameMode = "normal" | "2v2" | "quiz";

const Index = () => {
  const [gameState, setGameState] = useState<GameState>("home");
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [submittedChallenges, setSubmittedChallenges] = useState<VideoClip[]>([]);
  const [gameMode, setGameMode] = useState<GameMode>("normal");
  const { toast } = useToast();
  const { 
    lobby, 
    players, 
    wasKicked, 
    lobbyDeleted, 
    createLobby, 
    joinLobby, 
    leaveLobby, 
    kickPlayer,
    transferHost,
    updateLobbyStatus,
    resetState 
  } = useLobbySync();

  // Handle being kicked or lobby deleted
  useEffect(() => {
    if (wasKicked) {
      console.log('Player was kicked, returning to home');
      playSoundEffect('error', 0.5);
      toast({
        title: "Vous avez été exclu",
        description: "L'hôte vous a retiré de la partie",
        variant: "destructive",
      });
      setGameState("home");
      setCurrentPlayer(null);
      setSubmittedChallenges([]);
      resetState();
    }
  }, [wasKicked, toast, resetState]);

  useEffect(() => {
    if (lobbyDeleted && gameState !== "home") {
      console.log('Lobby was deleted, returning to home');
      playSoundEffect('error', 0.5);
      toast({
        title: "Partie terminée",
        description: "L'hôte a quitté la partie",
        variant: "destructive",
      });
      setGameState("home");
      setCurrentPlayer(null);
      setSubmittedChallenges([]);
      resetState();
    }
  }, [lobbyDeleted, gameState, toast, resetState]);

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
          const newMode = payload.new.game_mode;
          
          // Update game mode if changed
          if (newMode && newMode !== gameMode) {
            setGameMode(newMode as GameMode);
          }
          
          if (newPhase === 'preparation' && gameState !== 'preparation') {
            console.log('Transitioning to preparation');
            playSoundEffect('transition', 0.4);
            setGameState('preparation');
            toast({
              title: "La partie commence !",
              description: "Préparez vos défis vidéo.",
            });
          } else if (newPhase === 'quiz' && gameState !== 'quiz') {
            console.log('Transitioning to quiz');
            playSoundEffect('quizReveal', 0.5);
            setGameState('quiz');
            toast({
              title: "🧠 Mode Quiz !",
              description: "Préparez-vous à répondre aux questions.",
            });
          } else if (newPhase === 'playing' && gameState !== 'playing') {
            console.log('Transitioning to playing');
            playSoundEffect('start', 0.5);
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
  }, [lobby?.id, gameState, gameMode, toast]);

  const handleCreateGame = async (playerName: string) => {
    console.log('Creating game for:', playerName);
    playSoundEffect('success', 0.4);
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
      playSoundEffect('error', 0.4);
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
      playSoundEffect('join', 0.4);
      setGameState("lobby");
    } else {
      console.error('Failed to join lobby');
      playSoundEffect('error', 0.4);
      setCurrentPlayer(null);
    }
  };

  const handleStartGame = async (mode: GameMode = 'normal') => {
    console.log('Starting game with mode:', mode);
    playSoundEffect('start', 0.5);
    setGameMode(mode);
    
    // Update lobby status and phase
    if (lobby && currentPlayer?.isHost) {
      try {
        const gamePhase = mode === 'quiz' ? 'quiz' : 'preparation';
        await supabase
          .from('lobbies')
          .update({ 
            status: 'playing',
            game_phase: gamePhase,
            game_mode: mode
          })
          .eq('id', lobby.id);
        
        // For quiz mode, transition immediately
        if (mode === 'quiz') {
          setGameState('quiz');
        }
      } catch (error) {
        console.error('Error updating lobby status:', error);
      }
    }
  };

  const handleKickPlayer = async (playerId: string) => {
    await kickPlayer(playerId);
  };

  const handleTransferHost = async (playerId: string) => {
    await transferHost(playerId);
  };

  const handleSubmitChallenges = (challenges: VideoClip[]) => {
    setSubmittedChallenges(challenges);
    playSoundEffect('success', 0.4);
    
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
  };

  const handleBackToLobby = () => {
    playSoundEffect('whoosh', 0.3);
    setGameState("lobby");
    setSubmittedChallenges([]);
  };

  const handleLeaveGame = async () => {
    playSoundEffect('leave', 0.4);
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

  const handleEndGame = async () => {
    playSoundEffect('leave', 0.4);
    
    // If host ends game, reset lobby to waiting state
    if (lobby && currentPlayer?.isHost) {
      try {
        await supabase
          .from('lobbies')
          .update({ 
            status: 'waiting',
            game_phase: 'lobby'
          })
          .eq('id', lobby.id);
      } catch (error) {
        console.error('Error resetting lobby:', error);
      }
    }
    
    // Leave the game
    if (currentPlayer) {
      await leaveLobby(currentPlayer.id);
    }
    
    setGameState("home");
    setCurrentPlayer(null);
    setSubmittedChallenges([]);
    
    toast({
      title: "Partie terminée",
      description: "Merci d'avoir joué !",
    });
  };

  const renderContent = () => {
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
          lobbyId={lobby.id}
          isHost={currentPlayer.isHost}
          currentPlayer={currentPlayer}
          onStartGame={handleStartGame}
          onLeaveGame={handleLeaveGame}
          onKickPlayer={handleKickPlayer}
          onTransferHost={handleTransferHost}
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
          gameMode={gameMode}
          onEndGame={handleEndGame}
        />
      );
    }

    if (gameState === "quiz" && currentPlayer && lobby) {
      return (
        <QuizGameScreen
          currentPlayer={currentPlayer}
          players={players}
          lobbyId={lobby.id}
          onEndGame={handleEndGame}
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

  return (
    <>
      <DynamicBackground />
      <div className="pb-24">
        <ScreenTransition screenKey={gameState}>
          {renderContent()}
        </ScreenTransition>
      </div>
      <MusicPlayerBar />
    </>
  );
};

export default Index;