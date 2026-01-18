import { motion, AnimatePresence } from 'framer-motion';
import { Star, Sparkles, Gift, Trophy, Crown, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayerLevel, LevelReward } from '@/hooks/usePlayerLevel';
import { Button } from './ui/button';
import { usePremiumSoundEffects } from '@/hooks/usePremiumSoundEffects';
import { useEffect } from 'react';

interface LevelUpNotificationProps {
  level: number;
  onClose: () => void;
}

export const LevelUpNotification = ({ level, onClose }: LevelUpNotificationProps) => {
  const { getRewardsForLevel } = usePlayerLevel();
  const { playSound } = usePremiumSoundEffects();
  const rewards = getRewardsForLevel(level);

  useEffect(() => {
    playSound('levelUp');
  }, [playSound]);

  const getLevelColor = () => {
    if (level >= 25) return 'from-yellow-400 via-amber-500 to-orange-500';
    if (level >= 15) return 'from-purple-500 via-pink-500 to-rose-500';
    if (level >= 8) return 'from-blue-500 via-cyan-500 to-teal-500';
    return 'from-primary via-primary-hover to-accent';
  };

  const getLevelIcon = () => {
    if (level >= 25) return <Crown className="h-12 w-12" />;
    if (level >= 15) return <Trophy className="h-12 w-12" />;
    if (level >= 8) return <Star className="h-12 w-12" />;
    return <Zap className="h-12 w-12" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.5, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: -50 }}
        transition={{ type: 'spring', damping: 15 }}
        className="relative max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Radial glow behind */}
        <motion.div
          className={cn(
            "absolute inset-0 blur-3xl opacity-50 rounded-full",
            `bg-gradient-to-br ${getLevelColor()}`
          )}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        {/* Main card */}
        <div className="relative bg-card/95 backdrop-blur-xl border border-border/50 rounded-3xl overflow-hidden">
          {/* Animated border */}
          <motion.div
            className={cn(
              "absolute inset-0 rounded-3xl",
              `bg-gradient-to-r ${getLevelColor()}`
            )}
            style={{ padding: '2px' }}
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <div className="w-full h-full bg-card rounded-3xl" />
          </motion.div>

          {/* Content */}
          <div className="relative p-8 text-center">
            {/* Floating particles */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [0, -30, 0],
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}

            {/* Level badge */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', damping: 10 }}
              className={cn(
                "w-24 h-24 mx-auto rounded-2xl flex items-center justify-center text-white mb-6",
                `bg-gradient-to-br ${getLevelColor()}`
              )}
            >
              {getLevelIcon()}
            </motion.div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-accent" />
                <span className="text-sm font-semibold text-accent uppercase tracking-wider">
                  Level Up!
                </span>
                <Sparkles className="h-5 w-5 text-accent" />
              </div>
              
              <h2 className={cn(
                "text-5xl font-display font-black bg-clip-text text-transparent",
                `bg-gradient-to-r ${getLevelColor()}`
              )}>
                Niveau {level}
              </h2>
              
              <p className="text-muted-foreground mt-2">
                Félicitations ! Vous avez atteint un nouveau niveau !
              </p>
            </motion.div>

            {/* Rewards */}
            {rewards.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mt-6 space-y-3"
              >
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Gift className="h-4 w-4" />
                  Récompenses débloquées
                </div>
                
                <div className="flex flex-wrap justify-center gap-2">
                  {rewards.map((reward) => (
                    <RewardBadge key={reward.id} reward={reward} />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Close button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-8"
            >
              <Button
                onClick={onClose}
                className={cn(
                  "px-8 py-3 rounded-xl font-bold text-white",
                  `bg-gradient-to-r ${getLevelColor()} hover:opacity-90`
                )}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Continuer
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const RewardBadge = ({ reward }: { reward: LevelReward }) => {
  const rarityColors = {
    common: 'from-gray-400 to-gray-500',
    rare: 'from-blue-400 to-cyan-500',
    epic: 'from-purple-500 to-pink-500',
    legendary: 'from-yellow-400 to-orange-500',
  };

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.05 }}
      className={cn(
        "px-4 py-2 rounded-xl text-white text-sm font-semibold",
        `bg-gradient-to-r ${rarityColors[reward.rarity]}`
      )}
    >
      {reward.name}
    </motion.div>
  );
};

// Wrapper component to use with AnimatePresence
export const LevelUpNotificationWrapper = () => {
  const { pendingLevelUp, dismissLevelUp } = usePlayerLevel();

  return (
    <AnimatePresence>
      {pendingLevelUp && (
        <LevelUpNotification level={pendingLevelUp} onClose={dismissLevelUp} />
      )}
    </AnimatePresence>
  );
};
