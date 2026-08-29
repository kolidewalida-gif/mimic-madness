import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  Award,
  Check,
  Circle,
  Compass,
  Crown,
  Loader2,
  Lock,
  Shield,
  Sparkles,
  Star,
  Sun,
  Trophy,
  User,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

import { InkDrawer } from '@/components/menu/InkOverlay';
import { useEquippedTitle } from '@/hooks/useEquippedTitle';
import { LEVEL_REWARDS, type LevelReward, usePlayerLevel } from '@/hooks/usePlayerLevel';
import { RARITY_STYLE } from '@/lib/rarity';
import { rewardPerk } from '@/lib/rewardPerks';
import { cn } from '@/lib/utils';

const iconMap: Record<string, ReactNode> = {
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

type TitleSelectorProps =
  | { embedded: true; isOpen?: never; onClose?: never }
  | { embedded?: false; isOpen: boolean; onClose: () => void };

interface TitleCardProps {
  title: LevelReward;
  unlocked: boolean;
  equipped: boolean;
  busy: boolean;
  disabled: boolean;
  index: number;
  onEquip: (title: LevelReward) => void;
}

const TitleCard = ({
  title,
  unlocked,
  equipped,
  busy,
  disabled,
  index,
  onEquip,
}: TitleCardProps) => {
  const style = RARITY_STYLE[title.rarity];
  const perk = rewardPerk(title.id);

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 12) * 0.035 }}
      className={cn('ik-title-card', equipped && 'is-equipped', !unlocked && 'is-locked')}
      style={{
        background: equipped ? `${style.color}0d` : 'rgba(255,255,255,0.02)',
        borderColor: equipped ? `${style.color}55` : 'rgba(255,255,255,0.08)',
      }}
    >
      <div
        className={cn('ik-title-card-icon bg-gradient-to-br', style.gradient)}
        style={{ boxShadow: unlocked ? `0 0 12px ${style.color}22` : undefined }}
      >
        {unlocked ? iconMap[title.icon] : <Lock className="h-4 w-4" aria-hidden="true" />}
      </div>
      <div className="ik-title-card-copy">
        <div>
          <h3>{title.name}</h3>
          <span style={{ color: style.color, background: `${style.color}15` }}>Niv. {title.level}</span>
        </div>
        <p>{title.description}</p>
        {perk && <small style={{ color: unlocked ? `${style.color}cc` : undefined }}><Zap aria-hidden="true" /> {perk}</small>}
      </div>
      <div className="ik-title-card-action">
        {equipped ? (
          <span className="is-equipped"><Check aria-hidden="true" /> Équipé</span>
        ) : unlocked ? (
          <button
            type="button"
            onClick={() => onEquip(title)}
            disabled={disabled}
            aria-busy={busy}
            className="menu-focus"
            style={{ background: `${style.color}15`, color: style.color, borderColor: `${style.color}44` }}
          >
            {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
            Équiper
          </button>
        ) : (
          <span className="is-locked"><Lock aria-hidden="true" /> Niv. {title.level}</span>
        )}
      </div>
    </motion.article>
  );
};

