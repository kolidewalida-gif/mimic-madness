import { motion } from 'framer-motion';
import { Sparkles, Star, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayerLevel, LEVEL_XP_REQUIREMENTS } from '@/hooks/usePlayerLevel';

interface LevelProgressBarProps {
  compact?: boolean;
  showXpText?: boolean;
  className?: string;
}

export const LevelProgressBar = ({ 
  compact = false, 
  showXpText = true,
  className 
}: LevelProgressBarProps) => {
  const { level, currentXp, xpForNextLevel, xpForCurrentLevel, progressPercent, totalXp } = usePlayerLevel();
  
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  const xpProgress = totalXp - xpForCurrentLevel;
  const isMaxLevel = level >= LEVEL_XP_REQUIREMENTS.length;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Level Badge and XP Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Animated Level Badge */}
          <motion.div
            className={cn(
              "relative flex items-center justify-center font-bold text-white rounded-xl",
              compact ? "w-8 h-8 text-sm" : "w-12 h-12 text-lg",
              level >= 25 ? "bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500" :
              level >= 15 ? "bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500" :
              level >= 8 ? "bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500" :
              "bg-gradient-to-br from-primary via-primary-hover to-accent"
            )}
            animate={{
              boxShadow: [
                '0 0 10px rgba(var(--primary), 0.3)',
                '0 0 20px rgba(var(--primary), 0.5)',
                '0 0 10px rgba(var(--primary), 0.3)',
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {level}
            {level >= 10 && (
              <motion.div
                className="absolute -top-1 -right-1"
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <Star className="h-3 w-3 text-yellow-300 fill-yellow-300" />
              </motion.div>
            )}
          </motion.div>

          {!compact && (
            <div>
              <div className="font-semibold text-sm flex items-center gap-1">
                Niveau {level}
                {level >= 20 && <Sparkles className="h-3 w-3 text-accent" />}
              </div>
              <div className="text-xs text-muted-foreground">
                {isMaxLevel ? 'Niveau Max!' : `${xpProgress.toLocaleString()} / ${xpNeeded.toLocaleString()} XP`}
              </div>
            </div>
          )}
        </div>

        {showXpText && !compact && (
          <div className="text-right">
            <div className="text-xs text-muted-foreground">XP Total</div>
            <div className="font-bold text-primary flex items-center gap-1">
              <Zap className="h-3 w-3" />
              {totalXp.toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="relative">
        {/* Background */}
        <div className={cn(
          "rounded-full bg-background/50 border border-border/30 overflow-hidden",
          compact ? "h-2" : "h-4"
        )}>
          {/* Animated Progress Fill */}
          <motion.div
            className={cn(
              "h-full rounded-full relative overflow-hidden",
              level >= 25 ? "bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500" :
              level >= 15 ? "bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500" :
              level >= 8 ? "bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500" :
              "bg-gradient-to-r from-primary via-primary-hover to-accent"
            )}
            initial={{ width: 0 }}
            animate={{ width: `${isMaxLevel ? 100 : progressPercent}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            {/* Shimmer Effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
            />
            
            {/* Glow particles on high levels */}
            {level >= 15 && !compact && (
              <>
                <motion.div
                  className="absolute top-0 right-2 w-1 h-1 bg-white rounded-full"
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

        {/* XP gain indicator (animated flash) */}
        {!compact && (
          <motion.div
            className="absolute -right-1 top-1/2 -translate-y-1/2"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-bold text-white",
              "bg-gradient-to-r from-accent to-primary shadow-lg"
            )}>
              +XP
            </div>
          </motion.div>
        )}
      </div>

      {/* Next Level Preview */}
      {!compact && !isMaxLevel && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Prochain niveau dans {(xpNeeded - xpProgress).toLocaleString()} XP</span>
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3" />
            Niveau {level + 1}
          </span>
        </div>
      )}
    </div>
  );
};
