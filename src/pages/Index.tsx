import { useState, useEffect, memo, useCallback, useMemo } from "react";
import { DynamicBackground } from "@/components/DynamicBackground";
import { ScreenTransition } from "@/components/ScreenTransition";
import { MusicPlayerBar } from "@/components/MusicPlayerBar";
import { GameInvitationNotification } from "@/components/GameInvitationNotification";
import { SocialHub } from "@/components/SocialHub";
import { SocialStudioDialog } from "@/components/SocialStudioDialog";
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
import { useTheme, isInkFamily, useRestrictedThemeGuard } from "@/hooks/useTheme";
import { getGamePlayerId } from "@/hooks/usePersistentPlayerId";
import { LobbyGameMode, soloBotCount } from "@/lib/gameModes";
import { playSample } from "@/lib/sfx/samples";
import { setActiveSfxMode, type SfxMode } from "@/lib/sfx/palette";
import { ConnectionRecoveryOverlay } from "@/components/ConnectionRecoveryOverlay";
import { DiagnosticsOverlay } from "@/components/DiagnosticsOverlay";
import {
  loadAudioPhoneGameScreen,
  loadGamePlayScreen,
  loadMemoriseGameScreen,
  loadMimicGameScreen,
  loadMonopolyGameScreen,
  loadPixoguessGameScreen,
  loadQuizGameScreen,
  loadUndercoverGameScreen,
  preloadGameMode,
} from "@/lib/gameScreenLoaders";
import { useBackgroundMusic, type MusicSituation } from "@/hooks/useBackgroundMusic";
import { Loader2 } from "lucide-react";
import React from "react";

// Lazy load heavy components
const HomeScreen = React.lazy(() => import("@/components/HomeScreen").then(m => ({ default: m.HomeScreen })));
const InkHomeScreen = React.lazy(() => import("@/components/InkHomeScreen").then(m => ({ default: m.InkHomeScreen })));
/* Beta admin : en `lazy`, donc un joueur ordinaire ne télécharge jamais ce chunk. */
const InkBetaHomeScreen = React.lazy(() => import("@/components/InkBetaHomeScreen").then(m => ({ default: m.InkBetaHomeScreen })));
const NeonHomeScreen = React.lazy(() => import("@/components/neon/NeonHomeScreen").then(m => ({ default: m.NeonHomeScreen })));
const LobbyScreen = React.lazy(() => import("@/components/LobbyScreen").then(m => ({ default: m.LobbyScreen })));
const InkLobbyScreen = React.lazy(() => import("@/components/InkLobbyScreen").then(m => ({ default: m.InkLobbyScreen })));
const VideoSubmissionScreen = React.lazy(() => import("@/components/VideoSubmissionScreen").then(m => ({ default: m.VideoSubmissionScreen })));
const GamePlayScreen = React.lazy(loadGamePlayScreen);
const QuizGameScreen = React.lazy(loadQuizGameScreen);
const AudioPhoneGameScreen = React.lazy(loadAudioPhoneGameScreen);
const PixoguessGameScreen = React.lazy(loadPixoguessGameScreen);
const MonopolyGameScreen = React.lazy(loadMonopolyGameScreen);
const UndercoverGameScreen = React.lazy(loadUndercoverGameScreen);
const MemoriseGameScreen = React.lazy(loadMemoriseGameScreen);
const MimicGameScreen = React.lazy(loadMimicGameScreen);
const NeverLikeThatBackground = React.lazy(() => import("@/components/NeverLikeThatBackground").then(m => ({ default: m.NeverLikeThatBackground })));
const NeverLikeThatLobbyScreen = React.lazy(() => import("@/components/neverlikethat/NeverLikeThatLobbyScreen").then(m => ({ default: m.NeverLikeThatLobbyScreen })));
const NeverLikeThatHomeScreen = React.lazy(() => import("@/components/neverlikethat/NeverLikeThatHomeScreen").then(m => ({ default: m.NeverLikeThatHomeScreen })));

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

type GameState = "home" | "lobby" | "preparation" | "playing" | "quiz" | "audiophone" | "pixoguess" | "monopoly" | "undercover" | "memorise" | "mimic";
type GameMode = "normal" | "2v2" | "quiz" | "audiophone" | "pixoguess" | "monopoly" | "undercover" | "memorise" | "mimic";

