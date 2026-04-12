import { LobbyGameMode } from '@/lib/gameModes';
import { Phone, Copy, Swords, Brain, Zap, Landmark, UserX } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { playInkSound } from '@/hooks/useInkSoundEffects';

interface InkGameModeSelectorProps {
  gameMode: LobbyGameMode;
  onGameModeChange: (mode: LobbyGameMode) => void;
  playerCount: number;
}

interface GameModeInfo {
  id: LobbyGameMode;
  name: string;
  icon: React.ReactNode;
  description: string;
  minPlayers: number;
}

const GAME_MODES: GameModeInfo[] = [
  {
    id: 'audiophone',
    name: 'Audiophone',
    icon: <Phone className="w-5 h-5" />,
    description: 'Téléphone arabe audio inversé',
    minPlayers: 2,
  },
  {
    id: 'normal',
    name: 'Imitation',
    icon: <Copy className="w-5 h-5" />,
    description: 'Imitez les défis vidéo',
    minPlayers: 2,
  },
  {
    id: '2v2',
    name: '2v2',
    icon: <Swords className="w-5 h-5" />,
    description: 'Équipes de 2',
    minPlayers: 4,
  },
  {
    id: 'quiz',
    name: 'Quiz',
    icon: <Brain className="w-5 h-5" />,
    description: 'Testez vos connaissances',
    minPlayers: 2,
  },
  {
    id: 'pixoguess',
    name: 'BlurRush',
    icon: <Zap className="w-5 h-5" />,
    description: "Devinez l'image",
    minPlayers: 2,
  },
  {
    id: 'monopoly',
    name: 'Monopoly',
    icon: <Landmark className="w-5 h-5" />,
    description: 'Plateau 3D multijoueur',
    minPlayers: 2,
  },
  {
    id: 'undercover',
    name: 'Undercover',
    icon: <UserX className="w-5 h-5" />,
    description: 'Démasque l\'imposteur',
    minPlayers: 3,
  },
];

export const InkGameModeSelector = ({
  gameMode,
  onGameModeChange,
  playerCount,
}: InkGameModeSelectorProps) => {
  const handleSelect = (mode: LobbyGameMode) => {
    playInkSound('brushTap', 0.4);
    onGameModeChange(mode);
  };

  const selectedModeInfo = GAME_MODES.find((m) => m.id === gameMode);

  return (
    <div className="p-4 space-y-4">
      <h3 
        className="text-lg font-bold text-primary"
        style={{ fontFamily: "'Caveat', cursive" }}
      >
        Mode de Jeu
      </h3>

      {/* Mode List */}
      <div className="space-y-1">
        {GAME_MODES.map((mode) => {
          const isSelected = gameMode === mode.id;
          const isDisabled = playerCount < mode.minPlayers;

          return (
            <motion.button
              key={mode.id}
              onClick={() => !isDisabled && handleSelect(mode.id)}
              whileHover={!isDisabled ? { x: 4 } : undefined}
              whileTap={!isDisabled ? { scale: 0.98 } : undefined}
              disabled={isDisabled}
              className={cn(
                'w-full text-left px-4 py-3 rounded-lg transition-all duration-300',
                'border-l-4 flex items-center gap-3',
                isSelected
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-transparent hover:bg-primary/5 text-foreground/70 hover:text-foreground hover:border-primary/40',
                isDisabled && 'opacity-40 cursor-not-allowed'
              )}
            >
              <span className={cn(
                'p-2 rounded-lg',
                isSelected ? 'bg-primary/20' : 'bg-muted'
              )}>
                {mode.icon}
              </span>
              <div className="flex-1">
                <span className={cn('font-semibold', isSelected && 'text-primary')}>
                  {mode.name}
                </span>
                {isDisabled && (
                  <span className="text-xs text-muted-foreground ml-2">
                    (min {mode.minPlayers})
                  </span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Selected Mode Description Card */}
      {selectedModeInfo && (
        <motion.div
          key={gameMode}
          initial={{ opacity: 0, y: 10, rotate: -1 }}
          animate={{ opacity: 1, y: 0, rotate: -0.5 }}
          className="relative mt-4"
        >
          <div className="absolute inset-0 bg-primary/20 rounded-xl blur-sm" />
          <div className="relative bg-background/90 border-2 border-primary/40 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg text-primary">
                {selectedModeInfo.icon}
              </div>
              <div>
                <h4 className="font-bold text-primary">{selectedModeInfo.name}</h4>
                <p className="text-xs text-muted-foreground">{selectedModeInfo.description}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
