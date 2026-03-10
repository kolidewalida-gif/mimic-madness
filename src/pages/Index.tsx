import { useState, useEffect, memo, useCallback, useMemo } from "react";
import { DynamicBackground } from "@/components/DynamicBackground";
import { ScreenTransition } from "@/components/ScreenTransition";
import { MusicPlayerBar } from "@/components/MusicPlayerBar";
import { GameInvitationNotification } from "@/components/GameInvitationNotification";
import { InkSplashAnimation } from "@/components/InkSplashAnimation";
import { useToast } from "@/hooks/use-toast";
import { VideoClip } from "@/lib/videoStorageSupabase";
import { useLobbySync } from "@/hooks/useLobbySync";
import { useGameInvitations, setOnNewInvitationCallback } from "@/hooks/useGameInvitations";
import { supabase } from "@/integrations/supabase/client";
import { playSoundEffect } from "@/hooks/useSoundEffects";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { getGamePlayerId } from "@/hooks/usePersistentPlayerId";
import { LobbyGameMode } from "@/lib/gameModes";
import React from "react";

// Lazy load heavy components
const HomeScreen = React.lazy(() => import("@/components/HomeScreen").then(m => ({ default: m.HomeScreen })));
const InkHomeScreen = React.lazy(() => import("@/components/InkHomeScreen").then(m => ({ default: m.InkHomeScreen })));
const LobbyScreen = React.lazy(() => import("@/components/LobbyScreen").then(m => ({ default: m.LobbyScreen })));
const InkLobbyScreen = React.lazy(() => import("@/components/InkLobbyScreen").then(m => ({ default: m.InkLobbyScreen })));
const VideoSubmissionScreen = React.lazy(() => import("@/components/VideoSubmissionScreen").then(m => ({ default: m.VideoSubmissionScreen })));
const GamePlayScreen = React.lazy(() => import("@/components/GamePlayScreen").then(m => ({ default: m.GamePlayScreen })));
const QuizGameScreen = React.lazy(() => import("@/components/QuizGameScreen").then(m => ({ default: m.QuizGameScreen })));
const AudioPhoneGameScreen = React.lazy(() => import("@/components/AudioPhoneGameScreen").then(m => ({ default: m.AudioPhoneGameScreen })));
const PixoguessGameScreen = React.lazy(() => import("@/components/PixoguessGameScreen").then(m => ({ default: m.PixoguessGameScreen })));

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

type GameState = "home" | "lobby" | "preparation" | "playing" | "quiz" | "audiophone" | "pixoguess" | "monopoly";
type GameMode = "normal" | "2v2" | "quiz" | "audiophone" | "pixoguess" | "monopoly";

const LoadingFallback = memo(() => (
  <div className="h-screen flex items-center justify-center">
    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
));

// Interface for game invitation
interface GameInvitation {
  id: string;
  sender_id: string;
  sender_name: string;
  receiver_id: string;
  lobby_code: string;
  status: string;
  created_at: string;
  expires_at: string;
}

