import { useState, useEffect, memo, useCallback, useMemo } from "react";
import { DynamicBackground } from "@/components/DynamicBackground";
import { ScreenTransition } from "@/components/ScreenTransition";
import { MusicPlayerBar } from "@/components/MusicPlayerBar";
import { useToast } from "@/hooks/use-toast";
import { VideoClip } from "@/lib/videoStorageSupabase";
import { useLobbySync } from "@/hooks/useLobbySync";
import { supabase } from "@/integrations/supabase/client";
import { playSoundEffect } from "@/hooks/useSoundEffects";
import React from "react";

// Lazy load heavy components
const HomeScreen = React.lazy(() => import("@/components/HomeScreen").then(m => ({ default: m.HomeScreen })));
const LobbyScreen = React.lazy(() => import("@/components/LobbyScreen").then(m => ({ default: m.LobbyScreen })));
const VideoSubmissionScreen = React.lazy(() => import("@/components/VideoSubmissionScreen").then(m => ({ default: m.VideoSubmissionScreen })));
const GamePlayScreen = React.lazy(() => import("@/components/GamePlayScreen").then(m => ({ default: m.GamePlayScreen })));
const QuizGameScreen = React.lazy(() => import("@/components/QuizGameScreen").then(m => ({ default: m.QuizGameScreen })));
const AudioPhoneGameScreen = React.lazy(() => import("@/components/AudioPhoneGameScreen").then(m => ({ default: m.AudioPhoneGameScreen })));

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

type GameState = "home" | "lobby" | "preparation" | "playing" | "quiz" | "audiophone";
type GameMode = "normal" | "2v2" | "quiz" | "audiophone";

