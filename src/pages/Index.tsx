import { useState, useEffect, memo, useCallback, useMemo } from "react";
import { DynamicBackground } from "@/components/DynamicBackground";
import { ScreenTransition } from "@/components/ScreenTransition";
import { MusicPlayerBar } from "@/components/MusicPlayerBar";
import { GameInvitationNotification } from "@/components/GameInvitationNotification";
import { InkSplashAnimation } from "@/components/InkSplashAnimation";
import { SocialHub } from "@/components/SocialHub";
import { useToast } from "@/hooks/use-toast";
import { VideoClip } from "@/lib/videoStorageSupabase";
import { useLobbySync } from "@/hooks/useLobbySync";
import { useGameInvitations, setOnNewInvitationCallback } from "@/hooks/useGameInvitations";
import { saveResumeSession, clearResumeSession, useResumeSession } from "@/hooks/useResumeSession";
import { useLoginStreak } from "@/hooks/useLoginStreak";
import { useQuestTracker } from "@/hooks/useQuestTracker";
import type { QuestEvent } from "@/lib/questDefinitions";
import { supabase } from "@/integrations/supabase/client";
import { playSoundEffect } from "@/hooks/useSoundEffects";
import { juice } from "@/lib/juice";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useTheme } from "@/hooks/useTheme";
import { getGamePlayerId } from "@/hooks/usePersistentPlayerId";
import { LobbyGameMode } from "@/lib/gameModes";
import { useBackgroundMusic, type MusicSituation } from "@/hooks/useBackgroundMusic";
import React from "react";

// Lazy load heavy components
const HomeScreen = React.lazy(() => import("@/components/HomeScreen").then(m => ({ default: m.HomeScreen })));
const InkHomeScreen = React.lazy(() => import("@/components/InkHomeScreen").then(m => ({ default: m.InkHomeScreen })));
const NeonHomeScreen = React.lazy(() => import("@/components/neon/NeonHomeScreen").then(m => ({ default: m.NeonHomeScreen })));
const LobbyScreen = React.lazy(() => import("@/components/LobbyScreen").then(m => ({ default: m.LobbyScreen })));
const InkLobbyScreen = React.lazy(() => import("@/components/InkLobbyScreen").then(m => ({ default: m.InkLobbyScreen })));
const VideoSubmissionScreen = React.lazy(() => import("@/components/VideoSubmissionScreen").then(m => ({ default: m.VideoSubmissionScreen })));
const GamePlayScreen = React.lazy(() => import("@/components/GamePlayScreen").then(m => ({ default: m.GamePlayScreen })));
const QuizGameScreen = React.lazy(() => import("@/components/QuizGameScreen").then(m => ({ default: m.QuizGameScreen })));
const AudioPhoneGameScreen = React.lazy(() => import("@/components/AudioPhoneGameScreen").then(m => ({ default: m.AudioPhoneGameScreen })));
const PixoguessGameScreen = React.lazy(() => import("@/components/PixoguessGameScreen").then(m => ({ default: m.PixoguessGameScreen })));
const MonopolyGameScreen = React.lazy(() => import("@/components/monopoly/MonopolyGameScreen").then(m => ({ default: m.MonopolyGameScreen })));
const UndercoverGameScreen = React.lazy(() => import("@/components/undercover/UndercoverGameScreen").then(m => ({ default: m.UndercoverGameScreen })));

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

