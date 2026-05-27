import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  QuestDefinition,
  QuestEvent,
  getActiveDailyQuests,
  getActiveWeeklyQuests,
  dailyPeriodKey,
  weeklyPeriodKey,
  findQuestsForEvent,
} from '@/lib/questDefinitions';

interface QuestProgressRow {
  quest_id: string;
  quest_kind: 'daily' | 'weekly';
  progress: number;
  target: number;
  is_claimed: boolean;
  period_key: string;
}

export interface QuestWithProgress extends QuestDefinition {
  progress: number;
  isComplete: boolean;
  isClaimed: boolean;
  periodKey: string;
}

/**
 * useQuests — surface daily + weekly quests with progress.
 *
 *  - Snapshots the current "active" quests (deterministic per period).
 *  - Joins them with `quest_progress` rows for the current user.
 *  - Exposes `trackEvent(event, increment?)` so gameplay code can advance
 *    every quest that listens to a given event in one call.
 *  - Exposes `claim(questId)` to mark a finished quest as claimed and
 *    deliver the XP reward via the existing `usePlayerLevel.addXp` flow.
 */
export const useQuests = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<QuestProgressRow[]>([]);
  const [loading, setLoading] = useState(true);

  const dailyKey = dailyPeriodKey();
  const weeklyKey = weeklyPeriodKey();

  const fetchProgress = useCallback(async () => {
    if (!user) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('quest_progress')
      .select('quest_id, quest_kind, progress, target, is_claimed, period_key')
      .eq('user_id', user.id)
      .in('period_key', [dailyKey, weeklyKey]);
    setRows((data as QuestProgressRow[]) ?? []);
    setLoading(false);
  }, [user, dailyKey, weeklyKey]);

  useEffect(() => {
    fetchProgress();
    if (!user) return;

    const channel = supabase
      .channel(`quests:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quest_progress',
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchProgress(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchProgress]);

  const dailyQuests = useMemo<QuestWithProgress[]>(() => {
    const defs = getActiveDailyQuests();
    return defs.map((q) => {
      const row = rows.find((r) => r.quest_id === q.id && r.period_key === dailyKey);
      const progress = row?.progress ?? 0;
      return {
        ...q,
        progress,
        isComplete: progress >= q.target,
        isClaimed: row?.is_claimed ?? false,
        periodKey: dailyKey,
      };
    });
  }, [rows, dailyKey]);

  const weeklyQuests = useMemo<QuestWithProgress[]>(() => {
    const defs = getActiveWeeklyQuests();
    return defs.map((q) => {
      const row = rows.find((r) => r.quest_id === q.id && r.period_key === weeklyKey);
      const progress = row?.progress ?? 0;
      return {
        ...q,
        progress,
        isComplete: progress >= q.target,
        isClaimed: row?.is_claimed ?? false,
        periodKey: weeklyKey,
      };
    });
  }, [rows, weeklyKey]);

  /**
   * Increment progress on every active quest listening to the given event.
   * Idempotent at the row level (we always upsert from the current value).
   */
  const trackEvent = useCallback(
    async (event: QuestEvent, increment = 1) => {
      if (!user) return;
      const matches = findQuestsForEvent(event);
      if (matches.length === 0) return;

      for (const q of matches) {
        const period = q.kind === 'daily' ? dailyKey : weeklyKey;
        const existing = rows.find((r) => r.quest_id === q.id && r.period_key === period);
        const currentProgress = existing?.progress ?? 0;
        // Cap progress at target to avoid bloated counters
        const nextProgress = Math.min(q.target, currentProgress + increment);
        if (nextProgress === currentProgress && existing) continue;

        await supabase
          .from('quest_progress')
          .upsert(
            {
              user_id: user.id,
              quest_id: q.id,
              quest_kind: q.kind,
              progress: nextProgress,
              target: q.target,
              is_claimed: existing?.is_claimed ?? false,
              period_key: period,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,quest_id,period_key' },
          );
      }
    },
    [user, rows, dailyKey, weeklyKey],
  );

  /**
   * Claim a finished quest. Returns the XP reward to grant on success,
   * or null if claim failed (already claimed, not complete, etc.).
   * The caller is responsible for routing the XP through addXp.
   */
  const claim = useCallback(
    async (questId: string): Promise<number | null> => {
      if (!user) return null;
      const all = [...dailyQuests, ...weeklyQuests];
      const quest = all.find((q) => q.id === questId);
      if (!quest || !quest.isComplete || quest.isClaimed) return null;

      const { data, error } = await supabase.rpc('claim_quest_reward', {
        p_quest_id: questId,
        p_period_key: quest.periodKey,
      });

      if (error || !data) return null;
      return quest.xpReward;
    },
    [user, dailyQuests, weeklyQuests],
  );

  return {
    dailyQuests,
    weeklyQuests,
    loading,
    trackEvent,
    claim,
  };
};
