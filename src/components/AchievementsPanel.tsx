import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Zap, MessageSquare, Mic, Award, Target, Flame, Crown, Heart, Sparkles, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Achievement } from './AchievementToast';
import { useAchievements } from '@/hooks/useAchievements';
import { InkDrawer, InkTabs } from '@/components/menu/InkOverlay';
import { rarityStyle } from '@/lib/rarity';

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
    <InkDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Badges"
      subtitle={`${progress.unlocked}/${progress.total} débloqués`}
      icon={<Trophy className="h-5 w-5" strokeWidth={2.5} />}
      iconGradient="linear-gradient(135deg, #fbbf24, #f97316)"
      toolbar={
        <>
          <div className="flex-shrink-0 px-5 pb-3">
            <div className="ink-progress" role="progressbar" aria-valuenow={progress.percentage} aria-valuemin={0} aria-valuemax={100} aria-label="Progression des badges">
              <motion.span
                style={{ background: 'linear-gradient(90deg, #fbbf24, #f97316)' }}
                initial={{ width: 0 }}
                animate={{ width: `${progress.percentage}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2">
              {[
                { label: 'Victoires', value: stats.winsCount, color: '#fbbf24' },
                { label: 'Messages', value: stats.messagesCount, color: '#38bdf8' },
                { label: 'Records', value: stats.recordingsCount, color: '#34d399' },
                { label: 'Hébergées', value: stats.gamesHosted, color: '#c084fc' },
              ].map((item) => (
                <div key={item.label} className="rounded-lg py-2 text-center" style={{ background: `${item.color}12` }}>
                  <div className="text-base font-bold tabular-nums" style={{ color: item.color }}>{item.value}</div>
                  <div className="text-[10px] text-white/45">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
          <InkTabs
            value={tab}
            onChange={(v) => setTab(v as typeof tab)}
            accent="#fbbf24"
            items={[
              { key: 'unlocked', label: `Débloqué (${unlocked.length})` },
              { key: 'locked', label: `À débloquer (${locked.length})` },
            ]}
          />
        </>
      }
    >
      {list.length === 0 ? (
        <div className="ink-empty">
          <Trophy aria-hidden="true" />
          <strong>{tab === 'unlocked' ? 'Aucun badge débloqué' : 'Tous les badges sont débloqués'}</strong>
          <p>
            {tab === 'unlocked'
              ? 'Joue une partie, envoie un message ou enregistre une imitation pour décrocher ton premier badge.'
              : 'Collection complète. Il ne reste plus rien à décrocher.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {list.map((achievement, i) => (
            <BadgeCard key={achievement.id} achievement={achievement} isUnlocked={tab === 'unlocked'} index={i} />
          ))}
        </div>
      )}
    </InkDrawer>
  );
};

const BadgeCard = ({ achievement, isUnlocked, index }: { achievement: Achievement; isUnlocked: boolean; index: number }) => {
  const style = rarityStyle(achievement.rarity);
  const perk = BADGE_PERKS[achievement.id];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 12) * 0.04 }}
      className={cn('relative rounded-xl p-3.5 transition-all', isUnlocked ? 'bg-white/[0.03]' : 'bg-white/[0.015] opacity-60')}
      style={{ border: `1px solid ${isUnlocked ? `${style.color}33` : 'rgba(255,255,255,0.05)'}` }}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl',
            isUnlocked ? `bg-gradient-to-br ${style.gradient}` : 'bg-white/5',
          )}
          style={isUnlocked ? { boxShadow: `0 0 12px ${style.color}33` } : undefined}
          aria-hidden="true"
        >
          {isUnlocked ? <span className="text-white">{iconMap[achievement.icon]}</span> : <Lock className="h-4 w-4 text-white/30" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className={cn('truncate text-sm font-semibold', isUnlocked ? 'text-white' : 'text-white/50')}>
              {achievement.title}
            </h3>
            <span
              className="flex-shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium"
              style={{
                background: isUnlocked ? `${style.color}18` : 'rgba(255,255,255,0.05)',
                color: isUnlocked ? style.color : 'rgba(255,255,255,0.3)',
              }}
            >
              {style.label}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-white/40">{achievement.description}</p>

          {perk && (
            <div className="mt-2 flex items-start gap-1.5 rounded-md px-2 py-1.5" style={{ background: isUnlocked ? `${style.color}0a` : 'rgba(255,255,255,0.02)' }}>
              <Zap className="mt-0.5 h-3 w-3 flex-shrink-0" style={{ color: isUnlocked ? style.color : 'rgba(255,255,255,0.2)' }} aria-hidden="true" />
              <span className="text-[11px] font-medium leading-tight" style={{ color: isUnlocked ? `${style.color}bb` : 'rgba(255,255,255,0.25)' }}>
                {perk}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