const LoadingFallback = memo(() => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
));

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
    resetState 
  } = useLobbySync();

  // Handle being kicked or lobby deleted
  useEffect(() => {
    if (wasKicked) {
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
          const newPhase = payload.new.game_phase;
          const newMode = payload.new.game_mode;
          
          if (newMode && newMode !== gameMode) {
            setGameMode(newMode as GameMode);
          }
          
          if (newPhase === 'preparation' && gameState !== 'preparation') {
            playSoundEffect('transition', 0.4);
            setGameState('preparation');
            toast({
              title: "La partie commence !",
              description: "Préparez vos défis vidéo.",
            });
          } else if (newPhase === 'quiz' && gameState !== 'quiz') {
            playSoundEffect('quizReveal', 0.5);
            setGameState('quiz');
            toast({
              title: "🧠 Mode Quiz !",
              description: "Préparez-vous à répondre aux questions.",
            });
          } else if (newPhase === 'audiophone' && gameState !== 'audiophone') {
            playSoundEffect('start', 0.5);
            setGameState('audiophone');
            toast({
              title: "📞 Audio Phone !",
              description: "Préparez votre micro !",
            });
          } else if (newPhase === 'playing' && gameState !== 'playing') {
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

  const handleCreateGame = useCallback(async (playerName: string) => {
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
      setGameState("lobby");
    } else {
      playSoundEffect('error', 0.4);
    }
  }, [createLobby]);

  const handleJoinGame = useCallback(async (playerName: string, code: string) => {
    const playerId = crypto.randomUUID();
    const newPlayer: Player = {
      id: playerId,
      name: playerName,
      isHost: false,
    };
    
    setCurrentPlayer(newPlayer);
    const result = await joinLobby(code, playerId, playerName);
    
    if (result) {
      playSoundEffect('join', 0.4);
      setGameState("lobby");
    } else {
      playSoundEffect('error', 0.4);
      setCurrentPlayer(null);
    }
  }, [joinLobby]);

  const handleStartGame = useCallback(async (mode: GameMode = 'normal') => {
    playSoundEffect('start', 0.5);
    setGameMode(mode);
    
    if (lobby && currentPlayer?.isHost) {
      try {
        const gamePhase = mode === 'quiz' ? 'quiz' : mode === 'audiophone' ? 'audiophone' : 'preparation';
        await supabase
          .from('lobbies')
          .update({ 
            status: 'playing',
            game_phase: gamePhase,
            game_mode: mode
          })
          .eq('id', lobby.id);
        
        if (mode === 'quiz') {
          setGameState('quiz');
        } else if (mode === 'audiophone') {
          setGameState('audiophone');
        }
      } catch (error) {
        console.error('Error updating lobby status:', error);
      }
    }
  }, [lobby, currentPlayer?.isHost]);

  const handleKickPlayer = useCallback(async (playerId: string) => {
    await kickPlayer(playerId);
  }, [kickPlayer]);

  const handleTransferHost = useCallback(async (playerId: string) => {
    await transferHost(playerId);
  }, [transferHost]);

  const handleSubmitChallenges = useCallback((challenges: VideoClip[]) => {
    setSubmittedChallenges(challenges);
    playSoundEffect('success', 0.4);
    
    toast({
      title: "Défis soumis !",
      description: `${challenges.length} défi(s) envoyé(s). En attente des autres joueurs...`,
    });
  }, [toast]);
  
  const handleStartActualGame = useCallback(async () => {
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
  }, [lobby, currentPlayer?.isHost]);

  const handleBackToLobby = useCallback(() => {
    playSoundEffect('whoosh', 0.3);
    setGameState("lobby");
    setSubmittedChallenges([]);
  }, []);

  const handleLeaveGame = useCallback(async () => {
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
  }, [currentPlayer, leaveLobby, toast]);

  const handleEndGame = useCallback(async () => {
    playSoundEffect('leave', 0.4);
    
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
  }, [lobby, currentPlayer, leaveLobby, toast]);

  const renderContent = useMemo(() => {
    return (
      <React.Suspense fallback={<LoadingFallback />}>
        {gameState === "home" && (
          <HomeScreen 
            onCreateGame={handleCreateGame}
            onJoinGame={handleJoinGame}
          />
        )}

        {gameState === "lobby" && currentPlayer && lobby && (
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
        )}

        {gameState === "preparation" && currentPlayer && lobby && (
          <VideoSubmissionScreen
            currentPlayer={currentPlayer}
            lobbyId={lobby.id}
            players={players}
            isHost={currentPlayer.isHost}
            onBackToLobby={handleBackToLobby}
            onSubmitChallenges={handleSubmitChallenges}
            onStartActualGame={handleStartActualGame}
          />
        )}

        {gameState === "playing" && currentPlayer && lobby && (
          <GamePlayScreen
            currentPlayer={currentPlayer}
            players={players}
            lobbyId={lobby.id}
            gameMode={gameMode as 'normal' | '2v2' | 'quiz'}
            onEndGame={handleEndGame}
          />
        )}

        {gameState === "quiz" && currentPlayer && lobby && (
          <QuizGameScreen
            currentPlayer={currentPlayer}
            players={players}
            lobbyId={lobby.id}
            onEndGame={handleEndGame}
          />
        )}

        {gameState === "audiophone" && currentPlayer && lobby && (
          <AudioPhoneGameScreen
            currentPlayer={currentPlayer}
            players={players}
            lobbyId={lobby.id}
            onEndGame={handleEndGame}
          />
        )}

        {/* Fallback */}
        {gameState === "home" && !currentPlayer && (
          <HomeScreen 
            onCreateGame={handleCreateGame}
            onJoinGame={handleJoinGame}
          />
        )}
      </React.Suspense>
    );
  }, [gameState, currentPlayer, lobby, players, gameMode, handleCreateGame, handleJoinGame, handleStartGame, handleLeaveGame, handleKickPlayer, handleTransferHost, handleBackToLobby, handleSubmitChallenges, handleStartActualGame, handleEndGame]);

  return (
    <>
      <DynamicBackground />
      <div className="pb-24">
        <ScreenTransition screenKey={gameState}>
          {renderContent}
        </ScreenTransition>
      </div>
      <MusicPlayerBar />
    </>
  );
};

export default memo(Index);
