import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { 
  Star, 
  Award, 
  Trophy, 
  Crown, 
  Shield, 
  Sparkles, 
  Zap,
  Compass,
  User,
  Sun,
  Circle,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import { LevelReward } from '@/hooks/usePlayerLevel';

interface Notification {
  id: string;
  type: 'reward' | 'achievement' | 'levelUp';
  title: string;
  description: string;
  icon: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  level?: number;
}

// Global event emitter for notifications
const notificationListeners: Set<(notification: Notification) => void> = new Set();

export const emitRewardNotification = (reward: LevelReward) => {
  const notification: Notification = {
    id: `${Date.now()}-${Math.random()}`,
    type: 'reward',
    title: reward.name,
    description: reward.description,
    icon: reward.icon,
    rarity: reward.rarity,
    level: reward.level,
  };
  notificationListeners.forEach(listener => listener(notification));
};

export const emitAchievementNotification = (title: string, description: string, rarity: 'common' | 'rare' | 'epic' | 'legendary' = 'common') => {
  const notification: Notification = {
    id: `${Date.now()}-${Math.random()}`,
    type: 'achievement',
    title,
    description,
    icon: 'trophy',
    rarity,
  };
  notificationListeners.forEach(listener => listener(notification));
};

export const emitLevelUpNotification = (newLevel: number) => {
  const notification: Notification = {
    id: `${Date.now()}-${Math.random()}`,
    type: 'levelUp',
    title: `Niveau ${newLevel} !`,
    description: 'Félicitations pour cette progression !',
    icon: 'crown',
    level: newLevel,
  };
  notificationListeners.forEach(listener => listener(notification));
};

const IconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  star: Star,
  compass: Compass,
  user: User,
  zap: Zap,
  sparkles: Sparkles,
  circle: Circle,
  shield: Shield,
  award: Award,
  sun: Sun,
  crown: Crown,
  trophy: Trophy,
};

const rarityColors = {
  common: {
    bg: 'from-gray-600 to-gray-700',
    border: 'border-gray-400/50',
    glow: 'shadow-gray-500/30',
    text: 'text-gray-200',
  },
  rare: {
    bg: 'from-blue-600 to-cyan-600',
    border: 'border-blue-400/50',
    glow: 'shadow-blue-500/50',
    text: 'text-blue-200',
  },
  epic: {
    bg: 'from-purple-600 to-pink-600',
    border: 'border-purple-400/50',
    glow: 'shadow-purple-500/50',
    text: 'text-purple-200',
  },
  legendary: {
    bg: 'from-yellow-500 to-orange-500',
    border: 'border-yellow-400/50',
    glow: 'shadow-yellow-500/50',
    text: 'text-yellow-200',
  },
};

export const RewardNotification = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const handleNotification = useCallback((notification: Notification) => {
    setNotifications(prev => [...prev, notification]);
    
    // Play appropriate sound
    if (notification.type === 'levelUp') {
      playSoundEffect('levelComplete', 0.6);
    } else if (notification.type === 'achievement') {
      playSoundEffect('achievementEarned', 0.5);
    } else {
      playSoundEffect('badgeUnlocked', 0.5);
    }
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  }, []);

  useEffect(() => {
    notificationListeners.add(handleNotification);
    return () => {
      notificationListeners.delete(handleNotification);
    };
  }, [handleNotification]);

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (iconName: string) => {
    const Icon = IconMap[iconName] || Star;
    return Icon;
  };

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {notifications.map((notification, index) => {
          const Icon = getIcon(notification.icon);
          const colors = rarityColors[notification.rarity || 'common'];
          
          return (
            <motion.div
              key={notification.id}
              className="pointer-events-auto"
              initial={{ opacity: 0, x: 300, scale: 0.8 }}
              animate={{ 
                opacity: 1, 
                x: 0, 
                scale: 1,
                transition: {
                  type: 'spring',
                  stiffness: 300,
                  damping: 25,
                }
              }}
              exit={{ 
                opacity: 0, 
                x: 300, 
                scale: 0.8,
                transition: { duration: 0.2 }
              }}
            >
              <div
                className={cn(
                  "relative w-80 rounded-2xl overflow-hidden",
                  "bg-gradient-to-br backdrop-blur-xl",
                  colors.bg,
                  "border-2",
                  colors.border,
                  "shadow-2xl",
                  colors.glow
                )}
              >
                {/* Animated glow background */}
                <motion.div
                  className="absolute inset-0 opacity-30"
                  animate={{
                    background: [
                      'radial-gradient(circle at 0% 0%, white 0%, transparent 50%)',
                      'radial-gradient(circle at 100% 100%, white 0%, transparent 50%)',
                      'radial-gradient(circle at 0% 0%, white 0%, transparent 50%)',
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                
                {/* Sparkle particles */}
                {notification.rarity === 'legendary' && (
                  <>
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-yellow-300 rounded-full"
                        style={{
                          left: `${20 + i * 15}%`,
                          top: `${20 + (i % 3) * 20}%`,
                        }}
                        animate={{
                          opacity: [0, 1, 0],
                          scale: [0, 1.5, 0],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                      />
                    ))}
                  </>
                )}

                {/* Content */}
                <div className="relative p-4">
                  <div className="flex items-start gap-4">
                    {/* Icon container */}
                    <motion.div
                      className={cn(
                        "w-14 h-14 rounded-xl flex items-center justify-center",
                        "bg-white/20 backdrop-blur-sm border border-white/30",
                        "shadow-inner"
                      )}
                      animate={{
                        rotate: notification.type === 'levelUp' ? [0, 10, -10, 0] : 0,
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 0.5,
                        repeat: notification.type === 'levelUp' ? 2 : 0,
                      }}
                    >
                      <Icon className="h-7 w-7 text-white drop-shadow-lg" />
                    </motion.div>

                    {/* Text content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <motion.h3
                          className="text-lg font-black text-white truncate drop-shadow-lg"
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 0.3 }}
                        >
                          {notification.title}
                        </motion.h3>
                        {notification.rarity && (
                          <span className={cn(
                            "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                            "bg-white/20 backdrop-blur-sm",
                            colors.text
                          )}>
                            {notification.rarity === 'common' && 'Commun'}
                            {notification.rarity === 'rare' && 'Rare'}
                            {notification.rarity === 'epic' && 'Épique'}
                            {notification.rarity === 'legendary' && 'Légendaire'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-white/80 mt-1">
                        {notification.description}
                      </p>
                      {notification.type === 'reward' && notification.level && (
                        <p className="text-xs text-white/60 mt-1">
                          Débloqué au niveau {notification.level}
                        </p>
                      )}
                    </div>

                    {/* Close button */}
                    <button
                      onClick={() => dismissNotification(notification.id)}
                      className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                    >
                      <X className="h-4 w-4 text-white/70" />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <motion.div
                  className="h-1 bg-white/30"
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 5, ease: 'linear' }}
                />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};