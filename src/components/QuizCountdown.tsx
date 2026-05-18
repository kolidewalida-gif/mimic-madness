import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Zap, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import { DoodleBorder, DoodleOval, DoodleStage, DoodleWobble } from '@/components/doodle/Doodle';

interface QuizCountdownProps {
  roundNumber: number;
  totalRounds: number;
  category: string;
}

const ACCENT = '#38bdf8';

const categoryLabels: Record<string, string> = {
  culture: '🎭 Culture Générale',
  histoire: '📜 Histoire',
  youtube_fr: '📺 YouTube France',
  musique: '🎵 Musique',
  sport: '⚽ Sport',
  cinema: '🎬 Cinéma & Séries',
  science: '🔬 Science',
  geographie: '🌍 Géographie',
  general: '🧠 Culture Générale',
  anime: '🎌 Anime & Manga',
  jeux_video: '🎮 Jeux Vidéo',
  art: '🎨 Art',
  mixed: '🎲 Mélangé',
};

export const QuizCountdown = ({ roundNumber, totalRounds, category }: QuizCountdownProps) => {
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count > 0) {
      // Cartoon boing per number
      playInkSound('cartoonBoing', 0.4);
      playSoundEffect('countdown', 0.4);
      const timer = setTimeout(() => setCount(count - 1), 900);
      return () => clearTimeout(timer);
    } else if (count === 0) {
      playInkSound('cartoonZap', 0.5);
      playSoundEffect('countdown', 0.6);
    }
  }, [count]);

  const numberColors = ['#34d399', '#fbbf24', '#f87171', '#c084fc'];

  return (
    <DoodleStage accent={ACCENT}>
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 gap-8">
        {/* Round counter */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-3 relative">
            <DoodleBorder color={ACCENT} filled />
            <Brain className="relative w-3.5 h-3.5" style={{ color: ACCENT }} />
            <span
              className="relative text-xs uppercase tracking-[0.25em] font-bold"
              style={{ color: ACCENT, fontFamily: "'Caveat', cursive" }}
            >
              Question
            </span>
          </div>
          <p
            className="text-5xl md:text-6xl font-black leading-none text-white"
            style={{
              fontFamily: "'Caveat', cursive",
              textShadow: `0 0 18px ${ACCENT}33`,
            }}
          >
            {roundNumber}
            <span className="text-white/30 text-3xl md:text-4xl"> / {totalRounds}</span>
          </p>
        </motion.div>

        {/* Category badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
          animate={{ opacity: 1, scale: 1, rotate: -2 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 14 }}
          className="relative inline-block"
        >
          <div className="px-5 py-2 relative">
            <DoodleBorder color="#fbbf24" filled rotation={2} thick />
            <span
              className="relative text-xl md:text-2xl font-black"
              style={{ fontFamily: "'Caveat', cursive", color: '#fbbf24' }}
            >
              {categoryLabels[category] || category || '🎲 Mélangé'}
            </span>
          </div>
          {/* Sparkle accents */}
          <Sparkles
            className="absolute -top-2 -left-2 w-4 h-4 text-amber-300"
            style={{ transform: 'rotate(-20deg)' }}
          />
          <Sparkles
            className="absolute -bottom-1 -right-1 w-3 h-3 text-amber-200"
            style={{ transform: 'rotate(20deg)' }}
          />
        </motion.div>

        {/* Countdown number — big oval */}
        <div className="relative">
          {/* Pulsing rings */}
          {count > 0 && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  border: `3px solid ${numberColors[count] || ACCENT}80`,
                  width: 220,
                  height: 220,
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
                animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
                transition={{ duration: 0.85, ease: 'easeOut', repeat: Infinity }}
              />
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  border: `2px solid ${numberColors[count] || ACCENT}50`,
                  width: 220,
                  height: 220,
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
                animate={{ scale: [1, 1.4], opacity: [0.4, 0] }}
                transition={{ duration: 0.85, ease: 'easeOut', repeat: Infinity, delay: 0.25 }}
              />
            </>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={count}
              initial={{ scale: 0.3, rotate: -25, opacity: 0 }}
              animate={{ scale: 1, rotate: count % 2 === 0 ? -3 : 3, opacity: 1 }}
              exit={{ scale: 1.6, rotate: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 240, damping: 14 }}
              className="relative w-44 h-44 md:w-52 md:h-52 flex items-center justify-center"
            >
              <DoodleOval color={numberColors[count] || ACCENT} filled />
              <span
                className={cn(
                  'relative font-black drop-shadow-lg',
                  count === 0 ? 'text-5xl md:text-6xl' : 'text-7xl md:text-8xl',
                )}
                style={{
                  fontFamily: "'Caveat', cursive",
                  color: numberColors[count] || ACCENT,
                  textShadow: `0 0 22px ${(numberColors[count] || ACCENT)}66, 0 4px 12px rgba(0,0,0,0.6)`,
                }}
              >
                {count === 0 ? (
                  <span className="flex items-center gap-2">
                    GO
                    <DoodleWobble>
                      <Zap className="w-9 h-9 md:w-12 md:h-12" />
                    </DoodleWobble>
                  </span>
                ) : (
                  count
                )}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Caption */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-2"
        >
          <span
            className="text-base md:text-lg text-white/55"
            style={{ fontFamily: "'Caveat', cursive" }}
          >
            Prépare-toi à répondre…
          </span>
        </motion.div>
      </div>
    </DoodleStage>
  );
};
