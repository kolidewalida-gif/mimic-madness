import { useState, memo, useCallback, useEffect } from 'react';
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
  Users,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  User,
  UsersRound,
  Hash,
  LogOut,
  Sparkles,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { DeviceSettings } from '@/components/DeviceSettings';
import { LobbyGameMode } from '@/lib/gameModes';
import { InkProfileSidebar } from '@/components/InkProfileSidebar';
import { InkFriendsSidebar } from '@/components/InkFriendsSidebar';
import { InkCursorParticles } from '@/components/InkCursorParticles';
import { InkPatchNoteModal, CURRENT_VERSION } from '@/components/InkPatchNoteModal';

interface InkHomeScreenProps {
  onCreateGame: (playerName: string, gameMode?: LobbyGameMode) => void;
  onJoinGame: (playerName: string, lobbyCode: string) => void;
}

interface GameModeInfo {
  id: LobbyGameMode;
  name: string;
  tagline: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  accent: string;
}

const GAME_MODES: GameModeInfo[] = [
  {
    id: 'audiophone',
    name: 'Audio Phone',
    tagline: 'Le téléphone arabe audio',
    description: 'Enregistrez, écoutez, imitez. Fou rire garanti !',
    icon: <Phone className="w-7 h-7" />,
    gradient: 'from-rose-500 via-red-500 to-orange-500',
    accent: '#ff2b2b',
  },
  {
    id: 'normal',
    name: 'Normal',
    tagline: 'Imitation classique',
    description: 'Imitez les défis vidéo des autres joueurs',
    icon: <Copy className="w-7 h-7" />,
    gradient: 'from-violet-500 via-purple-500 to-fuchsia-500',
    accent: '#a855f7',
  },
  {
    id: '2v2',
    name: '2v2',
    tagline: 'Combat en équipes',
    description: 'Affrontement en équipes de 2 joueurs',
    icon: <Swords className="w-7 h-7" />,
    gradient: 'from-amber-500 via-orange-500 to-red-500',
    accent: '#f59e0b',
  },
  {
    id: 'quiz',
    name: 'Quiz',
    tagline: 'Testez vos connaissances',
    description: 'Questions variées en temps réel',
    icon: <Brain className="w-7 h-7" />,
    gradient: 'from-cyan-400 via-sky-500 to-blue-600',
    accent: '#0ea5e9',
  },
  {
    id: 'pixoguess',
    name: 'BlurRush',
    tagline: 'Devinez l\'image',
    description: 'L\'image se dépixelise, soyez le plus rapide',
    icon: <Zap className="w-7 h-7" />,
    gradient: 'from-emerald-400 via-green-500 to-teal-600',
    accent: '#10b981',
  },
  {
    id: 'undercover',
    name: 'Undercover',
    tagline: 'Trouvez l\'infiltré',
    description: 'Donnez des indices, démasquez l\'imposteur',
    icon: <UserX className="w-7 h-7" />,
    gradient: 'from-slate-400 via-zinc-500 to-stone-600',
    accent: '#94a3b8',
  },
];

