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
import { LobbyChat } from '@/components/LobbyChat';
import { DeviceSettings } from '@/components/DeviceSettings';
import { useGameTeams } from '@/hooks/useGameTeams';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { InkLobbyCanvas } from '@/components/InkLobbyCanvas';
import { InkCursorParticles } from '@/components/InkCursorParticles';
import { LobbyInvitePanel } from '@/components/LobbyInvitePanel';
import { useMultiplePlayerAvatars } from '@/hooks/useGlobalPlayerAvatar';
import { getStartStatus, GAME_MODE_META, type LobbyGameMode } from '@/lib/gameModes';

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
    id: 'monopoly',
    label: 'MEMORY',
    tagline: 'Plateau aventure',
    imageCandidates: ['/lobby/cards/memory.png', '/lobby/cards/memory.jpg'],
    fallbackEmoji: '🔐',
    fallbackColor: '#ec4899',
    glowColor: '#f472b6',
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

  if (allFailed) return <>{fallback}</>;
  return (
    <img
      key={candidates[idx]}
      src={candidates[idx]}
      alt={alt}
      className={className}
      onError={() => {
        if (idx + 1 < candidates.length) setIdx(idx + 1);
        else setAllFailed(true);
      }}
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
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
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
    setTimeout(() => setCodeCopied(false), 1500);
  };

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
      <InkCursorParticles />

      {/* Graffiti background — user image with gradient fallback */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <ImageWithFallback
          src={[
            '/lobby/background.png',
            '/lobby/background.jpg',
            '/lobby/background.jpeg',
            '/lobby/bakcgroundlobby.jpeg',
            '/lobby/bakcgroundlobby.jpg',
            '/lobby/bakcgroundlobby.png',
          ]}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
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
      <div className="relative z-10 flex-1 grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4 p-4 pb-[100px] min-h-0 overflow-hidden">

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
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between flex-shrink-0">
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

            {/* Player list */}
            <div className="overflow-y-auto custom-scrollbar p-3 max-h-[280px]">
              <div className="space-y-2">
                <AnimatePresence>
                  {players.map((player, idx) => {
                    const isMe = player.id === currentPlayer.id;
                    const isDisc = player.isDisconnected;
                    const av = getAvatar(player.id);
                    const hasImage = av.type === 'image' && av.imageUrl;
                    return (
                      <motion.div
                        key={player.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: idx * 0.04 }}
                        className={cn(
                          'group relative flex items-center gap-2.5 px-2.5 py-2 rounded-2xl transition-all',
                          isMe ? 'bg-purple-500/10' : 'bg-transparent hover:bg-white/[0.03]',
                          isDisc && 'opacity-60',
                        )}
                      >
                        <div className="relative flex-shrink-0">
                          <div
                            className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-sm font-black text-white border-2 border-white/15"
                            style={{ background: 'linear-gradient(135deg, #a855f7, #6b21a8)' }}
                          >
                            {hasImage ? (
                              <img src={av.imageUrl} alt={player.name} className="w-full h-full object-cover" />
                            ) : (
                              player.name[0]?.toUpperCase()
                            )}
                          </div>
                          <div
                            className={cn(
                              'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#1a0d2e]',
                              isDisc ? 'bg-amber-400' : 'bg-emerald-400',
                            )}
                            style={{
                              boxShadow: isDisc
                                ? '0 0 6px rgba(251, 191, 36, 0.6)'
                                : '0 0 6px rgba(52, 211, 153, 0.6)',
                            }}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="text-sm font-black text-white truncate"
                              style={{ fontFamily: "'Caveat', cursive" }}
                            >
                              {player.name}
                            </span>
                            {player.isHost && (
                              <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" fill="currentColor" />
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px]">
                            {isDisc ? (
                              <span className="flex items-center gap-1 text-amber-400">
                                <WifiOff className="w-2.5 h-2.5" />
                                Reconnexion
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                                <span className="w-1 h-1 rounded-full bg-emerald-400" />
                                EN LIGNE
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Host kebab */}
                        {isHost && !isMe && (onKickPlayer || onTransferHost) && (
                          <div className="relative flex-shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                playInkSound('cartoonPop', 0.3);
                                setOpenMenuFor(openMenuFor === player.id ? null : player.id);
                              }}
                              className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <MoreVertical className="w-3 h-3" />
                            </button>
                            <AnimatePresence>
                              {openMenuFor === player.id && (
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
                                        onTransferHost(player.id);
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
                                        onKickPlayer(player.id);
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
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>

            {/* Waiting message + mascot */}
            <div className="flex-1 px-3 pb-2 flex flex-col items-center justify-end min-h-0 overflow-hidden">
              <p className="text-xs text-white/50 italic text-center mb-1">
                En attente d'autres joueurs…
              </p>
              {players.length < minPlayers && (
                <>
                  <p
                    className="text-sm font-black text-white/85 text-center mt-1"
                    style={{ fontFamily: "'Caveat', cursive" }}
                  >
                    Invite tes amis pour commencer !
                  </p>
                  <div className="text-2xl text-white/40 mt-1 mb-2">↓</div>
                </>
              )}

              {/* Mascot */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                className="mt-1 mb-2"
              >
                <ImageWithFallback
                  src="/lobby/mascot.png"
                  alt="mascot"
                  className="w-32 h-auto select-none pointer-events-none"
                  fallback={<div className="text-6xl select-none">🎤</div>}
                />
              </motion.div>
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
            className="flex-shrink-0 w-full flex items-center justify-center gap-2 px-3 py-3 rounded-2xl bg-red-500/15 border-2 border-red-500/40 hover:bg-red-500/25 hover:border-red-500/60 text-red-300 hover:text-red-200 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span
              className="text-base font-black uppercase tracking-wider"
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
              className="relative flex-shrink-0 px-4 py-3 flex items-center gap-3 rounded-2xl border-2 border-purple-400/30 bg-purple-950/30 backdrop-blur-md"
              style={{
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05), 0 6px 18px rgba(0,0,0,0.3)`,
              }}
            >
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
                  onClick={() => {
                    playInkSound('cartoonPop', 0.3);
                    setShowInvitePanel(true);
                  }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border-2 border-white/20 hover:border-white/40 transition-all text-xs font-black text-white"
                  style={{ fontFamily: "'Caveat', cursive" }}
                >
                  <UserPlus className="w-3 h-3" />
                  INVITER
                </motion.button>
                <motion.button
                  onClick={() => {
                    playInkSound('cartoonPop', 0.3);
                    setShowSettings(true);
                  }}
                  whileHover={{ rotate: 90 }}
                  whileTap={{ scale: 0.96 }}
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/15 border-2 border-white/20 hover:border-white/40 flex items-center justify-center text-white/70 hover:text-white transition-all"
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

          {/* MODE CARD GRID — uses real images */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 min-h-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pb-4 max-w-[560px] mx-0">
              {MODE_CARDS.map((card) => {
                const isActive = card.id === gameMode;
                const meta = GAME_MODE_META[card.id];
                const enoughPlayers = connectedCount >= meta.minPlayers || isAdmin;
                const disabled = !isHost;
                const count = playerCountForMode(card.id);

                return (
                  <motion.button
                    key={card.id}
                    type="button"
                    onClick={() => !disabled && handleGameModeChange(card.id)}
                    whileHover={!disabled ? { y: -4, scale: 1.02 } : undefined}
                    whileTap={!disabled ? { scale: 0.97 } : undefined}
                    disabled={disabled}
                    animate={
                      isActive
                        ? {
                            y: [0, -3, 0],
                            transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
                          }
                        : undefined
                    }
                    className={cn(
                      'relative aspect-[3/4] rounded-2xl overflow-hidden text-left transition-all group',
                      !enoughPlayers && !isActive && 'opacity-60',
                      disabled && 'cursor-default',
                    )}
                    style={{
                      filter: isActive
                        ? `drop-shadow(0 0 16px ${card.glowColor}cc) drop-shadow(0 8px 24px ${card.glowColor}88)`
                        : 'drop-shadow(0 6px 12px rgba(0,0,0,0.4))',
                    }}
                  >
                    {/* Active outer glow ring */}
                    {isActive && (
                      <div
                        className="absolute -inset-1 rounded-2xl pointer-events-none"
                        style={{
                          background: `${card.glowColor}`,
                          opacity: 0.4,
                          filter: 'blur(12px)',
                        }}
                      />
                    )}

                    {/* Card art — image OR fallback */}
                    <CardArt card={card} isActive={isActive} />

                    {/* Player count pill — overlay at bottom */}
                    <div
                      className="absolute bottom-2 left-2 right-2 px-3 py-1.5 rounded-full flex items-center justify-center gap-1.5 border-2 text-[11px] font-black uppercase tracking-wider text-white"
                      style={{
                        background: 'rgba(0,0,0,0.55)',
                        borderColor: 'rgba(255,255,255,0.15)',
                        backdropFilter: 'blur(4px)',
                        fontFamily: "'Caveat', cursive",
                      }}
                    >
                      <Users className="w-3 h-3" />
                      {count} JOUEUR{count !== 1 ? 'S' : ''}
                    </div>

                    {/* Active checkmark */}
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="absolute -top-2 -right-2 w-9 h-9 rounded-full bg-amber-400 border-4 border-[#1a0d2e] flex items-center justify-center z-10"
                        style={{
                          boxShadow: '0 4px 14px rgba(251, 191, 36, 0.6)',
                        }}
                      >
                        <Check className="w-5 h-5 text-[#0a0810]" strokeWidth={3} />
                      </motion.div>
                    )}

                    {/* Lock for non-host */}
                    {disabled && !isActive && (
                      <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 border border-white/20 flex items-center justify-center backdrop-blur-sm">
                        <Lock className="w-3 h-3 text-white/60" />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
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

      {/* Floating chat */}
      <LobbyChat
        lobbyId={lobbyId}
        playerId={currentPlayer.id}
        playerName={currentPlayer.name}
      />

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
              className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50 flex flex-col bg-[#1a0d2e]/95 backdrop-blur-2xl border-l-2 border-white/15 shadow-2xl"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" style={{ color: '#a855f7' }} />
                  <h2
                    className="text-2xl font-black text-white"
                    style={{ fontFamily: "'Caveat', cursive" }}
                  >
                    Inviter
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInvitePanel(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                <LobbyInvitePanel
                  lobbyCode={lobbyCode}
                  lobbyId={lobbyId}
                  players={players}
                  isHost={isHost}
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
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <DeviceSettings showPreview onClose={() => setShowSettings(false)} />
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
              initial={{ opacity: 0, scale: 0.9, y: 10, rotate: -3 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotate: -1 }}
              exit={{ opacity: 0, scale: 0.9, y: 10, rotate: 3 }}
              transition={{ type: 'spring', damping: 18, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm bg-[#1a0d2e]/95 backdrop-blur-2xl border-2 border-red-500/40 rounded-3xl p-5 space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-500/20 border-2 border-red-500/40 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3
                    className="text-2xl font-black text-white"
                    style={{ fontFamily: "'Caveat', cursive" }}
                  >
                    Quitter le lobby ?
                  </h3>
                  <p className="text-xs text-white/55 mt-0.5">
                    {isHost
                      ? 'Le lobby sera transféré ou fermé.'
                      : 'Vous serez déconnecté de la partie.'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowLeaveConfirm(false)}
                  className="flex-1 py-2.5 rounded-2xl border-2 border-white/15 text-white/70 hover:border-white/30 hover:text-white transition-all text-base font-black"
                  style={{ fontFamily: "'Caveat', cursive" }}
                >
                  Rester
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playInkSound('cartoonZap', 0.4);
                    onLeaveGame();
                  }}
                  className="flex-1 py-2.5 rounded-2xl text-base font-black text-white bg-red-500 hover:bg-red-400 border-2 border-red-700 transition-all"
                  style={{ fontFamily: "'Caveat', cursive" }}
                >
                  Quitter
                </button>
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
        'relative w-44 h-32 flex-shrink-0 select-none',
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
