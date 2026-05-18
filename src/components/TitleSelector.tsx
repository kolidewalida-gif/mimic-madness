import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, Check, Star, Shield, Award, Sparkles, Zap, Sun, Trophy, Compass, Circle, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayerLevel, LEVEL_REWARDS, LevelReward } from '@/hooks/usePlayerLevel';
import { useEquippedTitle } from '@/hooks/useEquippedTitle';
import { ScrollArea } from './ui/scroll-area';
import { PremiumButton } from './premium/PremiumButton';
import { toast } from 'sonner';

interface TitleSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
  star: <Star className="h-4 w-4" />,
  sparkles: <Sparkles className="h-4 w-4" />,
  crown: <Crown className="h-4 w-4" />,
  trophy: <Trophy className="h-4 w-4" />,
  award: <Award className="h-4 w-4" />,
  shield: <Shield className="h-4 w-4" />,
  compass: <Compass className="h-4 w-4" />,
  zap: <Zap className="h-4 w-4" />,
  sun: <Sun className="h-4 w-4" />,
  circle: <Circle className="h-4 w-4" />,
  user: <User className="h-4 w-4" />,
};

const rarityColors = {
  common: 'from-gray-400 to-gray-500',
  rare: 'from-blue-400 to-cyan-500',
  epic: 'from-purple-500 to-pink-500',
  legendary: 'from-yellow-400 to-orange-500',
};

export const TitleSelector = ({ isOpen, onClose }: TitleSelectorProps) => {
  const { isRewardUnlocked } = usePlayerLevel();
  const { equippedTitle, equipTitle, unequipTitle, isLoading } = useEquippedTitle();
  const [isEquipping, setIsEquipping] = useState(false);

  // Filter only titles
  const titles = LEVEL_REWARDS.filter(r => r.type === 'title');
  const unlockedTitles = titles.filter(t => isRewardUnlocked(t.id));

  const handleEquip = async (reward: LevelReward) => {
    setIsEquipping(true);
    const success = await equipTitle(reward.id);
    if (success) {
      toast.success(`Titre "${reward.name}" équipé !`);
    } else {
      toast.error('Erreur lors de l\'équipement du titre');
    }
    setIsEquipping(false);
  };

  const handleUnequip = async () => {
    setIsEquipping(true);
    const success = await unequipTitle();
    if (success) {
      toast.success('Titre retiré');
    }
    setIsEquipping(false);
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
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white">
                    <Crown className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-display font-bold">Mes Titres</h2>
                    <p className="text-sm text-muted-foreground">
                      {unlockedTitles.length}/{titles.length} débloqués
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

              {/* Currently equipped */}
              <div className="px-6 py-4 border-b border-border/20">
                <p className="text-sm text-muted-foreground mb-2">Titre équipé</p>
                {equippedTitle ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center text-white bg-gradient-to-br",
                        rarityColors[equippedTitle.rarity]
                      )}>
                        {iconMap[equippedTitle.icon]}
                      </div>
                      <span className="font-semibold">{equippedTitle.name}</span>
                    </div>
                    <PremiumButton
                      variant="default"
                      size="sm"
                      onClick={handleUnequip}
                      disabled={isEquipping || isLoading}
                    >
                      Retirer
                    </PremiumButton>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/20 text-center text-muted-foreground">
                    Aucun titre équipé
                  </div>
                )}
              </div>

              {/* Title list */}
              <ScrollArea className="flex-1 px-6 py-4">
                <div className="space-y-3 pb-6">
                  {unlockedTitles.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Crown className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>Aucun titre débloqué</p>
                      <p className="text-sm">Montez en niveau pour débloquer des titres !</p>
                    </div>
                  ) : (
                    unlockedTitles.map((title, index) => (
                      <motion.div
                        key={title.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn(
                          "p-4 rounded-xl border transition-all duration-300",
                          equippedTitle?.id === title.id
                            ? "bg-gradient-to-r from-primary/20 to-accent/20 border-primary/30"
                            : "bg-muted/30 border-border/20 hover:border-primary/30"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center text-white bg-gradient-to-br",
                              rarityColors[title.rarity]
                            )}>
                              {iconMap[title.icon]}
                            </div>
                            <div>
                              <h3 className="font-semibold">{title.name}</h3>
                              <p className="text-xs text-muted-foreground">{title.description}</p>
                              {title.perk && (
                                <p className="text-[11px] text-primary/80 mt-1">{title.perk}</p>
                              )}
                              <span className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded-full text-white mt-1 inline-block bg-gradient-to-r",
                                rarityColors[title.rarity]
                              )}>
                                Niveau {title.level}
                              </span>
                            </div>
                          </div>
                          
                          {equippedTitle?.id === title.id ? (
                            <div className="flex items-center gap-1 text-green-500">
                              <Check className="h-4 w-4" />
                              <span className="text-xs">Équipé</span>
                            </div>
                          ) : (
                            <PremiumButton
                              variant="neon"
                              size="sm"
                              onClick={() => handleEquip(title)}
                              disabled={isEquipping || isLoading}
                            >
                              Équiper
                            </PremiumButton>
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
