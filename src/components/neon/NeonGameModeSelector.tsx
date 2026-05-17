import { motion } from 'framer-motion';
import { Phone, Copy, Swords, Brain, Zap, Landmark, UserX } from 'lucide-react';
import { LobbyGameMode } from '@/lib/gameModes';
import { cn } from '@/lib/utils';
import { NeonHUDFrame, NeonLabel } from './NeonHUDFrame';
import { playSoundEffect } from '@/hooks/useSoundEffects';

interface ModeMeta {
  id: LobbyGameMode;
  name: string;
  tag: string;
  description: string;
  icon: React.ReactNode;
  accent: string; // tailwind class
  minPlayers: number;
  duration: string;
}

export const NEON_MODES: ModeMeta[] = [
  {
    id: 'audiophone',
    name: 'Audio Phone',
    tag: 'TÉLÉPHONE INVERSÉ',
    description: 'Une phrase audio passe entre les joueurs et se déforme à chaque maillon.',
    icon: <Phone className="h-5 w-5" />,
    accent: 'from-emerald-400 to-cyan-400',
    minPlayers: 2,
    duration: '~10 min',
  },
  {
    id: 'quiz',
    name: 'Quiz',
    tag: 'QCM RAPIDE',
    description: 'Questions chrono, premier répondu, premier scoreur.',
    icon: <Brain className="h-5 w-5" />,
    accent: 'from-cyan-400 to-blue-500',
    minPlayers: 2,
    duration: '~8 min',
  },
  {
    id: 'pixoguess',
    name: 'BlurRush',
    tag: 'IMAGE FLOUTÉE',
    description: "L'image se dévoile : sois le premier à deviner.",
    icon: <Zap className="h-5 w-5" />,
    accent: 'from-fuchsia-500 to-rose-500',
    minPlayers: 2,
    duration: '~6 min',
  },
  {
    id: 'undercover',
    name: 'Undercover',
    tag: 'IMPOSTEUR',
    description: "Démasque l'infiltré avant qu'il ne te démasque.",
    icon: <UserX className="h-5 w-5" />,
    accent: 'from-violet-500 to-fuchsia-600',
    minPlayers: 3,
    duration: '~12 min',
  },
  {
    id: 'monopoly',
    name: 'Monopoly 3D',
    tag: 'PLATEAU 3D',
    description: 'Plateau Monopoly en 3D temps réel multijoueur.',
    icon: <Landmark className="h-5 w-5" />,
    accent: 'from-amber-400 to-orange-500',
    minPlayers: 2,
    duration: '~25 min',
  },
  {
    id: 'normal',
    name: 'Imitation',
    tag: 'VIDÉO DÉFI',
    description: 'Reproduisez les défis vidéo des autres joueurs.',
    icon: <Copy className="h-5 w-5" />,
    accent: 'from-cyan-400 to-teal-400',
    minPlayers: 2,
    duration: '~15 min',
  },
  {
    id: '2v2',
    name: '2v2',
    tag: 'ÉQUIPES',
    description: 'Affrontement par équipes de 2 joueurs.',
    icon: <Swords className="h-5 w-5" />,
    accent: 'from-rose-500 to-pink-600',
    minPlayers: 4,
    duration: '~15 min',
  },
];

export const getNeonModeMeta = (id: LobbyGameMode) =>
  NEON_MODES.find((m) => m.id === id) ?? NEON_MODES[0];

interface NeonGameModeSelectorProps {
  gameMode: LobbyGameMode;
  onGameModeChange: (mode: LobbyGameMode) => void;
  playerCount: number;
  isAdmin?: boolean;
}

export const NeonGameModeSelector = ({
  gameMode,
  onGameModeChange,
  playerCount,
  isAdmin = false,
}: NeonGameModeSelectorProps) => {
  const selected = getNeonModeMeta(gameMode);

  return (
    <NeonHUDFrame title="Mode de jeu" badge="HOST" innerClassName="p-4 space-y-4">
      {/* Featured tile */}
      <motion.div
        key={selected.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-sm border border-primary/40 bg-background/60 p-4"
      >
        <div
          className={cn(
            'absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br opacity-30 blur-2xl',
            selected.accent
          )}
        />
        <div className="relative flex items-start gap-3">
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-sm bg-gradient-to-br text-white shadow-lg',
              selected.accent
            )}
          >
            {selected.icon}
          </div>
          <div className="min-w-0 flex-1">
            <NeonLabel>{selected.tag}</NeonLabel>
            <h4
              className="mt-0.5 truncate text-lg font-black uppercase tracking-wider text-foreground"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              {selected.name}
            </h4>
            <p className="mt-1 text-xs leading-relaxed text-foreground-secondary">
              {selected.description}
            </p>
            <div className="mt-2 flex gap-3 text-[10px] uppercase tracking-widest text-foreground-muted">
              <span>{selected.minPlayers}+ joueurs</span>
              <span>•</span>
              <span>{selected.duration}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Grid of options */}
      <div className="grid grid-cols-2 gap-2">
        {NEON_MODES.map((mode) => {
          const isSelected = gameMode === mode.id;
          const isDisabled = !isAdmin && playerCount < mode.minPlayers;
          return (
            <button
              key={mode.id}
              onClick={() => {
                if (isDisabled) return;
                playSoundEffect('click', 0.3);
                onGameModeChange(mode.id);
              }}
              disabled={isDisabled}
              className={cn(
                'group relative flex items-center gap-2 rounded-sm border px-2 py-2 text-left transition-all',
                '[clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)]',
                isSelected
                  ? 'border-primary bg-primary/15 shadow-[0_0_18px_hsl(var(--primary)/0.4)]'
                  : 'border-primary/20 bg-card/40 hover:border-primary/60 hover:bg-primary/5',
                isDisabled && 'opacity-40 cursor-not-allowed hover:border-primary/20 hover:bg-card/40'
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-sm bg-gradient-to-br text-white',
                  mode.accent
                )}
              >
                {mode.icon}
              </span>
              <div className="min-w-0">
                <div className="truncate text-xs font-bold uppercase tracking-wider text-foreground">
                  {mode.name}
                </div>
                {isDisabled && (
                  <div className="text-[9px] text-foreground-muted">min {mode.minPlayers}</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </NeonHUDFrame>
  );
};