const Index = () => {
  const { user, signInWithGoogle, isLoading: authLoading } = useAuth();
  const { theme, inkModeEnabled } = useTheme();
  const [gameState, setGameState] = useState<GameState>("home");
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [submittedChallenges, setSubmittedChallenges] = useState<VideoClip[]>([]);
  const [gameMode, setGameMode] = useState<GameMode>("normal");
  const [activeInvitation, setActiveInvitation] = useState<GameInvitation | null>(null);
  const [showInkAnimation, setShowInkAnimation] = useState(false);
  const [inkAnimationCompleted, setInkAnimationCompleted] = useState(false);
  const { toast } = useToast();
  const { acceptInvitation, declineInvitation } = useGameInvitations();
  
  // Check if we need to show ink animation (fresh load with ink mode)
  useEffect(() => {
    if (inkModeEnabled && theme === 'ink') {
      const hasSeenAnimation = sessionStorage.getItem('ink-animation-seen');
      if (!hasSeenAnimation) {
        setShowInkAnimation(true);
      } else {
        setInkAnimationCompleted(true);
      }
    }
  }, [inkModeEnabled, theme]);
  
  const handleInkAnimationComplete = useCallback(() => {
    sessionStorage.setItem('ink-animation-seen', 'true');
    setShowInkAnimation(false);
    setInkAnimationCompleted(true);
  }, []);
  
  // Determine if we should show Ink UI
  const useInkMode = inkModeEnabled && theme === 'ink' && inkAnimationCompleted;
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

  // Register invitation callback for premium notification
  useEffect(() => {
    setOnNewInvitationCallback((invitation) => {
      setActiveInvitation(invitation);
    });

    return () => {
      setOnNewInvitationCallback(null);
    };
  }, []);

  const handleAcceptInvitation = useCallback(async (invitationId: string) => {
    const lobbyCode = await acceptInvitation(invitationId);
    setActiveInvitation(null);
    
    if (lobbyCode && gameState === 'home') {
      // Generate a player name and join the game
      const storedName = localStorage.getItem('playerName') || `Joueur${Math.floor(Math.random() * 1000)}`;
      const playerId = crypto.randomUUID();
      const newPlayer: Player = {
        id: playerId,
        name: storedName,
        isHost: false,
      };
      
      setCurrentPlayer(newPlayer);
      const result = await joinLobby(lobbyCode, playerId, storedName);
      
      if (result) {
        playSoundEffect('join', 0.4);
        setGameState("lobby");
      } else {
        playSoundEffect('error', 0.4);
        setCurrentPlayer(null);
      }
    }
  }, [acceptInvitation, gameState, joinLobby]);

  const handleDeclineInvitation = useCallback(async (invitationId: string) => {
    await declineInvitation(invitationId);
    setActiveInvitation(null);
  }, [declineInvitation]);

  const handleCloseInvitation = useCallback(() => {
    setActiveInvitation(null);
  }, []);

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

  // Listen for lobby status changes - critical for game state sync
  useEffect(() => {
    if (!lobby) return;

    console.log('[Index] Setting up lobby status listener for:', lobby.id);

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
          console.log('[Index] Lobby update received:', payload.new);
          
          const newPhase = payload.new.game_phase;
          const newMode = payload.new.game_mode;
          
          if (newMode && newMode !== gameMode) {
            console.log('[Index] Game mode changed to:', newMode);
            setGameMode(newMode as GameMode);
          }
          
          console.log('[Index] Game phase change:', { currentState: gameState, newPhase });
          
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
            console.log('[Index] Transitioning to audiophone state');
            playSoundEffect('start', 0.5);
            setGameState('audiophone');
            toast({
              title: "📞 Audio Phone !",
              description: "Préparez votre micro !",
            });
          } else if (newPhase === 'pixoguess' && gameState !== 'pixoguess') {
            playSoundEffect('quizReveal', 0.5);
            setGameState('pixoguess');
            toast({
              title: "⚡ BlurRush !",
              description: "Devinez l'image avant les autres !",
            });
          } else if (newPhase === 'playing' && gameState !== 'playing') {
            playSoundEffect('start', 0.5);
            setGameState('playing');
            toast({
              title: "🎮 Que le jeu commence !",
              description: "Tous les joueurs sont prêts. C'est parti !",
            });
          } else if (newPhase === 'lobby' && gameState !== 'lobby') {
            console.log('[Index] Returning to lobby');
            setGameState('lobby');
          }
        }
      )
      .subscribe((status) => {
        console.log('[Index] Lobby subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lobby?.id, gameState, gameMode, toast]);

  const handleCreateGame = useCallback(async (playerName: string, gameMode?: LobbyGameMode) => {
    playSoundEffect('success', 0.4);
    // Use persistent player ID (auth user ID when logged in)
    const playerId = getGamePlayerId(user?.id);
    const hostPlayer: Player = {
      id: playerId,
      name: playerName,
      isHost: true,
    };
    
    setCurrentPlayer(hostPlayer);
    
    // If a gameMode is provided (from InkHomeScreen), set it
    if (gameMode) {
      setGameMode(gameMode as GameMode);
    }
    
    const result = await createLobby(playerId, playerName);
    
    if (result) {
      setGameState("lobby");
    } else {
      playSoundEffect('error', 0.4);
    }
  }, [createLobby, user?.id]);

  const handleJoinGame = useCallback(async (playerName: string, code: string) => {
    // Use persistent player ID (auth user ID when logged in)
    const playerId = getGamePlayerId(user?.id);
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
  }, [joinLobby, user?.id]);

  const handleStartGame = useCallback(async (mode: GameMode = 'normal') => {
    console.log('[Index] handleStartGame called with mode:', mode);
    playSoundEffect('start', 0.5);
    setGameMode(mode);
    
    if (lobby && currentPlayer?.isHost) {
      try {
        const gamePhase = mode === 'quiz' ? 'quiz' : mode === 'audiophone' ? 'audiophone' : mode === 'pixoguess' ? 'pixoguess' : 'preparation';
        console.log('[Index] Updating lobby to phase:', gamePhase);
        
        const { error } = await supabase
          .from('lobbies')
          .update({ 
            status: 'playing',
            game_phase: gamePhase,
            game_mode: mode
          })
          .eq('id', lobby.id);
        
        if (error) {
          console.error('[Index] Error updating lobby:', error);
          toast({
            title: "Erreur",
            description: `Impossible de démarrer la partie (${error.message})`,
            variant: "destructive",
          });
          throw new Error(error.message);
        }
        
        console.log('[Index] Lobby updated successfully, transitioning state');
        
        // Host transitions immediately, others will transition via realtime
        if (mode === 'quiz') {
          setGameState('quiz');
        } else if (mode === 'audiophone') {
          setGameState('audiophone');
        } else if (mode === 'pixoguess') {
          setGameState('pixoguess');
        } else {
          setGameState('preparation');
        }
      } catch (error) {
        console.error('[Index] Error updating lobby status:', error);
        const msg = error instanceof Error ? error.message : 'Erreur inconnue';
        toast({
          title: "Erreur",
          description: `Impossible de démarrer la partie (${msg})`,
          variant: "destructive",
        });
        throw error;
      }
    }
  }, [lobby, currentPlayer?.isHost, toast]);

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
    console.log('[Index] handleStartActualGame called', { lobby: !!lobby, isHost: currentPlayer?.isHost });
    if (lobby && currentPlayer?.isHost) {
      try {
        console.log('[Index] Updating game_phase to playing for lobby:', lobby.id);
        const { error } = await supabase
          .from('lobbies')
          .update({ game_phase: 'playing' })
          .eq('id', lobby.id);
        
        if (error) {
          console.error('[Index] Error updating game phase:', error);
        } else {
          console.log('[Index] Game phase updated to playing successfully');
          // Host transitions immediately
          setGameState('playing');
        }
      } catch (error) {
        console.error('[Index] Error updating game phase:', error);
      }
    } else {
      console.warn('[Index] handleStartActualGame: conditions not met', { lobby: !!lobby, isHost: currentPlayer?.isHost });
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
    // For ink mode, we need user to be logged in (even before the ink intro animation)
    if (inkModeEnabled && theme === 'ink' && !user && !authLoading) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center space-y-6 max-w-md">
            <h1 className="text-4xl font-black text-primary" style={{ fontFamily: "'Caveat', cursive" }}>
              MIMIC MASTER
            </h1>
            <p className="text-muted-foreground">
              Connectez-vous avec Google pour accéder au jeu
            </p>
            <button
              onClick={signInWithGoogle}
              className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary-hover transition-colors shadow-lg"
            >
              Connexion avec Google
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <React.Suspense fallback={<LoadingFallback />}>
        {gameState === "home" && (
          useInkMode ? (
            <InkHomeScreen 
              onCreateGame={handleCreateGame}
              onJoinGame={handleJoinGame}
            />
          ) : (
            <HomeScreen 
              onCreateGame={handleCreateGame}
              onJoinGame={handleJoinGame}
            />
          )
        )}

        {gameState === "lobby" && currentPlayer && lobby && (
          useInkMode ? (
            <InkLobbyScreen
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
          ) : (
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
          )
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

        {gameState === "pixoguess" && currentPlayer && lobby && (
          <PixoguessGameScreen
            currentPlayer={currentPlayer}
            players={players}
            lobbyId={lobby.id}
            onEndGame={handleEndGame}
          />
        )}

      </React.Suspense>
    );
  }, [gameState, currentPlayer, lobby, players, gameMode, useInkMode, user, authLoading, signInWithGoogle, handleCreateGame, handleJoinGame, handleStartGame, handleLeaveGame, handleKickPlayer, handleTransferHost, handleBackToLobby, handleSubmitChallenges, handleStartActualGame, handleEndGame]);

  // Enforce login before Ink intro animation
  if (inkModeEnabled && theme === 'ink' && !user && !authLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center p-4 overflow-hidden">
        <div className="text-center space-y-6 max-w-md">
          <h1 
            className="text-5xl font-black text-primary" 
            style={{ 
              fontFamily: "'Caveat', cursive",
              textShadow: '-2px -2px 0 hsl(var(--background)), 2px -2px 0 hsl(var(--background)), -2px 2px 0 hsl(var(--background)), 2px 2px 0 hsl(var(--background))'
            }}
          >
            MIMIC MASTER
          </h1>
          <p className="text-muted-foreground">
            Connectez-vous avec Google pour accéder au mode Ink
          </p>
          <button
            onClick={signInWithGoogle}
            className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity shadow-lg"
          >
            Connexion avec Google
          </button>
        </div>
      </div>
    );
  }

  // Show ink animation if needed
  if (showInkAnimation) {
    return <InkSplashAnimation onComplete={handleInkAnimationComplete} />;
  }

  return (
    <div className="h-screen overflow-hidden">
      {/* Only show dynamic background in non-ink mode */}
      {!useInkMode && <DynamicBackground />}
      
      <ScreenTransition screenKey={gameState}>
        {renderContent}
      </ScreenTransition>
      
      {/* Only show music bar in non-ink mode */}
      {!useInkMode && <MusicPlayerBar />}
      
      {/* Premium Game Invitation Notification */}
      {activeInvitation && (
        <GameInvitationNotification
          invitation={activeInvitation}
          onAccept={handleAcceptInvitation}
          onDecline={handleDeclineInvitation}
          onClose={handleCloseInvitation}
        />
      )}
    </div>
  );
};

export default memo(Index);
