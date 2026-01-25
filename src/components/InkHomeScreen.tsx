import { useState, memo, useCallback, useEffect } from 'react';
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
  X,
  Settings,
  Volume2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { VolumeControl } from '@/components/VolumeControl';
import { SoundEffectsVolumeControl } from '@/components/SoundEffectsVolumeControl';
import { DeviceSettings } from '@/components/DeviceSettings';
import { LobbyGameMode } from '@/lib/gameModes';

interface InkHomeScreenProps {
  onCreateGame: (playerName: string, gameMode?: LobbyGameMode) => void;
  onJoinGame: (playerName: string, lobbyCode: string) => void;
}

type ViewMode = 'home' | 'join';

interface GameModeInfo {
  id: LobbyGameMode;
  name: string;
  icon: React.ReactNode;
  description: string;
  rules: string[];
}

const GAME_MODES: GameModeInfo[] = [
  {
    id: 'audiophone',
    name: 'Audiophone',
    icon: <Phone className="w-5 h-5" />,
    description: 'Le téléphone arabe version audio inversé',
    rules: [
      'Enregistrez une phrase qui sera automatiquement inversée',
      "Les autres joueurs écoutent et imitent ce qu'ils entendent",
      'Fou rires garantis lors de la révélation finale!',
    ],
  },
  {
    id: 'normal',
    name: 'Imitation',
    icon: <Copy className="w-5 h-5" />,
    description: 'Imitez les défis vidéo des autres joueurs',
    rules: [
      'Un joueur lance un défi vidéo',
      "Les autres doivent l'imiter le plus fidèlement possible",
      'Votez pour la meilleure imitation!',
    ],
  },
  {
    id: '2v2',
    name: '2v2',
    icon: <Swords className="w-5 h-5" />,
    description: 'Affrontement en équipes de 2',
    rules: [
      'Formez des équipes de 2 joueurs',
      'Collaborez pour réaliser les défis ensemble',
      "L'équipe avec le plus de points gagne!",
    ],
  },
  {
    id: 'quiz',
    name: 'Quiz',
    icon: <Brain className="w-5 h-5" />,
    description: 'Testez vos connaissances en temps réel',
    rules: [
      'Questions variées: culture générale, jeux, films...',
      'Répondez le plus vite possible pour plus de points',
      'Le plus rapide et précis gagne!',
    ],
  },
  {
    id: 'pixoguess',
    name: 'Blurrush',
    icon: <Zap className="w-5 h-5" />,
    description: "Devinez l'image pixelisée",
    rules: [
      'Une image se dépixelise progressivement',
      "Soyez le premier à deviner ce que c'est",
      'Plus vous êtes rapide, plus vous gagnez de points!',
    ],
  },
];

