import { useState, memo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';
import {
  Hash,
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
  icon: React.ReactNode;
}

const GAME_MODES: GameModeInfo[] = [
  { id: 'audiophone', name: 'Audio Phone', icon: <Phone className="w-4 h-4" /> },
  { id: 'normal', name: 'Normal', icon: <Copy className="w-4 h-4" /> },
  { id: '2v2', name: '2v2', icon: <Swords className="w-4 h-4" /> },
  { id: 'quiz', name: 'Quiz', icon: <Brain className="w-4 h-4" /> },
  { id: 'pixoguess', name: 'BlurRush', icon: <Zap className="w-4 h-4" /> },
  { id: 'undercover', name: 'Undercover', icon: <UserX className="w-4 h-4" /> },
];

const InkHomeScreenComponent = ({ onCreateGame, onJoinGame }: InkHomeScreenProps) => {
  const { profile } = useAuth();
  const [playerName, setPlayerName] = useState('');
  const [lobbyCode, setLobbyCode] = useState('');
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPatchNote, setShowPatchNote] = useState(false);
  const [selectedMode, setSelectedMode] = useState<LobbyGameMode>('audiophone');
  const { play, volume, setVolume } = useBackgroundMusic();
  const isMuted = volume === 0;
  const toggleMute = useCallback(() => {
    if (volume === 0) {
      setVolume(0.5);
    } else {
      (window as any).__prevMusicVol = volume;
      setVolume(0);
    }
  }, [volume, setVolume]);

  useEffect(() => {
    if (profile?.display_name && !playerName) {
      setPlayerName(profile.display_name);
    }
  }, [profile?.display_name]);

  const handleCreateGame = useCallback(() => {
    if (playerName.trim()) {
      play();
      playInkSound('inkSuccess', 0.5);
      onCreateGame(playerName.trim(), selectedMode || 'normal');
    }
  }, [playerName, selectedMode, play, onCreateGame]);

  const handleJoinGame = useCallback(() => {
    if (playerName.trim() && lobbyCode.trim()) {
      play();
      playInkSound('inkSuccess', 0.5);
      onJoinGame(playerName.trim(), lobbyCode.trim().toUpperCase());
    }
  }, [playerName, lobbyCode, play, onJoinGame]);

  const handleSelectMode = (mode: GameModeInfo) => {
    playInkSound('brushTap', 0.4);
    setSelectedMode(mode.id);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0a0505] text-foreground relative overflow-hidden">
      {/* Ink Cursor Particles Effect */}
      <InkCursorParticles />

      {/* Background — volumetric red fog + ambient elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Red glow halos */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#ff2b2b]/15 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-[#ff2b2b]/12 rounded-full blur-[130px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-[#ff2b2b]/8 rounded-full blur-[180px]" />

        {/* Splash decorations */}
        <div className="absolute top-8 left-8 w-32 h-32 opacity-30">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <path d="M20,50 Q30,20 50,30 T80,40 L75,55 Q60,70 40,65 T20,50 Z" fill="#ff2b2b" opacity="0.4" />
            <circle cx="85" cy="20" r="3" fill="#ff2b2b" opacity="0.5" />
            <circle cx="15" cy="80" r="2" fill="#ff2b2b" opacity="0.4" />
          </svg>
        </div>

        {/* Crown decoration left */}
        <div className="absolute left-12 top-1/2 -translate-y-1/2 opacity-15">
          <svg viewBox="0 0 100 80" className="w-40 h-32">
            <path d="M20,60 L20,30 L35,45 L50,20 L65,45 L80,30 L80,60 Z" fill="#ff2b2b" stroke="#ff2b2b" strokeWidth="2" />
            <circle cx="20" cy="28" r="4" fill="#ff2b2b" />
            <circle cx="50" cy="18" r="4" fill="#ff2b2b" />
            <circle cx="80" cy="28" r="4" fill="#ff2b2b" />
          </svg>
        </div>

        {/* Mascot decoration right */}
        <div className="absolute right-12 bottom-32 opacity-15">
          <svg viewBox="0 0 100 100" className="w-40 h-40">
            <circle cx="50" cy="50" r="35" fill="#ff2b2b" opacity="0.6" />
            <circle cx="40" cy="45" r="3" fill="#0a0505" />
            <circle cx="60" cy="45" r="3" fill="#0a0505" />
            <path d="M35,60 Q50,75 65,60" stroke="#0a0505" strokeWidth="3" fill="none" strokeLinecap="round" />
          </svg>
        </div>

        {/* Subtle noise/grid overlay */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }} />
      </div>

      {/* TITLE — Big cartoon "MIMIC MASTER" */}
      <header className="relative z-10 pt-6 pb-2 text-center flex-shrink-0">
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative inline-block"
        >
          {/* Crown decoration top right */}
          <div className="absolute -top-4 -right-6 text-[#ff2b2b] rotate-12">
            <svg viewBox="0 0 24 24" className="w-10 h-10 fill-current drop-shadow-[0_0_8px_rgba(255,43,43,0.8)]">
              <path d="M3,18L5,8L8,12L12,4L16,12L19,8L21,18H3M5.5,16H18.5L17.7,12L15.2,15L12,8L8.8,15L6.3,12L5.5,16Z" />
            </svg>
          </div>
          {/* Crown decoration top left */}
          <div className="absolute -top-3 -left-8 text-[#ff2b2b] -rotate-12">
            <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current drop-shadow-[0_0_8px_rgba(255,43,43,0.8)]">
              <path d="M3,18L5,8L8,12L12,4L16,12L19,8L21,18H3M5.5,16H18.5L17.7,12L15.2,15L12,8L8.8,15L6.3,12L5.5,16Z" />
            </svg>
          </div>

          {/* MIMIC */}
          <h1
            className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-none"
            style={{
              fontFamily: "'Caveat', cursive, sans-serif",
              color: '#ff2b2b',
              textShadow: `
                3px 3px 0 #000,
                -1px -1px 0 #000,
                1px -1px 0 #000,
                -1px 1px 0 #000,
                1px 1px 0 #000,
                0 0 30px rgba(255, 43, 43, 0.8),
                0 0 60px rgba(255, 43, 43, 0.4)
              `,
              WebkitTextStroke: '1px #000',
              filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))',
            }}
          >
            MIMIC
          </h1>
          {/* MASTER */}
          <h1
            className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-none -mt-2"
            style={{
              fontFamily: "'Caveat', cursive, sans-serif",
              color: '#ffffff',
              textShadow: `
                3px 3px 0 #000,
                -1px -1px 0 #000,
                1px -1px 0 #000,
                -1px 1px 0 #000,
                1px 1px 0 #000,
                0 0 30px rgba(255, 43, 43, 0.6),
                0 0 60px rgba(255, 43, 43, 0.3)
              `,
              WebkitTextStroke: '1px #000',
              filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))',
            }}
          >
            MASTER
          </h1>
        </motion.div>
      </header>

      {/* MAIN CONTENT — 3 Panels */}
      <main className="flex-1 flex items-center justify-center px-6 pb-6 relative z-10 min-h-0">
        <div className="w-full max-w-[1500px] grid grid-cols-[1fr_1.3fr_1fr] gap-6 items-stretch h-full max-h-[700px]">

          {/* LEFT PANEL — Profile */}
          <motion.aside
            initial={{ opacity: 0, x: -60, rotateY: 5 }}
            animate={{ opacity: 1, x: 0, rotateY: -2 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
            style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
          >
            {/* Glow background */}
            <div className="absolute inset-0 bg-[#ff2b2b]/20 rounded-3xl blur-2xl" />

            {/* Card */}
            <div
              className="relative h-full bg-[#0a0505]/90 backdrop-blur-xl border-2 border-[#ff2b2b]/50 rounded-3xl overflow-hidden flex flex-col"
              style={{
                boxShadow: `
                  0 0 40px rgba(255, 43, 43, 0.3),
                  0 0 80px rgba(255, 43, 43, 0.15),
                  inset 0 1px 0 rgba(255, 255, 255, 0.05)
                `,
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-[#ff2b2b]/5 to-transparent pointer-events-none" />
              <div className="relative h-full overflow-y-auto custom-scrollbar">
                <InkProfileSidebar />
              </div>
            </div>
          </motion.aside>

          {/* CENTER PANEL — Main (Dominant) */}
          <motion.section
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            {/* Strong glow */}
            <div className="absolute -inset-2 bg-[#ff2b2b]/30 rounded-3xl blur-3xl animate-pulse" />
            <div className="absolute -inset-1 bg-[#ff2b2b]/20 rounded-3xl blur-xl" />

            {/* Main card */}
            <div
              className="relative h-full bg-[#0a0505]/95 backdrop-blur-xl border-2 border-[#ff2b2b] rounded-3xl overflow-hidden flex flex-col"
              style={{
                boxShadow: `
                  0 0 60px rgba(255, 43, 43, 0.5),
                  0 0 120px rgba(255, 43, 43, 0.25),
                  inset 0 1px 0 rgba(255, 255, 255, 0.1),
                  inset 0 0 40px rgba(255, 43, 43, 0.1)
                `,
              }}
            >
              {/* Top reflection */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ff2b2b] to-transparent" />
              <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#ff2b2b]/8 to-transparent pointer-events-none" />

              {/* Splatter decorations */}
              <div className="absolute top-3 left-4 opacity-20 pointer-events-none">
                <svg viewBox="0 0 40 40" className="w-12 h-12">
                  <circle cx="20" cy="20" r="3" fill="#ff2b2b" />
                  <circle cx="30" cy="10" r="1.5" fill="#ff2b2b" />
                  <circle cx="10" cy="30" r="1" fill="#ff2b2b" />
                  <circle cx="35" cy="25" r="2" fill="#ff2b2b" />
                </svg>
              </div>
              <div className="absolute top-3 right-4 opacity-20 pointer-events-none">
                <svg viewBox="0 0 24 24" className="w-8 h-8">
                  <path d="M3,18L5,8L8,12L12,4L16,12L19,8L21,18H3" fill="#ff2b2b" />
                </svg>
              </div>

              <div className="relative flex-1 flex flex-col justify-center px-8 py-8 gap-6 overflow-y-auto custom-scrollbar">
                {/* Username Input */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/60 uppercase tracking-[0.2em] block text-center">
                    Votre nom
                  </label>
                  <Input
                    placeholder="Entrez votre pseudo..."
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="h-14 bg-[#1a0a0a]/80 border-2 border-[#ff2b2b]/40 rounded-2xl text-center text-2xl font-black text-white placeholder:text-white/30 placeholder:font-normal placeholder:text-base focus:border-[#ff2b2b] focus:ring-2 focus:ring-[#ff2b2b]/30 transition-all"
                    style={{ fontFamily: "'Caveat', cursive" }}
                  />
                </div>

                {/* Game Modes — Pills */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/60 uppercase tracking-[0.2em] block">
                    Mode de jeu
                  </label>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {GAME_MODES.map((mode) => {
                      const isActive = selectedMode === mode.id;
                      return (
                        <motion.button
                          key={mode.id}
                          onClick={() => handleSelectMode(mode)}
                          whileHover={{ scale: 1.05, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          className={cn(
                            'flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold transition-all duration-200 border-2',
                            isActive
                              ? 'bg-[#ff2b2b]/20 border-[#ff2b2b] text-[#ff2b2b] shadow-[0_0_20px_rgba(255,43,43,0.5)]'
                              : 'bg-[#1a0a0a]/60 border-white/10 text-white/70 hover:border-[#ff2b2b]/40 hover:text-white'
                          )}
                        >
                          {mode.icon}
                          {mode.name}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* CREATE GAME — Big red button */}
                <motion.button
                  onClick={handleCreateGame}
                  disabled={!playerName.trim()}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'relative w-full py-5 px-6 rounded-2xl font-black text-xl tracking-wider transition-all duration-300',
                    'bg-gradient-to-b from-[#ff4040] to-[#cc1818] text-white border-2 border-[#ff2b2b]',
                    'hover:from-[#ff5050] hover:to-[#dd2020]',
                    'disabled:opacity-40 disabled:cursor-not-allowed',
                    'overflow-hidden group'
                  )}
                  style={{
                    boxShadow: `
                      0 0 40px rgba(255, 43, 43, 0.6),
                      0 8px 24px rgba(255, 43, 43, 0.4),
                      inset 0 1px 0 rgba(255, 255, 255, 0.3),
                      inset 0 -2px 0 rgba(0, 0, 0, 0.3)
                    `,
                  }}
                >
                  {/* Shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  {/* Decorative burst */}
                  <div className="absolute -top-1 -right-2 opacity-60">
                    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
                      <path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z" />
                    </svg>
                  </div>
                  <span className="relative flex items-center justify-center gap-3">
                    CREATE GAME
                    <Users className="w-6 h-6" />
                  </span>
                </motion.button>

                {/* JOIN GAME — Outline button */}
                <motion.button
                  onClick={() => {
                    playInkSound('brushTap', 0.3);
                    setShowJoinDialog(true);
                  }}
                  disabled={!playerName.trim()}
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'w-full py-4 px-6 rounded-2xl font-black text-lg tracking-wider transition-all duration-300',
                    'bg-[#1a0a0a]/80 border-2 border-[#ff2b2b]/60 text-white',
                    'hover:bg-[#1a0a0a] hover:border-[#ff2b2b] hover:shadow-[0_0_30px_rgba(255,43,43,0.4)]',
                    'disabled:opacity-40 disabled:cursor-not-allowed'
                  )}
                >
                  <span className="flex items-center justify-center gap-3">
                    JOIN GAME
                    <Users className="w-5 h-5" />
                  </span>
                </motion.button>

                {/* Bottom icon buttons */}
                <div className="flex items-center justify-center gap-3 pt-2">
                  <motion.button
                    onClick={() => {
                      playInkSound('inkClick', 0.3);
                      toggleMute();
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-11 h-11 rounded-full bg-[#1a0a0a]/80 border border-[#ff2b2b]/30 flex items-center justify-center text-white/70 hover:text-[#ff2b2b] hover:border-[#ff2b2b] transition-all"
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </motion.button>
                  <motion.button
                    onClick={() => {
                      playInkSound('inkClick', 0.3);
                      setShowSettings(true);
                    }}
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-11 h-11 rounded-full bg-[#1a0a0a]/80 border border-[#ff2b2b]/30 flex items-center justify-center text-white/70 hover:text-[#ff2b2b] hover:border-[#ff2b2b] transition-all"
                  >
                    <Settings className="w-5 h-5" />
                  </motion.button>
                </div>

                {/* Version */}
                <button
                  onClick={() => {
                    playInkSound('brushTap', 0.2);
                    setShowPatchNote(true);
                  }}
                  className="text-center text-[10px] text-white/30 hover:text-[#ff2b2b]/70 transition-colors font-mono"
                >
                  v{CURRENT_VERSION} · Notes de version
                </button>
              </div>
            </div>
          </motion.section>

          {/* RIGHT PANEL — Friends */}
          <motion.aside
            initial={{ opacity: 0, x: 60, rotateY: -5 }}
            animate={{ opacity: 1, x: 0, rotateY: 2 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
            style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
          >
            {/* Glow background */}
            <div className="absolute inset-0 bg-[#ff2b2b]/20 rounded-3xl blur-2xl" />

            {/* Card */}
            <div
              className="relative h-full bg-[#0a0505]/90 backdrop-blur-xl border-2 border-[#ff2b2b]/50 rounded-3xl overflow-hidden flex flex-col"
              style={{
                boxShadow: `
                  0 0 40px rgba(255, 43, 43, 0.3),
                  0 0 80px rgba(255, 43, 43, 0.15),
                  inset 0 1px 0 rgba(255, 255, 255, 0.05)
                `,
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-[#ff2b2b]/5 to-transparent pointer-events-none" />
              <div className="relative h-full overflow-y-auto custom-scrollbar">
                <InkFriendsSidebar onJoinFriend={(code) => {
                  setLobbyCode(code);
                  if (playerName.trim()) {
                    onJoinGame(playerName.trim(), code);
                  }
                }} />
              </div>
            </div>
          </motion.aside>
        </div>
      </main>

      {/* Join Game Dialog */}
      <AnimatePresence>
        {showJoinDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowJoinDialog(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md"
            >
              <div className="absolute -inset-2 bg-[#ff2b2b]/30 rounded-3xl blur-2xl" />
              <div
                className="relative bg-[#0a0505]/95 backdrop-blur-xl border-2 border-[#ff2b2b] rounded-3xl p-6 space-y-4"
                style={{
                  boxShadow: '0 0 60px rgba(255, 43, 43, 0.5), 0 0 120px rgba(255, 43, 43, 0.25)',
                }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-[#ff2b2b]" style={{ fontFamily: "'Caveat', cursive" }}>
                    Rejoindre une partie
                  </h3>
                  <button
                    onClick={() => setShowJoinDialog(false)}
                    className="w-8 h-8 rounded-full bg-[#1a0a0a] border border-[#ff2b2b]/30 flex items-center justify-center text-white/60 hover:text-[#ff2b2b] transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-white/70">
                    <Hash className="h-3 w-3" />
                    Code du Lobby
                  </label>
                  <Input
                    placeholder="XXXX"
                    value={lobbyCode}
                    onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
                    onKeyPress={(e) => e.key === 'Enter' && handleJoinGame()}
                    maxLength={4}
                    className="text-center text-3xl tracking-[0.4em] uppercase font-black h-16 bg-[#1a0a0a]/80 border-2 border-[#ff2b2b]/50 rounded-2xl focus:border-[#ff2b2b] text-white"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowJoinDialog(false)}
                    className="flex-1 py-3 rounded-2xl border-2 border-white/20 text-white/80 hover:border-white/40 hover:text-white transition-all flex items-center justify-center gap-2 font-bold"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Annuler
                  </button>
                  <button
                    onClick={handleJoinGame}
                    disabled={!playerName.trim() || lobbyCode.length !== 4}
                    className={cn(
                      'flex-1 py-3 rounded-2xl font-black tracking-wider transition-all',
                      'bg-gradient-to-b from-[#ff4040] to-[#cc1818] text-white border-2 border-[#ff2b2b]',
                      'hover:from-[#ff5050] hover:to-[#dd2020]',
                      'disabled:opacity-40 disabled:cursor-not-allowed',
                      'shadow-[0_0_30px_rgba(255,43,43,0.4)]'
                    )}
                  >
                    REJOINDRE
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
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

      {/* Patch Note Modal */}
      <InkPatchNoteModal
        forceOpen={showPatchNote}
        onClose={() => setShowPatchNote(false)}
      />

      {/* Custom scrollbar styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 43, 43, 0.05);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 43, 43, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 43, 43, 0.5);
        }
      `}</style>
    </div>
  );
};

export const InkHomeScreen = memo(InkHomeScreenComponent);
