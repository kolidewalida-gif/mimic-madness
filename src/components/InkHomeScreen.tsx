import { memo } from 'react';
import { motion } from 'framer-motion';
import { LobbyGameMode } from '@/lib/gameModes';
import { InkCursorParticles } from '@/components/InkCursorParticles';
import { InkHomeCarousel } from '@/components/InkHomeCarousel';

interface InkHomeScreenProps {
  onCreateGame: (playerName: string, gameMode?: LobbyGameMode) => void;
  onJoinGame: (playerName: string, lobbyCode: string) => void;
}

const InkHomeScreenComponent = ({ onCreateGame, onJoinGame }: InkHomeScreenProps) => {
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
          initial={{ opacity: 0, y: -30, letterSpacing: '0.4em', filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, letterSpacing: '-0.02em', filter: 'blur(0px)' }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: "'Caveat', cursive",
            color: 'hsl(var(--primary))',
            textShadow: '0 0 30px hsl(var(--primary) / 0.4)',
          }}
        >
          MIMIC MASTER
        </motion.h1>
      </header>

      {/* Carousel Main Content */}
      <main className="flex-1 flex flex-col px-3 pb-3 relative z-10 min-h-0">
        <InkHomeCarousel onCreateGame={onCreateGame} onJoinGame={onJoinGame} />
      </main>
    </div>
  );
};

export const InkHomeScreen = memo(InkHomeScreenComponent);
