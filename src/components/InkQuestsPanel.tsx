import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, ThumbsUp, MessageCircle, Image as ImageIcon, Brain, Mic,
  Zap, UserPlus, Flame, Trophy, Crown, MessageSquare,
  Check, Loader2, Gift, Calendar, Sparkles,
} from 'lucide-react';
import { useQuests, QuestWithProgress } from '@/hooks/useQuests';
import { useLoginStreak } from '@/hooks/useLoginStreak';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { playInkSound } from '@/hooks/useInkSoundEffects';

const SHADOW = "2px 2px 0 var(--ink-line), -1.5px -1.5px 0 var(--ink-line), 1.5px -1.5px 0 var(--ink-line), -1.5px 1.5px 0 var(--ink-line)";
const SHADOW_SM = "1.5px 1.5px 0 var(--ink-line), -1px -1px 0 var(--ink-line), 1px -1px 0 var(--ink-line), -1px 1px 0 var(--ink-line)";
const FONT = "'Outfit', sans-serif";

const ICON_MAP: Record<string, any> = {
  eye: Eye, 'thumbs-up': ThumbsUp, 'message-circle': MessageCircle,
  image: ImageIcon, brain: Brain, mic: Mic, zap: Zap,
  'user-plus': UserPlus, flame: Flame, trophy: Trophy, crown: Crown,
  'message-square': MessageSquare,
};

const QuestRow = memo(({ quest, onClaim, claiming }: {
  quest: QuestWithProgress;
  onClaim: (id: string) => void;
  claiming: boolean;
}) => {
  const Icon = ICON_MAP[quest.icon] ?? Sparkles;
  const pct = Math.min(100, Math.round((quest.progress / quest.target) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, rotate: -1 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      className="relative rounded-2xl p-3 flex items-center gap-3"
      style={{
        background: quest.isClaimed
          ? 'linear-gradient(180deg, rgba(52,211,153,0.15), rgba(52,211,153,0.05))'
          : 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
        border: '1px solid var(--ink-line)',
        boxShadow: 'none',
      }}
    >
      {/* Icon badge */}
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{
          background: `linear-gradient(135deg, ${quest.color}, ${quest.color}cc)`,
          border: '1px solid var(--ink-line)',
          boxShadow: 'none',
        }}
      >
        <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
      </div>

      {/* Title + progress */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <h4
            className="text-lg font-black text-white truncate"
            style={{ fontFamily: FONT, textShadow: SHADOW_SM }}
          >
            {quest.title}
          </h4>
          <span
            className="text-xs font-black flex-shrink-0"
            style={{ fontFamily: FONT, color: quest.color, textShadow: SHADOW_SM }}
          >
            {quest.progress}/{quest.target}
          </span>
        </div>
        <p className="text-xs text-white/55 truncate" style={{ fontFamily: FONT }}>
          {quest.description}
        </p>
        {/* Progress bar */}
        <div
          className="mt-1.5 h-2 rounded-full overflow-hidden"
          style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--ink-line)' }}
        >
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', damping: 22 }}
            style={{ background: `linear-gradient(90deg, ${quest.color}, ${quest.color}88)` }}
          />
        </div>
      </div>

      {/* Reward / claim button */}
      <div className="flex-shrink-0">
        {quest.isClaimed ? (
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(180deg, #34d399, #059669)',
              border: '1px solid var(--ink-line)',
              boxShadow: 'none',
            }}
          >
            <Check className="w-5 h-5 text-white" strokeWidth={3} />
          </div>
        ) : quest.isComplete ? (
          <motion.button
            type="button"
            onClick={() => onClaim(quest.id)}
            disabled={claiming}
            aria-busy={claiming}
            aria-label={`Réclamer ${quest.xpReward} XP pour la quête ${quest.title}`}
            whileHover={{ scale: 1.05, rotate: -2 }}
            whileTap={{ scale: 0.95 }}
            className="menu-focus px-3 py-2 rounded-2xl flex items-center gap-1.5 disabled:opacity-50"
            style={{
              background: 'linear-gradient(180deg, #fbbf24, #d97706)',
              border: '1px solid var(--ink-line)',
              boxShadow: 'none',
            }}
          >
            {claiming ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" aria-hidden="true" />
            ) : (
              <Gift className="w-4 h-4 text-white" strokeWidth={2.5} aria-hidden="true" />
            )}
            <span
              className="text-sm font-black text-white"
              style={{ fontFamily: FONT, textShadow: SHADOW_SM }}
            >
              +{quest.xpReward} XP
            </span>
          </motion.button>
        ) : (
          <div
            className="px-2.5 py-1.5 rounded-xl flex items-center gap-1"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '2px solid rgba(255,255,255,0.12)',
            }}
          >
            <Sparkles className="w-3 h-3" style={{ color: quest.color }} />
            <span
              className="text-xs font-black"
              style={{ fontFamily: FONT, color: quest.color }}
            >
              +{quest.xpReward}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
});
QuestRow.displayName = 'QuestRow';

