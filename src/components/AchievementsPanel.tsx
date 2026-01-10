import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Zap, MessageSquare, Mic, Award, Target, Flame, Crown, Heart, Sparkles, Lock, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Achievement, ACHIEVEMENTS } from './AchievementToast';
import { useAchievements } from '@/hooks/useAchievements';
import { playSoundEffect } from '@/hooks/useSoundEffects';

const iconMap: Record<string, React.ReactNode> = {
  trophy: <Trophy className="h-5 w-5" />,
  star: <Star className="h-5 w-5" />,
  zap: <Zap className="h-5 w-5" />,
  message: <MessageSquare className="h-5 w-5" />,
  mic: <Mic className="h-5 w-5" />,
  award: <Award className="h-5 w-5" />,
  target: <Target className="h-5 w-5" />,
  flame: <Flame className="h-5 w-5" />,
  crown: <Crown className="h-5 w-5" />,
  heart: <Heart className="h-5 w-5" />,
  sparkles: <Sparkles className="h-5 w-5" />,
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

interface AchievementsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AchievementsPanel = ({ isOpen, onClose }: AchievementsPanelProps) => {
  const { getUnlockedAchievements, getLockedAchievements, getProgress, stats } = useAchievements();
  const [activeTab, setActiveTab] = useState<'unlocked' | 'locked'>('unlocked');

  const progress = getProgress();
  const unlockedAchievements = getUnlockedAchievements();
  const lockedAchievements = getLockedAchievements();

  const handleClose = () => {
    playSoundEffect('click', 0.3);
    onClose();
  };

  const handleTabChange = (tab: 'unlocked' | 'locked') => {
    playSoundEffect('tabSwitch', 0.4);
    setActiveTab(tab);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[150]"
            onClick={handleClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card/95 backdrop-blur-xl border-l border-border/50 z-[151] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-border/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center">
                    <Trophy className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-display font-bold">Badges</h2>
                    <p className="text-sm text-muted-foreground">Votre collection</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleClose}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progression</span>
                  <span className="font-semibold">{progress.unlocked}/{progress.total}</span>
                </div>
                <Progress value={progress.percentage} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  {progress.percentage}% des badges débloqués
                </p>
              </div>
            </div>

            {/* Stats summary */}
            <div className="px-6 py-4 grid grid-cols-4 gap-3 border-b border-border/50">
              <div className="text-center">
                <div className="text-lg font-bold text-primary">{stats.winsCount}</div>
                <div className="text-xs text-muted-foreground">Victoires</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-accent">{stats.messagesCount}</div>
                <div className="text-xs text-muted-foreground">Messages</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-400">{stats.recordingsCount}</div>
                <div className="text-xs text-muted-foreground">Enregistrements</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-400">{stats.gamesHosted}</div>
                <div className="text-xs text-muted-foreground">Parties créées</div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border/50">
              <button
                onClick={() => handleTabChange('unlocked')}
                className={cn(
                  "flex-1 py-3 text-sm font-medium transition-colors relative",
                  activeTab === 'unlocked' ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Débloqués ({unlockedAchievements.length})
                {activeTab === 'unlocked' && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  />
                )}
              </button>
              <button
                onClick={() => handleTabChange('locked')}
                className={cn(
                  "flex-1 py-3 text-sm font-medium transition-colors relative",
                  activeTab === 'locked' ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                À débloquer ({lockedAchievements.length})
                {activeTab === 'locked' && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  />
                )}
              </button>
            </div>

            {/* Achievement list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <AnimatePresence mode="wait">
                {activeTab === 'unlocked' ? (
                  unlockedAchievements.length > 0 ? (
                    unlockedAchievements.map((achievement, index) => (
                      <motion.div
                        key={achievement.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-4 p-4 rounded-xl bg-background/50 border border-border/30 hover:border-primary/30 transition-colors"
                      >
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center text-white",
                          "bg-gradient-to-br",
                          rarityColors[achievement.rarity]
                        )}>
                          {iconMap[achievement.icon]}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{achievement.title}</h3>
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full text-white",
                              "bg-gradient-to-r",
                              rarityColors[achievement.rarity]
                            )}>
                              {rarityLabels[achievement.rarity]}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{achievement.description}</p>
                        </div>
                        <Sparkles className="h-5 w-5 text-yellow-400" />
                      </motion.div>
                    ))
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-12"
                    >
                      <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">Aucun badge débloqué pour le moment</p>
                      <p className="text-sm text-muted-foreground/70 mt-1">Jouez pour débloquer vos premiers badges!</p>
                    </motion.div>
                  )
                ) : (
                  lockedAchievements.map((achievement, index) => (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-4 p-4 rounded-xl bg-background/30 border border-border/20 opacity-70"
                    >
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-muted text-muted-foreground">
                        <Lock className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-muted-foreground">{achievement.title}</h3>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {rarityLabels[achievement.rarity]}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground/70">{achievement.description}</p>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
