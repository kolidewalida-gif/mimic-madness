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
   * Uses the `bump_quest_progress` server RPC: the server validates inputs,
   * caps progress at target, and refuses already-claimed rows. The client
   * cannot self-complete a quest by sending arbitrary values.
   */
  const trackEvent = useCallback(
    async (event: QuestEvent, increment = 1) => {
      if (!user) return;
      const matches = findQuestsForEvent(event);
      if (matches.length === 0) return;

      for (const q of matches) {
        const period = q.kind === 'daily' ? dailyKey : weeklyKey;
        await supabase.rpc('bump_quest_progress', {
          p_quest_id: q.id,
          p_quest_kind: q.kind,
          p_target: q.target,
          p_period_key: period,
          p_increment: increment,
        });
      }
    },
    [user, dailyKey, weeklyKey],
  );

  /**
   * Claim a finished quest. The server RPC marks the row as claimed AND
   * grants the XP atomically, so the client cannot game it by claiming
   * without the XP grant or vice-versa. Returns the XP actually granted
   * by the server, or null if the claim was rejected.
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
        p_xp_reward: quest.xpReward,
      });

      if (error) return null;
      const granted = typeof data === 'number' ? data : 0;
      return granted > 0 ? granted : null;
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
