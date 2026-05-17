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
    <div
      className="h-screen w-screen flex flex-col relative overflow-hidden"
      style={{ background: '#050505' }}
    >
      {/* Ink Cursor Particles Effect */}
      <InkCursorParticles />

      {/* Volumetric red fog layers */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/4 left-1/3 w-[600px] h-[600px] rounded-full animate-pulse"
          style={{
            background: 'radial-gradient(circle, rgba(255,43,43,0.12) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,43,43,0.08) 0%, transparent 70%)',
            filter: 'blur(100px)',
            animation: 'pulse 4s ease-in-out infinite alternate',
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(ellipse, rgba(255,43,43,0.06) 0%, transparent 60%)',
            filter: 'blur(120px)',
          }}
        />
        <div
          className="absolute top-0 left-0 w-[400px] h-[400px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,43,43,0.05) 0%, transparent 70%)',
            filter: 'blur(90px)',
            animation: 'pulse 6s ease-in-out infinite',
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-[350px] h-[350px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,43,43,0.07) 0%, transparent 70%)',
            filter: 'blur(70px)',
            animation: 'pulse 5s ease-in-out 1s infinite alternate',
          }}
        />
      </div>

      {/* Title Header */}
      <header className="relative z-10 pt-5 pb-2 text-center flex-shrink-0">
        <motion.h1
          className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight"
          initial={{ opacity: 0, y: -30, letterSpacing: '0.4em', filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, letterSpacing: '-0.02em', filter: 'blur(0px)' }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: "'Caveat', cursive",
            color: '#ff2b2b',
            textShadow:
              '0 0 10px rgba(255,43,43,0.8), 0 0 30px rgba(255,43,43,0.5), 0 0 60px rgba(255,43,43,0.3), 0 0 100px rgba(255,43,43,0.15)',
          }}
        >
          MIMIC MASTER
        </motion.h1>
      </header>

      {/* Carousel Main Content with perspective */}
      <main
        className="flex-1 flex flex-col px-3 pb-3 relative z-10 min-h-0"
        style={{ perspective: '1200px' }}
      >
        <InkHomeCarousel onCreateGame={onCreateGame} onJoinGame={onJoinGame} />
      </main>
    </div>
  );
};

export const InkHomeScreen = memo(InkHomeScreenComponent);
