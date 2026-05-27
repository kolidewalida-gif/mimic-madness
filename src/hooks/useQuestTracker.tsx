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
          // Server-side RPC: validates kind, target, period_key format,
          // refuses if claimed, caps progress at target. Replaces the old
          // client upsert that a malicious client could exploit.
          await supabase.rpc('bump_quest_progress', {
            p_quest_id: q.id,
            p_quest_kind: q.kind,
            p_target: q.target,
            p_period_key: period,
            p_increment: increment,
          });
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
