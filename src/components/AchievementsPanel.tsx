import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Zap, MessageSquare, Mic, Award, Target, Flame, Crown, Heart, Sparkles, Lock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Achievement, ACHIEVEMENTS } from './AchievementToast';
import { useAchievements } from '@/hooks/useAchievements';

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

const RARITY_STYLE = {
  common: { gradient: 'from-zinc-500 to-zinc-600', color: '#a1a1aa', label: 'Commun' },
  rare: { gradient: 'from-blue-500 to-cyan-500', color: '#38bdf8', label: 'Rare' },
  epic: { gradient: 'from-purple-500 to-pink-500', color: '#c084fc', label: 'Épique' },
  legendary: { gradient: 'from-amber-400 to-orange-500', color: '#fbbf24', label: 'Légendaire' },
};

/** Perk descriptions — what each badge ACTUALLY gives you in-game */
const BADGE_PERKS: Record<string, string> = {
  first_message: '+5% XP sur les messages pendant 24h',
  first_gif: 'Débloque les réactions animées en partie',
  first_recording: '+10% XP sur les enregistrements',
  first_win: 'Cadre "Vainqueur" temporaire (7 jours)',
  quiz_streak_3: '+15% XP en mode Quiz',
  quiz_streak_5: 'Bonus de temps +3s en Quiz',
  perfect_round: 'Effet "Perfection" sur ton avatar (permanent)',
  host_10_games: 'Accès aux paramètres avancés de lobby',
  play_all_modes: '+10% XP global permanent',
  win_streak_3: 'Aura dorée sur ton avatar (permanent)',
  community_star: 'Badge visible par tous les joueurs en lobby',
};

interface AchievementsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AchievementsPanel = ({ isOpen, onClose }: AchievementsPanelProps) => {
  const { getUnlockedAchievements, getLockedAchievements, getProgress, stats } = useAchievements();
  const [tab, setTab] = useState<'unlocked' | 'locked'>('unlocked');

  const progress = getProgress();
  const unlocked = getUnlockedAchievements();
  const locked = getLockedAchievements();
  const list = tab === 'unlocked' ? unlocked : locked;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150]"
            onClick={onClose}
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
                    style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)', border: '1.5px solid rgba(251,191,36,0.4)' }}>
                    <Trophy className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Badges</h2>
                    <p className="text-xs text-white/40">{progress.unlocked}/{progress.total} débloqués</p>
                  </div>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors">
                  <X className="h-4 w-4 text-white/60" />
                </button>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #fbbf24, #f97316)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress.percentage}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-4 gap-2 mt-4">
                {[
                  { label: 'Victoires', value: stats.winsCount, color: '#fbbf24' },
                  { label: 'Messages', value: stats.messagesCount, color: '#38bdf8' },
                  { label: 'Records', value: stats.recordingsCount, color: '#34d399' },
                  { label: 'Hébergées', value: stats.gamesHosted, color: '#c084fc' },
                ].map((s) => (
                  <div key={s.label} className="text-center py-2 rounded-lg" style={{ background: `${s.color}08` }}>
                    <div className="text-base font-bold" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-[10px] text-white/40">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/5">
              {(['unlocked', 'locked'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    'flex-1 py-3 text-sm font-medium transition-colors relative',
                    tab === t ? 'text-white' : 'text-white/40 hover:text-white/60',
                  )}
                >
                  {t === 'unlocked' ? `Débloqués (${unlocked.length})` : `À débloquer (${locked.length})`}
                  {tab === t && (
                    <motion.div layoutId="badge-tab" className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-amber-400" />
                  )}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
              {list.length === 0 ? (
                <div className="text-center py-16">
                  <Trophy className="h-10 w-10 mx-auto text-white/15 mb-3" />
                  <p className="text-sm text-white/40">
                    {tab === 'unlocked' ? 'Aucun badge débloqué' : 'Tous les badges sont débloqués !'}
                  </p>
                </div>
              ) : (
                list.map((achievement, i) => (
                  <BadgeCard key={achievement.id} achievement={achievement} isUnlocked={tab === 'unlocked'} index={i} />
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const BadgeCard = ({ achievement, isUnlocked, index }: { achievement: Achievement; isUnlocked: boolean; index: number }) => {
  const style = RARITY_STYLE[achievement.rarity];
  const perk = BADGE_PERKS[achievement.id];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={cn(
        'relative rounded-xl p-3.5 transition-all',
        isUnlocked ? 'bg-white/[0.03]' : 'bg-white/[0.015] opacity-60',
      )}
      style={{ border: `1px solid ${isUnlocked ? `${style.color}33` : 'rgba(255,255,255,0.05)'}` }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
            isUnlocked ? `bg-gradient-to-br ${style.gradient}` : 'bg-white/5',
          )}
          style={isUnlocked ? { boxShadow: `0 0 12px ${style.color}33` } : undefined}
        >
          {isUnlocked ? (
            <span className="text-white">{iconMap[achievement.icon]}</span>
          ) : (
            <Lock className="h-4 w-4 text-white/30" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={cn('font-semibold text-sm truncate', isUnlocked ? 'text-white' : 'text-white/50')}>
              {achievement.title}
            </h3>
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-md flex-shrink-0"
              style={{
                background: isUnlocked ? `${style.color}18` : 'rgba(255,255,255,0.05)',
                color: isUnlocked ? style.color : 'rgba(255,255,255,0.3)',
              }}
            >
              {style.label}
            </span>
          </div>
          <p className="text-xs text-white/40 mt-0.5">{achievement.description}</p>

          {/* Perk — what it actually does */}
          {perk && isUnlocked && (
            <div className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ background: `${style.color}0d` }}>
              <Zap className="h-3 w-3 flex-shrink-0" style={{ color: style.color }} />
              <span className="text-[11px] font-medium" style={{ color: `${style.color}cc` }}>{perk}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
