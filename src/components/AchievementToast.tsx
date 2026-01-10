import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Zap, MessageSquare, Mic, Award, Target, Flame, Crown, Heart, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playSoundEffect } from '@/hooks/useSoundEffects';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: Date;
}

const iconMap: Record<string, React.ReactNode> = {
  trophy: <Trophy className="h-6 w-6" />,
  star: <Star className="h-6 w-6" />,
  zap: <Zap className="h-6 w-6" />,
  message: <MessageSquare className="h-6 w-6" />,
  mic: <Mic className="h-6 w-6" />,
  award: <Award className="h-6 w-6" />,
  target: <Target className="h-6 w-6" />,
  flame: <Flame className="h-6 w-6" />,
  crown: <Crown className="h-6 w-6" />,
  heart: <Heart className="h-6 w-6" />,
  sparkles: <Sparkles className="h-6 w-6" />,
};

const rarityColors = {
  common: 'from-gray-500 to-gray-400',
  rare: 'from-blue-500 to-cyan-400',
  epic: 'from-purple-500 to-pink-500',
  legendary: 'from-yellow-500 to-orange-400',
};

const rarityLabels = {
  common: 'Commun',
  rare: 'Rare',
  epic: 'Épique',
  legendary: 'Légendaire',
};

const rarityGlows = {
  common: 'shadow-gray-500/30',
  rare: 'shadow-blue-500/40',
  epic: 'shadow-purple-500/50',
  legendary: 'shadow-yellow-500/60',
};

interface AchievementToastProps {
  achievement: Achievement | null;
  onClose: () => void;
}

export const AchievementToast = ({ achievement, onClose }: AchievementToastProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (achievement) {
      setIsVisible(true);
      playSoundEffect('achievementEarned', 0.6);
      
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [achievement, onClose]);

  if (!achievement) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[300]"
          onClick={onClose}
        >
          <div className={cn(
            "flex items-center gap-4 px-6 py-4 rounded-2xl",
            "bg-card/90 backdrop-blur-xl border border-border/50",
            "shadow-2xl cursor-pointer",
            rarityGlows[achievement.rarity]
          )}>
            {/* Icon with gradient background */}
            <motion.div
              initial={{ rotate: -180, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className={cn(
                "w-14 h-14 rounded-xl flex items-center justify-center text-white",
                "bg-gradient-to-br",
                rarityColors[achievement.rarity]
              )}
            >
              {iconMap[achievement.icon] || <Trophy className="h-6 w-6" />}
            </motion.div>

            {/* Content */}
            <div className="flex-1">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded-full text-white",
                    "bg-gradient-to-r",
                    rarityColors[achievement.rarity]
                  )}>
                    {rarityLabels[achievement.rarity]}
                  </span>
                  <span className="text-xs text-muted-foreground">Badge débloqué!</span>
                </div>
                <h3 className="font-display font-bold text-lg">{achievement.title}</h3>
                <p className="text-sm text-muted-foreground">{achievement.description}</p>
              </motion.div>
            </div>

            {/* Sparkle effect */}
            <motion.div
              animate={{ 
                rotate: 360,
                scale: [1, 1.2, 1]
              }}
              transition={{ 
                rotate: { duration: 3, repeat: Infinity, ease: "linear" },
                scale: { duration: 1, repeat: Infinity }
              }}
            >
              <Sparkles className="h-5 w-5 text-yellow-400" />
            </motion.div>
          </div>

          {/* Particle burst effect */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className={cn(
              "absolute inset-0 rounded-2xl border-2",
              "border-gradient-to-r",
              rarityColors[achievement.rarity]
            )}
            style={{ 
              borderColor: achievement.rarity === 'legendary' ? '#eab308' : 
                          achievement.rarity === 'epic' ? '#a855f7' :
                          achievement.rarity === 'rare' ? '#3b82f6' : '#6b7280'
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Predefined achievements
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_message',
    title: 'Social Butterfly',
    description: 'Envoyez votre premier message dans le chat',
    icon: 'message',
    rarity: 'common'
  },
  {
    id: 'first_gif',
    title: 'Meme Lord',
    description: 'Envoyez votre premier GIF',
    icon: 'sparkles',
    rarity: 'common'
  },
  {
    id: 'first_recording',
    title: 'Première Prise',
    description: 'Enregistrez votre première phrase audio',
    icon: 'mic',
    rarity: 'common'
  },
  {
    id: 'first_win',
    title: 'Champion',
    description: 'Gagnez votre première partie',
    icon: 'trophy',
    rarity: 'rare'
  },
  {
    id: 'quiz_streak_3',
    title: 'En Feu!',
    description: '3 bonnes réponses consécutives au quiz',
    icon: 'flame',
    rarity: 'rare'
  },
  {
    id: 'quiz_streak_5',
    title: 'Imbattable',
    description: '5 bonnes réponses consécutives au quiz',
    icon: 'zap',
    rarity: 'epic'
  },
  {
    id: 'perfect_round',
    title: 'Perfection',
    description: 'Round parfait sans aucune erreur',
    icon: 'target',
    rarity: 'epic'
  },
  {
    id: 'host_10_games',
    title: 'Maître de Cérémonie',
    description: 'Créez et hébergez 10 parties',
    icon: 'crown',
    rarity: 'epic'
  },
  {
    id: 'play_all_modes',
    title: 'Polyvalent',
    description: 'Jouez à tous les modes de jeu',
    icon: 'star',
    rarity: 'rare'
  },
  {
    id: 'win_streak_3',
    title: 'Série Victorieuse',
    description: 'Gagnez 3 parties consécutives',
    icon: 'flame',
    rarity: 'legendary'
  },
  {
    id: 'community_star',
    title: 'Star de la Communauté',
    description: '100 messages envoyés dans les chats',
    icon: 'heart',
    rarity: 'legendary'
  }
];