/* ============================================================
   MAIN PANEL
============================================================ */
const InkQuestsPanelComponent = () => {
  const { dailyQuests, weeklyQuests, claim, loading } = useQuests();
  const { current: streakDays, best: bestStreak } = useLoginStreak();
  const { toast } = useToast();
  const [tab, setTab] = useState<'daily' | 'weekly'>('daily');
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const handleClaim = async (id: string) => {
    setClaimingId(id);
    playInkSound('cartoonDing', 0.5);
    const xp = await claim(id);
    if (xp != null && xp > 0) {
      // XP is granted server-side atomically by claim_quest_reward.
      // We just surface the feedback to the player; usePlayerLevel
      // realtime will pick up the new total_xp from player_stats.
      toast({
        title: '🎁 Quête validée !',
        description: `+${xp} XP`,
      });
    } else {
      toast({
        title: 'Erreur',
        description: 'Impossible de valider la quête',
        variant: 'destructive',
      });
    }
    setClaimingId(null);
  };

  const visible = tab === 'daily' ? dailyQuests : weeklyQuests;

  return (
    <div
      className="relative rounded-3xl overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #1a0d2e, #0f0820)',
        border: '1px solid var(--ink-line)',
        boxShadow: 'none',
      }}
    >
      {/* Header with streak badge */}
      <div
        className="relative px-4 py-3 flex items-center justify-between"
        style={{
          background: 'linear-gradient(180deg, rgba(168,85,247,0.18), rgba(168,85,247,0.05))',
          borderBottom: '1px solid var(--ink-line)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <motion.div
            animate={{ rotate: [-5, 5, -5] }}
            transition={{ duration: 2.4, repeat: Infinity }}
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #a855f7, #7e22ce)',
              border: '1px solid var(--ink-line)',
              boxShadow: 'none',
            }}
          >
            <Calendar className="w-5 h-5 text-white" strokeWidth={2.5} />
          </motion.div>
          <div>
            <h2
              className="text-2xl font-black text-white leading-none"
              style={{ fontFamily: FONT, textShadow: SHADOW }}
            >
              Quêtes
            </h2>
            <p className="text-xs text-white/55 mt-0.5" style={{ fontFamily: FONT }}>
              Complète, réclame, monte en niveau
            </p>
          </div>
        </div>

        {/* Streak badge */}
        <motion.div
          animate={streakDays >= 3 ? { rotate: [-3, 3, -3] } : {}}
          transition={{ duration: 1.2, repeat: Infinity }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
          style={{
            background: streakDays > 0
              ? 'linear-gradient(180deg, #ef4444, #b91c1c)'
              : 'rgba(255,255,255,0.05)',
            border: '1px solid var(--ink-line)',
            boxShadow: 'none',
          }}
        >
          <Flame className="w-4 h-4 text-white" />
          <span
            className="text-base font-black text-white"
            style={{ fontFamily: FONT, textShadow: SHADOW_SM }}
          >
            {streakDays}j
          </span>
          {bestStreak > streakDays && (
            <span className="text-[10px] text-white/70" style={{ fontFamily: FONT }}>
              · best {bestStreak}
            </span>
          )}
        </motion.div>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Type de quêtes" className="px-4 py-2.5 flex gap-2 border-b border-white/10">
        {(['daily', 'weekly'] as const).map((t) => (
          <motion.button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => { playInkSound('cartoonPop', 0.3); setTab(t); }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className={cn(
              'menu-focus menu-action px-4 rounded-2xl text-base font-black',
              tab === t ? 'text-white' : 'text-white/50',
            )}
            style={{
              background: tab === t
                ? 'linear-gradient(180deg, #fbbf24, #d97706)'
                : 'rgba(255,255,255,0.04)',
              border: '1px solid var(--ink-line)',
              boxShadow: tab === t ? '0 0 0 rgba(0,0,0,0)' : 'none',
              fontFamily: FONT,
              textShadow: tab === t ? SHADOW_SM : 'none',
            }}
          >
            {t === 'daily' ? 'Du jour' : 'Hebdo'}
          </motion.button>
        ))}
      </div>

      {/* Quest list */}
      <div className="p-4 space-y-2.5 max-h-[60vh] overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-10" role="status" aria-label="Chargement des quêtes">
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" aria-hidden="true" />
          </div>
        ) : visible.length === 0 ? (
          <div className="ink-empty">
            <Calendar aria-hidden="true" />
            <strong>{tab === 'daily' ? 'Aucune quête du jour' : 'Aucune quête hebdo'}</strong>
            <p>
              {tab === 'daily'
                ? 'De nouvelles quêtes arrivent chaque jour. Reviens demain.'
                : 'De nouvelles quêtes arrivent chaque semaine.'}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {visible.map((q) => (
              <QuestRow
                key={q.id}
                quest={q}
                onClaim={handleClaim}
                claiming={claimingId === q.id}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export const InkQuestsPanel = memo(InkQuestsPanelComponent);
