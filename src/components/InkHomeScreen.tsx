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
  UserX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { VolumeControl } from '@/components/VolumeControl';
import { SoundEffectsVolumeControl } from '@/components/SoundEffectsVolumeControl';
import { DeviceSettings } from '@/components/DeviceSettings';
import { LobbyGameMode } from '@/lib/gameModes';
import { InkProfileSidebar } from '@/components/InkProfileSidebar';
import { InkFriendsSidebar } from '@/components/InkFriendsSidebar';
import { InkCursorParticles } from '@/components/InkCursorParticles';
import { ScrollArea } from '@/components/ui/scroll-area';
// WorldLeaderboard removed

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
  {
    id: 'undercover',
    name: 'Undercover',
    icon: <UserX className="w-5 h-5" />,
    description: "Trouvez l'infiltré parmi les joueurs",
    rules: [
      'Chaque joueur reçoit un mot secret',
      "L'Undercover a un mot similaire mais différent",
      'Donnez des indices et votez pour éliminer le suspect!',
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
    <div className="h-screen flex flex-col bg-background text-foreground relative overflow-hidden">
      {/* Ink Cursor Particles Effect */}
      <InkCursorParticles />

      {/* Background effects - Red glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-primary/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary/15 rounded-full blur-[80px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      {/* Title Header */}
      <header className="relative z-10 pt-4 pb-2 text-center flex-shrink-0">
        <motion.h1
          className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            fontFamily: "'Caveat', cursive",
            color: 'hsl(var(--primary))',
            textShadow: '0 0 30px hsl(var(--primary) / 0.4)',
          }}
        >
          MIMIC MASTER
        </motion.h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-stretch justify-center px-3 pb-3 relative z-10 min-h-0 overflow-hidden">
        <div className="w-full max-w-[1400px] flex gap-3 h-full">
          
          {/* Left Sidebar - Profile (scrollable) */}
          <aside className="hidden lg:flex w-[260px] flex-shrink-0">
            <ScrollArea className="h-full w-full">
              <div className="pr-2">
                <InkProfileSidebar />
              </div>
            </ScrollArea>
          </aside>
          
          {/* Center Content */}
          <div className="flex-1 flex flex-col lg:flex-row gap-3 min-w-0">
            {/* Game Modes List */}
            <div className="lg:w-[160px] flex-shrink-0">
              <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-primary/20 p-2">
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider px-2 py-1 mb-1" 
                    style={{ fontFamily: "'Caveat', cursive" }}>
                  Mode de Jeu
                </h3>
                <div className="space-y-0.5">
                  {GAME_MODES.map((mode, index) => (
                    <motion.button
                      key={mode.id}
                      onClick={() => handleSelectMode(mode)}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-lg transition-all duration-200',
                        'border-l-2 text-sm',
                        selectedMode === mode.id
                          ? 'border-primary bg-primary/15 text-primary font-semibold'
                          : 'border-transparent text-foreground/70 hover:text-foreground hover:bg-primary/5 hover:border-primary/50'
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {mode.icon}
                        {mode.name}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>

            {/* Center - Username + Mode Description + Leaderboard + Actions */}
            <div className="flex-1 flex flex-col gap-3 min-w-0 min-h-0">
              {/* Username Input */}
              <div className="w-full max-w-md mx-auto flex-shrink-0">
                <Input
                  placeholder="Entrez votre pseudo..."
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="h-11 bg-card/50 border border-primary/30 rounded-xl text-center text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Mode Description Card */}
              <AnimatePresence mode="wait">
                {selectedModeInfo && (
                  <motion.div
                    key={selectedMode}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="relative w-full max-w-md mx-auto flex-shrink-0"
                  >
                    <div className="absolute inset-0 bg-primary/20 rounded-xl blur-sm" />
                    <div className="relative bg-card/80 backdrop-blur-sm border border-primary/40 rounded-xl p-4 shadow-lg shadow-primary/10">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-primary/20 rounded-lg text-primary">
                          {selectedModeInfo.icon}
                        </div>
                        <h3 className="text-lg font-bold text-primary" style={{ fontFamily: "'Caveat', cursive" }}>
                          {selectedModeInfo.name}
                        </h3>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {selectedModeInfo.description}
                      </p>
                      <ul className="mt-2 space-y-1">
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


              {/* Actions */}
              <div className="w-full max-w-md mx-auto space-y-2 flex-shrink-0">
                {viewMode === 'home' ? (
                  <>
                    <motion.button
                      onClick={handleCreateGame}
                      disabled={!playerName.trim()}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={cn(
                        'w-full py-3 px-5 rounded-xl font-bold text-base transition-all duration-200',
                        'border-2 border-primary bg-primary/10 text-primary',
                        'hover:bg-primary hover:text-primary-foreground',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        'shadow-lg shadow-primary/20'
                      )}
                    >
                      <span className="flex items-center justify-center gap-2">
                        Créer une partie
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </motion.button>

                    <motion.button
                      onClick={() => {
                        playInkSound('brushTap', 0.3);
                        setViewMode('join');
                      }}
                      disabled={!playerName.trim()}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={cn(
                        'w-full py-3 px-5 rounded-xl font-semibold text-base transition-all duration-200',
                        'border border-border text-foreground/80',
                        'hover:border-primary hover:text-primary',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                    >
                      Rejoindre une partie
                    </motion.button>

                    {/* Audio Controls */}
                    <div className="pt-3 space-y-2 border-t border-border/30">
                      <VolumeControl />
                      <SoundEffectsVolumeControl />
                    </div>

                    <button
                      onClick={() => {
                        playInkSound('inkClick', 0.3);
                        setShowSettings(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 text-muted-foreground hover:text-primary transition-colors text-sm"
                    >
                      <Settings className="w-4 h-4" />
                      Paramètres
                    </button>
                  </>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-3"
                  >
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-muted-foreground">
                        <Hash className="h-3 w-3" />
                        Code du Lobby
                      </label>
                      <Input
                        placeholder="XXXX"
                        value={lobbyCode}
                        onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
                        onKeyPress={(e) => e.key === 'Enter' && handleJoinGame()}
                        maxLength={4}
                        className="text-center text-2xl tracking-[0.3em] uppercase font-bold h-14 bg-card/50 border-2 border-primary/50 rounded-xl focus:border-primary"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          playInkSound('brushTap', 0.3);
                          setViewMode('home');
                        }}
                        className="flex-1 py-2.5 px-4 rounded-xl border border-border text-foreground/80 hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-1 text-sm"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Retour
                      </button>
                      <button
                        onClick={handleJoinGame}
                        disabled={!playerName.trim() || lobbyCode.length !== 4}
                        className={cn(
                          'flex-1 py-2.5 px-4 rounded-xl font-semibold transition-all text-sm',
                          'bg-primary text-primary-foreground hover:bg-primary/90',
                          'disabled:opacity-50 disabled:cursor-not-allowed'
                        )}
                      >
                        Rejoindre
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar - Friends (scrollable) */}
          <aside className="hidden lg:flex w-[260px] flex-shrink-0">
            <ScrollArea className="h-full w-full">
              <div className="pl-2">
                <InkFriendsSidebar onJoinFriend={(code) => {
                  setLobbyCode(code);
                  if (playerName.trim()) {
                    onJoinGame(playerName.trim(), code);
                  }
                }} />
              </div>
            </ScrollArea>
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
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card rounded-2xl p-5 w-full max-w-md shadow-2xl border border-primary/30"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-primary" style={{ fontFamily: "'Caveat', cursive" }}>
                  Paramètres
                </h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
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
