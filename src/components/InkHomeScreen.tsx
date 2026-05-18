import { useState, memo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';
import {
  ArrowRight,
  ChevronLeft,
  Hash,
  Phone,
  Copy,
  Swords,
  Brain,
  Zap,
  Settings,
  UserX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { useToast } from '@/hooks/use-toast';
import { VolumeControl } from '@/components/VolumeControl';
import { SoundEffectsVolumeControl } from '@/components/SoundEffectsVolumeControl';
import { DeviceSettings } from '@/components/DeviceSettings';
import { LobbyGameMode } from '@/lib/gameModes';
import { InkCursorParticles } from '@/components/InkCursorParticles';
import { InkParallaxContainer } from '@/components/ink-menu/InkParallaxContainer';
import { InkMenuButton } from '@/components/ink-menu/InkMenuButton';
import { InkProfileCard } from '@/components/ink-menu/InkProfileCard';
import { InkFriendsCard } from '@/components/ink-menu/InkFriendsCard';

interface InkHomeScreenProps {
  onCreateGame: (playerName: string, gameMode?: LobbyGameMode) => void;
  onJoinGame: (playerName: string, lobbyCode: string) => void;
}

type ViewMode = 'home' | 'join';

interface GameModeOption {
  id: LobbyGameMode;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

const GAME_MODES: GameModeOption[] = [
  { id: 'audiophone', name: 'Audiophone', icon: Phone },
  { id: 'normal', name: 'Imitation', icon: Copy },
  { id: '2v2', name: '2v2', icon: Swords },
  { id: 'quiz', name: 'Quiz', icon: Brain },
  { id: 'pixoguess', name: 'Blurrush', icon: Zap },
  { id: 'undercover', name: 'Undercover', icon: UserX },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const InkHomeScreenComponent = ({ onCreateGame, onJoinGame }: InkHomeScreenProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [playerName, setPlayerName] = useState('');
  const [lobbyCode, setLobbyCode] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [showSettings, setShowSettings] = useState(false);
  const [selectedMode, setSelectedMode] = useState<LobbyGameMode>('audiophone');
  const { play } = useBackgroundMusic();
  const hasSyncedName = useRef(false);

  useEffect(() => {
    if (profile?.display_name && !hasSyncedName.current) {
      hasSyncedName.current = true;
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

  const handleJoinFriend = useCallback(
    (code: string) => {
      setLobbyCode(code);
      if (playerName.trim()) {
        play();
        playInkSound('inkSuccess', 0.5);
        onJoinGame(playerName.trim(), code);
      } else {
        toast({
          title: "Pseudo requis",
          description: "Entrez votre pseudo d'abord",
        });
      }
    },
    [playerName, play, onJoinGame, toast],
  );

  return (
    <div className="h-screen w-screen overflow-hidden relative bg-[#050505]">
      {/* Ink Cursor Particles */}
      <InkCursorParticles />

      {/* Background fog blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute top-[15%] left-[20%] w-[400px] h-[400px] rounded-full bg-red-600 opacity-[0.07] blur-[120px]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.07, 0.12, 0.07] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-[20%] right-[15%] w-[350px] h-[350px] rounded-full bg-red-600 opacity-[0.05] blur-[100px]"
          animate={{ scale: [1, 1.15, 1], opacity: [0.05, 0.1, 0.05] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
        <motion.div
          className="absolute top-[50%] left-[55%] w-[500px] h-[300px] rounded-full bg-red-600 opacity-[0.04] blur-[150px]"
          animate={{ scale: [1, 1.1, 1], opacity: [0.04, 0.08, 0.04] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
      </div>

      {/* Main content with parallax */}
      <InkParallaxContainer
        intensity={2}
        className="h-full w-full flex flex-col items-center justify-center px-4 py-6 relative z-10"
      >
        <motion.div
          className="w-full max-w-[1400px] h-full flex flex-col"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Title */}
          <motion.div variants={itemVariants} className="text-center mb-4 flex-shrink-0">
            <motion.h1
              className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight"
              initial={{
                opacity: 0,
                letterSpacing: '0.5em',
                filter: 'blur(10px)',
              }}
              animate={{
                opacity: 1,
                letterSpacing: '-0.02em',
                filter: 'blur(0px)',
              }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: "'Caveat', cursive",
                color: '#ef4444',
                textShadow:
                  '0 0 20px rgba(255,43,43,0.6), 0 0 40px rgba(255,43,43,0.3), 0 0 80px rgba(255,43,43,0.15)',
              }}
            >
              MIMIC MASTER
            </motion.h1>
          </motion.div>

          {/* Grid layout */}
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[300px_1fr_300px] gap-4 lg:gap-6">
            {/* Left - Profile Card (hidden on mobile) */}
            <motion.div
              variants={itemVariants}
              className="hidden lg:block overflow-y-auto scrollbar-none"
            >
              <InkProfileCard />
            </motion.div>

            {/* Center - Actions */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col items-center justify-center gap-4 overflow-y-auto scrollbar-none"
            >
              {/* Mobile profile summary */}
              <div className="lg:hidden w-full max-w-md">
                <InkProfileCard />
              </div>

              {/* Player name input */}
              <div className="w-full max-w-md">
                <Input
                  placeholder="Entrez votre pseudo..."
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  aria-label="Pseudo du joueur"
                  className="h-11 bg-white/5 border border-white/10 rounded-xl text-center text-white placeholder:text-white/30 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
              </div>

              {/* Game mode selector */}
              <div className="w-full max-w-md">
                <div className="flex flex-wrap justify-center gap-2">
                  {GAME_MODES.map((mode) => {
                    const Icon = mode.icon;
                    return (
                      <motion.button
                        key={mode.id}
                        onClick={() => {
                          playInkSound('brushTap', 0.4);
                          setSelectedMode(mode.id);
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        aria-label={`Mode ${mode.name}`}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border',
                          selectedMode === mode.id
                            ? 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(255,43,43,0.3)]'
                            : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30 hover:text-white/80',
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {mode.name}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Action buttons */}
              <div className="w-full max-w-md space-y-3">
                <AnimatePresence mode="wait" initial={false}>
                  {viewMode === 'home' ? (
                    <motion.div
                      key="home-actions"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className="space-y-3"
                    >
                      <InkMenuButton
                        onClick={handleCreateGame}
                        disabled={!playerName.trim()}
                        variant="primary"
                        delay={0.3}
                        ariaLabel="Creer une partie"
                      >
                        <span className="flex items-center justify-center gap-2">
                          Creer une partie
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      </InkMenuButton>

                      <InkMenuButton
                        onClick={() => {
                          playInkSound('brushTap', 0.3);
                          setViewMode('join');
                        }}
                        disabled={!playerName.trim()}
                        variant="secondary"
                        delay={0.4}
                        ariaLabel="Rejoindre une partie"
                      >
                        Rejoindre une partie
                      </InkMenuButton>

                      {/* Volume controls */}
                      <div className="pt-3 space-y-2 border-t border-white/10">
                        <VolumeControl />
                        <SoundEffectsVolumeControl />
                      </div>

                      <InkMenuButton
                        onClick={() => {
                          playInkSound('inkClick', 0.3);
                          setShowSettings(true);
                        }}
                        variant="ghost"
                        delay={0.5}
                        ariaLabel="Ouvrir les parametres"
                        className="text-sm"
                      >
                        <span className="flex items-center justify-center gap-2">
                          <Settings className="w-4 h-4" />
                          Parametres
                        </span>
                      </InkMenuButton>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="join-actions"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className="space-y-3"
                    >
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-white/50">
                          <Hash className="h-3 w-3" />
                          Code du Lobby
                        </label>
                        <Input
                          placeholder="XXXX"
                          value={lobbyCode}
                          onChange={(e) =>
                            setLobbyCode(e.target.value.toUpperCase())
                          }
                          onKeyDown={(e) =>
                            e.key === 'Enter' && handleJoinGame()
                          }
                          maxLength={4}
                          aria-label="Code du lobby"
                          className="text-center text-2xl tracking-[0.3em] uppercase font-bold h-14 bg-white/5 border-2 border-red-500/50 rounded-xl focus:border-red-500 text-white"
                        />
                      </div>

                      <div className="flex gap-2">
                        <motion.button
                          onClick={() => {
                            playInkSound('brushTap', 0.3);
                            setViewMode('home');
                          }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          aria-label="Retour au menu"
                          className="flex-1 py-2.5 px-4 rounded-xl border border-white/20 text-white/80 hover:border-red-500/50 hover:text-red-400 transition-all flex items-center justify-center gap-1 text-sm"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Retour
                        </motion.button>
                        <motion.button
                          onClick={handleJoinGame}
                          disabled={
                            !playerName.trim() || lobbyCode.length !== 4
                          }
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          aria-label="Rejoindre le lobby"
                          className={cn(
                            'flex-1 py-2.5 px-4 rounded-xl font-semibold transition-all text-sm',
                            'bg-red-500 text-white hover:bg-red-500/90',
                            'disabled:opacity-50 disabled:cursor-not-allowed',
                          )}
                        >
                          Rejoindre
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Right - Friends Card (hidden on mobile) */}
            <motion.div
              variants={itemVariants}
              className="hidden lg:block overflow-y-auto scrollbar-none"
            >
              <InkFriendsCard onJoinFriend={handleJoinFriend} />
            </motion.div>
          </div>

          {/* Mobile friends card */}
          <motion.div variants={itemVariants} className="lg:hidden mt-4">
            <InkFriendsCard onJoinFriend={handleJoinFriend} />
          </motion.div>
        </motion.div>
      </InkParallaxContainer>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
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
    </div>
  );
};

export const InkHomeScreen = memo(InkHomeScreenComponent);
