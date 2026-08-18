import { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Check, Star, Shield, Award, Sparkles, Zap, Sun, Trophy, Compass, Circle, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayerLevel, LEVEL_REWARDS, LevelReward } from '@/hooks/usePlayerLevel';
import { useEquippedTitle } from '@/hooks/useEquippedTitle';
import { InkDrawer } from '@/components/menu/InkOverlay';
import { RARITY_STYLE as RARITY_TABLE } from '@/lib/rarity';
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

/** Rarity presentation now comes from the shared table (was a 4th copy). */
const RARITY_STYLE = RARITY_TABLE;

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
    <InkDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Mes titres"
      subtitle={`${unlockedTitles.length}/${titles.length} débloqués`}
      icon={<Crown className="h-5 w-5" strokeWidth={2.5} />}
      iconGradient="var(--ink-accent)"
      toolbar={
        <div className="flex-shrink-0 border-b-2 border-white/10 px-5 pb-4">
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
                    type="button"
                    onClick={handleUnequip}
                    disabled={isEquipping || isLoading}
                    aria-busy={isEquipping}
                    className="menu-focus inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                  >
                    {isEquipping && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
                    Retirer
                  </button>
                </div>
              ) : (
                <div className="rounded-xl p-3 text-center text-sm text-white/30" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  Aucun titre équipé
                </div>
              )}
        </div>
      }
    >
            <div className="space-y-2.5">
              {unlockedTitles.length === 0 ? (
                <div className="ink-empty">
                  <Crown aria-hidden="true" />
                  <strong>Aucun titre débloqué</strong>
                  <p>Monte en niveau en jouant pour débloquer tes premiers titres.</p>
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
                            type="button"
                            onClick={() => handleEquip(title)}
                            disabled={isEquipping || isLoading}
                            aria-busy={isEquipping}
                            className="menu-focus inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                            style={{ background: `${style.color}15`, color: style.color, border: `1px solid ${style.color}33` }}
                          >
                            {isEquipping && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
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
    </InkDrawer>
  );
};
