import { motion } from 'framer-motion';
import { Sparkles, Star, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayerLevel, LEVEL_XP_REQUIREMENTS } from '@/hooks/usePlayerLevel';

interface LevelProgressBarProps {
  compact?: boolean;
  showXpText?: boolean;
  className?: string;
}

const GRAFFITI_TEXT_SHADOW_SM =
  '1.5px 1.5px 0 #0a0810, -1px -1px 0 #0a0810, 1px -1px 0 #0a0810, -1px 1px 0 #0a0810, 1px 1px 0 #0a0810';

const getLevelGradient = (level: number) => {
  if (level >= 25) return 'linear-gradient(180deg, #fde047, #fbbf24, #f97316)';
  if (level >= 15) return 'linear-gradient(180deg, #f9a8d4, #ec4899, #be185d)';
  if (level >= 8) return 'linear-gradient(180deg, #67e8f9, #06b6d4, #0e7490)';
  return 'linear-gradient(180deg, #c084fc, #a855f7, #6b21a8)';
};

const getLevelBarGradient = (level: number) => {
  if (level >= 25) return 'linear-gradient(90deg, #fde047, #fbbf24, #f97316, #ef4444)';
  if (level >= 15) return 'linear-gradient(90deg, #f9a8d4, #ec4899, #be185d, #9d174d)';
  if (level >= 8) return 'linear-gradient(90deg, #67e8f9, #38bdf8, #0ea5e9, #1e40af)';
  return 'linear-gradient(90deg, #c084fc, #a855f7, #7e22ce, #4c1d95)';
};

export const LevelProgressBar = ({
  compact = false,
  showXpText = true,
  className,
}: LevelProgressBarProps) => {
  const {
    level,
    xpForNextLevel,
    xpForCurrentLevel,
    progressPercent,
    totalXp,
  } = usePlayerLevel();

  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  const xpProgress = totalXp - xpForCurrentLevel;
  const isMaxLevel = level >= LEVEL_XP_REQUIREMENTS.length;

  return (
    <div className={cn('space-y-2', className)}>
      {/* HEADER ROW: Level badge + XP total */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* Cartoon level badge */}
          <motion.div
            initial={{ scale: 0, rotate: -25 }}
            animate={{ scale: 1, rotate: -3 }}
            transition={{ type: 'spring', stiffness: 280, damping: 18 }}
            className={cn(
              'relative flex items-center justify-center font-black text-white',
              compact ? 'w-9 h-9' : 'w-12 h-12',
            )}
            style={{
              background: getLevelGradient(level),
              border: '3px solid #0a0810',
              borderRadius: '0.85rem',
              boxShadow: '0 4px 0 #0a0810, inset 0 2px 0 rgba(255,255,255,0.3)',
              fontFamily: "'Caveat', cursive",
              textShadow: GRAFFITI_TEXT_SHADOW_SM,
            }}
          >
            <span className={compact ? 'text-base' : 'text-2xl leading-none'}>
              {level}
            </span>
            {level >= 10 && (
              <motion.div
                className="absolute -top-2 -right-2"
                animate={{ rotate: 360 }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
              >
                <Star
                  className="h-3.5 w-3.5 text-yellow-300"
                  fill="currentColor"
                  style={{ filter: 'drop-shadow(0 0 4px #fde047)' }}
                />
              </motion.div>
            )}
          </motion.div>

          {!compact && (
            <div>
              <div
                className="text-base font-black text-white flex items-center gap-1 leading-none"
                style={{
                  fontFamily: "'Caveat', cursive",
                  textShadow: GRAFFITI_TEXT_SHADOW_SM,
                }}
              >
                Niveau {level}
                {level >= 20 && (
                  <Sparkles
                    className="h-3.5 w-3.5 text-amber-300"
                    style={{ filter: 'drop-shadow(0 0 3px #fbbf24)' }}
                  />
                )}
              </div>
              <div
                className="text-[10px] text-white/55 font-bold mt-1"
                style={{ fontFamily: "'Caveat', cursive" }}
              >
                {isMaxLevel
                  ? '🔥 Niveau Max !'
                  : `${xpProgress.toLocaleString()} / ${xpNeeded.toLocaleString()} XP`}
              </div>
            </div>
          )}
        </div>

        {showXpText && !compact && (
          <div className="text-right">
            <div
              className="text-[10px] uppercase tracking-wider text-white/55 font-bold"
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              XP Total
            </div>
            <div
              className="text-base font-black flex items-center gap-1 justify-end leading-none mt-0.5"
              style={{
                color: '#f87171',
                fontFamily: "'Caveat', cursive",
                textShadow: GRAFFITI_TEXT_SHADOW_SM,
              }}
            >
              <Zap
                className="h-3.5 w-3.5"
                fill="currentColor"
                style={{ filter: 'drop-shadow(0 0 3px #f87171)' }}
              />
              {totalXp.toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* PROGRESS BAR — graffiti style */}
      <div className="relative">
        <div
          className={cn(
            'rounded-full overflow-hidden relative',
            compact ? 'h-2.5' : 'h-5',
          )}
          style={{
            background: 'rgba(0,0,0,0.5)',
            border: '2.5px solid #0a0810',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)',
          }}
        >
          <motion.div
            className="h-full rounded-full relative overflow-hidden"
            initial={{ width: 0 }}
            animate={{ width: `${isMaxLevel ? 100 : progressPercent}%` }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{ background: getLevelBarGradient(level) }}
          >
            {/* Shine sweep */}
            <motion.div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
              }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: 'easeInOut',
                repeatDelay: 0.6,
              }}
            />
            {/* Sparkles for high levels */}
            {level >= 15 && !compact && (
              <>
                <motion.div
                  className="absolute top-0.5 right-2 w-1 h-1 bg-white rounded-full"
                  animate={{ opacity: [0, 1, 0], y: [-2, 2, -2] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <motion.div
                  className="absolute top-1 right-6 w-0.5 h-0.5 bg-white rounded-full"
                  animate={{ opacity: [0, 1, 0], y: [0, -4, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: 0.3 }}
                />
              </>
            )}
          </motion.div>
        </div>

        {/* +XP badge */}
        {!compact && (
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 4 }}
            transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.2 }}
            className="absolute -right-1 top-1/2 -translate-y-1/2"
          >
            <div
              className="px-2 py-0.5 rounded-full text-[10px] font-black text-white"
              style={{
                background: 'linear-gradient(180deg, #ef4444, #b91c1c)',
                border: '2px solid #0a0810',
                boxShadow: '0 2px 0 #0a0810',
                fontFamily: "'Caveat', cursive",
                textShadow: GRAFFITI_TEXT_SHADOW_SM,
              }}
            >
              +XP
            </div>
          </motion.div>
        )}
      </div>

      {/* Next level preview */}
      {!compact && !isMaxLevel && (
        <div
          className="flex items-center justify-between text-[10px] text-white/55 font-bold pt-1"
          style={{ fontFamily: "'Caveat', cursive" }}
        >
          <span>
            Prochain niveau dans {(xpNeeded - xpProgress).toLocaleString()} XP
          </span>
          <span className="flex items-center gap-1">
            <Star
              className="h-3 w-3 text-amber-300"
              fill="currentColor"
              style={{ filter: 'drop-shadow(0 0 2px #fbbf24)' }}
            />
            Niveau {level + 1}
          </span>
        </div>
      )}
    </div>
  );
};
