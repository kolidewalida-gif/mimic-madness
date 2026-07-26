import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Gift, Lock, Check, Star, Sparkles, Crown, Trophy, Award, Shield, Compass, Zap, Sun, Circle, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayerLevel, LEVEL_REWARDS, LevelReward } from '@/hooks/usePlayerLevel';
import { InkDrawer, InkTabs } from '@/components/menu/InkOverlay';
import { rarityStyle } from '@/lib/rarity';

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

/** What each reward ACTUALLY does in-game */
const REWARD_PERKS: Record<string, string> = {
  badge_beginner: 'Score de prestige +1. Visible dans ta collection.',
  badge_explorer: 'Score de prestige +1. Boost la confiance des autres joueurs.',
  title_player: '+5% XP permanent. Titre visible sur ton profil.',
  badge_enthusiast: 'Score de prestige +3. Badge rare mis en avant.',
  effect_sparkle: 'Étincelles autour de ton avatar en lobby et en jeu.',
  frame_bronze: 'Cadre bronze visible par tous dans les lobbies.',
  title_veteran: '+10% XP permanent. Chat coloré en partie.',
  badge_master: 'Score de prestige +5. Badge épique affiché en priorité.',
  effect_glow: 'Aura lumineuse intense autour de ton avatar.',
  frame_silver: 'Cadre argent remplace le bronze. Plus prestigieux.',
  title_legend: '+15% XP permanent. Priorité de parole. Style prestige.',
  badge_champion: 'Score de prestige +8. Badge légendaire ultime.',
  frame_gold: 'Cadre or animé. Effet visuel maximum sur ton avatar.',
};

type RewardTab = 'all' | 'unlocked' | 'locked';

export const RewardsPanel = ({ isOpen, onClose }: RewardsPanelProps) => {
  const { level, isRewardUnlocked, unlockedRewards } = usePlayerLevel();
  const [activeTab, setActiveTab] = useState<RewardTab>('all');

  const rewards = LEVEL_REWARDS;
  const unlockedCount = unlockedRewards.length;
  const totalCount = rewards.length;
  const pct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const filtered = useMemo(() => rewards.filter((reward) => {
    if (activeTab === 'unlocked') return isRewardUnlocked(reward.id);
    if (activeTab === 'locked') return !isRewardUnlocked(reward.id);
    return true;
  }), [rewards, activeTab, isRewardUnlocked]);

  return (
    <InkDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Récompenses"
      subtitle={`${unlockedCount}/${totalCount} débloquées · niveau ${level}`}
      icon={<Gift className="h-5 w-5" strokeWidth={2.5} />}
      iconGradient="linear-gradient(135deg, #ef4444, #dc2626)"
      toolbar={
        <>
          <div className="flex-shrink-0 px-5 pb-3">
            <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-white/45">
              <span>Progression</span>
              <span className="tabular-nums text-white/70">{pct}%</span>
            </div>
            <div className="ink-progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progression des récompenses">
              <motion.span
                style={{ background: 'linear-gradient(90deg, #ef4444, #f97316, #fbbf24)' }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
          <InkTabs
            value={activeTab}
            onChange={setActiveTab}
            accent="#f87171"
            items={[
              { key: 'all', label: `Tout (${totalCount})` },
              { key: 'unlocked', label: `Débloqué (${unlockedCount})` },
              { key: 'locked', label: `À débloquer (${totalCount - unlockedCount})` },
            ]}
          />
        </>
      }
    >
      {filtered.length === 0 ? (
        <div className="ink-empty">
          <Gift aria-hidden="true" />
          <strong>
            {activeTab === 'unlocked' ? 'Aucune récompense débloquée' : 'Tout est débloqué'}
          </strong>
          <p>
            {activeTab === 'unlocked'
              ? 'Monte de niveau en jouant pour débloquer tes premières récompenses.'
              : 'Tu as récupéré toutes les récompenses disponibles. Beau parcours.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((reward, i) => (
            <RewardCard key={reward.id} reward={reward} isUnlocked={isRewardUnlocked(reward.id)} currentLevel={level} index={i} />
          ))}
        </div>
      )}
    </InkDrawer>
  );
};

const RewardCard = ({ reward, isUnlocked, currentLevel, index }: { reward: LevelReward; isUnlocked: boolean; currentLevel: number; index: number }) => {
  const style = rarityStyle(reward.rarity);
  const perk = REWARD_PERKS[reward.id];
  const progressPct = isUnlocked ? 100 : Math.min(100, Math.round((currentLevel / reward.level) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 12) * 0.03 }}
      className={cn('relative rounded-xl p-3.5 transition-all', isUnlocked ? 'bg-white/[0.03]' : 'bg-white/[0.015]')}
      style={{ border: `1px solid ${isUnlocked ? `${style.color}33` : 'rgba(255,255,255,0.05)'}` }}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn('flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl', isUnlocked ? `bg-gradient-to-br ${style.gradient}` : 'bg-white/5')}
          style={isUnlocked ? { boxShadow: `0 0 12px ${style.color}22` } : undefined}
          aria-hidden="true"
        >
          {isUnlocked ? <span className="text-white">{iconMap[reward.icon]}</span> : <Lock className="h-4 w-4 text-white/30" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className={cn('truncate text-sm font-semibold', isUnlocked ? 'text-white' : 'text-white/50')}>
              {reward.name}
            </h3>
            {isUnlocked && <Check className="h-3.5 w-3.5 flex-shrink-0 text-green-400" aria-label="Débloqué" />}
          </div>
          <p className="mt-0.5 text-xs text-white/40">{reward.description}</p>

          <div className="mt-1.5 flex items-center gap-2">
            <span className="rounded-md px-1.5 py-0.5 text-[10px] font-medium" style={{ background: `${style.color}15`, color: style.color }}>
              {style.label}
            </span>
            <span className="flex items-center gap-0.5 text-[10px] text-white/30">
              <Star className="h-2.5 w-2.5" aria-hidden="true" /> Niv. {reward.level}
            </span>
          </div>

          {perk && (
            <div className="mt-2 flex items-start gap-1.5 rounded-md px-2 py-1.5" style={{ background: isUnlocked ? `${style.color}0a` : 'rgba(255,255,255,0.02)' }}>
              <Zap className="mt-0.5 h-3 w-3 flex-shrink-0" style={{ color: isUnlocked ? style.color : 'rgba(255,255,255,0.2)' }} aria-hidden="true" />
              <span className="text-[11px] font-medium leading-tight" style={{ color: isUnlocked ? `${style.color}bb` : 'rgba(255,255,255,0.25)' }}>
                {perk}
              </span>
            </div>
          )}

          {!isUnlocked && reward.level <= currentLevel + 5 && (
            <div className="mt-2">
              <div className="mb-1 flex items-center justify-between text-[10px] text-white/30">
                <span>Niv. {currentLevel}/{reward.level}</span>
                <span className="tabular-nums">{progressPct}%</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full" style={{ width: `${progressPct}%`, background: `${style.color}66` }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
