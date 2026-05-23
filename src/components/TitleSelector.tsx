import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, Check, Star, Shield, Award, Sparkles, Zap, Sun, Trophy, Compass, Circle, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayerLevel, LEVEL_REWARDS, LevelReward } from '@/hooks/usePlayerLevel';
import { useEquippedTitle } from '@/hooks/useEquippedTitle';
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

const RARITY_STYLE = {
  common: { gradient: 'from-zinc-500 to-zinc-600', color: '#a1a1aa', label: 'Commun', bg: '#a1a1aa' },
  rare: { gradient: 'from-blue-500 to-cyan-500', color: '#38bdf8', label: 'Rare', bg: '#38bdf8' },
  epic: { gradient: 'from-purple-500 to-pink-500', color: '#c084fc', label: 'Épique', bg: '#c084fc' },
  legendary: { gradient: 'from-amber-400 to-orange-500', color: '#fbbf24', label: 'Légendaire', bg: '#fbbf24' },
};

/** Real perks for each title — visible to other players + gameplay bonuses */
const TITLE_PERKS: Record<string, string> = {
  title_player: 'Visible sur ton profil. +5% XP de base.',
  title_veteran: 'Affiché en jeu. +10% XP. Accès au chat coloré.',
  title_legend: 'Style prestige complet. +15% XP. Priorité de parole en Undercover.',
};

export const TitleSelector = ({ isOpen, onClose }: TitleSelectorProps) => {
  const { isRewardUnlocked } = usePlayerLevel();
  const { equippedTitle, equipTitle, unequipTitle, isLoading } = useEquippedTitle();
  const [isEquipping, setIsEquipping] = useState(false);

  const titles = LEVEL_REWARDS.filter(r => r.type === 'title');
  const unlockedTitles = titles.filter(t => isRewardUnlocked(t.id));

  const handleEquip = async (reward: LevelReward) => {
    setIsEquipping(true);
    const success = await equipTitle(reward.id);
    if (success) toast.success(`Titre "${reward.name}" équipé !`);
    else toast.error("Erreur lors de l'équipement");
    setIsEquipping(false);
  };

  const handleUnequip = async () => {
    setIsEquipping(true);
    const success = await unequipTitle();
    if (success) toast.success('Titre retiré');
    setIsEquipping(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150]"
          />
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 250 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md z-[151] flex flex-col overflow-hidden"
            style={{ background: '#0c0a14' }}
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-4 border-b border-white/8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #c084fc, #7c3aed)', border: '1.5px solid rgba(192,132,252,0.4)' }}>
                    <Crown className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Mes Titres</h2>
                    <p className="text-xs text-white/40">{unlockedTitles.length}/{titles.length} débloqués</p>
                  </div>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors">
                  <X className="h-4 w-4 text-white/60" />
                </button>
              </div>
            </div>

            {/* Equipped title */}
            <div className="px-5 py-4 border-b border-white/5">
              <p className="text-xs text-white/40 mb-2 uppercase tracking-wider font-medium">Titre équipé</p>
              {equippedTitle ? (
                <div className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: `${RARITY_STYLE[equippedTitle.rarity].color}0d`, border: `1px solid ${RARITY_STYLE[equippedTitle.rarity].color}33` }}>
                  <div className="flex items-center gap-3">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white bg-gradient-to-br', RARITY_STYLE[equippedTitle.rarity].gradient)}>
                      {iconMap[equippedTitle.icon]}
                    </div>
                    <span className="font-semibold text-white text-sm">{equippedTitle.name}</span>
                  </div>
                  <button
                    onClick={handleUnequip}
                    disabled={isEquipping || isLoading}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors border border-red-500/20"
                  >
                    Retirer
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-xl text-center text-sm text-white/30" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  Aucun titre équipé
                </div>
              )}
            </div>

            {/* Title list */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
              {unlockedTitles.length === 0 ? (
                <div className="text-center py-16">
                  <Crown className="h-10 w-10 mx-auto text-white/15 mb-3" />
                  <p className="text-sm text-white/40">Monte en niveau pour débloquer des titres</p>
                </div>
              ) : (
                unlockedTitles.map((title, i) => {
                  const style = RARITY_STYLE[title.rarity];
                  const isEquipped = equippedTitle?.id === title.id;
                  const perk = TITLE_PERKS[title.id];

                  return (
                    <motion.div
                      key={title.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="rounded-xl p-3.5"
                      style={{
                        background: isEquipped ? `${style.color}0d` : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${isEquipped ? `${style.color}44` : 'rgba(255,255,255,0.05)'}`,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-white bg-gradient-to-br', style.gradient)}
                            style={{ boxShadow: `0 0 10px ${style.color}22` }}>
                            {iconMap[title.icon]}
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm text-white">{title.name}</h3>
                            <p className="text-xs text-white/40">{title.description}</p>
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md mt-1 inline-block"
                              style={{ background: `${style.color}15`, color: style.color }}>
                              Niveau {title.level}
                            </span>
                          </div>
                        </div>

                        {isEquipped ? (
                          <div className="flex items-center gap-1 text-green-400">
                            <Check className="h-4 w-4" />
                            <span className="text-xs font-medium">Équipé</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEquip(title)}
                            disabled={isEquipping || isLoading}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                            style={{ background: `${style.color}15`, color: style.color, border: `1px solid ${style.color}33` }}
                          >
                            Équiper
                          </button>
                        )}
                      </div>

                      {/* Perk */}
                      {perk && (
                        <div className="mt-2.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md" style={{ background: `${style.color}08` }}>
                          <Zap className="h-3 w-3 flex-shrink-0" style={{ color: style.color }} />
                          <span className="text-[11px] font-medium" style={{ color: `${style.color}bb` }}>{perk}</span>
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
