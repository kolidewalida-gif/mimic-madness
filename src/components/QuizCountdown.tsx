import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Zap, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import {
  InkGameStage,
  InkPhasePill,
  GRAFFITI_TEXT_SHADOW,
  GRAFFITI_TEXT_SHADOW_SM,
} from '@/components/ink/InkPrimitives';

interface QuizCountdownProps {
  roundNumber: number;
  totalRounds: number;
  category: string;
  variant?: 'default' | 'inkBeta';
}

const ACCENT = '#84cc16'; // lime — matches Quiz mode

const CATEGORY_LABELS: Record<string, string> = {
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

const NUMBER_COLORS = ['#34d399', '#fbbf24', '#f87171', 'var(--ink-accent)'];

export const QuizCountdown = ({
  roundNumber,
  totalRounds,
  category,
  variant = 'default',
}: QuizCountdownProps) => {
  const isInkBeta = variant === 'inkBeta';
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count > 0) {
      playInkSound('cartoonBoing', 0.4);
      playSoundEffect('countdown', 0.4);
      const timer = setTimeout(() => setCount(count - 1), 900);
      return () => clearTimeout(timer);
    } else if (count === 0) {
      playInkSound('cartoonZap', 0.5);
      playSoundEffect('countdown', 0.6);
    }
  }, [count]);

  const numberColor = NUMBER_COLORS[count] || ACCENT;

  /*
   * En beta, la scène et la barre de marque viennent du parent : ce composant
   * ne rend plus que le décompte, dans un panneau.
   */
  const body = (
    <div
      className={isInkBeta
        ? 'ik-gpanel is-featured ik-quiz-countdown items-center justify-center gap-4 py-8'
        : 'min-h-screen flex flex-col items-center justify-center p-4 gap-6'}
    >
        {/* Round counter */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          {!isInkBeta && <InkPhasePill icon={Brain} label="Question" accent={ACCENT} />}
          <p
            className="text-6xl md:text-7xl font-black leading-none text-white"
            style={{
              fontFamily: "'Outfit', sans-serif",
              textShadow: GRAFFITI_TEXT_SHADOW,
            }}
          >
            {roundNumber}
            <span className="text-white/30 text-4xl md:text-5xl"> / {totalRounds}</span>
          </p>
        </motion.div>

        {/* Category badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
          animate={{ opacity: 1, scale: 1, rotate: -2 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 14 }}
          className="relative inline-flex items-center gap-2 px-5 py-2 rounded-2xl"
          style={{
            background: 'linear-gradient(180deg, #fbbf24, #d97706)',
            border: '1px solid var(--ink-line)',
            boxShadow: 'none',
          }}
        >
          <span
            className="text-2xl md:text-3xl font-black text-white leading-none"
            style={{
              fontFamily: "'Outfit', sans-serif",
              textShadow: GRAFFITI_TEXT_SHADOW,
            }}
          >
            {CATEGORY_LABELS[category] || category || '🎲 Mélangé'}
          </span>
          <Sparkles
            className="absolute -top-2 -left-2 w-4 h-4 text-amber-200"
            style={{
              transform: 'rotate(-20deg)',
              filter: 'none',
            }}
          />
          <Sparkles
            className="absolute -bottom-1 -right-1 w-3.5 h-3.5 text-amber-200"
            style={{
              transform: 'rotate(20deg)',
              filter: 'none',
            }}
          />
        </motion.div>

        {/* Countdown number — cartoon circle */}
        <div className="relative">
          {/* Pulsing rings */}
          {count > 0 && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  border: `4px solid ${numberColor}88`,
                  width: 240,
                  height: 240,
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
                animate={{ scale: [1, 1.6], opacity: [0.7, 0] }}
                transition={{ duration: 0.85, ease: 'easeOut', repeat: Infinity }}
              />
              <motion.div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  border: `3px solid ${numberColor}60`,
                  width: 240,
                  height: 240,
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
                animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
                transition={{
                  duration: 0.85,
                  ease: 'easeOut',
                  repeat: Infinity,
                  delay: 0.25,
                }}
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
              className="relative w-52 h-52 md:w-60 md:h-60 rounded-full flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${numberColor}, ${numberColor}cc)`,
                border: '1px solid var(--ink-line)',
                boxShadow: `0 0 0 rgba(0,0,0,0), 0 14px 30px ${numberColor}88, inset 0 0 0 rgba(255,255,255,0.25)`,
              }}
            >
              <span
                className={cn(
                  'font-black text-white leading-none',
                  count === 0
                    ? 'text-6xl md:text-7xl'
                    : 'text-8xl md:text-9xl',
                )}
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  textShadow: GRAFFITI_TEXT_SHADOW,
                }}
              >
                {count === 0 ? (
                  <span className="flex items-center gap-2">
                    GO
                    <motion.div
                      animate={{ rotate: [-15, 15, -15] }}
                      transition={{
                        duration: 0.5,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    >
                      <Zap
                        className="w-12 h-12 md:w-16 md:h-16 text-white"
                        fill="white"
                        strokeWidth={2.5}
                      />
                    </motion.div>
                  </span>
                ) : (
                  count
                )}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Caption */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xl md:text-2xl text-white/65 font-bold leading-none"
          style={{
            fontFamily: "'Outfit', sans-serif",
            textShadow: GRAFFITI_TEXT_SHADOW_SM,
          }}
        >
          Prépare-toi à répondre…
        </motion.p>
    </div>
  );

  return isInkBeta ? body : <InkGameStage accent={ACCENT}>{body}</InkGameStage>;
};
