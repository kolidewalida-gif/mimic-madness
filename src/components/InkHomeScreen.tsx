import { useState, memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';
import {
  Phone,
  Copy,
  Swords,
  Brain,
  Zap,
  X,
  Settings,
  UserX,
  Volume2,
  VolumeX,
  ChevronLeft,
  User,
  UsersRound,
  Hash,
  Crown,
  Play,
  Check,
  Sparkles,
  Music,
  Mic2,
  Dices,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { DeviceSettings } from '@/components/DeviceSettings';
import { GAME_MODE_META, GAME_MODE_ORDER, type LobbyGameMode } from '@/lib/gameModes';
import { usePlayerLevel } from '@/hooks/usePlayerLevel';
import { InkProfileSidebar } from '@/components/InkProfileSidebar';
import { InkFriendsSidebar } from '@/components/InkFriendsSidebar';
import { InkPatchNoteModal, CURRENT_VERSION } from '@/components/InkPatchNoteModal';
import { InkShortcutsModal } from '@/components/InkShortcutsModal';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useRecentLobbies } from '@/hooks/useRecentLobbies';
import { toast } from 'sonner';


interface InkHomeScreenProps {
  onCreateGame: (playerName: string, gameMode?: LobbyGameMode) => void;
  onJoinGame: (playerName: string, lobbyCode: string) => void;
}

interface GameModeInfo {
  id: LobbyGameMode;
  name: string;
  shortLabel: string;
  tagline: string;
  description: string;
  icon: React.ReactNode;
  /** Mini card image candidates (small bottom row) */
  cardImageCandidates: string[];
  /** Hero banner image candidates (big top card) */
  bannerImageCandidates: string[];
  fallbackEmoji: string;
  fallbackColor: string;
  accent: string;
}

/** Lucide icon per mode — kept here so GAME_MODES stays data-only. */
const MODE_ICONS: Record<LobbyGameMode, React.ReactNode> = {
  normal: <Copy className="w-7 h-7" />,
  audiophone: <Phone className="w-7 h-7" />,
  '2v2': <Swords className="w-7 h-7" />,
  quiz: <Brain className="w-7 h-7" />,
  pixoguess: <Zap className="w-7 h-7" />,
  undercover: <UserX className="w-7 h-7" />,
  memorise: <Music className="w-7 h-7" />,
  mimic: <Mic2 className="w-7 h-7" />,
  monopoly: <Dices className="w-7 h-7" />,
};

/**
 * All game modes for the home hero carousel. Derived from GAME_MODE_META
 * (single source of truth) via GAME_MODE_ORDER so every mode — including
 * `mimic` and `memorise` (Blindtest) — is present and stays consistent.
 */
const GAME_MODES: GameModeInfo[] = GAME_MODE_ORDER.map((id) => {
  const meta = GAME_MODE_META[id];
  return {
    id,
    name: meta.label,
    shortLabel: meta.shortLabel,
    tagline: meta.tagline,
    description: meta.description,
    icon: MODE_ICONS[id],
    cardImageCandidates: meta.imageCandidates,
    bannerImageCandidates: [`/home/banners/${id}.png`, `/home/banners/${id}.jpg`],
    fallbackEmoji: meta.fallbackEmoji,
    fallbackColor: meta.fallbackColor,
    accent: meta.accent,
  };
});

/* ============================================================
   Image with multi-candidate fallback
============================================================ */
const ImageWithFallback = ({
  src,
  alt,
  className,
  fallback,
  style,
}: {
  src: string | string[];
  alt: string;
  className?: string;
  fallback: React.ReactNode;
  style?: React.CSSProperties;
}) => {
  const candidates = useMemo(() => {
    if (Array.isArray(src)) return src;
    if (src.endsWith('.png')) return [src, src.replace(/\.png$/, '.jpg')];
    if (src.endsWith('.jpg')) return [src, src.replace(/\.jpg$/, '.png')];
    return [src];
  }, [src]);

  const [idx, setIdx] = useState(0);
  const [allFailed, setAllFailed] = useState(false);

  // Reset on src change
  useEffect(() => {
    setIdx(0);
    setAllFailed(false);
  }, [JSON.stringify(candidates)]);

  if (allFailed) return <>{fallback}</>;
  return (
    <img
      key={candidates[idx]}
      src={candidates[idx]}
      alt={alt}
      className={className}
      style={style}
      onError={() => {
        if (idx + 1 < candidates.length) setIdx(idx + 1);
        else setAllFailed(true);
      }}
    />
  );
};

const InkHomeScreenComponent = ({ onCreateGame, onJoinGame }: InkHomeScreenProps) => {
  const { profile, friendCode } = useAuth();
  const [playerName, setPlayerName] = useState('');
  const [lobbyCode, setLobbyCode] = useState('');
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPatchNote, setShowPatchNote] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [showFriendsDrawer, setShowFriendsDrawer] = useState(false);
  const [modeIndex, setModeIndex] = useState(1); // start on AUDIO PHONE like mockup
  // Direction of last mode change: +1 = went right, -1 = went left.
  // Used to drive the hero banner horizontal swipe animation.
  const [modeDir, setModeDir] = useState<1 | -1>(1);
  const prevModeIndexRef = useRef(1);
  const [codeCopied, setCodeCopied] = useState(false);
  const { play, volume, setVolume } = useBackgroundMusic();
  const { level } = usePlayerLevel();
  const isMuted = volume === 0;
  const {
    recent: recentLobbies,
    pushLobby: pushRecentLobby,
    removeLobby: removeRecentLobby,
  } = useRecentLobbies();

  const selectedMode = GAME_MODES[modeIndex];

  /**
   * Switch to a mode index using shortest-path direction with wrap-around.
   * Drives the hero banner horizontal swipe direction:
   *   +1 = swipe right (new card slides in from right)
   *   -1 = swipe left  (new card slides in from left)
   */
  const goToMode = useCallback((next: number) => {
    setModeIndex((curr) => {
      if (next === curr) return curr;
      const len = GAME_MODES.length;
      const normalized = ((next % len) + len) % len;
      const forward = (normalized - curr + len) % len; // steps going right
      const backward = (curr - normalized + len) % len; // steps going left
      const dir: 1 | -1 = forward <= backward ? 1 : -1;
      prevModeIndexRef.current = curr;
      setModeDir(dir);
      return normalized;
    });
  }, []);

  const toggleMute = useCallback(() => {
    if (volume === 0) setVolume(0.5);
    else setVolume(0);
  }, [volume, setVolume]);

  // Auto-fill lobby code from URL query param (?code=ABCD or ?lobby=ABCD)
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const param = url.searchParams.get('code') || url.searchParams.get('lobby');
      if (param) {
        const cleaned = param.trim().toUpperCase().slice(0, 4);
        if (cleaned.length === 4) {
          setLobbyCode(cleaned);
          setShowJoinDialog(true);
          // Clean the URL so it doesn't reopen on refresh
          url.searchParams.delete('code');
          url.searchParams.delete('lobby');
          window.history.replaceState({}, '', url.toString());
          toast.success('Code lobby détecté !', {
            description: `Code ${cleaned} pré-rempli`,
          });
        }
      }
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    if (profile?.display_name && !playerName) {
      setPlayerName(profile.display_name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.display_name]);

  // Close modals on Escape (already handled per-modal but extra safety)
  const anyModalOpen =
    showJoinDialog ||
    showSettings ||
    showPatchNote ||
    showShortcuts ||
    showProfileDrawer ||
    showFriendsDrawer;

  // Global keyboard shortcuts on the home screen
  useKeyboardShortcuts([
    {
      key: 'Escape',
      enabled: anyModalOpen,
      handler: () => {
        if (showShortcuts) setShowShortcuts(false);
        else if (showJoinDialog) setShowJoinDialog(false);
        else if (showSettings) setShowSettings(false);
        else if (showPatchNote) setShowPatchNote(false);
        else if (showProfileDrawer) setShowProfileDrawer(false);
        else if (showFriendsDrawer) setShowFriendsDrawer(false);
      },
      label: 'Fermer la modale',
    },
    {
      key: '?',
      shift: true,
      enabled: !anyModalOpen,
      handler: () => setShowShortcuts(true),
      label: 'Afficher les raccourcis',
    },
    {
      key: 'm',
      enabled: !anyModalOpen,
      handler: () => {
        toggleMute();
        toast(isMuted ? '🔊 Son activé' : '🔇 Son coupé', { duration: 1500 });
      },
      label: 'Couper / activer le son',
    },
    {
      key: 's',
      enabled: !anyModalOpen,
      handler: () => setShowSettings(true),
      label: 'Ouvrir les paramètres',
    },
    {
      key: 'c',
      enabled: !anyModalOpen && !!friendCode,
      handler: () => {
        if (!friendCode) return;
        navigator.clipboard.writeText(friendCode).catch(() => {});
        toast.success('Code ami copié !');
      },
      label: 'Copier le code ami',
    },
    {
      key: 'Enter',
      enabled: !anyModalOpen && !!playerName.trim(),
      handler: () => {
        playInkSound('inkSuccess', 0.5);
        play();
        onCreateGame(playerName.trim());
      },
      label: 'Lancer la partie',
    },
    {
      key: 'ArrowLeft',
      enabled: !anyModalOpen,
      handler: () => {
        playInkSound('brushTap', 0.25);
        goToMode((modeIndex - 1 + GAME_MODES.length) % GAME_MODES.length);
      },
      label: 'Mode précédent',
    },
    {
      key: 'ArrowRight',
      enabled: !anyModalOpen,
      handler: () => {
        playInkSound('brushTap', 0.25);
        goToMode((modeIndex + 1) % GAME_MODES.length);
      },
      label: 'Mode suivant',
    },
  ]);

  const handleCreateGame = useCallback(() => {
    if (playerName.trim()) {
      play();
      playInkSound('inkSuccess', 0.5);
      onCreateGame(playerName.trim());
    }
  }, [playerName, play, onCreateGame]);

  const handleJoinGame = useCallback(() => {
    if (playerName.trim() && lobbyCode.trim()) {
      const code = lobbyCode.trim().toUpperCase();
      play();
      playInkSound('inkSuccess', 0.5);
      pushRecentLobby(code);
      onJoinGame(playerName.trim(), code);
    }
  }, [playerName, lobbyCode, play, onJoinGame, pushRecentLobby]);

  const handleCopyFriendCode = useCallback(async () => {
    if (!friendCode) return;
    await navigator.clipboard.writeText(friendCode);
    setCodeCopied(true);
    playInkSound('inkSuccess', 0.4);
    setTimeout(() => setCodeCopied(false), 1500);
  }, [friendCode]);

  return (
    <div className="ibs-shell ibs-home menu-surface menu-screen-safe h-screen w-full flex flex-col bg-[#0a0510] text-white relative overflow-hidden">
      {/* ============== BACKGROUND ============== */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Static background image */}
        <div className="absolute inset-0">
          <ImageWithFallback
            src={[
              '/home/background.png',
              '/home/background.jpg',
              '/home/background.jpeg',
            ]}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            fallback={
              <div className="absolute inset-0 bg-gradient-to-br from-[#0f0820] via-[#0a0510] to-[#160a26]" />
            }
          />
        </div>

        {/* Static mode-tinted glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1100px] h-[700px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(167,139,250,0.28) 0%, transparent 70%)',
            filter: 'blur(120px)',
          }}
        />

        {/* Slight dark overlay so the foreground stays legible */}
        <div className="absolute inset-0 bg-[#0a0510]/30" />
      </div>

      {/* ============== TOP BAR ============== */}
      <header className="relative z-30 flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 gap-2 flex-shrink-0">
        {/* PROFILE PILL */}
        <motion.button
          onClick={() => {
            playInkSound('inkClick', 0.3);
            setShowProfileDrawer(true);
          }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="relative flex items-center gap-3 pl-1.5 pr-4 py-1.5 rounded-2xl"
          style={{
            background:
              'linear-gradient(180deg, rgba(168,85,247,0.25), rgba(126,34,206,0.25))',
            border: '2.5px solid #0a0810',
            boxShadow: '0 4px 0 #0a0810, inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          <div className="relative">
            <div
              className="w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center text-white font-bold text-base"
              style={{
                background: 'linear-gradient(135deg, #a855f7, #6b21a8)',
                border: '2px solid #0a0810',
              }}
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                (profile?.display_name?.[0] || playerName[0] || 'M').toUpperCase()
              )}
            </div>
          </div>
          <div className="text-left hidden sm:block">
            <div className="flex items-center gap-1">
              <ImageWithFallback
                src={['/home/buttons/profil.png']}
                alt="Profil"
                className="h-6 w-auto select-none"
                style={{ filter: 'drop-shadow(1px 2px 0 #0a0810)' }}
                fallback={
                  <span
                    className="text-lg font-black text-white leading-none truncate max-w-[110px]"
                    style={{
                      fontFamily: "'Caveat', cursive",
                      textShadow:
                        '1.5px 1.5px 0 #0a0810, -1px -1px 0 #0a0810, 1px -1px 0 #0a0810, -1px 1px 0 #0a0810',
                    }}
                  >
                    {profile?.display_name || 'Joueur'}
                  </span>
                }
              />
              <Crown className="w-3.5 h-3.5 text-amber-400" fill="currentColor" />
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">
                Niveau {level}
              </span>
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[9px] font-black text-emerald-300 uppercase">EN LIGNE</span>
              </span>
            </div>
          </div>
        </motion.button>

        {/* CENTER LOGO */}
        <div className="flex flex-col items-center pointer-events-none">
          <ImageWithFallback
            src={['/home/logo.png', '/lobby/logo.png']}
            alt="C2TV MIMIC MASTER"
            className="h-14 sm:h-20 md:h-24 w-auto max-w-[32vw] sm:max-w-none select-none"
            style={{ filter: 'drop-shadow(0 4px 12px rgba(168,85,247,0.5))' }}
            fallback={
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-0.5">
                  <Crown className="w-4 h-4 text-amber-400" fill="currentColor" />
                </div>
                <h1
                  className="text-3xl md:text-4xl font-black tracking-wider leading-none"
                  style={{
                    fontFamily: "'Caveat', cursive",
                    background:
                      'linear-gradient(180deg, #ffffff 0%, #d4d4d4 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    filter: 'drop-shadow(0 2px 8px rgba(168,85,247,0.6))',
                  }}
                >
                  C2TV
                </h1>
                <h2
                  className="text-xl md:text-2xl font-black tracking-wider leading-none mt-1"
                  style={{
                    fontFamily: "'Caveat', cursive",
                    color: '#fbbf24',
                    textShadow:
                      '2px 2px 0 #0a0810, -1.5px -1.5px 0 #0a0810, 1.5px -1.5px 0 #0a0810, -1.5px 1.5px 0 #0a0810, 1.5px 1.5px 0 #0a0810',
                  }}
                >
                  MIMIC MASTER
                </h2>
              </div>
            }
          />
        </div>

        {/* RIGHT — NAV BUTTONS (amis / social / paramètres) */}
        <div className="flex items-center gap-1 sm:gap-2.5">
          {/* MES AMIS */}
          <motion.button
            onClick={() => {
              playInkSound('inkClick', 0.3);
              setShowFriendsDrawer(true);
            }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="relative h-12 flex items-center"
            style={{ filter: 'drop-shadow(0 4px 10px rgba(168,85,247,0.35))' }}
            aria-label="Mes amis"
          >
            <ImageWithFallback
              src={['/home/buttons/friends.png']}
              alt="Mes amis"
              className="h-12 w-auto select-none"
              fallback={
                <div
                  className="h-12 flex items-center gap-2 px-4 rounded-2xl"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(168,85,247,0.25), rgba(126,34,206,0.25))',
                    border: '2.5px solid #0a0810',
                    boxShadow: '0 4px 0 #0a0810, inset 0 1px 0 rgba(255,255,255,0.1)',
                  }}
                >
                  <UsersRound className="w-4 h-4 text-white" />
                  <span
                    className="text-base font-black text-white uppercase tracking-wider"
                    style={{
                      fontFamily: "'Caveat', cursive",
                      textShadow:
                        '1.5px 1.5px 0 #0a0810, -1px -1px 0 #0a0810, 1px -1px 0 #0a0810, -1px 1px 0 #0a0810',
                    }}
                  >
                    MES AMIS
                  </span>
                </div>
              }
            />
          </motion.button>

          {/* SOCIAL */}
          <motion.button
            onClick={() => {
              playInkSound('inkClick', 0.3);
              window.dispatchEvent(new CustomEvent('mimic:open-social'));
            }}
            whileHover={{ scale: 1.08, y: -2 }}
            whileTap={{ scale: 0.94 }}
            className="relative h-12 flex items-center"
            style={{ filter: 'drop-shadow(0 4px 10px rgba(236,72,153,0.35))' }}
            aria-label="Social"
          >
            <ImageWithFallback
              src={['/home/buttons/social.png']}
              alt="Social"
              className="h-12 w-auto select-none"
              fallback={
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(236,72,153,0.3), rgba(190,24,93,0.3))',
                    border: '2.5px solid #0a0810',
                    boxShadow: '0 4px 0 #0a0810',
                  }}
                >
                  <Sparkles className="w-5 h-5" />
                </div>
              }
            />
          </motion.button>

          {/* PARAMÈTRES */}
          <motion.button
            onClick={() => {
              playInkSound('inkClick', 0.3);
              setShowSettings(true);
            }}
            whileHover={{ scale: 1.08, rotate: 12 }}
            whileTap={{ scale: 0.94 }}
            className="relative h-12 flex items-center"
            style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.4))' }}
            aria-label="Paramètres"
          >
            <ImageWithFallback
              src={['/home/buttons/setting.png']}
              alt="Paramètres"
              className="h-12 w-auto select-none"
              fallback={
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '2.5px solid #0a0810',
                    boxShadow: '0 4px 0 #0a0810',
                  }}
                >
                  <Settings className="w-5 h-5" />
                </div>
              }
            />
          </motion.button>
        </div>
      </header>

      {/* ============== MAIN CONTENT ============== */}
      <main className="ibs-home-main relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pb-24 min-h-0 overflow-y-auto custom-scrollbar gap-4">
        <div className="w-full max-w-3xl text-center sm:text-left">
          <span className="ibs-eyebrow">INK BROADCAST STUDIO · EN DIRECT</span>
          <h2 className="ibs-display-title">Ta soirée commence ici.</h2>
          <p className="mt-1 text-sm text-white/60">Entre ton nom, ouvre un studio puis choisis l’émission avec tes invités.</p>
        </div>

        {/* PSEUDO INPUT — discreet, just above the buttons */}
        <div className="ibs-panel w-full max-w-3xl p-3 sm:p-4">
          <div className="relative group">
            <Input
              placeholder="Votre pseudo"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="h-12 bg-black/50 backdrop-blur-md border-2 border-[#0a0810] rounded-xl text-center text-xl font-black text-white placeholder:text-white/30 focus:border-purple-400/60 transition-all"
              style={{ fontFamily: "'Caveat', cursive" }}
              maxLength={20}
            />
          </div>
        </div>

        {/* ACTION BUTTONS — JOUER + REJOINDRE */}
        <div className="w-full max-w-3xl flex flex-col sm:flex-row items-stretch gap-3">
          {/* JOUER — yellow image button (with code fallback) */}
          <motion.button
            onClick={handleCreateGame}
            disabled={!playerName.trim()}
            whileHover={!playerName.trim() ? undefined : { scale: 1.03, y: -2 }}
            whileTap={!playerName.trim() ? undefined : { scale: 0.97 }}
            className={cn(
              'relative flex-[1.4] h-20 rounded-2xl overflow-hidden group transition-opacity',
              !playerName.trim() && 'opacity-40 cursor-not-allowed grayscale',
            )}
            style={{
              filter: playerName.trim()
                ? 'drop-shadow(0 8px 20px rgba(251,191,36,0.45))'
                : undefined,
            }}
          >
            <ImageWithFallback
              src={['/home/buttons/jouer.png', '/home/buttons/jouer.jpg']}
              alt="JOUER"
              className="absolute inset-0 w-full h-full object-cover"
              fallback={
                <div
                  className="absolute inset-0 flex items-center justify-center gap-3"
                  style={{
                    background:
                      'linear-gradient(180deg, #fde047 0%, #fbbf24 50%, #d97706 100%)',
                    border: '4px solid #0a0810',
                    borderRadius: '1rem',
                    boxShadow: '0 6px 0 #0a0810, inset 0 2px 0 rgba(255,255,255,0.4)',
                  }}
                >
                  {/* Ink splatter behind play icon */}
                  <div className="relative w-14 h-14 flex items-center justify-center">
                    <svg viewBox="0 0 60 60" className="absolute inset-0 w-full h-full">
                      <path
                        d="M30,8 Q42,4 48,12 Q56,18 52,30 Q56,44 44,50 Q34,58 22,52 Q8,50 6,38 Q2,24 12,16 Q20,8 30,8 Z"
                        fill="#0a0810"
                      />
                    </svg>
                    <Play
                      className="relative w-7 h-7 text-white fill-white"
                      strokeWidth={2}
                    />
                  </div>
                  <span
                    className="text-4xl md:text-5xl font-black text-white leading-none tracking-wide"
                    style={{
                      fontFamily: "'Caveat', cursive",
                      textShadow:
                        '3px 3px 0 #0a0810, -2px -2px 0 #0a0810, 2px -2px 0 #0a0810, -2px 2px 0 #0a0810, 2px 2px 0 #0a0810',
                    }}
                  >
                    JOUER
                  </span>
                </div>
              }
            />
            {/* Shine sweep on hover (over the image) */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
          </motion.button>

          {/* REJOINDRE UN LOBBY — purple image button */}
          <motion.button
            onClick={() => {
              playInkSound('brushTap', 0.3);
              setShowJoinDialog(true);
            }}
            disabled={!playerName.trim()}
            whileHover={!playerName.trim() ? undefined : { scale: 1.02, y: -2 }}
            whileTap={!playerName.trim() ? undefined : { scale: 0.98 }}
            className={cn(
              'relative flex-1 h-20 rounded-2xl overflow-hidden transition-opacity',
              !playerName.trim() && 'opacity-40 cursor-not-allowed grayscale',
            )}
            style={{
              filter: playerName.trim()
                ? 'drop-shadow(0 8px 20px rgba(168,85,247,0.4))'
                : undefined,
            }}
          >
            <ImageWithFallback
              src={['/home/buttons/rejoindre.png', '/home/buttons/rejoindre.jpg']}
              alt="REJOINDRE UN LOBBY"
              className="absolute inset-0 w-full h-full object-cover"
              fallback={
                <div
                  className="absolute inset-0 flex items-center justify-center gap-3"
                  style={{
                    background:
                      'linear-gradient(180deg, #a855f7 0%, #7e22ce 50%, #4c1d95 100%)',
                    border: '4px solid #0a0810',
                    borderRadius: '1rem',
                    boxShadow: '0 6px 0 #0a0810, inset 0 2px 0 rgba(255,255,255,0.2)',
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: '#0a0810',
                      border: '2.5px solid rgba(255,255,255,0.15)',
                    }}
                  >
                    <Hash className="w-6 h-6 text-white" strokeWidth={3} />
                  </div>
                  <span
                    className="text-2xl md:text-3xl font-black text-white leading-none tracking-wide"
                    style={{
                      fontFamily: "'Caveat', cursive",
                      textShadow:
                        '2.5px 2.5px 0 #0a0810, -1.5px -1.5px 0 #0a0810, 1.5px -1.5px 0 #0a0810, -1.5px 1.5px 0 #0a0810, 1.5px 1.5px 0 #0a0810',
                    }}
                  >
                    REJOINDRE UN LOBBY
                  </span>
                </div>
              }
            />
          </motion.button>
        </div>

        {/* HERO MODE BANNER — le mode réel reste choisi dans le lobby ; cette
            galerie est purement informative / visuelle. Navigable ← / →. */}
        <AnimatePresence mode="wait" custom={modeDir}>
          <motion.div
            key={selectedMode.id}
            custom={modeDir}
            variants={{
              enter: (dir: number) => ({
                opacity: 0,
                x: 320 * dir,
                scale: 0.94,
                rotate: dir * 1.5,
              }),
              center: {
                opacity: 1,
                x: 0,
                scale: 1,
                rotate: 0,
              },
              exit: (dir: number) => ({
                opacity: 0,
                x: -320 * dir,
                scale: 0.94,
                rotate: -dir * 1.5,
              }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            style={{
              willChange: 'transform, opacity',
              border: '4px solid #0a0810',
              boxShadow:
                '0 12px 0 #0a0810, 0 18px 40px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,255,255,0.08)',
            }}
            className="relative w-full max-w-3xl rounded-3xl overflow-hidden"
          >
            {/* Custom banner image — falls back to gradient + icon if missing */}
            <ImageWithFallback
              src={selectedMode.bannerImageCandidates}
              alt={selectedMode.name}
              className="block w-full h-auto select-none"
              fallback={
                <div
                  className="relative w-full p-6 md:p-8 flex items-center gap-5"
                  style={{
                    background: `linear-gradient(180deg, #0a0510 0%, #1a0d2e 50%, #0a0510 100%)`,
                  }}
                >
                  {/* Glow halo */}
                  <div
                    className="absolute inset-0 opacity-40 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at 30% 50%, ${selectedMode.accent}55, transparent 60%)`,
                    }}
                  />
                  {/* Icon badge */}
                  <motion.div
                    animate={{ rotate: [-3, 3, -3] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                    className="relative w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: selectedMode.fallbackColor,
                      border: '3px solid #0a0810',
                      boxShadow: `0 4px 0 #0a0810, 0 8px 20px ${selectedMode.fallbackColor}88`,
                    }}
                  >
                    <span className="text-5xl">{selectedMode.fallbackEmoji}</span>
                  </motion.div>

                  <div className="relative flex-1 min-w-0">
                    <h2
                      className="text-4xl md:text-5xl font-black leading-none tracking-tight text-white"
                      style={{
                        fontFamily: "'Caveat', cursive",
                        textShadow:
                          '3px 3px 0 #0a0810, -2px -2px 0 #0a0810, 2px -2px 0 #0a0810, -2px 2px 0 #0a0810, 2px 2px 0 #0a0810',
                      }}
                    >
                      {selectedMode.name.toUpperCase()}
                    </h2>
                    <p
                      className="text-sm md:text-base text-white/85 font-bold mt-2 uppercase tracking-wider"
                      style={{ fontFamily: "'Caveat', cursive" }}
                    >
                      {selectedMode.tagline}
                    </p>
                    <p className="text-xs md:text-sm text-white/70 mt-2 font-medium">
                      {selectedMode.description}
                    </p>
                  </div>
                </div>
              }
            />
          </motion.div>
        </AnimatePresence>

        {/* MINI MODE CARDS ROW — click to preview a mode in the hero above */}
        <div className="w-full max-w-3xl">
          <div className="grid grid-cols-5 md:grid-cols-9 gap-2">
            {GAME_MODES.map((mode, idx) => {
              const isActive = idx === modeIndex;
              return (
                <motion.button
                  key={mode.id}
                  onClick={() => {
                    playInkSound('brushTap', 0.3);
                    goToMode(idx);
                  }}
                  whileHover={{ y: -4, scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  animate={
                    isActive
                      ? { y: [0, -3, 0], transition: { duration: 1.6, repeat: Infinity } }
                      : undefined
                  }
                  className="relative aspect-[3/4] rounded-2xl overflow-hidden group"
                  aria-label={mode.name}
                  aria-pressed={isActive}
                  style={{
                    border: isActive ? '3.5px solid #fbbf24' : '3px solid #0a0810',
                    boxShadow: isActive
                      ? `0 0 24px ${mode.accent}cc, 0 6px 0 #0a0810`
                      : '0 4px 0 #0a0810',
                  }}
                >
                  {/* Card image with fallback */}
                  <ImageWithFallback
                    src={mode.cardImageCandidates}
                    alt={mode.shortLabel}
                    className="absolute inset-0 w-full h-full object-cover"
                    fallback={
                      <div
                        className="absolute inset-0 flex flex-col items-center justify-between p-1.5"
                        style={{
                          background: `linear-gradient(180deg, ${mode.fallbackColor}, ${mode.fallbackColor}cc)`,
                        }}
                      >
                        <div className="flex-1 flex items-center justify-center">
                          <span className="text-3xl">{mode.fallbackEmoji}</span>
                        </div>
                      </div>
                    }
                  />
                  {/* Bottom label overlay */}
                  <div
                    className="absolute bottom-0 inset-x-0 px-1 py-1 text-center"
                    style={{
                      background:
                        'linear-gradient(180deg, transparent, rgba(0,0,0,0.85))',
                    }}
                  >
                    <div
                      className="text-[10px] font-black text-white uppercase leading-tight tracking-wide"
                      style={{
                        fontFamily: "'Caveat', cursive",
                        textShadow:
                          '1.5px 1.5px 0 #0a0810, -1px -1px 0 #0a0810, 1px -1px 0 #0a0810, -1px 1px 0 #0a0810, 1px 1px 0 #0a0810',
                      }}
                    >
                      {mode.shortLabel}
                    </div>
                  </div>
                  {/* Active checkmark */}
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-amber-400 border-[3px] border-[#0a0810] flex items-center justify-center z-10"
                      style={{ boxShadow: '0 3px 0 #0a0810' }}
                    >
                      <Check className="w-3 h-3 text-[#0a0810]" strokeWidth={4} />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </main>

      {/* ============== BOTTOM UTILITY BAR ============== */}
      <div className="absolute bottom-0 inset-x-0 z-20 flex items-center justify-center gap-3 px-6 py-3 pointer-events-none">
        <div
          className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-2xl"
          style={{
            backgroundColor: 'rgba(0,0,0,0.6)',
            backgroundImage:
              'linear-gradient(rgba(10,5,16,0.62), rgba(10,5,16,0.62)), url(/home/musiclecteurandfriendcode.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backdropFilter: 'blur(8px)',
            border: '2.5px solid #0a0810',
            boxShadow: '0 4px 0 #0a0810',
          }}
        >
          {friendCode && (
            <motion.button
              onClick={handleCopyFriendCode}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-2 px-3 py-1 rounded-lg hover:bg-white/5 transition-colors"
              title="Copier mon code ami"
            >
              <span className="text-[10px] text-white/50 uppercase tracking-wider font-bold">
                Code ami
              </span>
              <span className="font-mono font-black tracking-wider text-amber-300 text-sm">
                {friendCode}
              </span>
              {codeCopied ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3 text-white/40" />
              )}
            </motion.button>
          )}

          <div className="w-px h-5 bg-white/10" />

          <motion.button
            onClick={() => {
              playInkSound('inkClick', 0.3);
              toggleMute();
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 transition-colors"
            aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </motion.button>

          <motion.button
            onClick={() => {
              playInkSound('inkClick', 0.3);
              setShowSettings(true);
            }}
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Paramètres"
          >
            <Settings className="w-4 h-4" />
          </motion.button>

          <motion.button
            onClick={() => {
              playInkSound('inkClick', 0.3);
              setShowShortcuts(true);
            }}
            whileHover={{ scale: 1.15, rotate: -10 }}
            whileTap={{ scale: 0.9 }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Raccourcis clavier"
            title="Raccourcis (?)"
          >
            <span
              className="text-base font-black"
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              ?
            </span>
          </motion.button>

          <button
            type="button"
            onClick={() => {
              playInkSound('brushTap', 0.2);
              setShowPatchNote(true);
            }}
            className="px-2 text-[10px] font-mono text-white/40 hover:text-white/70 transition-colors"
          >
            v{CURRENT_VERSION}
          </button>
        </div>
      </div>

      {/* ============== PROFILE DRAWER ============== */}
      <AnimatePresence>
        {showProfileDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
              onClick={() => setShowProfileDrawer(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed left-0 top-0 bottom-0 w-full max-w-md z-50 flex flex-col"
              style={{
                background:
                  'linear-gradient(180deg, #1a0d2e 0%, #160a26 50%, #0f0820 100%)',
                borderRight: '4px solid #0a0810',
                boxShadow: '8px 0 24px rgba(0,0,0,0.5)',
              }}
            >
              <div
                className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(168,85,247,0.18), rgba(168,85,247,0.05))',
                  borderBottom: '3px solid #0a0810',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
                      border: '3px solid #0a0810',
                      boxShadow: '0 4px 0 #0a0810',
                    }}
                  >
                    <User className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </div>
                  <h2
                    className="text-3xl font-black text-white leading-none"
                    style={{
                      fontFamily: "'Caveat', cursive",
                      textShadow:
                        '2px 2px 0 #0a0810, -1.5px -1.5px 0 #0a0810, 1.5px -1.5px 0 #0a0810, -1.5px 1.5px 0 #0a0810, 1.5px 1.5px 0 #0a0810',
                    }}
                  >
                    Mon profil
                  </h2>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowProfileDrawer(false)}
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
                <InkProfileSidebar />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ============== FRIENDS DRAWER ============== */}
      <AnimatePresence>
        {showFriendsDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
              onClick={() => setShowFriendsDrawer(false)}
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
              <div
                className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(168,85,247,0.18), rgba(168,85,247,0.05))',
                  borderBottom: '3px solid #0a0810',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)',
                      border: '3px solid #0a0810',
                      boxShadow: '0 4px 0 #0a0810',
                    }}
                  >
                    <UsersRound className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </div>
                  <h2
                    className="text-3xl font-black text-white leading-none"
                    style={{
                      fontFamily: "'Caveat', cursive",
                      textShadow:
                        '2px 2px 0 #0a0810, -1.5px -1.5px 0 #0a0810, 1.5px -1.5px 0 #0a0810, -1.5px 1.5px 0 #0a0810, 1.5px 1.5px 0 #0a0810',
                    }}
                  >
                    Mes amis
                  </h2>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowFriendsDrawer(false)}
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
                <InkFriendsSidebar
                  onJoinFriend={(code) => {
                    setLobbyCode(code);
                    setShowFriendsDrawer(false);
                    if (playerName.trim()) {
                      onJoinGame(playerName.trim(), code);
                    }
                  }}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ============== JOIN DIALOG ============== */}
      <AnimatePresence>
        {showJoinDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setShowJoinDialog(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 20, rotate: -2 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotate: -1 }}
              exit={{ opacity: 0, scale: 0.85, y: 20, rotate: 2 }}
              transition={{ type: 'spring', damping: 22, stiffness: 260 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md max-h-[calc(100dvh-2rem)] flex flex-col rounded-3xl overflow-hidden"
              style={{
                background:
                  'linear-gradient(180deg, #1a0d2e 0%, #160a26 50%, #0f0820 100%)',
                border: '4px solid #0a0810',
                boxShadow:
                  '0 12px 0 #0a0810, 0 18px 40px rgba(168,85,247,0.35), inset 0 2px 0 rgba(255,255,255,0.08)',
              }}
            >
              <div
                className="absolute inset-1.5 rounded-[1.3rem] pointer-events-none"
                style={{ border: '2px solid rgba(168,85,247,0.4)' }}
              />
              <div className="relative p-6 space-y-4 overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{ rotate: [-5, 5, -5] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      className="w-11 h-11 rounded-2xl flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
                        border: '3px solid #0a0810',
                        boxShadow: '0 4px 0 #0a0810',
                      }}
                    >
                      <Hash className="h-5 w-5 text-white" strokeWidth={3} />
                    </motion.div>
                    <h3
                      className="text-3xl font-black text-white leading-none"
                      style={{
                        fontFamily: "'Caveat', cursive",
                        textShadow:
                          '2px 2px 0 #0a0810, -1.5px -1.5px 0 #0a0810, 1.5px -1.5px 0 #0a0810, -1.5px 1.5px 0 #0a0810, 1.5px 1.5px 0 #0a0810',
                      }}
                    >
                      Rejoindre
                    </h3>
                  </div>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowJoinDialog(false)}
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
                <div className="space-y-2">
                  <label
                    className="text-sm font-black text-white/80 flex items-center gap-2 px-1"
                    style={{ fontFamily: "'Caveat', cursive" }}
                  >
                    <Hash className="h-3.5 w-3.5" />
                    Code du Lobby
                  </label>
                  <Input
                    placeholder="XXXX"
                    value={lobbyCode}
                    onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
                    onKeyPress={(e) => e.key === 'Enter' && handleJoinGame()}
                    maxLength={4}
                    className="text-center text-4xl tracking-[0.4em] uppercase font-black h-16 bg-black/50 rounded-2xl text-white"
                    style={{
                      fontFamily: "'Caveat', cursive",
                      border: '3px solid #0a0810',
                      boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5)',
                    }}
                    autoFocus
                  />
                </div>

                {/* RECENT LOBBIES — quick rejoin */}
                {recentLobbies.length > 0 && (
                  <div className="space-y-2">
                    <label
                      className="text-sm font-black text-white/70 flex items-center gap-2 px-1"
                      style={{ fontFamily: "'Caveat', cursive" }}
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                      Récents
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {recentLobbies.slice(0, 6).map((it, idx) => (
                        <motion.button
                          key={it.code}
                          type="button"
                          initial={{ opacity: 0, scale: 0.8, rotate: -4 }}
                          animate={{
                            opacity: 1,
                            scale: 1,
                            rotate: idx % 2 === 0 ? -1.5 : 1.5,
                          }}
                          transition={{ delay: idx * 0.04 }}
                          whileHover={{ scale: 1.05, rotate: 0, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setLobbyCode(it.code);
                            playInkSound('brushTap', 0.3);
                          }}
                          className="group relative px-3 py-1.5 rounded-xl flex items-center gap-1.5"
                          style={{
                            background:
                              'linear-gradient(180deg, rgba(168,85,247,0.18), rgba(126,34,206,0.05))',
                            border: '2.5px solid #0a0810',
                            boxShadow: '0 3px 0 #0a0810',
                          }}
                          title={`Rejoindre ${it.code}`}
                        >
                          <span
                            className="font-mono text-base font-black tracking-wider text-white"
                            style={{
                              fontFamily: "'Caveat', cursive",
                              textShadow:
                                '1.5px 1.5px 0 #0a0810, -1px -1px 0 #0a0810, 1px -1px 0 #0a0810, -1px 1px 0 #0a0810',
                            }}
                          >
                            {it.code}
                          </span>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              removeRecentLobby(it.code);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity w-4 h-4 rounded-full bg-red-500/30 hover:bg-red-500/50 flex items-center justify-center"
                          >
                            <X className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.04, rotate: -2 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setShowJoinDialog(false)}
                    className="flex-1 py-3 rounded-2xl text-xl font-black text-white flex items-center justify-center gap-2"
                    style={{
                      background: 'linear-gradient(180deg, #4b5563, #1f2937)',
                      border: '3px solid #0a0810',
                      boxShadow: '0 4px 0 #0a0810',
                      fontFamily: "'Caveat', cursive",
                      textShadow:
                        '1.5px 1.5px 0 #0a0810, -1px -1px 0 #0a0810, 1px -1px 0 #0a0810, -1px 1px 0 #0a0810',
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" strokeWidth={3} />
                    Annuler
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={
                      playerName.trim() && lobbyCode.length === 4
                        ? { scale: 1.04, rotate: 2 }
                        : undefined
                    }
                    whileTap={
                      playerName.trim() && lobbyCode.length === 4
                        ? { scale: 0.96 }
                        : undefined
                    }
                    onClick={handleJoinGame}
                    disabled={!playerName.trim() || lobbyCode.length !== 4}
                    className={cn(
                      'flex-1 py-3 rounded-2xl text-xl font-black text-white transition-opacity',
                      (!playerName.trim() || lobbyCode.length !== 4) && 'opacity-50',
                    )}
                    style={{
                      background: 'linear-gradient(180deg, #a855f7, #6b21a8)',
                      border: '3px solid #0a0810',
                      boxShadow: '0 4px 0 #0a0810',
                      fontFamily: "'Caveat', cursive",
                      textShadow:
                        '1.5px 1.5px 0 #0a0810, -1px -1px 0 #0a0810, 1px -1px 0 #0a0810, -1px 1px 0 #0a0810',
                    }}
                  >
                    Rejoindre
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============== SETTINGS MODAL ============== */}
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
              <div
                className="absolute inset-1.5 rounded-[1.3rem] pointer-events-none z-[1]"
                style={{ border: '2px solid rgba(168,85,247,0.4)' }}
              />
              <div className="relative z-[2] flex flex-col min-h-0 flex-1">
                <DeviceSettings showPreview onClose={() => setShowSettings(false)} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PATCH NOTE MODAL */}
      <InkPatchNoteModal forceOpen={showPatchNote} onClose={() => setShowPatchNote(false)} />

      {/* SHORTCUTS HELP MODAL */}
      <InkShortcutsModal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
        extra={[
          { keys: ['C'], label: 'Copier le code ami' },
          { keys: ['Enter'], label: 'Lancer la partie' },
        ]}
      />

      {/* SCROLLBAR STYLE */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.04); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(168,85,247,0.4); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(168,85,247,0.6); }
      `}</style>
    </div>
  );
};

export const InkHomeScreen = memo(InkHomeScreenComponent);
