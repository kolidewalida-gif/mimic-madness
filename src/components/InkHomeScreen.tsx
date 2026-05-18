import { memo, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Settings, ArrowLeft } from 'lucide-react';
import { LobbyGameMode } from '@/lib/gameModes';
import { InkCursorParticles } from '@/components/InkCursorParticles';
import { InkParallaxContainer } from '@/components/ink-menu/InkParallaxContainer';
import { InkProfileCard } from '@/components/ink-menu/InkProfileCard';
import { InkFriendsCard } from '@/components/ink-menu/InkFriendsCard';
import { InkMenuButton } from '@/components/ink-menu/InkMenuButton';
import { DeviceSettings } from '@/components/DeviceSettings';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';
import { useToast } from '@/hooks/use-toast';
import { playInkSound } from '@/hooks/useInkSoundEffects';

interface InkHomeScreenProps {
  onCreateGame: (playerName: string, gameMode?: LobbyGameMode) => void;
  onJoinGame: (playerName: string, lobbyCode: string) => void;
}

const GAME_MODES: { id: LobbyGameMode; label: string; emoji: string }[] = [
  { id: 'audiophone', label: 'Audio Phone', emoji: '📞' },
  { id: 'normal', label: 'Normal', emoji: '🎮' },
  { id: '2v2', label: '2v2', emoji: '⚔️' },
  { id: 'quiz', label: 'Quiz', emoji: '🧠' },
  { id: 'pixoguess', label: 'BlurRush', emoji: '⚡' },
  { id: 'undercover', label: 'Undercover', emoji: '🕵️' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const InkHomeScreenComponent = ({ onCreateGame, onJoinGame }: InkHomeScreenProps) => {
  const { profile } = useAuth();
  const { play, isPlaying, volume, setVolume } = useBackgroundMusic();
  const { toast } = useToast();
  const [playerName, setPlayerName] = useState('');
  const [gameMode, setGameMode] = useState<LobbyGameMode>('audiophone');
  const [lobbyCode, setLobbyCode] = useState('');
  const [view, setView] = useState<'home' | 'join'>('home');
  const [showSettings, setShowSettings] = useState(false);

  // Sync profile display name
  useEffect(() => {
    if (profile?.display_name && !playerName) {
      setPlayerName(profile.display_name);
    }
  }, [profile?.display_name]);

  const handleCreate = useCallback(() => {
    if (!playerName.trim()) {
      toast({ title: 'Entrez votre nom', variant: 'destructive' });
      playInkSound('inkError', 0.3);
      return;
    }
    playInkSound('inkSuccess', 0.4);
    play();
    onCreateGame(playerName.trim(), gameMode);
  }, [playerName, gameMode, onCreateGame, play, toast]);

  const handleJoin = useCallback(() => {
    if (!playerName.trim()) {
      toast({ title: 'Entrez votre nom', variant: 'destructive' });
      playInkSound('inkError', 0.3);
      return;
    }
    if (!lobbyCode.trim()) {
      toast({ title: 'Entrez un code de lobby', variant: 'destructive' });
      playInkSound('inkError', 0.3);
      return;
    }
    playInkSound('inkSuccess', 0.4);
    play();
    onJoinGame(playerName.trim(), lobbyCode.trim().toUpperCase());
  }, [playerName, lobbyCode, onJoinGame, play, toast]);

  const handleJoinView = useCallback(() => {
    playInkSound('brushTap', 0.3);
    setView('join');
  }, []);

  const handleBack = useCallback(() => {
    playInkSound('paperSlide', 0.3);
    setView('home');
  }, []);

  const handleToggleMute = useCallback(() => {
    playInkSound('inkClick', 0.3);
    setVolume(volume > 0 ? 0 : 0.5);
  }, [volume, setVolume]);

  return (
    <div className="h-screen w-screen bg-[#050505] text-white relative overflow-hidden">
      {/* Ink Cursor Particles */}
      <InkCursorParticles />

      {/* Volumetric red fog blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#ff2b2b]/12 rounded-full blur-[140px]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.12, 0.18, 0.12] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#ff2b2b]/15 rounded-full blur-[120px]"
          animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.22, 0.15] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#ff2b2b]/8 rounded-full blur-[160px]"
          animate={{ scale: [1, 1.1, 1], opacity: [0.08, 0.14, 0.08] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
        />
      </div>

      {/* Main content with parallax */}
      <InkParallaxContainer intensity={2} className="h-full w-full flex flex-col">
        {/* Title */}
        <header className="relative z-10 pt-6 pb-4 text-center flex-shrink-0">
          <motion.h1
            className="text-4xl md:text-5xl lg:text-6xl font-black"
            initial={{ opacity: 0, y: -30, letterSpacing: '0.4em', filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, letterSpacing: '-0.02em', filter: 'blur(0px)' }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "'Caveat', cursive",
              color: '#ff2b2b',
              textShadow: '0 0 40px rgba(255, 43, 43, 0.6), 0 0 80px rgba(255, 43, 43, 0.4), 0 0 120px rgba(255, 43, 43, 0.2)',
            }}
          >
            MIMIC MASTER
          </motion.h1>
        </header>

        {/* 3-column grid */}
        <main className="flex-1 flex items-stretch justify-center px-4 pb-6 relative z-10 min-h-0 overflow-hidden">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full max-w-[1400px] grid grid-cols-1 lg:grid-cols-[300px_1fr_300px] gap-4 h-full"
          >
            {/* Left: Profile */}
            <motion.aside variants={itemVariants} className="hidden lg:block h-full min-h-0 overflow-y-auto">
              <InkProfileCard />
            </motion.aside>

            {/* Center */}
            <motion.section variants={itemVariants} className="h-full min-h-0 overflow-y-auto flex flex-col items-center justify-center gap-5 px-4">
              <AnimatePresence mode="wait">
                {view === 'home' ? (
                  <motion.div
                    key="home"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="w-full max-w-md space-y-5"
                  >
                    {/* Mobile profile card */}
                    <div className="lg:hidden">
                      <InkProfileCard />
                    </div>

                    {/* Player name */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-white/50 font-medium">Votre nom</label>
                      <Input
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        placeholder="Entrez votre pseudo..."
                        className="h-11 bg-white/5 border-white/10 text-white text-center text-lg placeholder:text-white/30 rounded-xl"
                        maxLength={20}
                      />
                    </div>

                    {/* Game Mode Selector */}
                    <div className="space-y-2">
                      <label className="text-xs text-white/50 font-medium">Mode de jeu</label>
                      <div className="flex flex-wrap gap-1.5">
                        {GAME_MODES.map((mode) => (
                          <motion.button
                            key={mode.id}
                            onClick={() => { setGameMode(mode.id); playInkSound('inkClick', 0.2); }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                              gameMode === mode.id
                                ? 'bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_12px_rgba(255,43,43,0.3)]'
                                : 'bg-white/5 border-white/10 text-white/60 hover:text-white/80 hover:border-white/20'
                            }`}
                          >
                            {mode.emoji} {mode.label}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      <InkMenuButton variant="primary" onClick={handleCreate} delay={0.2}>
                        Create Game
                      </InkMenuButton>
                      <InkMenuButton variant="secondary" onClick={handleJoinView} delay={0.3}>
                        Join Game
                      </InkMenuButton>
                    </div>

                    {/* Volume + Settings */}
                    <div className="flex items-center justify-center gap-3 pt-2">
                      <motion.button
                        onClick={handleToggleMute}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white/80"
                      >
                        {volume > 0 ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                      </motion.button>
                      <motion.button
                        onClick={() => { playInkSound('brushTap', 0.3); setShowSettings(true); }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white/80"
                      >
                        <Settings className="w-4 h-4" />
                      </motion.button>
                    </div>

                    {/* Mobile friends card */}
                    <div className="lg:hidden">
                      <InkFriendsCard />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="join"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="w-full max-w-md space-y-4"
                  >
                    <div className="space-y-1.5">
                      <label className="text-xs text-white/50 font-medium">Code du lobby</label>
                      <Input
                        value={lobbyCode}
                        onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
                        placeholder="ABCD..."
                        className="h-12 bg-white/5 border-white/10 text-white text-center text-2xl font-mono tracking-[0.3em] placeholder:text-white/20 rounded-xl uppercase"
                        maxLength={6}
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <InkMenuButton variant="primary" onClick={handleJoin} delay={0.1}>
                        Join
                      </InkMenuButton>
                      <InkMenuButton variant="ghost" onClick={handleBack} delay={0.2}>
                        <span className="flex items-center justify-center gap-2">
                          <ArrowLeft className="w-4 h-4" /> Back
                        </span>
                      </InkMenuButton>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>

            {/* Right: Friends */}
            <motion.aside variants={itemVariants} className="hidden lg:block h-full min-h-0 overflow-y-auto">
              <InkFriendsCard />
            </motion.aside>
          </motion.div>
        </main>
      </InkParallaxContainer>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden max-h-[80vh] overflow-y-auto"
            >
              <DeviceSettings onClose={() => setShowSettings(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const InkHomeScreen = memo(InkHomeScreenComponent);
