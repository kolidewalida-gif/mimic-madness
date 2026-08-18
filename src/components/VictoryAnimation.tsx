import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { juice } from '@/lib/juice';
import { playInkSound } from '@/hooks/useInkSoundEffects';
import {
  DoodleBorder,
  DoodleConfetti,
  DoodleSpotlight,
  DoodleWobble,
} from '@/components/doodle/Doodle';

interface VictoryAnimationProps {
  winnerName: string;
  isTeam?: boolean;
  teamPlayers?: string[];
}

/**
 * Cartoon doodle victory celebration.
 * - Big sun-rays spotlight rotating
 * - Big bouncing trophy with crown
 * - DoodleConfetti party particles
 * - Animated VICTOIRE title with stamp aesthetic
 */
export const VictoryAnimation = ({ winnerName, isTeam, teamPlayers }: VictoryAnimationProps) => {
  const [stage, setStage] = useState<'flash' | 'trophy' | 'name'>('flash');
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    // Big audio + visual celebration
    juice.flash('primary', 380);
    juice.shake(280, 0.9);
    playInkSound('cartoonFanfare', 0.6);
    setShowConfetti(true);

    const t1 = setTimeout(() => {
      setStage('trophy');
      playInkSound('cartoonDing', 0.5);
    }, 220);
    const t2 = setTimeout(() => {
      setStage('name');
      playInkSound('cartoonPop', 0.4);
    }, 900);

    // Confetti waves
    const w1 = setTimeout(() => setShowConfetti(true), 0);
    const stopConfetti = setTimeout(() => setShowConfetti(false), 4500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(w1);
      clearTimeout(stopConfetti);
    };
  }, []);

  const displayName = isTeam && teamPlayers ? teamPlayers.join(' & ') : winnerName;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden pointer-events-none">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 bg-[rgba(8,5,24,0.86)]"
      />

      {/* Confetti */}
      <DoodleConfetti show={showConfetti} count={48} />

      {/* Sun spotlight + trophy */}
      <div className="relative flex flex-col items-center gap-6 px-6 z-10">
        {/* Trophy with sun rays */}
        <AnimatePresence>
          {stage !== 'flash' && (
            <motion.div
              initial={{ scale: 0.3, rotate: -25, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 14 }}
              className="relative"
            >
              <DoodleSpotlight color="#fbbf24">
                {/* Trophy in oval */}
                <div className="relative w-44 h-44 md:w-56 md:h-56 flex items-center justify-center">
                  {/* Wobbly oval doodle */}
                  <svg
                    className="absolute inset-0 w-full h-full"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M50,8 Q70,7 82,18 Q94,32 92,52 Q90,72 76,86 Q60,96 42,92 Q24,90 12,76 Q4,60 8,40 Q14,20 30,12 Q40,8 50,8 Z"
                      fill="#fbbf24"
                      fillOpacity="0.18"
                      stroke="#fbbf24"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>

                  {/* Crown above */}
                  <motion.div
                    initial={{ y: -10, opacity: 0, rotate: -20 }}
                    animate={{ y: 0, opacity: 1, rotate: -8 }}
                    transition={{ delay: 0.3, type: 'spring', stiffness: 180, damping: 12 }}
                    className="absolute -top-10 left-1/2 -translate-x-1/2"
                  >
                    <DoodleWobble intensity={0.7}>
                      <Crown
                        className="w-12 h-12 text-amber-400"
                        fill="currentColor"
                        style={{ filter: 'drop-shadow(0 0 12px rgba(251,191,36,0.6))' }}
                      />
                    </DoodleWobble>
                  </motion.div>

                  {/* Trophy */}
                  <DoodleWobble>
                    <Trophy
                      className="relative w-24 h-24 md:w-28 md:h-28 text-amber-400"
                      strokeWidth={1.5}
                      style={{ filter: 'drop-shadow(0 0 20px rgba(251,191,36,0.7))' }}
                    />
                  </DoodleWobble>
                </div>
              </DoodleSpotlight>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Title VICTOIRE */}
        <AnimatePresence>
          {stage === 'name' && (
            <motion.h1
              initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
              animate={{ opacity: 1, scale: 1, rotate: -2 }}
              transition={{ type: 'spring', stiffness: 200, damping: 14 }}
              className="text-7xl md:text-8xl font-black leading-none"
              style={{
                fontFamily: "'Outfit', sans-serif",
                color: '#fbbf24',
                textShadow:
                  '0 0 20px rgba(251,191,36,0.5), 4px 4px 0 rgba(0,0,0,0.4)',
              }}
            >
              VICTOIRE !
            </motion.h1>
          )}
        </AnimatePresence>

        {/* Winner name card */}
        <AnimatePresence>
          {stage === 'name' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.6, y: 20, rotate: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotate: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 220, damping: 16 }}
              className={cn('relative px-7 py-3 max-w-[90vw]')}
            >
              <DoodleBorder color="#fbbf24" filled rotation={-2} thick />
              <div className="relative text-center">
                <p
                  className="text-2xl md:text-4xl font-black truncate"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    color: '#fbbf24',
                  }}
                >
                  {displayName}
                </p>
                <p
                  className="text-[10px] md:text-xs uppercase tracking-[0.25em] font-bold text-white/60 mt-1"
                >
                  remporte la manche
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
