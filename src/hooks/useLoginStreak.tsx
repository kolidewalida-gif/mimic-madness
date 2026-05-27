import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * useLoginStreak — daily login streak counter.
 *
 * Once per day (UTC), the user's `login_streak_days` is bumped:
 *   - +1 if the previous login was yesterday
 *   - reset to 1 if the previous login was older than 1 day
 *   - no-op if the user already logged in today
 *
 * Also bumps `best_login_streak_days` on the way up.
 */

interface StreakState {
  current: number;
  best: number;
  lastLoginISO: string | null;
}

const todayUTC = (): string => {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};

const yesterdayOf = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};

export const useLoginStreak = () => {
  const { user } = useAuth();
  const [state, setState] = useState<StreakState>({
    current: 0,
    best: 0,
    lastLoginISO: null,
  });
  const [loading, setLoading] = useState(true);
  const [justBumped, setJustBumped] = useState(false);

  const fetchStreak = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('player_stats')
      .select('login_streak_days, best_login_streak_days, last_login_date')
      .eq('user_id', user.id)
      .maybeSingle();

    setState({
      current: data?.login_streak_days ?? 0,
      best: data?.best_login_streak_days ?? 0,
      lastLoginISO: data?.last_login_date ?? null,
    });
    setLoading(false);
  }, [user]);

  // Run once when user logs in: bump streak if needed
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const run = async () => {
      const { data } = await supabase
        .from('player_stats')
        .select('login_streak_days, best_login_streak_days, last_login_date')
        .eq('user_id', user.id)
        .maybeSingle();

      const today = todayUTC();
      const last = data?.last_login_date ?? null;

      if (last === today) {
        // Already counted today — just hydrate state and exit.
        if (!cancelled) {
          setState({
            current: data?.login_streak_days ?? 0,
            best: data?.best_login_streak_days ?? 0,
            lastLoginISO: last,
          });
          setLoading(false);
        }
        return;
      }

      const wasYesterday = last === yesterdayOf(today);
      const newCurrent = wasYesterday ? (data?.login_streak_days ?? 0) + 1 : 1;
      const newBest = Math.max(data?.best_login_streak_days ?? 0, newCurrent);

      await supabase
        .from('player_stats')
        .update({
          login_streak_days: newCurrent,
          best_login_streak_days: newBest,
          last_login_date: today,
        })
        .eq('user_id', user.id);

      if (!cancelled) {
        setState({ current: newCurrent, best: newBest, lastLoginISO: today });
        setJustBumped(true);
        setLoading(false);
        // Auto-clear the "just bumped" flag so the popup doesn't loop
        setTimeout(() => setJustBumped(false), 6000);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return {
    ...state,
    loading,
    justBumped,
    refresh: fetchStreak,
  };
};