const InkHomeScreenComponent = ({ onCreateGame, onJoinGame }: InkHomeScreenProps) => {
  const { profile } = useAuth();
  const [playerName, setPlayerName] = useState('');
  const [lobbyCode, setLobbyCode] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [showSettings, setShowSettings] = useState(false);
  const [selectedMode, setSelectedMode] = useState<LobbyGameMode>('audiophone');
  const [hoveredMode, setHoveredMode] = useState<GameModeInfo | null>(null);
  const { play } = useBackgroundMusic();

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

  const selectedModeInfo = GAME_MODES.find((m) => m.id === selectedMode);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground relative overflow-hidden">
      {/* Background effects - Red glow particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Main red glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/15 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[150px]" />
        
        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/40"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
            }}
            animate={{
              y: [null, Math.random() * 100 - 50],
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: 4 + Math.random() * 4,
              repeat: Infinity,
              repeatType: 'reverse',
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Title Header */}
      <header className="relative z-10 pt-8 pb-4 text-center">
        <motion.h1
          className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            fontFamily: "'Caveat', cursive",
            color: 'hsl(var(--primary))',
            textShadow: '0 0 40px hsl(var(--primary) / 0.4)',
          }}
        >
          MIMIC MASTER
        </motion.h1>
      </header>

      {/* Main Content - Three Column Layout */}
      <main className="flex-1 flex items-start justify-center px-4 py-6 relative z-10">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[200px_1fr_280px] gap-6 items-start">
          
          {/* Left Column - Game Modes */}
          <aside className="space-y-1">
            {GAME_MODES.map((mode, index) => (
              <motion.button
                key={mode.id}
                onClick={() => handleSelectMode(mode)}
                onMouseEnter={() => setHoveredMode(mode)}
                onMouseLeave={() => setHoveredMode(null)}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'w-full text-left px-4 py-3 rounded-lg transition-all duration-300',
                  'border-l-4 hover:bg-primary/10',
                  selectedMode === mode.id
                    ? 'border-primary bg-primary/10 text-primary font-bold'
                    : 'border-transparent text-foreground/70 hover:text-foreground hover:border-primary/50'
                )}
              >
                <span className="flex items-center gap-3">
                  {mode.icon}
                  {mode.name}
                </span>
              </motion.button>
            ))}
          </aside>

          {/* Center Column - Username + Actions */}
          <div className="flex flex-col items-center justify-center space-y-6">
            {/* Username Input */}
            <div className="w-full max-w-xs">
              <Input
                placeholder="Choose a username..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="h-12 bg-background/50 border border-border/50 rounded-lg text-center text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Mode Description Card - Angled/Tilted */}
            <AnimatePresence mode="wait">
              {selectedModeInfo && (
                <motion.div
                  key={selectedMode}
                  initial={{ opacity: 0, y: 20, rotate: -2 }}
                  animate={{ opacity: 1, y: 0, rotate: -1 }}
                  exit={{ opacity: 0, y: -20, rotate: 0 }}
                  transition={{ duration: 0.3 }}
                  className="relative w-full max-w-sm"
                >
                  {/* Outer glow border */}
                  <div className="absolute inset-0 bg-primary/30 rounded-xl blur-sm" />
                  
                  {/* Card content */}
                  <div className="relative bg-background/80 backdrop-blur-sm border-2 border-primary/50 rounded-xl p-5 shadow-lg shadow-primary/10">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-primary/20 rounded-lg text-primary">
                        {selectedModeInfo.icon}
                      </div>
                      <h3 className="text-xl font-bold text-primary" style={{ fontFamily: "'Caveat', cursive" }}>
                        {selectedModeInfo.name}
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedModeInfo.description}
                    </p>
                    <ul className="mt-3 space-y-1">
                      {selectedModeInfo.rules.slice(0, 2).map((rule, i) => (
                        <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                          <span className="text-primary">•</span>
                          {rule}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hover tooltip for modes */}
            <AnimatePresence>
              {hoveredMode && hoveredMode.id !== selectedMode && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="fixed left-[220px] top-1/2 -translate-y-1/2 z-50 hidden lg:block"
                >
                  <div className="bg-card border border-primary/30 rounded-lg p-4 shadow-xl max-w-xs">
                    <h4 className="font-bold text-primary mb-1">{hoveredMode.name}</h4>
                    <p className="text-xs text-muted-foreground">{hoveredMode.description}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column - Actions */}
          <aside className="space-y-4">
            {viewMode === 'home' ? (
              <>
                {/* Create Game Button */}
                <motion.button
                  onClick={handleCreateGame}
                  disabled={!playerName.trim()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300',
                    'border-2 border-primary bg-primary/10 text-primary',
                    'hover:bg-primary hover:text-primary-foreground',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'shadow-lg shadow-primary/20'
                  )}
                >
                  <span className="flex items-center justify-center gap-2">
                    Créer une partie
                    <ArrowRight className="w-5 h-5" />
                  </span>
                </motion.button>

                {/* Join Game Button */}
                <motion.button
                  onClick={() => {
                    playInkSound('brushTap', 0.3);
                    setViewMode('join');
                  }}
                  disabled={!playerName.trim()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300',
                    'border-2 border-border text-foreground/80',
                    'hover:border-primary hover:text-primary',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  Rejoindre une partie
                </motion.button>

                {/* Audio Controls */}
                <div className="pt-4 space-y-3 border-t border-border/30">
                  <VolumeControl />
                  <SoundEffectsVolumeControl />
                </div>

                {/* Settings Button */}
                <button
                  onClick={() => {
                    playInkSound('inkClick', 0.3);
                    setShowSettings(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span className="text-sm">Paramètres Audio/Vidéo</span>
                </button>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-muted-foreground">
                    <Hash className="h-3.5 w-3.5" />
                    Code du Lobby
                  </label>
                  <Input
                    placeholder="XXXX"
                    value={lobbyCode}
                    onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
                    onKeyPress={(e) => e.key === 'Enter' && handleJoinGame()}
                    maxLength={4}
                    className="text-center text-4xl tracking-[0.3em] uppercase font-bold h-20 bg-background/50 border-2 border-primary/50 rounded-xl focus:border-primary"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      playInkSound('brushTap', 0.3);
                      setViewMode('home');
                    }}
                    className="flex-1 py-3 px-4 rounded-xl border border-border text-foreground/80 hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Retour
                  </button>
                  <button
                    onClick={handleJoinGame}
                    disabled={!playerName.trim() || lobbyCode.length !== 4}
                    className={cn(
                      'flex-1 py-3 px-4 rounded-xl font-semibold transition-all',
                      'bg-primary text-primary-foreground hover:bg-primary/90',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    Rejoindre
                  </button>
                </div>
              </motion.div>
            )}
          </aside>
        </div>
      </main>

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
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-card rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-primary/30"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-primary" style={{ fontFamily: "'Caveat', cursive" }}>
                  Paramètres
                </h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-2 hover:bg-primary/10 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <DeviceSettings showPreview onClose={() => setShowSettings(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const InkHomeScreen = memo(InkHomeScreenComponent);
