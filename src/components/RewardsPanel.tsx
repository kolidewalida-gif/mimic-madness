import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Lock, Check, Star, Sparkles, Crown, Trophy, Award, Shield, Compass, Zap, Sun, Circle, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayerLevel, LEVEL_REWARDS, LevelReward } from '@/hooks/usePlayerLevel';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface RewardsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
  star: <Star className="h-5 w-5" />,
  sparkles: <Sparkles className="h-5 w-5" />,
  crown: <Crown className="h-5 w-5" />,
  trophy: <Trophy className="h-5 w-5" />,
  award: <Award className="h-5 w-5" />,
  shield: <Shield className="h-5 w-5" />,
  compass: <Compass className="h-5 w-5" />,
  zap: <Zap className="h-5 w-5" />,
  sun: <Sun className="h-5 w-5" />,
  circle: <Circle className="h-5 w-5" />,
  user: <User className="h-5 w-5" />,
};

const rarityColors = {
  common: 'from-gray-400 to-gray-500',
  rare: 'from-blue-400 to-cyan-500',
  epic: 'from-purple-500 to-pink-500',
  legendary: 'from-yellow-400 to-orange-500',
};

const rarityBorders = {
  common: 'border-gray-400/30',
  rare: 'border-blue-400/30',
  epic: 'border-purple-500/30',
  legendary: 'border-yellow-400/30',
};

const rarityGlows = {
  common: '',
  rare: 'shadow-blue-500/20',
  epic: 'shadow-purple-500/30',
  legendary: 'shadow-yellow-500/40',
};

export const RewardsPanel = ({ isOpen, onClose }: RewardsPanelProps) => {
  const { level, isRewardUnlocked, unlockedRewards } = usePlayerLevel();
  const [activeTab, setActiveTab] = useState<'all' | 'unlocked' | 'locked'>('all');

  const rewards = LEVEL_REWARDS;
  const filteredRewards = rewards.filter(r => {
    if (activeTab === 'unlocked') return isRewardUnlocked(r.id);
    if (activeTab === 'locked') return !isRewardUnlocked(r.id);
    return true;
  });

  const unlockedCount = unlockedRewards.length;
  const totalCount = rewards.length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md z-[100] bg-[#0a0810]/95 backdrop-blur-xl border-l-2 border-white/15 shadow-2xl"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border/30">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white">
                    <Gift className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-display font-bold">Récompenses</h2>
                    <p className="text-sm text-muted-foreground">
                      {unlockedCount}/{totalCount} débloquées
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-muted transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Progress */}
              <div className="px-6 py-4 border-b border-border/20">
                <div className="flex items-center justify-between mb-2 text-sm">
                  <span className="text-muted-foreground">Progression</span>
                  <span className="font-semibold">{Math.round((unlockedCount / totalCount) * 100)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-accent"
                    initial={{ width: 0 }}
                    animate={{ width: `${(unlockedCount / totalCount) * 100}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
                <TabsList className="mx-6 mt-4 grid grid-cols-3 bg-muted/50">
                  <TabsTrigger value="all" className="text-xs">
                    Toutes ({totalCount})
                  </TabsTrigger>
                  <TabsTrigger value="unlocked" className="text-xs">
                    Débloquées ({unlockedCount})
                  </TabsTrigger>
                  <TabsTrigger value="locked" className="text-xs">
                    Verrouillées ({totalCount - unlockedCount})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="flex-1 mt-4">
                  <ScrollArea className="h-[calc(100vh-280px)] px-6">
                    <div className="space-y-3 pb-6">
                      {filteredRewards.map((reward, index) => (
                        <RewardCard
                          key={reward.id}
                          reward={reward}
                          isUnlocked={isRewardUnlocked(reward.id)}
                          currentLevel={level}
                          index={index}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const RewardCard = ({ 
  reward, 
  isUnlocked, 
  currentLevel,
  index 
}: { 
  reward: LevelReward; 
  isUnlocked: boolean;
  currentLevel: number;
  index: number;
}) => {
  const canUnlockSoon = !isUnlocked && reward.level <= currentLevel + 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "relative p-4 rounded-xl border transition-all duration-300",
        isUnlocked 
          ? `bg-gradient-to-r ${rarityColors[reward.rarity]}/10 ${rarityBorders[reward.rarity]} shadow-lg ${rarityGlows[reward.rarity]}`
          : "bg-muted/30 border-border/20 opacity-60"
      )}
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center",
          isUnlocked 
            ? `bg-gradient-to-br ${rarityColors[reward.rarity]} text-white`
            : "bg-muted text-muted-foreground"
        )}>
          {isUnlocked ? iconMap[reward.icon] : <Lock className="h-5 w-5" />}
        </div>

        {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
            <h3 className={cn(
              "font-semibold truncate",
              isUnlocked ? "text-foreground" : "text-muted-foreground"
            )}>
              {reward.name}
            </h3>
            {isUnlocked && (
              <Check className="h-4 w-4 text-green-500 shrink-0" />
            )}
            </div>
            <p className="text-sm text-muted-foreground truncate">{reward.description}</p>
            {reward.perk && (
              <p className="text-xs text-primary/80 mt-1">{reward.perk}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              isUnlocked 
                ? `bg-gradient-to-r ${rarityColors[reward.rarity]} text-white`
                : "bg-muted text-muted-foreground"
            )}>
              {reward.rarity === 'legendary' ? 'Légendaire' :
               reward.rarity === 'epic' ? 'Épique' :
               reward.rarity === 'rare' ? 'Rare' : 'Commun'}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Star className="h-3 w-3" />
              Niveau {reward.level}
            </span>
          </div>
        </div>
      </div>

      {/* Unlock progress for almost unlocked rewards */}
      {canUnlockSoon && !isUnlocked && (
        <div className="mt-3 pt-3 border-t border-border/20">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Niveau requis: {reward.level}</span>
            <span>Niveau actuel: {currentLevel}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full bg-gradient-to-r",
                rarityColors[reward.rarity]
              )}
              style={{ width: `${Math.min(100, (currentLevel / reward.level) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Legendary shimmer effect */}
      {isUnlocked && reward.rarity === 'legendary' && (
        <motion.div
          className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/10 to-transparent"
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
        />
      )}
    </motion.div>
  );
};
