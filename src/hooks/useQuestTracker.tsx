import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  QuestEvent,
  findQuestsForEvent,
  dailyPeriodKey,
  weeklyPeriodKey,
} from '@/lib/questDefinitions';

/**
 * useQuestTracker — fire-and-forget tracker for quest events.
 *
 * Decoupled from `useQuests` so any component (chat, voting, gameplay) can
 * trigger progress without dragging the full quest list into its render. The
 * tracker writes directly to `quest_progress` via upsert; the active subscriber
 * (`useQuests`) sees the change in real time.
 */
export const useQuestTracker = () => {
  const { user } = useAuth();
  const inflight = useRef(new Set<string>());

  const track = useCallback(
    async (event: QuestEvent, increment = 1) => {
      if (!user) return;
      const matches = findQuestsForEvent(event);
      if (matches.length === 0) return;

      const dailyKey = dailyPeriodKey();
      const weeklyKey = weeklyPeriodKey();

      for (const q of matches) {
        const period = q.kind === 'daily' ? dailyKey : weeklyKey;
        const key = `${q.id}:${period}`;
        // Avoid double-firing the same event on rapid re-renders
        if (inflight.current.has(key)) continue;
        inflight.current.add(key);

        try {
          // Read current progress to compute next safely (cap at target)
          const { data } = await supabase
            .from('quest_progress')
            .select('progress, is_claimed')
            .eq('user_id', user.id)
            .eq('quest_id', q.id)
            .eq('period_key', period)
            .maybeSingle();

          const current = data?.progress ?? 0;
          if ((data?.is_claimed ?? false) === false && current < q.target) {
            const next = Math.min(q.target, current + increment);
            await supabase.from('quest_progress').upsert(
              {
                user_id: user.id,
                quest_id: q.id,
                quest_kind: q.kind,
                progress: next,
                target: q.target,
                is_claimed: false,
                period_key: period,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id,quest_id,period_key' },
            );
          }
        } catch (err) {
          console.error('[questTracker] failed to track', event, err);
        } finally {
          // Release the lock on the next tick so legitimate consecutive
          // increments are still picked up.
          setTimeout(() => inflight.current.delete(key), 250);
        }
      }
    },
    [user],
  );

  // Clear inflight on user change so locks don't leak across sessions
  useEffect(() => {
    inflight.current.clear();
  }, [user?.id]);

  return { track };
};