type GameState = "home" | "lobby" | "preparation" | "playing" | "quiz" | "audiophone" | "pixoguess" | "monopoly" | "undercover";
type GameMode = "normal" | "2v2" | "quiz" | "audiophone" | "pixoguess" | "monopoly" | "undercover";

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
  const { user, profile, signInWithGoogle, isLoading: authLoading } = useAuth();
  // Bumps daily login streak once per UTC day. Surfaces a toast on bump.
  const { current: streakDays, justBumped: streakJustBumped } = useLoginStreak();
  const questTracker = useQuestTracker();
  useEffect(() => {
    if (streakJustBumped && streakDays > 0) {
      toast({
        title: `🔥 Streak ${streakDays} jour${streakDays > 1 ? 's' : ''} !`,
        description: streakDays >= 3 ? 'Tu enchaînes, continue !' : 'À demain pour +1',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streakJustBumped]);
  const { theme, inkModeEnabled } = useTheme();
  const { isAdmin } = useAdmin();
  const [gameState, setGameState] = useState<GameState>("home");
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [submittedChallenges, setSubmittedChallenges] = useState<VideoClip[]>([]);
  const [gameMode, setGameMode] = useState<GameMode>("normal");
  const [activeInvitation, setActiveInvitation] = useState<GameInvitation | null>(null);
  const [showInkAnimation, setShowInkAnimation] = useState(false);
  const [inkAnimationCompleted, setInkAnimationCompleted] = useState(false);
  const { toast } = useToast();
  const { acceptInvitation, declineInvitation } = useGameInvitations();
  const { setSituation } = useBackgroundMusic();

  // Sync background music situation with current game state for adaptive auto mode
  useEffect(() => {
    const map: Record<GameState, MusicSituation> = {
      home: "home",
      lobby: "lobby",
      preparation: "preparation",
      playing: "playing",
      quiz: "quiz",
      audiophone: "audiophone",
      pixoguess: "pixoguess",
      monopoly: "monopoly",
      undercover: "undercover",
    };
    setSituation(map[gameState] ?? "home");
  }, [gameState, setSituation]);
  
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
  // Neon Hub désactivé — on reste sur l'Ink polish
  const useNeonHub = false;
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

  // ── Resume session (crash/reload recovery) ──────────────────────────────
  const resumeStatus = useResumeSession({ enabled: gameState === 'home' && inkAnimationCompleted });
  const [showResumeModal, setShowResumeModal] = useState(false);

  useEffect(() => {
    if (resumeStatus.kind === 'ready') {
      setShowResumeModal(true);
    }
  }, [resumeStatus.kind]);

  const handleResumeYes = useCallback(async () => {
    setShowResumeModal(false);
    if (resumeStatus.kind !== 'ready') return;
    const { session } = resumeStatus;

    const result = await joinLobby(session.lobbyCode, session.playerId, session.playerName);
    if (result) {
      // Check if this player is the host (they might have been before crash)
      const { data: playerRow } = await supabase
        .from('lobby_players')
        .select('is_host')
        .eq('lobby_id', session.lobbyId)
        .eq('player_id', session.playerId)
        .maybeSingle();

      const newPlayer: Player = {
        id: session.playerId,
        name: session.playerName,
        isHost: playerRow?.is_host ?? false,
      };
      setCurrentPlayer(newPlayer);

      // Route directly to the correct game phase
      const lobbyData = result.lobby as any;
      const phase = lobbyData?.game_phase;
      const mode = lobbyData?.game_mode;
      if (mode) setGameMode(mode as GameMode);

      if (phase === 'playing') {
        setGameState('playing');
      } else if (phase === 'preparation') {
        setGameState('preparation');
      } else if (phase === 'quiz') {
        setGameState('quiz');
      } else if (phase === 'audiophone') {
        setGameState('audiophone');
      } else if (phase === 'pixoguess') {
        setGameState('pixoguess');
      } else if (phase === 'monopoly') {
        setGameState('monopoly');
      } else if (phase === 'undercover') {
        setGameState('undercover');
      } else {
        setGameState('lobby');
      }
    } else {
      clearResumeSession();
      setCurrentPlayer(null);
    }
  }, [resumeStatus, joinLobby]);

  const handleResumeNo = useCallback(() => {
    setShowResumeModal(false);
    clearResumeSession();
  }, []);  // Register invitation callback for premium notification
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

    if (!lobbyCode) return;

    // Resolve a stable display name for the receiver across every game state
    const storedName =
      localStorage.getItem('playerName') ||
      profile?.display_name ||
      `Joueur${Math.floor(Math.random() * 1000)}`;

    // Bug fix: previously this only worked when the receiver was on the home
    // page. If they were already in a lobby or in a game, accepting the
    // invitation did nothing and silently dropped the user. We now leave the
    // current lobby first (if any), reset transient state, and join the new
    // lobby regardless of where the receiver currently is.
    try {
      if (gameState !== 'home' && lobby) {
        await leaveLobby(currentPlayer?.id ?? '');
      }
    } catch (err) {
      console.error('[invitation] failed to leave current lobby:', err);
    }

    // If the user was mid-game, fully reset transient state so the new lobby
    // doesn't render under stale game/preparation state.
    setSubmittedChallenges([]);
    setGameMode('normal');
    setGameState('home');

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
      setGameState('lobby');
    } else {
      playSoundEffect('error', 0.4);
      setCurrentPlayer(null);
      toast({
        title: 'Lobby introuvable',
        description: "L'invitation ne pointe plus vers un lobby actif.",
        variant: 'destructive',
      });
    }
  }, [acceptInvitation, gameState, lobby, leaveLobby, joinLobby, profile?.display_name, toast]);

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
          } else if (newPhase === 'monopoly' && gameState !== 'monopoly') {
            playSoundEffect('start', 0.5);
            setGameState('monopoly');
            toast({
              title: "🏠 Monopoly !",
              description: "Le plateau 3D vous attend !",
            });
          } else if (newPhase === 'undercover' && gameState !== 'undercover') {
            playSoundEffect('start', 0.5);
            setGameState('undercover');
            toast({
              title: "🕵️ Undercover !",
              description: "Trouvez l'infiltré parmi vous !",
            });
          } else if (newPhase === 'playing' && gameState !== 'playing') {
            playSoundEffect('start', 0.5);
            // Dopamine launch — fires for every client when the game starts
            juice.confetti({ count: 80 });
            juice.flash('primary', 240);
            juice.shake(220, 0.8);
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
      saveResumeSession({
        lobbyCode: result.code,
        lobbyId: result.lobby.id,
        playerId,
        playerName,
      });
      void questTracker.track('host_lobby');
      setGameState("lobby");
    } else {
      playSoundEffect('error', 0.4);
    }
  }, [createLobby, user?.id, questTracker]);

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
      saveResumeSession({
        lobbyCode: code.trim().toUpperCase(),
        lobbyId: result.lobby.id,
        playerId,
        playerName,
      });
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

    // Fire the matching play_* quest event for the player who launches.
    // (For other clients, the realtime phase change triggers the same on
    // their side via a separate effect.)
    const playEventByMode: Record<string, QuestEvent | null> = {
      undercover: 'play_undercover',
      quiz: 'play_quiz',
      pixoguess: 'play_blurrush',
      audiophone: 'play_audiophone',
      monopoly: 'play_monopoly',
      normal: 'play_imitation',
      '2v2': 'play_imitation',
    };
    const playEvent = playEventByMode[mode];
    if (playEvent) void questTracker.track(playEvent);
    
    if (lobby && currentPlayer?.isHost) {
      try {
        // Admin solo: add bots if only 1 player connected
        const connectedPlayers = players.filter(p => !(p as any).isDisconnected);
        if (isAdmin && connectedPlayers.length === 1) {
          const botNames = ['Bot Alpha', 'Bot Bravo', 'Bot Charlie', 'Bot Delta'];
          const neededBots = mode === '2v2' ? 3 : mode === 'undercover' ? 2 : 1;
          const botsToAdd = botNames.slice(0, neededBots);
          
          for (const botName of botsToAdd) {
            const botId = `bot-${crypto.randomUUID().slice(0, 8)}`;
            await supabase.from('lobby_players').insert({
              lobby_id: lobby.id,
              player_id: botId,
              player_name: botName,
              is_host: false,
              connection_status: 'connected',
            });
          }
          
          console.log(`[Index] Added ${botsToAdd.length} bots for admin solo play`);
        }

        const gamePhase = mode === 'quiz' ? 'quiz' : mode === 'audiophone' ? 'audiophone' : mode === 'pixoguess' ? 'pixoguess' : mode === 'monopoly' ? 'monopoly' : mode === 'undercover' ? 'undercover' : 'preparation';
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
        } else if (mode === 'monopoly') {
          setGameState('monopoly');
        } else if (mode === 'undercover') {
          setGameState('undercover');
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
  }, [lobby, currentPlayer?.isHost, toast, players, isAdmin, questTracker]);

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
    clearResumeSession();
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

    // "Terminer la partie" — the host (or any player) wants to send everyone
    // BACK to the lobby. We must NOT call leaveLobby here, otherwise the host
    // is removed from lobby_players and host migration kicks in: everyone else
    // stays, a new host is elected, and the original host ends up on the home
    // screen alone. That was the "host gets kicked, others stay" bug.
    if (lobby && currentPlayer?.isHost) {
      try {
        await supabase
          .from('lobbies')
          .update({
            status: 'waiting',
            game_phase: 'lobby',
          })
          .eq('id', lobby.id);
      } catch (error) {
        console.error('Error resetting lobby:', error);
      }
    }

    // Local transition: every client receives the lobby phase change via
    // realtime and routes itself back to the lobby; we still set the local
    // state so the host (the one who clicked) doesn't wait a roundtrip.
    setSubmittedChallenges([]);
    setGameState('lobby');

    toast({
      title: 'Partie terminée',
      description: 'Retour au lobby !',
    });
  }, [lobby, currentPlayer?.isHost, toast]);

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
          useNeonHub ? (
            <NeonHomeScreen
              onCreateGame={handleCreateGame}
              onJoinGame={handleJoinGame}
            />
          ) : useInkMode ? (
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
          (useInkMode || useNeonHub) ? (
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

        {gameState === "monopoly" && currentPlayer && lobby && (
          <MonopolyGameScreen
            currentPlayer={currentPlayer}
            players={players}
            lobbyId={lobby.id}
            onEndGame={handleEndGame}
          />
        )}

        {gameState === "undercover" && currentPlayer && lobby && (
          <UndercoverGameScreen
            currentPlayer={currentPlayer}
            players={players}
            lobbyId={lobby.id}
            onEndGame={handleEndGame}
          />
        )}

      </React.Suspense>
    );
  }, [gameState, currentPlayer, lobby, players, gameMode, useInkMode, useNeonHub, user, authLoading, signInWithGoogle, handleCreateGame, handleJoinGame, handleStartGame, handleLeaveGame, handleKickPlayer, handleTransferHost, handleBackToLobby, handleSubmitChallenges, handleStartActualGame, handleEndGame]);

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
      
      {/* Resume session modal — shown when a player reloads/crashes and comes back */}
      {showResumeModal && resumeStatus.kind === 'ready' && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1a0d2e] border-4 border-[#0a0810] rounded-3xl p-6 max-w-sm mx-4 text-center space-y-4"
            style={{ boxShadow: '0 8px 0 #0a0810, 0 0 40px rgba(168,85,247,0.3)' }}>
            <h2 className="text-2xl font-black text-white" style={{ fontFamily: "'Caveat', cursive", textShadow: '2px 2px 0 #0a0810' }}>
              🎮 Partie en cours
            </h2>
            <p className="text-white/70 font-bold" style={{ fontFamily: "'Caveat', cursive" }}>
              Tu étais dans une partie avec le code <span className="text-purple-300 font-black">{resumeStatus.session.lobbyCode}</span>. Veux-tu revenir ?
            </p>
            <div className="flex gap-3">
              <button onClick={handleResumeNo}
                className="flex-1 py-3 rounded-2xl text-lg font-black text-white/70"
                style={{ background: 'rgba(255,255,255,0.05)', border: '3px solid #0a0810', boxShadow: '0 4px 0 #0a0810', fontFamily: "'Caveat', cursive" }}>
                Non
              </button>
              <button onClick={handleResumeYes}
                className="flex-1 py-3 rounded-2xl text-lg font-black text-white"
                style={{ background: 'linear-gradient(180deg, #a855f7, #7c3aed)', border: '3px solid #0a0810', boxShadow: '0 4px 0 #0a0810', fontFamily: "'Caveat', cursive" }}>
                Oui
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Only show music bar in non-ink mode */}
      <MusicPlayerBar />
      
      {/* Social Hub - Floating button always accessible */}
      <SocialHub
        currentLobbyCode={lobby?.code}
        onJoinFriend={(lobbyCode) => {
          const storedName = localStorage.getItem('playerName') || profile?.display_name || `Joueur${Math.floor(Math.random() * 1000)}`;
          handleJoinGame(storedName, lobbyCode);
        }}
      />
      
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