export const TitleSelector = (props: TitleSelectorProps) => {
  const { isRewardUnlocked } = usePlayerLevel();
  const { equippedTitle, equipTitle, unequipTitle, isLoading } = useEquippedTitle();
  const [equippingId, setEquippingId] = useState<string | null>(null);
  const titles = LEVEL_REWARDS.filter((reward) => reward.type === 'title');
  const unlockedTitles = titles.filter((title) => isRewardUnlocked(title.id));
  const lockedTitles = titles.filter((title) => !isRewardUnlocked(title.id));

  const handleEquip = async (reward: LevelReward) => {
    setEquippingId(reward.id);
    try {
      const success = await equipTitle(reward.id);
      if (success) toast.success(`Titre « ${reward.name} » équipé !`);
      else toast.error("Erreur lors de l'équipement");
    } finally {
      setEquippingId(null);
    }
  };

  const handleUnequip = async () => {
    setEquippingId('remove');
    try {
      const success = await unequipTitle();
      if (success) toast.success('Titre retiré');
      else toast.error('Impossible de retirer ce titre');
    } finally {
      setEquippingId(null);
    }
  };

  const equippedStyle = equippedTitle ? RARITY_STYLE[equippedTitle.rarity] : null;
  const toolbar = (
    <section className="ik-title-hero" aria-labelledby="ik-title-equipped-heading">
      <div className="ik-title-hero-copy">
        <span>Signature publique</span>
        <h3 id="ik-title-equipped-heading">Titre équipé</h3>
        <p>Il apparaît sous ton pseudo dans le lobby et sur ton profil.</p>
      </div>
      {equippedTitle && equippedStyle ? (
        <div className="ik-title-equipped" style={{ borderColor: `${equippedStyle.color}44`, background: `${equippedStyle.color}0d` }}>
          <span className={cn('ik-title-equipped-icon bg-gradient-to-br', equippedStyle.gradient)}>{iconMap[equippedTitle.icon]}</span>
          <div><small style={{ color: equippedStyle.color }}>{equippedStyle.label}</small><strong>{equippedTitle.name}</strong></div>
          <button
            type="button"
            onClick={() => void handleUnequip()}
            disabled={Boolean(equippingId) || isLoading}
            aria-busy={equippingId === 'remove'}
            className="menu-focus"
          >
            {equippingId === 'remove' && <Loader2 className="animate-spin" aria-hidden="true" />}
            Retirer
          </button>
        </div>
      ) : (
        <div className="ik-title-equipped is-empty"><Crown aria-hidden="true" /><div><small>Emplacement libre</small><strong>Aucun titre équipé</strong></div></div>
      )}
    </section>
  );

  const content = titles.length === 0 ? (
    <div className="ink-empty"><Crown aria-hidden="true" /><strong>Aucun titre disponible</strong><p>De nouveaux titres apparaîtront avec les prochaines récompenses.</p></div>
  ) : (
    <div className="ik-title-library">
      <section className="ik-title-shelf" aria-labelledby="ik-title-available-heading">
        <header><div><span>Disponibles</span><h3 id="ik-title-available-heading">Ta collection</h3></div><b>{unlockedTitles.length}</b></header>
        {unlockedTitles.length === 0 ? (
          <div className="ink-empty"><Crown aria-hidden="true" /><strong>Premier titre à décrocher</strong><p>Continue de jouer pour ouvrir ta collection.</p></div>
        ) : (
          <div className="ik-title-grid">
            {unlockedTitles.map((title, index) => (
              <TitleCard
                key={title.id}
                title={title}
                unlocked
                equipped={equippedTitle?.id === title.id}
                busy={equippingId === title.id}
                disabled={Boolean(equippingId) || isLoading}
                index={index}
                onEquip={(nextTitle) => void handleEquip(nextTitle)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="ik-title-shelf ik-title-roadmap" aria-labelledby="ik-title-roadmap-heading">
        <header><div><span>Roadmap</span><h3 id="ik-title-roadmap-heading">Prochains paliers</h3></div><b>{lockedTitles.length}</b></header>
        {lockedTitles.length === 0 ? (
          <div className="ink-empty"><Sparkles aria-hidden="true" /><strong>Tout est débloqué</strong><p>Ta collection de titres est complète.</p></div>
        ) : (
          <div className="ik-title-grid">
            {lockedTitles.map((title, index) => (
              <TitleCard
                key={title.id}
                title={title}
                unlocked={false}
                equipped={false}
                busy={false}
                disabled
                index={index}
                onEquip={() => undefined}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );

  if (props.embedded) {
    return <div className="ik-embedded-panel"><div className="ik-embedded-toolbar">{toolbar}</div><div className="ik-embedded-content">{content}</div></div>;
  }

  return (
    <InkDrawer
      isOpen={props.isOpen}
      onClose={props.onClose}
      title="Mes titres"
      subtitle={`${unlockedTitles.length}/${titles.length} débloqués`}
      icon={<Crown className="h-5 w-5" strokeWidth={2.5} />}
      iconGradient="var(--ink-accent)"
      toolbar={toolbar}
    >
      {content}
    </InkDrawer>
  );
};
