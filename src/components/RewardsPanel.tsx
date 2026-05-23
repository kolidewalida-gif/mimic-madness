import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Lock, Check, Star, Sparkles, Crown, Trophy, Award, Shield, Compass, Zap, Sun, Circle, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayerLevel, LEVEL_REWARDS, LevelReward } from '@/hooks/usePlayerLevel';
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

const RARITY_STYLE = {
  common: { gradient: 'from-zinc-500 to-zinc-600', color: '#a1a1aa', label: 'Commun' },
  rare: { gradient: 'from-blue-500 to-cyan-500', color: '#38bdf8', label: 'Rare' },
  epic: { gradient: 'from-purple-500 to-pink-500', color: '#c084fc', label: 'Épique' },
  legendary: { gradient: 'from-amber-400 to-orange-500', color: '#fbbf24', label: 'Légendaire' },
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

export const RewardsPanel = ({ isOpen, onClose }: RewardsPanelProps) => {
  const { level, isRewardUnlocked, unlockedRewards } = usePlayerLevel();
  const [activeTab, setActiveTab] = useState<'all' | 'unlocked' | 'locked'>('all');

  const rewards = LEVEL_REWARDS;
  const filtered = rewards.filter(r => {
    if (activeTab === 'unlocked') return isRewardUnlocked(r.id);
    if (activeTab === 'locked') return !isRewardUnlocked(r.id);
    return true;
  });

  const unlockedCount = unlockedRewards.length;
  const totalCount = rewards.length;
  const pct = Math.round((unlockedCount / totalCount) * 100);

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
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', border: '1.5px solid rgba(239,68,68,0.4)' }}>
                    <Gift className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Récompenses</h2>
                    <p className="text-xs text-white/40">{unlockedCount}/{totalCount} débloquées</p>
                  </div>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors">
                  <X className="h-4 w-4 text-white/60" />
                </button>
              </div>

              {/* Progress */}
              <div className="flex items-center justify-between text-xs text-white/40 mb-1.5">
                <span>Progression</span>
                <span className="font-semibold text-white/70">{pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #ef4444, #f97316, #fbbf24)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/5">
              {([
                { key: 'all', label: `Toutes (${totalCount})` },
                { key: 'unlocked', label: `Débloquées (${unlockedCount})` },
                { key: 'locked', label: `Verrouillées (${totalCount - unlockedCount})` },
              ] as const).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={cn(
                    'flex-1 py-3 text-xs font-medium transition-colors relative',
                    activeTab === t.key ? 'text-white' : 'text-white/40 hover:text-white/60',
                  )}
                >
                  {t.label}
                  {activeTab === t.key && (
                    <motion.div layoutId="reward-tab" className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-red-400" />
                  )}
                </button>
              ))}
            </div>

            {/* Reward list */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
              {filtered.map((reward, i) => (
                <RewardCard key={reward.id} reward={reward} isUnlocked={isRewardUnlocked(reward.id)} currentLevel={level} index={i} />
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const RewardCard = ({ reward, isUnlocked, currentLevel, index }: { reward: LevelReward; isUnlocked: boolean; currentLevel: number; index: number }) => {
  const style = RARITY_STYLE[reward.rarity];
  const perk = REWARD_PERKS[reward.id];
  const progressPct = isUnlocked ? 100 : Math.min(100, Math.round((currentLevel / reward.level) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={cn('relative rounded-xl p-3.5 transition-all', isUnlocked ? 'bg-white/[0.03]' : 'bg-white/[0.015]')}
      style={{ border: `1px solid ${isUnlocked ? `${style.color}33` : 'rgba(255,255,255,0.05)'}` }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', isUnlocked ? `bg-gradient-to-br ${style.gradient}` : 'bg-white/5')}
          style={isUnlocked ? { boxShadow: `0 0 12px ${style.color}22` } : undefined}
        >
          {isUnlocked ? <span className="text-white">{iconMap[reward.icon]}</span> : <Lock className="h-4 w-4 text-white/30" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={cn('font-semibold text-sm truncate', isUnlocked ? 'text-white' : 'text-white/50')}>
              {reward.name}
            </h3>
            {isUnlocked && <Check className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />}
          </div>
          <p className="text-xs text-white/40 mt-0.5">{reward.description}</p>

          {/* Tags */}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
              style={{ background: `${style.color}15`, color: style.color }}>
              {style.label}
            </span>
            <span className="text-[10px] text-white/30 flex items-center gap-0.5">
              <Star className="h-2.5 w-2.5" /> Niv. {reward.level}
            </span>
          </div>

          {/* Perk */}
          {perk && (
            <div className="mt-2 flex items-start gap-1.5 px-2 py-1.5 rounded-md" style={{ background: isUnlocked ? `${style.color}0a` : 'rgba(255,255,255,0.02)' }}>
              <Zap className="h-3 w-3 flex-shrink-0 mt-0.5" style={{ color: isUnlocked ? style.color : 'rgba(255,255,255,0.2)' }} />
              <span className="text-[11px] font-medium leading-tight" style={{ color: isUnlocked ? `${style.color}bb` : 'rgba(255,255,255,0.25)' }}>
                {perk}
              </span>
            </div>
          )}

          {/* Progress for locked */}
          {!isUnlocked && reward.level <= currentLevel + 5 && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-[10px] text-white/30 mb-1">
                <span>Niv. {currentLevel}/{reward.level}</span>
                <span>{progressPct}%</span>
              </div>
              <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${progressPct}%`, background: `${style.color}66` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legendary shimmer */}
      {isUnlocked && reward.rarity === 'legendary' && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.06), transparent)' }}
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
        />
      )}
    </motion.div>
  );
};
