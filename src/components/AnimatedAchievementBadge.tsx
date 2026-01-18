import { motion } from 'framer-motion';
import { Trophy, Star, Zap, MessageSquare, Mic, Award, Target, Flame, Crown, Heart, Sparkles, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Achievement } from './AchievementToast';

interface AnimatedAchievementBadgeProps {
  achievement: Achievement;
  isUnlocked: boolean;
  size?: 'sm' | 'md' | 'lg';
  showTitle?: boolean;
  onClick?: () => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  trophy: Trophy,
  star: Star,
  zap: Zap,
  message: MessageSquare,
  mic: Mic,
  award: Award,
  target: Target,
  flame: Flame,
  crown: Crown,
  heart: Heart,
  sparkles: Sparkles,
};

const rarityColors = {
  common: {
    bg: 'from-gray-400 to-gray-500',
    glow: 'shadow-gray-500/40',
    border: 'border-gray-400/50',
  },
  rare: {
    bg: 'from-blue-400 to-cyan-500',
    glow: 'shadow-blue-500/50',
    border: 'border-blue-400/50',
  },
  epic: {
    bg: 'from-purple-500 to-pink-500',
    glow: 'shadow-purple-500/60',
    border: 'border-purple-500/50',
  },
  legendary: {
    bg: 'from-yellow-400 via-amber-500 to-orange-500',
    glow: 'shadow-yellow-500/70',
    border: 'border-yellow-400/50',
  },
};

const sizeClasses = {
  sm: {
    container: 'w-12 h-12',
    icon: 'h-5 w-5',
    ring: 'w-14 h-14',
  },
  md: {
    container: 'w-16 h-16',
    icon: 'h-7 w-7',
    ring: 'w-20 h-20',
  },
  lg: {
    container: 'w-24 h-24',
    icon: 'h-10 w-10',
    ring: 'w-28 h-28',
  },
};

export const AnimatedAchievementBadge = ({
  achievement,
  isUnlocked,
  size = 'md',
  showTitle = true,
  onClick,
}: AnimatedAchievementBadgeProps) => {
  const Icon = iconMap[achievement.icon] || Trophy;
  const colors = rarityColors[achievement.rarity];
  const sizes = sizeClasses[size];

  return (
    <motion.div
      className="flex flex-col items-center gap-2 cursor-pointer group"
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Badge Container */}
      <div className="relative">
        {/* Outer animated ring for unlocked badges */}
        {isUnlocked && (
          <motion.div
            className={cn(
              "absolute inset-0 rounded-full",
              sizes.ring,
              "-translate-x-1 -translate-y-1"
            )}
            style={{
              background: `conic-gradient(from 0deg, transparent, ${
                achievement.rarity === 'legendary' ? '#fbbf24' :
                achievement.rarity === 'epic' ? '#a855f7' :
                achievement.rarity === 'rare' ? '#3b82f6' : '#9ca3af'
              }, transparent)`,
            }}
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: achievement.rarity === 'legendary' ? 2 : 4,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        )}

        {/* Badge */}
        <motion.div
          className={cn(
            "relative rounded-full flex items-center justify-center border-2 transition-all duration-300",
            sizes.container,
            isUnlocked ? [
              `bg-gradient-to-br ${colors.bg}`,
              colors.border,
              `shadow-xl ${colors.glow}`,
            ] : [
              "bg-muted/50",
              "border-muted-foreground/20",
              "opacity-50",
            ]
          )}
          animate={isUnlocked && achievement.rarity === 'legendary' ? {
            boxShadow: [
              '0 0 20px rgba(251, 191, 36, 0.4)',
              '0 0 40px rgba(251, 191, 36, 0.6)',
              '0 0 20px rgba(251, 191, 36, 0.4)',
            ],
          } : undefined}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        >
          {/* Icon */}
          {isUnlocked ? (
            <Icon className={cn(sizes.icon, "text-white drop-shadow-lg")} />
          ) : (
            <Lock className={cn(sizes.icon, "text-muted-foreground")} />
          )}

          {/* Sparkle particles for legendary */}
          {isUnlocked && achievement.rarity === 'legendary' && (
            <>
              <motion.div
                className="absolute top-0 right-0 w-2 h-2 bg-yellow-300 rounded-full"
                animate={{
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: 0,
                }}
              />
              <motion.div
                className="absolute bottom-1 left-0 w-1.5 h-1.5 bg-orange-400 rounded-full"
                animate={{
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: 0.5,
                }}
              />
              <motion.div
                className="absolute top-2 left-1 w-1 h-1 bg-white rounded-full"
                animate={{
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: 1,
                }}
              />
            </>
          )}

          {/* Shimmer effect for epic and legendary */}
          {isUnlocked && (achievement.rarity === 'epic' || achievement.rarity === 'legendary') && (
            <motion.div
              className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/30 to-transparent"
              animate={{
                opacity: [0, 0.5, 0],
                rotate: [0, 180],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 1,
              }}
            />
          )}
        </motion.div>

        {/* Rarity indicator dot */}
        {isUnlocked && (
          <div className={cn(
            "absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full border border-background",
            `bg-gradient-to-br ${colors.bg}`
          )} />
        )}
      </div>

      {/* Title */}
      {showTitle && (
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className={cn(
            "text-xs font-semibold truncate max-w-[80px]",
            isUnlocked ? "text-foreground" : "text-muted-foreground"
          )}>
            {achievement.title}
          </p>
          {isUnlocked && size !== 'sm' && (
            <p className={cn(
              "text-[10px] font-medium",
              `bg-gradient-to-r ${colors.bg} bg-clip-text text-transparent`
            )}>
              {achievement.rarity === 'legendary' ? 'Légendaire' :
               achievement.rarity === 'epic' ? 'Épique' :
               achievement.rarity === 'rare' ? 'Rare' : 'Commun'}
            </p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};
