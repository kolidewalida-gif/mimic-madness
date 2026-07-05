import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  X,
  Copy,
  Check,
  Crown,
  WifiOff,
  AlertTriangle,
  MoreVertical,
  Loader2,
  Users,
  Lock,
  LogOut,
  UserPlus,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { TwitchStyleLobbyChat } from '@/components/TwitchStyleLobbyChat';
import { DeviceSettings } from '@/components/DeviceSettings';
import { useGameTeams } from '@/hooks/useGameTeams';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { InkLobbyCanvas } from '@/components/InkLobbyCanvas';
import { LobbyInvitePanel } from '@/components/LobbyInvitePanel';
import { useMultiplePlayerAvatars } from '@/hooks/useGlobalPlayerAvatar';
import { getStartStatus, GAME_MODE_META, type LobbyGameMode } from '@/lib/gameModes';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { InkShortcutsModal } from '@/components/InkShortcutsModal';
import { Share2 } from 'lucide-react';
import CardFanCarousel from '@/components/ui/card-fan-carousel';
import { MemberSelector, type Member } from '@/components/ui/member-selector';

interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isDisconnected?: boolean;
  disconnectedTimeLeft?: number;
}

interface InkLobbyScreenProps {
  players: Player[];
  lobbyCode: string;
  lobbyId: string;
  isHost: boolean;
  currentPlayer: Player;
  onStartGame: (gameMode: LobbyGameMode) => void | Promise<void>;
  onLeaveGame: () => void;
  onKickPlayer?: (playerId: string) => void;
  onTransferHost?: (playerId: string) => void;
}

interface ModeCard {
  id: LobbyGameMode;
  label: string;
  tagline: string;
  /** Image candidates in /public/lobby/cards/ — first one that loads is used */
  imageCandidates: string[];
  /** Fallback emoji shown if no image loads */
  fallbackEmoji: string;
  /** Card body color when fallback is used */
  fallbackColor: string;
  /** Glow color for active state */
  glowColor: string;
}

const MODE_CARDS: ModeCard[] = [
  {
    id: 'normal',
    label: 'IMITATION',
    tagline: 'Imite le son ou le chanteur !',
    imageCandidates: ['/lobby/cards/imitation.png', '/lobby/cards/imitation.jpg'],
    fallbackEmoji: '🎤',
    fallbackColor: '#8b5cf6',
    glowColor: '#a855f7',
  },
  {
    id: 'audiophone',
    label: 'AUDIO PIONNER',
    tagline: 'Téléphone arabe audio',
    imageCandidates: ['/lobby/cards/audiophone.png', '/lobby/cards/audiophone.jpg'],
    fallbackEmoji: '🔊',
    fallbackColor: '#f59e0b',
    glowColor: '#fbbf24',
  },
  {
    id: '2v2',
    label: '2 VS 2',
    tagline: 'Combat en équipes',
    imageCandidates: ['/lobby/cards/2v2.png', '/lobby/cards/2v2.jpg'],
    fallbackEmoji: '⚔️',
    fallbackColor: '#3b82f6',
    glowColor: '#60a5fa',
  },
  {
    id: 'quiz',
    label: 'QUIZ',
    tagline: 'Connaissances générales',
    imageCandidates: ['/lobby/cards/quiz.png', '/lobby/cards/quiz.jpg'],
    fallbackEmoji: '❓',
    fallbackColor: '#84cc16',
    glowColor: '#a3e635',
  },
  {
    id: 'pixoguess',
    label: 'BLIND TEST',
    tagline: 'Devine la musique',
    imageCandidates: ['/lobby/cards/blindtest.png', '/lobby/cards/blindtest.jpg'],
    fallbackEmoji: '🎧',
    fallbackColor: '#06b6d4',
    glowColor: '#22d3ee',
  },
  {
    id: 'undercover',
    label: 'UNDERCOVER',
    tagline: 'Trouve l\'infiltré',
    imageCandidates: ['/lobby/cards/undercover.png', '/lobby/cards/undercover.jpg'],
    fallbackEmoji: '🕵️',
    fallbackColor: '#a855f7',
    glowColor: '#c084fc',
  },
  {
    id: 'memorise',
    label: 'BLINDTEST',
    tagline: 'Devine la musique, anime ou dessin animé !',
    imageCandidates: ['/lobby/cards/blindtest.png', '/lobby/cards/blindtest.jpg', '/lobby/cards/memorise.png'],
    fallbackEmoji: '🎵',
    fallbackColor: '#d946ef',
    glowColor: '#e879f9',
  },
  {
    id: 'mimic',
    label: 'MIMIC',
    tagline: 'Karaoké compétitif — imite la chanson !',
    imageCandidates: ['/lobby/cards/mimic.png', '/lobby/cards/mimic.jpg'],
    fallbackEmoji: '🎤',
    fallbackColor: '#ff2e97',
    glowColor: '#ffcf4a',
  },
];

/**
 * Card image with multi-candidate fallback chain (tries .png then .jpg, etc.)
 * Falls back to a stylized colored card with emoji if no image loads.
 */