const InkHomeScreenComponent = ({ onCreateGame, onJoinGame }: InkHomeScreenProps) => {
  const { profile, friendCode } = useAuth();
  const [playerName, setPlayerName] = useState('');
  const [lobbyCode, setLobbyCode] = useState('');
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPatchNote, setShowPatchNote] = useState(false);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [showFriendsDrawer, setShowFriendsDrawer] = useState(false);
  const [modeIndex, setModeIndex] = useState(0);
  const { play, volume, setVolume } = useBackgroundMusic();
  const isMuted = volume === 0;

  const selectedMode = GAME_MODES[modeIndex];

  const toggleMute = useCallback(() => {
    if (volume === 0) setVolume(0.5);
    else setVolume(0);
  }, [volume, setVolume]);

  useEffect(() => {
    if (profile?.display_name && !playerName) {
      setPlayerName(profile.display_name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.display_name]);

  const goPrevMode = useCallback(() => {
    playInkSound('brushTap', 0.3);
    setModeIndex((i) => (i - 1 + GAME_MODES.length) % GAME_MODES.length);
  }, []);

  const goNextMode = useCallback(() => {
    playInkSound('brushTap', 0.3);
    setModeIndex((i) => (i + 1) % GAME_MODES.length);
  }, []);

  // Keyboard nav for mode carousel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.matches('input, textarea, select, [contenteditable="true"]') ||
        showJoinDialog || showSettings || showPatchNote || showProfileDrawer || showFriendsDrawer
      ) return;
      if (e.key === 'ArrowLeft') goPrevMode();
      else if (e.key === 'ArrowRight') goNextMode();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goPrevMode, goNextMode, showJoinDialog, showSettings, showPatchNote, showProfileDrawer, showFriendsDrawer]);

  const handleCreateGame = useCallback(() => {
    if (playerName.trim()) {
      play();
      playInkSound('inkSuccess', 0.5);
      onCreateGame(playerName.trim(), selectedMode.id);
    }
  }, [playerName, selectedMode.id, play, onCreateGame]);

  const handleJoinGame = useCallback(() => {
    if (playerName.trim() && lobbyCode.trim()) {
      play();
      playInkSound('inkSuccess', 0.5);
      onJoinGame(playerName.trim(), lobbyCode.trim().toUpperCase());
    }
  }, [playerName, lobbyCode, play, onJoinGame]);

  const handleCopyFriendCode = useCallback(async () => {
    if (!friendCode) return;
    await navigator.clipboard.writeText(friendCode);
    playInkSound('inkSuccess', 0.4);
  }, [friendCode]);

  return (
    <div className="h-screen w-full flex flex-col bg-[#08070d] text-white relative overflow-hidden">
      <InkCursorParticles />

      {/* Animated background — dynamic gradient that follows selected mode */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Base layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0510] via-[#08070d] to-[#0a0512]" />

        {/* Mode-tinted glow that animates between modes */}
        <AnimatePresence mode="sync">
          <motion.div
            key={selectedMode.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0"
          >
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1100px] h-[700px] rounded-full opacity-30"
              style={{
                background: `radial-gradient(circle, ${selectedMode.accent}55 0%, transparent 70%)`,
                filter: 'blur(120px)',
              }}
            />
            <div
              className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full opacity-20 animate-pulse"
              style={{
                background: `radial-gradient(circle, ${selectedMode.accent}88 0%, transparent 70%)`,
                filter: 'blur(80px)',
              }}
            />
            <div
              className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] rounded-full opacity-20"
              style={{
                background: `radial-gradient(circle, ${selectedMode.accent}66 0%, transparent 70%)`,
                filter: 'blur(100px)',
              }}
            />
          </motion.div>
        </AnimatePresence>

        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Vignette */}
        <div className="absolute inset-0 bg-gradient-radial from-transparent to-black/60 pointer-events-none" />
      </div>

      {/* TOP BAR — minimal, premium */}
      <header className="relative z-30 flex items-center justify-between px-6 py-4 flex-shrink-0">
        {/* Profile button (opens drawer) */}
        <motion.button
          onClick={() => {
            playInkSound('inkClick', 0.3);
            setShowProfileDrawer(true);
          }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/30 hover:bg-white/10 transition-all group"
        >
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#ff2b2b] to-[#a01010] flex items-center justify-center text-white font-bold text-sm overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                (profile?.display_name?.[0] || playerName[0] || 'M').toUpperCase()
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#08070d]" />
          </div>
          <div className="text-left pr-1">
            <div className="text-sm font-bold text-white leading-tight truncate max-w-[120px]">
              {profile?.display_name || 'Joueur'}
            </div>
            <div className="text-[10px] text-white/50 leading-tight">Mon profil</div>
          </div>
        </motion.button>

        {/* Center logo / title */}
        <div className="flex flex-col items-center pointer-events-none">
          <div className="relative">
            <div
              className="absolute inset-0 blur-2xl opacity-60"
              style={{ background: `radial-gradient(circle, ${selectedMode.accent} 0%, transparent 70%)` }}
            />
            <h1
              className="relative text-3xl md:text-4xl font-black tracking-[0.2em] leading-none"
              style={{
                fontFamily: "'Caveat', cursive, sans-serif",
                background: 'linear-gradient(180deg, #ffffff 0%, #cccccc 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 2px 8px rgba(255, 43, 43, 0.5))',
              }}
            >
              MIMIC MASTER
            </h1>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="h-px w-10 bg-gradient-to-r from-transparent to-white/30" />
            <span className="text-[10px] tracking-[0.3em] text-white/40 font-bold uppercase">Lobby</span>
            <div className="h-px w-10 bg-gradient-to-l from-transparent to-white/30" />
          </div>
        </div>

        {/* Friends button (opens drawer) */}
        <motion.button
          onClick={() => {
            playInkSound('inkClick', 0.3);
            setShowFriendsDrawer(true);
          }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/30 hover:bg-white/10 transition-all"
        >
          <div className="text-right pl-1">
            <div className="text-sm font-bold text-white leading-tight">Mes amis</div>
            <div className="text-[10px] text-white/50 leading-tight">Communauté</div>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <UsersRound className="w-4 h-4 text-white" />
          </div>
        </motion.button>
      </header>

      {/* MAIN CONTENT */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-6 min-h-0">
        {/* Pseudo input — inline, premium */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 w-full max-w-md"
        >
          <div className="relative group">
            <div
              className="absolute -inset-px rounded-2xl opacity-50 blur transition-opacity group-focus-within:opacity-100"
              style={{ background: `linear-gradient(90deg, ${selectedMode.accent}, transparent, ${selectedMode.accent})` }}
            />
            <Input
              placeholder="Votre pseudo"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="relative h-14 bg-black/60 backdrop-blur-xl border-2 border-white/10 rounded-2xl text-center text-2xl font-bold text-white placeholder:text-white/30 focus:border-white/30 transition-all"
              style={{ fontFamily: "'Caveat', cursive" }}
              maxLength={20}
            />
          </div>
        </motion.div>

        {/* Mode showcase — the hero */}
        <div className="relative w-full max-w-5xl flex items-center justify-center gap-4 mb-8">
          {/* Prev button */}
          <motion.button
            onClick={goPrevMode}
            whileHover={{ scale: 1.1, x: -3 }}
            whileTap={{ scale: 0.95 }}
            className="flex-shrink-0 w-12 h-12 rounded-full bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/30 flex items-center justify-center text-white/70 hover:text-white transition-all"
            aria-label="Mode précédent"
          >
            <ChevronLeft className="w-6 h-6" />
          </motion.button>

          {/* Mode card */}
          <div className="flex-1 max-w-2xl relative" style={{ perspective: '1000px' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedMode.id}
                initial={{ opacity: 0, scale: 0.92, rotateX: -15, y: 20 }}
                animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, rotateX: 15, y: -20 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="relative"
              >
                {/* Glow shell */}
                <div
                  className="absolute -inset-4 rounded-3xl blur-2xl opacity-60 animate-pulse"
                  style={{
                    background: `linear-gradient(135deg, ${selectedMode.accent}88, transparent)`,
                  }}
                />

                {/* Card */}
                <div
                  className="relative rounded-3xl overflow-hidden border-2 backdrop-blur-2xl bg-black/50"
                  style={{
                    borderColor: `${selectedMode.accent}66`,
                    boxShadow: `0 0 60px ${selectedMode.accent}66, 0 0 120px ${selectedMode.accent}33, inset 0 1px 0 rgba(255,255,255,0.1)`,
                  }}
                >
                  {/* Background gradient */}
                  <div className={cn('absolute inset-0 bg-gradient-to-br opacity-10', selectedMode.gradient)} />

                  {/* Top accent line */}
                  <div
                    className="absolute inset-x-0 top-0 h-px"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${selectedMode.accent}, transparent)`,
                    }}
                  />

                  {/* Decorative pattern */}
                  <div className="absolute inset-0 opacity-5 pointer-events-none">
                    <div
                      className="w-full h-full"
                      style={{
                        backgroundImage: `radial-gradient(${selectedMode.accent} 1px, transparent 1px)`,
                        backgroundSize: '40px 40px',
                      }}
                    />
                  </div>

                  <div className="relative p-8 md:p-10 flex flex-col items-center text-center">
                    {/* Icon */}
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                      className={cn(
                        'w-20 h-20 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-4 shadow-2xl',
                        selectedMode.gradient
                      )}
                      style={{ boxShadow: `0 10px 40px ${selectedMode.accent}88` }}
                    >
                      <div className="text-white">{selectedMode.icon}</div>
                    </motion.div>

                    {/* Mode name */}
                    <h2
                      className="text-5xl md:text-6xl font-black tracking-tight mb-1"
                      style={{
                        fontFamily: "'Caveat', cursive",
                        color: selectedMode.accent,
                        textShadow: `0 0 30px ${selectedMode.accent}88, 0 4px 12px rgba(0,0,0,0.8)`,
                        WebkitTextStroke: '1px rgba(0,0,0,0.4)',
                      }}
                    >
                      {selectedMode.name}
                    </h2>

                    {/* Tagline */}
                    <p className="text-sm md:text-base font-bold text-white/80 uppercase tracking-[0.2em] mb-2">
                      {selectedMode.tagline}
                    </p>

                    {/* Description */}
                    <p className="text-sm text-white/60 max-w-md leading-relaxed">
                      {selectedMode.description}
                    </p>

                    {/* Mode counter */}
                    <div className="mt-6 flex items-center gap-1.5">
                      {GAME_MODES.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            playInkSound('inkClick', 0.3);
                            setModeIndex(i);
                          }}
                          className={cn(
                            'h-1.5 rounded-full transition-all duration-300',
                            i === modeIndex ? 'w-8' : 'w-1.5 hover:w-3'
                          )}
                          style={{
                            background: i === modeIndex ? selectedMode.accent : 'rgba(255,255,255,0.2)',
                            boxShadow: i === modeIndex ? `0 0 10px ${selectedMode.accent}` : 'none',
                          }}
                          aria-label={`Aller au mode ${i + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Next button */}
          <motion.button
            onClick={goNextMode}
            whileHover={{ scale: 1.1, x: 3 }}
            whileTap={{ scale: 0.95 }}
            className="flex-shrink-0 w-12 h-12 rounded-full bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/30 flex items-center justify-center text-white/70 hover:text-white transition-all"
            aria-label="Mode suivant"
          >
            <ChevronRight className="w-6 h-6" />
          </motion.button>
        </div>

        {/* Action buttons row */}
        <div className="w-full max-w-3xl flex flex-col sm:flex-row items-stretch gap-3">
          {/* Join button — secondary */}
          <motion.button
            onClick={() => {
              playInkSound('brushTap', 0.3);
              setShowJoinDialog(true);
            }}
            disabled={!playerName.trim()}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'flex-1 py-5 px-6 rounded-2xl font-bold text-lg transition-all',
              'bg-white/5 backdrop-blur-md border-2 border-white/15 text-white',
              'hover:bg-white/10 hover:border-white/30',
              'disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100'
            )}
          >
            <span className="flex items-center justify-center gap-2">
              <Hash className="w-5 h-5" />
              REJOINDRE UN LOBBY
            </span>
          </motion.button>

          {/* PLAY button — primary, hero */}
          <motion.button
            onClick={handleCreateGame}
            disabled={!playerName.trim()}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            className={cn(
              'relative flex-[1.5] py-5 px-8 rounded-2xl font-black text-2xl tracking-wider transition-all',
              'text-white border-2 overflow-hidden group',
              'disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100'
            )}
            style={{
              background: `linear-gradient(135deg, ${selectedMode.accent}, ${selectedMode.accent}dd)`,
              borderColor: selectedMode.accent,
              boxShadow: `0 0 40px ${selectedMode.accent}aa, 0 10px 30px ${selectedMode.accent}88, inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -3px 0 rgba(0,0,0,0.3)`,
            }}
          >
            {/* Shine */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
            {/* Sparkle */}
            <div className="absolute -top-1 -right-1 opacity-70 pointer-events-none">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="relative flex items-center justify-center gap-3">
              <Play className="w-7 h-7 fill-white" />
              JOUER
            </span>
          </motion.button>
        </div>

        {/* Bottom utility bar */}
        <div className="mt-6 flex items-center gap-3">
          {/* Friend code */}
          {friendCode && (
            <motion.button
              onClick={handleCopyFriendCode}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/30 hover:bg-white/10 transition-all text-xs"
              title="Copier mon code ami"
            >
              <span className="text-white/40 uppercase tracking-wider font-bold">Code ami</span>
              <span className="font-mono font-bold tracking-wider text-white">{friendCode}</span>
              <Copy className="w-3 h-3 text-white/40" />
            </motion.button>
          )}

          {/* Mute */}
          <motion.button
            onClick={() => {
              playInkSound('inkClick', 0.3);
              toggleMute();
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/30 flex items-center justify-center text-white/70 hover:text-white transition-all"
            aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </motion.button>

          {/* Settings */}
          <motion.button
            onClick={() => {
              playInkSound('inkClick', 0.3);
              setShowSettings(true);
            }}
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/30 flex items-center justify-center text-white/70 hover:text-white transition-all"
            aria-label="Paramètres"
          >
            <Settings className="w-4 h-4" />
          </motion.button>

          {/* Version */}
          <button
            type="button"
            onClick={() => {
              playInkSound('brushTap', 0.2);
              setShowPatchNote(true);
            }}
            className="px-3 py-2 text-[10px] font-mono text-white/30 hover:text-white/70 transition-colors"
          >
            v{CURRENT_VERSION}
          </button>
        </div>

        {/* Hint */}
        <div className="mt-4 text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold">
          Utilisez ← → pour naviguer
        </div>
      </main>

      {/* PROFILE DRAWER */}
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
              className="fixed left-0 top-0 bottom-0 w-full max-w-md z-50 flex flex-col bg-[#08070d]/95 backdrop-blur-2xl border-r border-white/10 shadow-2xl"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-white/70" />
                  <h2 className="text-lg font-bold text-white">Mon profil</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProfileDrawer(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                <InkProfileSidebar />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* FRIENDS DRAWER */}
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
              className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50 flex flex-col bg-[#08070d]/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <UsersRound className="w-5 h-5 text-white/70" />
                  <h2 className="text-lg font-bold text-white">Mes amis</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFriendsDrawer(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
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

      {/* JOIN DIALOG */}
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
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md"
            >
              <div
                className="absolute -inset-4 rounded-3xl blur-2xl opacity-60"
                style={{ background: `radial-gradient(circle, ${selectedMode.accent}88, transparent)` }}
              />
              <div
                className="relative bg-[#08070d]/95 backdrop-blur-2xl border-2 rounded-3xl p-6 space-y-4"
                style={{
                  borderColor: `${selectedMode.accent}88`,
                  boxShadow: `0 0 60px ${selectedMode.accent}66`,
                }}
              >
                <div className="flex items-center justify-between">
                  <h3
                    className="text-2xl font-black"
                    style={{
                      fontFamily: "'Caveat', cursive",
                      color: selectedMode.accent,
                    }}
                  >
                    Rejoindre une partie
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowJoinDialog(false)}
                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-white/60">
                    <Hash className="h-3 w-3" />
                    Code du Lobby
                  </label>
                  <Input
                    placeholder="XXXX"
                    value={lobbyCode}
                    onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
                    onKeyPress={(e) => e.key === 'Enter' && handleJoinGame()}
                    maxLength={4}
                    className="text-center text-3xl tracking-[0.4em] uppercase font-black h-16 bg-black/50 border-2 border-white/15 rounded-2xl focus:border-white/40 text-white"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowJoinDialog(false)}
                    className="flex-1 py-3 rounded-2xl border-2 border-white/15 text-white/80 hover:border-white/30 hover:text-white transition-all flex items-center justify-center gap-2 font-bold"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleJoinGame}
                    disabled={!playerName.trim() || lobbyCode.length !== 4}
                    className={cn(
                      'flex-1 py-3 rounded-2xl font-black tracking-wider transition-all text-white',
                      'disabled:opacity-30 disabled:cursor-not-allowed'
                    )}
                    style={{
                      background: `linear-gradient(135deg, ${selectedMode.accent}, ${selectedMode.accent}cc)`,
                      boxShadow: `0 0 30px ${selectedMode.accent}88`,
                    }}
                  >
                    REJOINDRE
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
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

      {/* PATCH NOTE MODAL */}
      <InkPatchNoteModal forceOpen={showPatchNote} onClose={() => setShowPatchNote(false)} />

      {/* SCROLLBAR STYLE */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.04); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.4); }
        .bg-gradient-radial { background: radial-gradient(circle at center, var(--tw-gradient-stops)); }
      `}</style>
    </div>
  );
};

export const InkHomeScreen = memo(InkHomeScreenComponent);