const resolveLobbyGameState = (phase?: string, mode?: string): GameState => {
  if (phase === 'playing') {
    if (mode === 'memorise') return 'memorise';
    if (mode === 'mimic') return 'mimic';
    return 'playing';
  }
  if (phase === 'preparation' || phase === 'quiz' || phase === 'audiophone' || phase === 'pixoguess' || phase === 'monopoly' || phase === 'undercover' || phase === 'memorise') {
    return phase;
  }
  return 'lobby';
};

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
  const { user, profile } = useAuth();
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
  const { isAdmin, isLoading: isAdminLoading } = useAdmin();

  /*
   * Aperçu de l'écran beta sans compte administrateur, pour les captures
   * automatisées de mise en page.
   *
   * `import.meta.env.DEV` est remplacé par `false` à la compilation, donc tout
   * ce bloc est éliminé du bundle de production : le paramètre d'URL n'a aucun
   * effet sur le site publié.
   */
  const devBetaPreview =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('betapreview');

  /* Ramène sur `ink` si un non-admin a un thème réservé en localStorage. */
  useRestrictedThemeGuard(isAdmin || devBetaPreview, isAdminLoading);
  const [gameState, setGameState] = useState<GameState>("home");
  const [showInkSocial, setShowInkSocial] = useState(false);
  const openInkSocial = useCallback(() => setShowInkSocial(true), []);
  const closeInkSocial = useCallback(() => setShowInkSocial(false), []);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [submittedChallenges, setSubmittedChallenges] = useState<VideoClip[]>([]);
  const [gameMode, setGameMode] = useState<GameMode>("normal");
  const [activeInvitation, setActiveInvitation] = useState<GameInvitation | null>(null);
  const [isResuming, setIsResuming] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const { toast } = useToast();
  const { acceptInvitation, declineInvitation } = useGameInvitations();
  const { setSituation } = useBackgroundMusic();

  // Sync background music situation with current game state for adaptive auto mode
  useEffect(() => {
    const map: Record<GameState, MusicSituation> = {
      home: "home",
      lobby: "lobby",
      preparation: "preparation",
      playing: gameMode === "2v2" ? "team-showdown" : "playing",
      quiz: "quiz",
      audiophone: "audiophone",
      pixoguess: "pixoguess",
      monopoly: "monopoly",
      undercover: "undercover",
      memorise: "blindtest",
      mimic: "mimic-waiting",
    };
    setSituation(map[gameState] ?? "home");
  }, [gameState, gameMode, setSituation]);

  /*
   * Palette d'effets sonores du mode en cours.
   *
   * Un seul effet dérivé de l'état, plutôt qu'un appel à côté de chaque
   * `setGameMode` : le mode peut aussi arriver par le temps réel via
   * `routeFromLobbySnapshot`, et un site d'appel oublié donnerait une palette
   * qui ne correspond plus à l'écran affiché.
   *
   * Hors partie — accueil, lobby — on revient à la palette neutre : ces écrans
   * sont les plus fréquentés, ils ne doivent pas hériter du timbre feutré
   * d'Undercover ou de la bande téléphonique d'Audiophone.
   */
  useEffect(() => {
    const inGame = gameState !== "home" && gameState !== "lobby";
    setActiveSfxMode(inGame ? (gameMode as SfxMode) : null);
  }, [gameState, gameMode]);
  
  // Determine if we should show Ink UI. There is no intro splash any more:
  // the menu is the first thing the player sees.
  /*
   * La beta appartient à la famille ink, donc elle hérite de toute la
   * plomberie : pas de fond animé, pas de barre musicale, Social Studio, lobby
   * Ink. Choisir le thème suffit — on n'exige pas en plus `inkModeEnabled`,
   * qui est le réglage historique du seul thème `ink`.
   */
  const useInkMode = theme === 'inkbeta' || (inkModeEnabled && isInkFamily(theme));
  /* L'accueil beta ne s'affiche qu'une fois le rôle admin confirmé. */
  const useBetaHome = theme === 'inkbeta' && (isAdmin || devBetaPreview);
  // Neon Hub désactivé — on reste sur l'Ink polish
  const useNeonHub = false;

  // Social Studio belongs to the menu shell, never to a running game. The
  // global event is emitted by comment notifications; in Ink it must open the
  // actual feed rather than the unrelated friends drawer.
  useEffect(() => {
    if (!useInkMode) return;
    const openSocial = () => {
      if (gameState === 'home' || gameState === 'lobby') openInkSocial();
    };
    window.addEventListener('mimic:open-social', openSocial);
    return () => window.removeEventListener('mimic:open-social', openSocial);
  }, [gameState, openInkSocial, useInkMode]);

  useEffect(() => {
    if (!useInkMode || (gameState !== 'home' && gameState !== 'lobby')) {
      closeInkSocial();
    }
  }, [closeInkSocial, gameState, useInkMode]);
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
    resetState,
    connectionState,
    retryConnection,
  } = useLobbySync();

  useEffect(() => {
    if (!lobby) return;
    setCurrentPlayer((player) => {
      if (!player) return player;
      const isHost = player.id === lobby.host_id;
      return player.isHost === isHost ? player : { ...player, isHost };
    });
  }, [lobby?.host_id]);

  const routeFromLobbySnapshot = useCallback((phase?: string, mode?: string) => {
    if (mode) setGameMode(mode as GameMode);
    setGameState(resolveLobbyGameState(phase, mode));
  }, []);

  useEffect(() => {
    if (gameState !== 'lobby' || !lobby?.game_mode) return;
    void preloadGameMode(lobby.game_mode as LobbyGameMode).catch((error) => {
      console.warn('[preload] Unable to preload game mode:', lobby.game_mode, error);
    });
  }, [gameState, lobby?.game_mode]);

  useEffect(() => {
    if (!currentPlayer || !lobby || connectionState !== 'online') return;
    routeFromLobbySnapshot(lobby.game_phase, lobby.game_mode);
  }, [connectionState, currentPlayer, lobby, routeFromLobbySnapshot]);

  // ── Resume session (crash/reload recovery) ──────────────────────────────
  const resumeStatus = useResumeSession({ enabled: gameState === 'home' });
  const [showResumeModal, setShowResumeModal] = useState(false);

  useEffect(() => {
    if (resumeStatus.kind === 'ready') {
      setShowResumeModal(true);
    }
  }, [resumeStatus.kind]);

  const handleResumeYes = useCallback(async () => {
    if (resumeStatus.kind !== 'ready' || isResuming) return;
    const { session } = resumeStatus;
    setIsResuming(true);
    setResumeError(null);

    try {
      const result = await joinLobby(session.lobbyCode, session.playerId, session.playerName);
      if (!result) {
        setResumeError('Impossible de rejoindre pour le moment. Vérifie ta connexion puis réessaie.');
        return;
      }

      const newPlayer: Player = {
        id: session.playerId,
        name: session.playerName,
        isHost: result.lobby.host_id === session.playerId,
      };
      setCurrentPlayer(newPlayer);
      setShowResumeModal(false);
      // Routing waits for useLobbySync's subscribed + SQL-certified snapshot.
    } catch (error) {
      console.error('[resume] rejoin failed:', error);
      setResumeError('La reprise a échoué, mais ta partie est toujours mémorisée. Réessaie dans un instant.');
    } finally {
      setIsResuming(false);
    }
  }, [resumeStatus, isResuming, joinLobby]);

  const handleResumeNo = useCallback(() => {
    if (isResuming) return;
    setShowResumeModal(false);
    setResumeError(null);
    clearResumeSession();
  }, [isResuming]);  // Register invitation callback for premium notification
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
      // Routing waits for the subscribed, SQL-certified hook snapshot.
    } else {
      playSoundEffect('error', 0.4);
      setCurrentPlayer(null);
    }
  }, [joinLobby, user?.id]);

  const handleStartGame = useCallback(async (mode: GameMode = 'normal') => {
    console.log('[Index] handleStartGame called with mode:', mode);
    /*
     * Signature sonore par mode. Tous les modes partaient sur le même `start`,
     * ce qui rendait le lancement interchangeable. `handleStartGame` est le seul
     * point de passage commun, donc le seul endroit juste pour la jouer.
     */
    if (!playSample(`mode${mode.charAt(0).toUpperCase()}${mode.slice(1)}`, 0.6)) {
      playSoundEffect('start', 0.5);
    }
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
        // Admin solo: add bots only where an autopilot actually plays them.
        // En mode Imitation le compte est zéro, et c'est délibéré : voir
        // `soloBotCount`.
        const connectedPlayers = players.filter(p => !(p as any).isDisconnected);
        const neededBots = isAdmin && connectedPlayers.length === 1 ? soloBotCount(mode) : 0;
        if (neededBots > 0) {
          const botNames = ['Bot Alpha', 'Bot Bravo', 'Bot Charlie', 'Bot Delta'];
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

        const gamePhase = mode === 'quiz' ? 'quiz' : mode === 'audiophone' ? 'audiophone' : mode === 'pixoguess' ? 'pixoguess' : mode === 'monopoly' ? 'monopoly' : mode === 'undercover' ? 'undercover' : mode === 'memorise' ? 'playing' : mode === 'mimic' ? 'playing' : 'preparation';
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
        } else if (mode === 'memorise') {
          setGameState('memorise');
        } else if (mode === 'mimic') {
          setGameState('mimic');
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

        if (error) throw error;
        console.log('[Index] Game phase updated to playing successfully');
        // Host transitions immediately; guests follow via the lobby snapshot.
        setGameState('playing');
      } catch (error) {
        // Previously silent: the host stayed on the preparation screen with no
        // explanation when this write failed. Surface it so they can retry.
        console.error('[Index] Error updating game phase:', error);
        playSoundEffect('error', 0.4);
        toast({
          title: 'Lancement impossible',
          description: "La partie n'a pas pu démarrer. Vérifie ta connexion puis réessaie.",
          variant: 'destructive',
        });
      }
    } else {
      console.warn('[Index] handleStartActualGame: conditions not met', { lobby: !!lobby, isHost: currentPlayer?.isHost });
    }
  }, [lobby, currentPlayer?.isHost, toast]);

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

    // Unmount the active game synchronously. Network latency must never keep
    // recording, voting or the rythmo animation alive after the user leaves.
    setSubmittedChallenges([]);
    setGameState('lobby');

    // "Terminer la partie" sends every client back to the same lobby. Do not
    // call leaveLobby here: that would remove the host and trigger migration.
    if (lobby && currentPlayer?.isHost) {
      try {
        const { error } = await supabase
          .from('lobbies')
          .update({
            status: 'waiting',
            game_phase: 'lobby',
          })
          .eq('id', lobby.id);
        if (error) throw error;
      } catch (error) {
        console.error('Error resetting lobby:', error);
      }
    }

    toast({
      title: 'Partie terminée',
      description: 'Retour au lobby !',
    });
  }, [lobby, currentPlayer?.isHost, toast]);

  const renderContent = useMemo(() => {
    return (
      <React.Suspense fallback={<LoadingFallback />}>
        {gameState === "home" && (
          theme === 'neverlikethat' ? (
            <NeverLikeThatHomeScreen
              onCreateGame={handleCreateGame}
              onJoinGame={handleJoinGame}
            />
          ) : useBetaHome ? (
            <InkBetaHomeScreen
              onCreateGame={handleCreateGame}
              onJoinGame={handleJoinGame}
              onOpenSocial={openInkSocial}
            />
          ) : useNeonHub ? (
            <NeonHomeScreen
              onCreateGame={handleCreateGame}
              onJoinGame={handleJoinGame}
            />
          ) : useInkMode ? (
            <InkHomeScreen 
              onCreateGame={handleCreateGame}
              onJoinGame={handleJoinGame}
              onOpenSocial={openInkSocial}
              isSocialOpen={showInkSocial}
            />
          ) : (
            <HomeScreen 
              onCreateGame={handleCreateGame}
              onJoinGame={handleJoinGame}
            />
          )
        )}

        {gameState === "lobby" && currentPlayer && lobby && (
          theme === 'neverlikethat' ? (
            <NeverLikeThatLobbyScreen
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
          ) : (useInkMode || useNeonHub) ? (
            <InkLobbyScreen
              variant={useBetaHome ? 'inkBeta' : 'default'}
              players={players}
              lobbyCode={lobby.code}
              lobbyId={lobby.id}
              isHost={currentPlayer.isHost}
              currentPlayer={currentPlayer}
              onStartGame={handleStartGame}
              onLeaveGame={handleLeaveGame}
              onKickPlayer={handleKickPlayer}
              onTransferHost={handleTransferHost}
              onOpenSocial={openInkSocial}
              isSocialOpen={showInkSocial}
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
            variant={useBetaHome ? 'inkBeta' : 'default'}
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
            variant={useBetaHome ? 'inkBeta' : 'default'}
            currentPlayer={currentPlayer}
            players={players}
            lobbyId={lobby.id}
            gameMode={gameMode as 'normal' | '2v2' | 'quiz'}
            onEndGame={handleEndGame}
          />
        )}

        {gameState === "quiz" && currentPlayer && lobby && (
          <QuizGameScreen
            variant={useBetaHome ? 'inkBeta' : 'default'}
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

        {gameState === "memorise" && currentPlayer && lobby && (
          <MemoriseGameScreen
            currentPlayer={currentPlayer}
            players={players}
            lobbyId={lobby.id}
            onEndGame={handleEndGame}
          />
        )}

        {gameState === "mimic" && currentPlayer && lobby && (
          <MimicGameScreen
            currentPlayer={currentPlayer}
            players={players}
            lobbyId={lobby.id}
            onEndGame={handleEndGame}
          />
        )}

      </React.Suspense>
    );
  }, [gameState, currentPlayer, lobby, players, gameMode, useInkMode, useBetaHome, useNeonHub, theme, showInkSocial, openInkSocial, handleCreateGame, handleJoinGame, handleStartGame, handleLeaveGame, handleKickPlayer, handleTransferHost, handleBackToLobby, handleSubmitChallenges, handleStartActualGame, handleEndGame]);

  return (
    <div className="game-viewport relative h-screen min-h-0 w-full overflow-hidden">
      {/* Only show dynamic background in non-ink mode (and not when the 3D theme is active) */}
      {!useInkMode && theme !== 'neverlikethat' && <DynamicBackground />}

      {/* "Never Like That" theme — interactive 3D Spline background */}
      {theme === 'neverlikethat' && (
        <React.Suspense fallback={null}>
          <NeverLikeThatBackground />
        </React.Suspense>
      )}
      
      {/* GamePlayScreen owns a strict durable-phase guard. Do not place it
          inside ScreenTransition: that component intentionally retains its
          previous child during exit animations, which would keep imitation
          recording and the rythmo RAF alive after leaving the game. */}
      {gameState === "playing" ? (
        renderContent
      ) : (
        <ScreenTransition screenKey={gameState}>
          {renderContent}
        </ScreenTransition>
      )}

      {currentPlayer && lobby && connectionState !== 'online' && (
        <ConnectionRecoveryOverlay state={connectionState} onRetry={retryConnection} />
      )}

      {/* Journal de diagnostic : la moitié de l'histoire que les logs Supabase
          ne peuvent pas raconter, à savoir ce que le client n'a pas envoyé. */}
      <DiagnosticsOverlay enabled={isAdmin} />
      
      {/* Resume session modal — shown when a player reloads/crashes and comes back */}
      {showResumeModal && resumeStatus.kind === 'ready' && (
        <div className="custom-scrollbar fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/70 p-4 pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))]">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Reprendre la partie en cours"
            className="if-panel if-fade menu-dialog custom-scrollbar max-h-full w-full max-w-sm overflow-y-auto p-5 space-y-3"
          >
            <h2 className="if-h2">Partie en cours</h2>
            <p className="if-muted text-sm">
              Tu étais dans le salon{' '}
              <span className="font-mono font-bold text-[var(--ink-text)]">
                {resumeStatus.session.lobbyCode}
              </span>
              . Veux-tu y revenir ?
            </p>
            {resumeError && (
              <p role="alert" className="rounded-[var(--ink-radius-sm)] border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {resumeError}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleResumeNo}
                disabled={isResuming}
                className="if-btn if-btn--ghost menu-focus flex-1"
              >
                Non
              </button>
              <button
                type="button"
                onClick={handleResumeYes}
                disabled={isResuming}
                aria-busy={isResuming}
                className="if-btn if-btn--primary menu-focus flex-1"
              >
                {isResuming ? <><Loader2 className="h-4 w-4 animate-spin" /> Reprise…</> : 'Oui'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Only show music bar in non-ink mode */}
      {!useInkMode && <MusicPlayerBar />}

      {/*
        Beta : le lecteur est monté ici, une seule fois, pour tous les écrans.

        Il vivait dans le pied de l'accueil, donc il disparaissait dès le salon
        et pendant toute la partie — impossible de couper ou changer la musique
        sans revenir au menu. Monté au niveau de la page, il survit aux
        changements d'écran, et le socle fixe le garde visible partout.
      */}
      {useBetaHome && (
        <div className="ik-music-dock ik-music-dock--floating">
          <MusicPlayerBar placement="inline" variant="inkBeta" />
        </div>
      )}
      
      {useInkMode && (gameState === 'home' || gameState === 'lobby') && (
        <SocialStudioDialog isOpen={showInkSocial} onClose={closeInkSocial} />
      )}

      {/*
        Hub social — réservé aux thèmes non-Ink.

        En mode Ink il faisait doublon avec `InkFriendsSidebar`, atteignable par
        le bouton « Mes amis » de l'en-tête : deux listes d'amis, deux façons
        d'accepter une demande, deux boutons pour rejoindre un ami. Son bouton
        flottant se posait par-dessus l'interface Ink, et ses couches `z-[55]`
        / `z-[56]` passaient derrière les tiroirs Ink (`--ink-z-drawer`, 9210) :
        ouvert depuis un tiroir, le panneau était invisible.
      */}
      {!useInkMode && (
        <SocialHub
          currentLobbyCode={lobby?.code}
          onJoinFriend={(lobbyCode) => {
            const storedName = localStorage.getItem('playerName') || profile?.display_name || `Joueur${Math.floor(Math.random() * 1000)}`;
            handleJoinGame(storedName, lobbyCode);
          }}
        />
      )}
      
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
