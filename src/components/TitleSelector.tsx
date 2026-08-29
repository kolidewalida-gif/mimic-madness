import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Crown, Check, Star, Shield, Award, Sparkles, Zap, Sun, Trophy, Compass, Circle, User, Loader2, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayerLevel, LEVEL_REWARDS, type LevelReward } from '@/hooks/usePlayerLevel';
import { useEquippedTitle } from '@/hooks/useEquippedTitle';
import { InkDrawer } from '@/components/menu/InkOverlay';
import { RARITY_STYLE } from '@/lib/rarity';
import { rewardPerk } from '@/lib/rewardPerks';
import { toast } from 'sonner';

const iconMap: Record<string, ReactNode> = {
  star: <Star className="h-4 w-4" />, sparkles: <Sparkles className="h-4 w-4" />,
  crown: <Crown className="h-4 w-4" />, trophy: <Trophy className="h-4 w-4" />,
  award: <Award className="h-4 w-4" />, shield: <Shield className="h-4 w-4" />,
  compass: <Compass className="h-4 w-4" />, zap: <Zap className="h-4 w-4" />,
  sun: <Sun className="h-4 w-4" />, circle: <Circle className="h-4 w-4" />,
  user: <User className="h-4 w-4" />,
};

type TitleSelectorProps =
  | { embedded: true; isOpen?: never; onClose?: never }
  | { embedded?: false; isOpen: boolean; onClose: () => void };

export const TitleSelector = (props: TitleSelectorProps) => {
  const { isRewardUnlocked } = usePlayerLevel();
  const { equippedTitle, equipTitle, unequipTitle, isLoading } = useEquippedTitle();
  const [equippingId, setEquippingId] = useState<string | null>(null);
  const titles = LEVEL_REWARDS.filter((reward) => reward.type === 'title');
  const unlockedTitles = titles.filter((title) => isRewardUnlocked(title.id));

  const handleEquip = async (reward: LevelReward) => {
    setEquippingId(reward.id);
    const success = await equipTitle(reward.id);
    if (success) toast.success(`Titre « ${reward.name} » équipé !`);
    else toast.error("Erreur lors de l'équipement");
    setEquippingId(null);
  };

  const handleUnequip = async () => {
    setEquippingId('remove');
    const success = await unequipTitle();
    if (success) toast.success('Titre retiré');
    setEquippingId(null);
  };

  const toolbar = (
    <div className="flex-shrink-0 border-b-2 border-white/10 px-5 pb-4 pt-1">
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/40">Titre équipé</p>
      {equippedTitle ? (
        <div className="flex items-center justify-between gap-3 rounded-xl p-3" style={{ background: `${RARITY_STYLE[equippedTitle.rarity].color}0d`, border: `1px solid ${RARITY_STYLE[equippedTitle.rarity].color}33` }}>
          <div className="flex min-w-0 items-center gap-3"><div className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white', RARITY_STYLE[equippedTitle.rarity].gradient)}>{iconMap[equippedTitle.icon]}</div><span className="truncate text-sm font-semibold text-white">{equippedTitle.name}</span></div>
          <button type="button" onClick={handleUnequip} disabled={Boolean(equippingId) || isLoading} aria-busy={equippingId === 'remove'} className="menu-focus inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50">{equippingId === 'remove' && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}Retirer</button>
        </div>
      ) : <div className="rounded-xl p-3 text-center text-sm text-white/30" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)' }}>Aucun titre équipé</div>}
    </div>
  );

  const content = (
    <div className="ik-title-collection">
      {titles.length === 0 ? (
        <div className="ink-empty"><Crown aria-hidden="true" /><strong>Aucun titre disponible</strong><p>De nouveaux titres apparaîtront avec les prochaines récompenses.</p></div>
      ) : titles.map((title, index) => {
        const style = RARITY_STYLE[title.rarity];
        const unlocked = isRewardUnlocked(title.id);
        const isEquipped = equippedTitle?.id === title.id;
        const isEquippingThisTitle = equippingId === title.id;
        const perk = rewardPerk(title.id);
        return (
          <motion.article
            key={title.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index, 12) * 0.035 }}
            className={cn('ik-title-card', isEquipped && 'is-equipped', !unlocked && 'is-locked')}
            style={{ background: isEquipped ? `${style.color}0d` : 'rgba(255,255,255,0.02)', borderColor: isEquipped ? `${style.color}55` : 'rgba(255,255,255,0.08)' }}
          >
            <div className={cn('ik-title-card-icon bg-gradient-to-br', style.gradient)} style={{ boxShadow: unlocked ? `0 0 12px ${style.color}22` : undefined }}>
              {unlocked ? iconMap[title.icon] : <Lock className="h-4 w-4" aria-hidden="true" />}
            </div>
            <div className="ik-title-card-copy">
              <div><h3>{title.name}</h3><span style={{ color: style.color, background: `${style.color}15` }}>Niveau {title.level}</span></div>
              <p>{title.description}</p>
              {perk && <small style={{ color: unlocked ? `${style.color}cc` : undefined }}><Zap aria-hidden="true" /> {perk}</small>}
            </div>
            <div className="ik-title-card-action">
              {isEquipped ? (
                <span className="is-equipped"><Check aria-hidden="true" /> Équipé</span>
              ) : unlocked ? (
                <button
                  type="button"
                  onClick={() => void handleEquip(title)}
                  disabled={Boolean(equippingId) || isLoading}
                  aria-busy={isEquippingThisTitle}
                  className="menu-focus"
                  style={{ background: `${style.color}15`, color: style.color, borderColor: `${style.color}44` }}
                >
                  {isEquippingThisTitle && <Loader2 className="animate-spin" aria-hidden="true" />}
                  Équiper
                </button>
              ) : (
                <span className="is-locked"><Lock aria-hidden="true" /> Niv. {title.level}</span>
              )}
            </div>
          </motion.article>
        );
      })}
    </div>
  );

  if (props.embedded) return <div className="ik-embedded-panel"><div className="ik-embedded-toolbar">{toolbar}</div><div className="ik-embedded-content">{content}</div></div>;

  return <InkDrawer isOpen={props.isOpen} onClose={props.onClose} title="Mes titres" subtitle={`${unlockedTitles.length}/${titles.length} débloqués`} icon={<Crown className="h-5 w-5" strokeWidth={2.5} />} iconGradient="var(--ink-accent)" toolbar={toolbar}>{content}</InkDrawer>;
};
