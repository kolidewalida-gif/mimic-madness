import { useEffect, useState, useSyncExternalStore } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * useLoginStreak — daily login streak counter.
 *
 * Once per UTC day per signed-in user the database row is bumped:
 *   - +1 if the previous login was yesterday
 *   - reset to 1 if the previous login was older than 1 day
 *   - no-op if the user already logged in today
 *
 * IMPORTANT: this is implemented as a **module-level singleton** so the
 * bump runs at most once per page load, no matter how many components
 * subscribe to the hook. Earlier versions kept the effect inside the hook
 * with `[user]` as a dependency, which fired the bump every time the
 * useAuth user object got a new reference (very common). Result: the
 * "+1 streak" toast spammed every second.
 */

interface StreakState {
  current: number;
  best: number;
  lastLoginISO: string | null;
  loading: boolean;
  justBumped: boolean;
}

type Listener = () => void;

let storeUserId: string | null = null;
let storeState: StreakState = {
  current: 0,
  best: 0,
  lastLoginISO: null,
  loading: true,
  justBumped: false,
};
const listeners = new Set<Listener>();

const emit = () => listeners.forEach((l) => l());

const setStoreState = (next: Partial<StreakState>) => {
  storeState = { ...storeState, ...next };
  emit();
};

const todayUTC = (): string => {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};

const yesterdayOf = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};

let bumpInFlight: Promise<void> | null = null;

const ensureBumpedFor = async (userId: string): Promise<void> => {
  // If this exact user has already been bumped/checked this session, do nothing.
  if (storeUserId === userId && !storeState.loading) return;
  // If a bump is in flight for this user, wait for it.
  if (bumpInFlight && storeUserId === userId) return bumpInFlight;

  storeUserId = userId;

  bumpInFlight = (async () => {
    const { data } = await supabase
      .from('player_stats')
      .select('login_streak_days, best_login_streak_days, last_login_date')
      .eq('user_id', userId)
      .maybeSingle();

    const today = todayUTC();
    const last = data?.last_login_date ?? null;

    if (last === today) {
      setStoreState({
        current: data?.login_streak_days ?? 0,
        best: data?.best_login_streak_days ?? 0,
        lastLoginISO: last,
        loading: false,
        justBumped: false,
      });
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
      .eq('user_id', userId);

    setStoreState({
      current: newCurrent,
      best: newBest,
      lastLoginISO: today,
      loading: false,
      justBumped: true,
    });

    // Auto-clear the "just bumped" flag so the toast doesn't loop on
    // re-subscribe. 6 seconds gives the UI time to react once and only once.
    setTimeout(() => setStoreState({ justBumped: false }), 6000);
  })();

  try {
    await bumpInFlight;
  } finally {
    bumpInFlight = null;
  }
};

const subscribe = (l: Listener) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

const getSnapshot = () => storeState;

export const useLoginStreak = () => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (!userId) return;
    void ensureBumpedFor(userId);
  }, [userId]);

  // refresh: re-pull the row without re-bumping (e.g. after a quest claim
  // that may have updated other XP fields).
  const refresh = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('player_stats')
      .select('login_streak_days, best_login_streak_days, last_login_date')
      .eq('user_id', userId)
      .maybeSingle();
    setStoreState({
      current: data?.login_streak_days ?? 0,
      best: data?.best_login_streak_days ?? 0,
      lastLoginISO: data?.last_login_date ?? null,
    });
  };

  return {
    current: state.current,
    best: state.best,
    lastLoginISO: state.lastLoginISO,
    loading: state.loading,
    justBumped: state.justBumped,
    refresh,
  };
};