const CardArt = ({
  card,
  isActive,
}: {
  card: ModeCard;
  isActive: boolean;
}) => {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [allFailed, setAllFailed] = useState(false);

  const currentSrc = card.imageCandidates[candidateIndex];

  const handleError = () => {
    if (candidateIndex + 1 < card.imageCandidates.length) {
      setCandidateIndex(candidateIndex + 1);
    } else {
      setAllFailed(true);
    }
  };

  if (allFailed || !currentSrc) {
    // Fallback: stylized colored card with emoji and label
    return (
      <div
        className="absolute inset-0 rounded-2xl flex flex-col items-center justify-between p-4 overflow-hidden"
        style={{
          background: `linear-gradient(180deg, ${card.fallbackColor}, ${card.fallbackColor}dd)`,
          border: '3px solid rgba(0,0,0,0.4)',
        }}
      >
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            animate={{ rotate: [-3, 3, -3], scale: [1, 1.05, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="text-7xl"
            style={{ filter: 'drop-shadow(2px 4px 0 rgba(0,0,0,0.4))' }}
          >
            {card.fallbackEmoji}
          </motion.div>
        </div>
        <h3
          className="text-xl font-black tracking-tight leading-none text-white text-center px-1"
          style={{
            fontFamily: "'Caveat', cursive",
            textShadow:
              '2px 2px 0 #0a0810, -1.5px -1.5px 0 #0a0810, 1.5px -1.5px 0 #0a0810, -1.5px 1.5px 0 #0a0810, 1.5px 1.5px 0 #0a0810',
          }}
        >
          {card.label}
        </h3>
      </div>
    );
  }

  return (
    <img
      key={currentSrc}
      src={currentSrc}
      alt={card.label}
      onError={handleError}
      className="absolute inset-0 w-full h-full object-cover rounded-2xl"
      style={{
        filter: isActive
          ? 'brightness(1.05) saturate(1.1)'
          : 'brightness(0.9) saturate(0.95)',
      }}
    />
  );
};

/**
 * Optional asset with fallback. Tries multiple candidate URLs (.png/.jpg/etc.)
 * before rendering the fallback element.
 */
const ImageWithFallback = ({
  src,
  alt,
  className,
  fallback,
}: {
  src: string | string[];
  alt: string;
  className?: string;
  fallback: React.ReactNode;
}) => {
  const candidates = useMemo(() => {
    if (Array.isArray(src)) return src;
    // Auto-derive jpg fallback from a .png src (and vice-versa)
    if (src.endsWith('.png')) return [src, src.replace(/\.png$/, '.jpg')];
    if (src.endsWith('.jpg')) return [src, src.replace(/\.jpg$/, '.png')];
    return [src];
  }, [src]);

  const [idx, setIdx] = useState(0);
  const [allFailed, setAllFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (allFailed) return <>{fallback}</>;
  return (
    <img
      key={candidates[idx]}
      src={candidates[idx]}
      alt={alt}
      className={cn(className, loaded ? 'opacity-100' : 'opacity-0')}
      onLoad={() => setLoaded(true)}
      onError={() => {
        setLoaded(false);
        if (idx + 1 < candidates.length) setIdx(idx + 1);
        else setAllFailed(true);
      }}
      loading="eager"
    />
  );
};

/* ============================================================
   Main lobby
============================================================ */

export const InkLobbyScreen = ({
  players,
  lobbyCode,
  lobbyId,
  isHost,
  currentPlayer,
  onStartGame,
  onLeaveGame,
  onKickPlayer,
  onTransferHost,
}: InkLobbyScreenProps) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [linkShared, setLinkShared] = useState(false);
  const { isAdmin } = useAdmin();
  const [gameMode, setGameMode] = useState<LobbyGameMode>('normal');
  const [codeCopied, setCodeCopied] = useState(false);
  const { teams, assignRandomTeams } = useGameTeams(lobbyId);
  const { toast } = useToast();

  const playerIds = useMemo(() => players.map((p) => p.id), [players]);
  const { getAvatar } = useMultiplePlayerAvatars(playerIds);

  // Sync game mode with backend
  useEffect(() => {
    const fetchGameMode = async () => {
      const { data } = await supabase
        .from('lobbies')
        .select('game_mode')
        .eq('id', lobbyId)
        .single();
      if (data?.game_mode) setGameMode(data.game_mode as LobbyGameMode);
    };
    fetchGameMode();

    const channel = supabase
      .channel(`lobby-mode:${lobbyId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'lobbies', filter: `id=eq.${lobbyId}` },
        (payload: any) => {
          if (payload.new.game_mode) setGameMode(payload.new.game_mode as LobbyGameMode);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lobbyId]);

  const selectedCard = useMemo(
    () => MODE_CARDS.find((c) => c.id === gameMode) ?? MODE_CARDS[0],
    [gameMode],
  );

  // Fan carousel cards (stable) + selected index for the highlight ring
  const fanCards = useMemo(
    () =>
      MODE_CARDS.map((c) => ({
        imgUrl: c.imageCandidates[0],
        alt: c.label,
        id: c.id,
        label: c.label,
        bgColor: `linear-gradient(180deg, ${c.fallbackColor}, ${c.fallbackColor}dd)`,
      })),
    [],
  );
  const selectedFanIndex = useMemo(
    () => MODE_CARDS.findIndex((c) => c.id === gameMode),
    [gameMode],
  );

  const handleGameModeChange = useCallback(
    async (mode: LobbyGameMode) => {
      if (!isHost) return;
      playInkSound('cartoonPop', 0.4);
      try {
        const { error } = await supabase.from('lobbies').update({ game_mode: mode }).eq('id', lobbyId);
        if (error) throw error;
        setGameMode(mode);
        if (mode === '2v2' && players.length >= 4 && players.length % 2 === 0) {
          await assignRandomTeams(players);
        }
      } catch (error) {
        console.error('Error updating game mode:', error);
        toast({ title: 'Erreur', description: 'Impossible de changer le mode', variant: 'destructive' });
      }
    },
    [isHost, lobbyId, players, assignRandomTeams, toast],
  );

  const connectedCount = players.filter((p) => !p.isDisconnected).length;
  const { canStart, reasons } = getStartStatus({
    mode: gameMode,
    connectedCount,
    teamsCount: teams.length,
    isAdmin,
  });
  const minPlayers = GAME_MODE_META[gameMode].minPlayers;

  const handleStartGame = async () => {
    if (gameMode === '2v2' && teams.length === 0 && !isAdmin) {
      toast({ title: 'Équipes requises', description: "Formez d'abord les équipes", variant: 'destructive' });
      return;
    }
    setIsStarting(true);
    playInkSound('cartoonFanfare', 0.6);
    try {
      await onStartGame(gameMode);
    } catch (error) {
      console.error('[InkLobby] onStartGame failed:', error);
      setIsStarting(false);
    }
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(lobbyCode);
    setCodeCopied(true);
    playInkSound('cartoonPop', 0.3);
    toast({ title: '📋 Code copié !', description: lobbyCode });
    setTimeout(() => setCodeCopied(false), 1500);
  };

  // Share lobby link via Web Share API or copy to clipboard
  const handleShareLink = useCallback(async () => {
    const url = `${window.location.origin}${window.location.pathname}?code=${lobbyCode}`;
    const shareData = {
      title: 'Mimic Master',
      text: `Rejoins-moi sur Mimic Master ! Code lobby : ${lobbyCode}`,
      url,
    };
    playInkSound('cartoonPop', 0.3);
    try {
      if (navigator.share && /mobile|iphone|ipad|android/i.test(navigator.userAgent)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        setLinkShared(true);
        toast({ title: '🔗 Lien copié !', description: url });
        setTimeout(() => setLinkShared(false), 1800);
      }
    } catch {
      /* user cancelled share */
    }
  }, [lobbyCode, toast]);

  // Global lobby shortcuts
  const lobbyAnyModalOpen =
    showSettings || showInvitePanel || showLeaveConfirm || showShortcuts || !!openMenuFor;
  useKeyboardShortcuts([
    {
      key: 'Escape',
      enabled: lobbyAnyModalOpen,
      handler: () => {
        if (showShortcuts) setShowShortcuts(false);
        else if (showSettings) setShowSettings(false);
        else if (showInvitePanel) setShowInvitePanel(false);
        else if (showLeaveConfirm) setShowLeaveConfirm(false);
        else if (openMenuFor) setOpenMenuFor(null);
      },
      label: 'Fermer la modale',
    },
    {
      key: '?',
      shift: true,
      enabled: !lobbyAnyModalOpen,
      handler: () => setShowShortcuts(true),
      label: 'Afficher les raccourcis',
    },
    {
      key: 's',
      enabled: !lobbyAnyModalOpen,
      handler: () => setShowSettings(true),
      label: 'Ouvrir les paramètres',
    },
    {
      key: 'i',
      enabled: !lobbyAnyModalOpen && isHost,
      handler: () => setShowInvitePanel(true),
      label: 'Inviter des amis',
    },
    {
      key: 'c',
      enabled: !lobbyAnyModalOpen,
      handler: () => {
        navigator.clipboard.writeText(lobbyCode).catch(() => {});
        setCodeCopied(true);
        toast({ title: 'Code copié !', description: lobbyCode });
        setTimeout(() => setCodeCopied(false), 1500);
      },
      label: 'Copier le code lobby',
    },
    {
      key: 'l',
      enabled: !lobbyAnyModalOpen,
      handler: () => handleShareLink(),
      label: 'Partager le lien',
    },
    {
      key: 'Enter',
      enabled: !lobbyAnyModalOpen && isHost && !isStarting,
      handler: () => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        handleStartGame();
      },
      label: 'Lancer la partie (host)',
    },
  ]);

  // Close action menu on outside click
  useEffect(() => {
    if (!openMenuFor) return;
    const close = () => setOpenMenuFor(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [openMenuFor]);

  const playerCountForMode = (modeId: LobbyGameMode) =>
    modeId === gameMode ? connectedCount : 0;

  return (
    <div className="h-screen w-full flex flex-col bg-[#1a0d2e] text-white relative overflow-hidden">
      {/* Background canvas (collaborative drawing) */}
      <InkLobbyCanvas lobbyId={lobbyId} playerId={currentPlayer.id} />

      {/* Graffiti background — user image with gradient fallback */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <ImageWithFallback
          src={[
            '/lobby/backgroundlobby.png',
            '/lobby/bakcgroundlobby.png',
            '/lobby/background.png',
            '/lobby/background.jpg',
          ]}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
          fallback={
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-[#1a0d2e] via-[#160a26] to-[#0f0820]" />
              <svg className="absolute inset-0 w-full h-full opacity-[0.04]">
                <defs>
                  <pattern id="brick" x="0" y="0" width="80" height="40" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="0" x2="80" y2="0" stroke="white" strokeWidth="1" />
                    <line x1="0" y1="20" x2="80" y2="20" stroke="white" strokeWidth="1" />
                    <line x1="0" y1="0" x2="0" y2="20" stroke="white" strokeWidth="1" />
                    <line x1="40" y1="0" x2="40" y2="20" stroke="white" strokeWidth="1" />
                    <line x1="20" y1="20" x2="20" y2="40" stroke="white" strokeWidth="1" />
                    <line x1="60" y1="20" x2="60" y2="40" stroke="white" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#brick)" />
              </svg>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-[0.06] select-none">
                <span className="text-[200px] leading-none">💀</span>
              </div>
            </>
          }
        />
        {/* Subtle dark overlay so the foreground UI stays legible */}
        <div className="absolute inset-0 bg-[#1a0d2e]/15" />
        {/* Soft glow halo on top */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[400px] rounded-full opacity-25"
          style={{
            background: 'radial-gradient(ellipse, rgba(168,85,247,0.4) 0%, transparent 70%)',
            filter: 'blur(120px)',
          }}
        />
      </div>

      {/* MAIN GRID — sidebar + main area */}
      <div className="relative z-10 flex-1 grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 p-4 pb-[100px] min-h-0 overflow-hidden">

        {/* SIDEBAR — Logo + Players + Mascot + QUITTER */}
        <aside className="flex flex-col gap-3 min-h-0 overflow-hidden">
          {/* C2TV / MIMIC MASTER LOGO */}
          <div className="flex-shrink-0 flex items-center justify-center pt-2">
            <ImageWithFallback
              src="/lobby/logo.png"
              alt="MIMIC MASTER"
              className="w-full max-w-[220px] h-auto select-none pointer-events-none"
              fallback={
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold mb-1 flex items-center justify-center gap-2">
                    <Crown className="w-3 h-3 text-amber-400" fill="currentColor" />
                    MIMIC
                    <Crown className="w-3 h-3 text-amber-400" fill="currentColor" />
                  </div>
                  <h1
                    className="text-3xl font-black leading-none"
                    style={{
                      fontFamily: "'Caveat', cursive",
                      color: '#a855f7',
                      textShadow:
                        '2px 2px 0 #0a0810, -1px -1px 0 #0a0810, 1px -1px 0 #0a0810, -1px 1px 0 #0a0810',
                    }}
                  >
                    MASTER
                  </h1>
                </div>
              }
            />
          </div>

          {/* Players card */}
          <div className="relative flex-1 rounded-3xl bg-black/40 backdrop-blur-md border-2 border-white/15 overflow-hidden flex flex-col min-h-0">
            {/* Custom column background image — drop /public/lobby/players-column.png to override */}
            <ImageWithFallback
              src={[
                '/lobby/lobbycolumn.png',
                '/lobby/players-column.png',
                '/lobby/players-column.jpg',
                '/lobby/players-column.jpeg',
                '/lobby/joueurs.png',
                '/lobby/joueurs.jpg',
              ]}
              alt=""
              className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
              fallback={<></>}
            />
            {/* Subtle dark overlay so text stays readable on top of the custom image */}
            <div className="absolute inset-0 bg-[#1a0d2e]/40 pointer-events-none" />

            <div className="relative px-4 py-3 border-b border-white/10 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-purple-400" />
                <span
                  className="text-base font-black text-white"
                  style={{ fontFamily: "'Caveat', cursive" }}
                >
                  JOUEURS ({players.length})
                </span>
              </div>
              <motion.button
                onClick={handleCopyCode}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="px-2 py-1 rounded-md bg-white/[0.04] border border-white/15 text-[10px] font-mono font-bold text-white/70 hover:text-white hover:border-white/30 flex items-center gap-1"
              >
                {lobbyCode}
                {codeCopied ? (
                  <Check className="w-2.5 h-2.5 text-emerald-400" />
                ) : (
                  <Copy className="w-2.5 h-2.5" />
                )}
              </motion.button>
            </div>

            {/* Player roster + invite — vertical MemberSelector */}
            <div className="relative overflow-y-auto custom-scrollbar p-3 max-h-[260px] flex-shrink-0">
              <MemberSelector
                orientation="vertical"
                selectable={false}
                addLabel="INVITER"
                onAddClick={() => {
                  playInkSound('cartoonPop', 0.3);
                  setShowInvitePanel(true);
                }}
                selected={playerIds}
                onChange={() => {}}
                members={players.map((p) => {
                  const av = getAvatar(p.id);
                  return {
                    id: p.id,
                    name: p.name,
                    avatar: av.type === 'image' ? av.imageUrl : undefined,
                    statusColor: p.isDisconnected ? '#fbbf24' : '#34d399',
                    highlight: p.id === currentPlayer.id,
                  } as Member;
                })}
                getBadge={(m) =>
                  players.find((p) => p.id === m.id)?.isHost ? (
                    <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" fill="currentColor" />
                  ) : null
                }
                renderItemMeta={(m) => {
                  const p = players.find((pp) => pp.id === m.id);
                  return p?.isDisconnected ? (
                    <span className="flex items-center gap-1 text-amber-400">
                      <WifiOff className="w-2.5 h-2.5" />
                      Reconnexion
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-emerald-400 font-bold">
                      <span className="w-1 h-1 rounded-full bg-emerald-400" />
                      EN LIGNE
                    </span>
                  );
                }}
                renderItemAction={(m) => {
                  const p = players.find((pp) => pp.id === m.id);
                  if (!p || !isHost || p.id === currentPlayer.id || (!onKickPlayer && !onTransferHost)) return null;
                  return (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playInkSound('cartoonPop', 0.3);
                          setOpenMenuFor(openMenuFor === p.id ? null : p.id);
                        }}
                        className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <MoreVertical className="w-3 h-3" />
                      </button>
                      <AnimatePresence>
                        {openMenuFor === p.id && (
                          <motion.div
                            initial={{ opacity: 0, y: -5, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -5, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-7 z-50 w-44 rounded-xl bg-[#1a0d2e]/95 backdrop-blur-xl border-2 border-white/15 shadow-2xl overflow-hidden"
                          >
                            {onTransferHost && (
                              <button
                                type="button"
                                onClick={() => {
                                  playInkSound('cartoonDing', 0.3);
                                  onTransferHost(p.id);
                                  setOpenMenuFor(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/80 hover:bg-amber-500/10 hover:text-amber-400 transition-colors text-left"
                              >
                                <Crown className="w-3.5 h-3.5" />
                                Transférer l'hôte
                              </button>
                            )}
                            {onKickPlayer && (
                              <button
                                type="button"
                                onClick={() => {
                                  playInkSound('cartoonZap', 0.3);
                                  onKickPlayer(p.id);
                                  setOpenMenuFor(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/80 hover:bg-red-500/10 hover:text-red-400 transition-colors text-left border-t border-white/8"
                              >
                                <X className="w-3.5 h-3.5" />
                                Exclure
                              </button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                }}
              />
            </div>

            {/* Twitch-style chat (INVITER is now part of the player roster above) */}
            <div className="relative flex-1 px-3 pb-2 flex flex-col gap-2 min-h-0 overflow-hidden">
              {/* Twitch-style chat — fills remaining space */}
              <div className="flex-1 min-h-0">
                <TwitchStyleLobbyChat
                  lobbyId={lobbyId}
                  playerId={currentPlayer.id}
                  playerName={currentPlayer.name}
                  className="h-full"
                />
              </div>
            </div>
          </div>

          {/* QUITTER */}
          <motion.button
            onClick={() => {
              playInkSound('cartoonSwoosh', 0.3);
              setShowLeaveConfirm(true);
            }}
            whileHover={{ scale: 1.02, x: -2 }}
            whileTap={{ scale: 0.98 }}
            className="flex-shrink-0 w-full flex items-center justify-center gap-2 px-3 py-3 rounded-2xl bg-red-500/15 border-2 border-red-500/40 hover:bg-red-500/25 hover:border-red-500/60 text-red-300 hover:text-red-200 transition-all overflow-hidden relative"
          >
            <ImageWithFallback
              src="/lobby/leave.png"
              alt=""
              className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none opacity-90"
              fallback={<></>}
            />
            <LogOut className="w-4 h-4 relative z-10" />
            <span
              className="text-base font-black uppercase tracking-wider relative z-10"
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              QUITTER
            </span>
          </motion.button>
        </aside>

        {/* MAIN CONTENT — Hero header + Mode grid + PRÊT button */}
        <main className="flex flex-col min-h-0 overflow-hidden gap-3">
          {/* Hero mode banner */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedCard.id}
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="relative flex-shrink-0 px-4 py-3 flex items-center gap-3 rounded-2xl border-2 border-purple-400/30 overflow-hidden"
              style={{
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05), 0 6px 18px rgba(0,0,0,0.3)`,
              }}
            >
              {/* Topbar background image */}
              <ImageWithFallback
                src="/lobby/topbar.png"
                alt=""
                className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
                fallback={<div className="absolute inset-0 bg-purple-950/30 backdrop-blur-md" />}
              />
              <div className="absolute inset-0 bg-black/20 pointer-events-none" />
              {/* Icon badge — uses the card image as thumbnail */}
              <div
                className="relative w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 border-2 overflow-hidden"
                style={{
                  background: selectedCard.fallbackColor,
                  borderColor: 'rgba(0,0,0,0.4)',
                  boxShadow: `0 4px 12px ${selectedCard.fallbackColor}66`,
                }}
              >
                <ImageWithFallback
                  src={selectedCard.imageCandidates[0]}
                  alt={selectedCard.label}
                  className="w-full h-full object-cover"
                  fallback={<span className="text-3xl">{selectedCard.fallbackEmoji}</span>}
                />
              </div>

              <div className="relative flex-1 min-w-0">
                <h2
                  className="text-2xl md:text-3xl font-black leading-none tracking-tight text-white"
                  style={{
                    fontFamily: "'Caveat', cursive",
                    textShadow:
                      '2px 2px 0 #0a0810, -1px -1px 0 #0a0810, 1px -1px 0 #0a0810, -1px 1px 0 #0a0810',
                  }}
                >
                  {selectedCard.label}
                </h2>
                <p className="text-xs md:text-sm text-white/80 mt-0.5">
                  {selectedCard.tagline}
                </p>
                <div className="flex items-center gap-3 mt-1.5 text-[10px] uppercase tracking-wider font-bold">
                  <span className="text-white/50">
                    Mode : <span className="text-white">SOLO</span>
                  </span>
                  <span className="text-white/50">
                    Difficulté :
                    <span
                      className="ml-1 inline-block px-1.5 py-0.5 rounded-md text-white"
                      style={{ background: selectedCard.fallbackColor }}
                    >
                      NORMAL
                    </span>
                  </span>
                </div>
              </div>

              <div className="relative flex items-center gap-2 flex-shrink-0">
                <motion.button
                  onClick={handleShareLink}
                  whileHover={{ scale: 1.06, rotate: -8 }}
                  whileTap={{ scale: 0.94 }}
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/15 border-2 border-white/20 hover:border-white/40 flex items-center justify-center text-white/70 hover:text-white transition-all"
                  title="Partager le lien (L)"
                >
                  {linkShared ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Share2 className="w-3.5 h-3.5" />
                  )}
                </motion.button>
                <motion.button
                  onClick={() => {
                    playInkSound('cartoonPop', 0.3);
                    setShowShortcuts(true);
                  }}
                  whileHover={{ scale: 1.1, rotate: -10 }}
                  whileTap={{ scale: 0.92 }}
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/15 border-2 border-white/20 hover:border-white/40 flex items-center justify-center text-white/70 hover:text-white transition-all"
                  title="Raccourcis (?)"
                >
                  <span
                    className="text-base font-black"
                    style={{ fontFamily: "'Caveat', cursive" }}
                  >
                    ?
                  </span>
                </motion.button>
                <motion.button
                  onClick={() => {
                    playInkSound('cartoonPop', 0.3);
                    setShowSettings(true);
                  }}
                  whileHover={{ rotate: 90 }}
                  whileTap={{ scale: 0.96 }}
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/15 border-2 border-white/20 hover:border-white/40 flex items-center justify-center text-white/70 hover:text-white transition-all"
                  title="Paramètres (S)"
                >
                  <Settings className="w-3.5 h-3.5" />
                </motion.button>
              </div>

              {/* Decorative lightning bolts */}
              <Sparkles className="absolute -bottom-1 -left-1 w-4 h-4 text-amber-400 select-none pointer-events-none" />
              <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-amber-400 select-none pointer-events-none" />
            </motion.div>
          </AnimatePresence>

          {/* Reasons banner */}
          <AnimatePresence>
            {isHost && !canStart && reasons.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden flex-shrink-0"
              >
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/[0.1] border-2 border-amber-500/30">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span className="text-xs text-amber-200/90">{reasons.join(' · ')}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* MODE FAN CAROUSEL — all modes shown in a fan */}
          <div className="flex-1 min-h-0 flex items-center justify-center">
            <CardFanCarousel
              cards={fanCards}
              selectedIndex={selectedFanIndex}
              onCardClick={(i) => {
                if (isHost) handleGameModeChange(MODE_CARDS[i].id);
              }}
            />
          </div>

          {/* PRÊT button (host) — uses /lobby/pret-stamp.png */}
          <div className="flex-shrink-0 flex items-end justify-end pb-2 pr-2">
            {isHost ? (
              isStarting ? (
                <div className="px-6 py-4 rounded-2xl bg-white/5 border-2 border-white/10 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span
                    className="text-xl font-black text-white"
                    style={{ fontFamily: "'Caveat', cursive" }}
                  >
                    Démarrage…
                  </span>
                </div>
              ) : (
                <PretButton onClick={handleStartGame} disabled={!canStart} />
              )
            ) : (
              <div className="px-6 py-4 rounded-2xl bg-white/5 border-2 border-white/10 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-white/50" />
                <span
                  className="text-base font-black text-white/70"
                  style={{ fontFamily: "'Caveat', cursive" }}
                >
                  En attente de l'hôte…
                </span>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Floating chat removed — replaced by integrated TwitchStyleLobbyChat in players sidebar */}

      {/* INVITE DRAWER */}
      <AnimatePresence>
        {showInvitePanel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
              onClick={() => setShowInvitePanel(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50 flex flex-col"
              style={{
                background:
                  'linear-gradient(180deg, #1a0d2e 0%, #160a26 50%, #0f0820 100%)',
                borderLeft: '4px solid #0a0810',
                boxShadow: '-8px 0 24px rgba(0,0,0,0.5)',
              }}
            >
              {/* Inner accent line */}
              <div
                className="absolute inset-y-0 left-1.5 w-0.5 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(180deg, transparent, rgba(168,85,247,0.4), transparent)',
                }}
              />

              <div
                className="relative flex items-center justify-between px-5 py-4 flex-shrink-0"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(168,85,247,0.18), rgba(168,85,247,0.05))',
                  borderBottom: '3px solid #0a0810',
                }}
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: [-5, 5, -5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-11 h-11 rounded-2xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
                      border: '3px solid #0a0810',
                      boxShadow:
                        '0 4px 0 #0a0810, inset 0 2px 0 rgba(255,255,255,0.25)',
                    }}
                  >
                    <UserPlus className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </motion.div>
                  <h2
                    className="text-3xl font-black text-white leading-none"
                    style={{
                      fontFamily: "'Caveat', cursive",
                      textShadow:
                        '2px 2px 0 #0a0810, -1.5px -1.5px 0 #0a0810, 1.5px -1.5px 0 #0a0810, -1.5px 1.5px 0 #0a0810, 1.5px 1.5px 0 #0a0810',
                    }}
                  >
                    Inviter
                  </h2>
                </div>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowInvitePanel(false)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                  style={{
                    background: 'rgba(239,68,68,0.2)',
                    border: '2.5px solid #0a0810',
                    boxShadow: '0 3px 0 #0a0810',
                  }}
                >
                  <X className="w-5 h-5" strokeWidth={3} />
                </motion.button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                <LobbyInvitePanel
                  lobbyCode={lobbyCode}
                  lobbyId={lobbyId}
                  players={players}
                  isHost={isHost}
                  inlineMode
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* SETTINGS MODAL */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20, rotate: -1 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotate: -0.5 }}
              exit={{ opacity: 0, scale: 0.92, y: 20, rotate: 1 }}
              transition={{ type: 'spring', damping: 22, stiffness: 240 }}
              className="relative w-full max-w-3xl max-h-[calc(100dvh-2rem)] flex flex-col rounded-3xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              style={{
                background:
                  'linear-gradient(180deg, #1a0d2e 0%, #160a26 50%, #0f0820 100%)',
                border: '4px solid #0a0810',
                boxShadow:
                  '0 12px 0 #0a0810, 0 18px 40px rgba(168,85,247,0.35), inset 0 2px 0 rgba(255,255,255,0.08)',
              }}
            >
              {/* Inner accent border */}
              <div
                className="absolute inset-1.5 rounded-[1.3rem] pointer-events-none z-[1]"
                style={{ border: '2px solid rgba(168,85,247,0.4)' }}
              />
              {/* Decorative stars */}
              <Sparkles
                className="absolute top-3 left-4 w-4 h-4 text-amber-400 z-10 select-none pointer-events-none"
                style={{ filter: 'drop-shadow(1px 1px 0 #0a0810)' }}
              />
              <Sparkles
                className="absolute top-3 right-4 w-4 h-4 text-pink-400 z-10 select-none pointer-events-none"
                style={{ filter: 'drop-shadow(1px 1px 0 #0a0810)' }}
              />
              <div className="relative z-[2] flex flex-col min-h-0 flex-1">
                <DeviceSettings showPreview onClose={() => setShowSettings(false)} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEAVE CONFIRM */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setShowLeaveConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 20, rotate: -3 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotate: -1 }}
              exit={{ opacity: 0, scale: 0.85, y: 20, rotate: 3 }}
              transition={{ type: 'spring', damping: 20, stiffness: 240 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm max-h-[calc(100dvh-2rem)] flex flex-col rounded-3xl overflow-hidden"
              style={{
                background:
                  'linear-gradient(180deg, #1a0d2e 0%, #160a26 50%, #0f0820 100%)',
                border: '4px solid #0a0810',
                boxShadow:
                  '0 12px 0 #0a0810, 0 18px 40px rgba(239,68,68,0.35), inset 0 2px 0 rgba(255,255,255,0.08)',
              }}
            >
              {/* Inner red accent border */}
              <div
                className="absolute inset-1.5 rounded-[1.3rem] pointer-events-none"
                style={{ border: '2px solid rgba(239,68,68,0.4)' }}
              />

              {/* Decorative star */}
              <Sparkles
                className="absolute top-3 right-4 w-4 h-4 text-amber-400 z-10 select-none pointer-events-none"
                style={{ filter: 'drop-shadow(1px 1px 0 #0a0810)' }}
              />

              <div className="relative p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <motion.div
                    animate={{ rotate: [-6, 6, -6] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                      border: '3px solid #0a0810',
                      boxShadow:
                        '0 4px 0 #0a0810, inset 0 2px 0 rgba(255,255,255,0.25)',
                    }}
                  >
                    <AlertTriangle className="w-6 h-6 text-white" strokeWidth={2.5} />
                  </motion.div>
                  <div>
                    <h3
                      className="text-3xl font-black text-white leading-none"
                      style={{
                        fontFamily: "'Caveat', cursive",
                        textShadow:
                          '2px 2px 0 #0a0810, -1.5px -1.5px 0 #0a0810, 1.5px -1.5px 0 #0a0810, -1.5px 1.5px 0 #0a0810, 1.5px 1.5px 0 #0a0810',
                      }}
                    >
                      Quitter le lobby ?
                    </h3>
                    <p
                      className="text-base text-white/70 mt-1 font-bold"
                      style={{ fontFamily: "'Caveat', cursive" }}
                    >
                      {isHost
                        ? 'Le lobby sera transféré ou fermé.'
                        : 'Tu seras déconnecté de la partie.'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.04, rotate: -2 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setShowLeaveConfirm(false)}
                    className="flex-1 py-3 rounded-2xl text-xl font-black text-white"
                    style={{
                      background: 'linear-gradient(180deg, #4b5563, #1f2937)',
                      border: '3px solid #0a0810',
                      boxShadow: '0 4px 0 #0a0810',
                      fontFamily: "'Caveat', cursive",
                      textShadow:
                        '1.5px 1.5px 0 #0a0810, -1px -1px 0 #0a0810, 1px -1px 0 #0a0810, -1px 1px 0 #0a0810',
                    }}
                  >
                    Rester
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.04, rotate: 2 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      playInkSound('cartoonZap', 0.4);
                      onLeaveGame();
                    }}
                    className="flex-1 py-3 rounded-2xl text-xl font-black text-white"
                    style={{
                      background: 'linear-gradient(180deg, #ef4444, #b91c1c)',
                      border: '3px solid #0a0810',
                      boxShadow: '0 4px 0 #0a0810',
                      fontFamily: "'Caveat', cursive",
                      textShadow:
                        '1.5px 1.5px 0 #0a0810, -1px -1px 0 #0a0810, 1px -1px 0 #0a0810, -1px 1px 0 #0a0810',
                    }}
                  >
                    Quitter
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(168, 85, 247, 0.3); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(168, 85, 247, 0.5); }

      `}</style>

      {/* SHORTCUTS HELP MODAL */}
      <InkShortcutsModal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
        extra={[
          { keys: ['I'], label: 'Inviter des amis (host)' },
          { keys: ['L'], label: 'Partager le lien' },
          { keys: ['C'], label: 'Copier le code lobby' },
          { keys: ['Enter'], label: 'Lancer la partie (host)' },
        ]}
      />
    </div>
  );
};

/**
 * PRÊT button — uses the user's pret-stamp.png with a graceful SVG fallback.
 */
const PretButton = ({ onClick, disabled }: { onClick: () => void; disabled: boolean }) => {
  const [imageOk, setImageOk] = useState(true);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.06, rotate: -2 } : undefined}
      whileTap={!disabled ? { scale: 0.94, rotate: 1 } : undefined}
      animate={!disabled ? { rotate: [-3, 3, -3] } : undefined}
      transition={
        !disabled ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } : undefined
      }
      className={cn(
        'relative w-60 h-44 flex-shrink-0 select-none',
        disabled && 'opacity-40 grayscale cursor-not-allowed',
      )}
      style={{
        filter: !disabled
          ? 'drop-shadow(0 6px 18px rgba(251, 191, 36, 0.4))'
          : undefined,
      }}
    >
      {imageOk ? (
        <img
          src="/lobby/pret-stamp.png"
          alt="PRÊT !"
          className="w-full h-full object-contain"
          onError={() => setImageOk(false)}
        />
      ) : (
        <>
          <svg
            viewBox="0 0 200 150"
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="xMidYMid meet"
          >
            <path
              d="M100,10 L120,40 L155,25 L150,60 L185,55 L165,85 L195,100 L165,115 L185,145 L150,140 L155,175 L120,160 L100,190 L80,160 L45,175 L50,140 L15,145 L35,115 L5,100 L35,85 L15,55 L50,60 L45,25 L80,40 Z"
              fill="#fbbf24"
              stroke="#0a0810"
              strokeWidth="5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
          <span
            className="absolute inset-0 flex items-center justify-center text-4xl md:text-5xl font-black tracking-wide"
            style={{
              fontFamily: "'Caveat', cursive",
              color: 'white',
              textShadow:
                '3px 3px 0 #0a0810, -1.5px -1.5px 0 #0a0810, 1.5px -1.5px 0 #0a0810, -1.5px 1.5px 0 #0a0810, 1.5px 1.5px 0 #0a0810',
            }}
          >
            PRÊT !
          </span>
          <span
            className="absolute -right-2 top-1/2 -translate-y-1/2 text-3xl"
            style={{ filter: 'drop-shadow(2px 2px 0 #0a0810)' }}
          >
            ✌️
          </span>
        </>
      )}
    </motion.button>
  );
};
