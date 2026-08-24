import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  getPaddleEnvironment,
  PRICE_AD_FREE_MONTHLY,
  PRICE_SUPPORTER_LIFETIME,
  type PaddleEnvironment,
} from '@/lib/paddle';
import { useAuth } from './useAuth';

const REFRESH_INTERVAL_MS = 60_000;
const MAX_EXPIRY_TIMER_MS = 24 * 60 * 60 * 1_000;
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing', 'past_due', 'canceled']);

export type AdFreeSource = 'subscription' | 'lifetime' | null;

export interface AdFreeSubscription {
  price_id: string;
  status: string;
  current_period_end: string | null;
  environment: string;
}

export interface AdFreePurchase {
  price_id: string;
  environment: string;
  revoked_at?: string | null;
}

export interface AdFreeEntitlement {
  isAdFree: boolean;
  source: AdFreeSource;
  expiresAt: string | null;
}

export interface AdFreeContextValue extends AdFreeEntitlement {
  environment: PaddleEnvironment;
  isLoading: boolean;
  isResolved: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

interface AdFreeState extends AdFreeEntitlement {
  subjectId: string | null;
  isLoading: boolean;
  isResolved: boolean;
  error: Error | null;
}

const unresolvedState = (subjectId: string | null): AdFreeState => ({
  subjectId,
  isAdFree: false,
  source: null,
  expiresAt: null,
  isLoading: true,
  isResolved: false,
  error: null,
});

export function resolveAdFreeEntitlement(
  subscriptions: readonly AdFreeSubscription[],
  purchases: readonly AdFreePurchase[],
  environment: PaddleEnvironment,
  now = Date.now(),
): AdFreeEntitlement {
  const hasLifetimeAccess = purchases.some(
    (purchase) =>
      purchase.environment === environment &&
      purchase.price_id === PRICE_SUPPORTER_LIFETIME &&
      (purchase.revoked_at ?? null) === null,
  );

  if (hasLifetimeAccess) {
    return { isAdFree: true, source: 'lifetime', expiresAt: null };
  }

  const expiresAt = subscriptions.reduce<string | null>((latest, subscription) => {
    if (
      subscription.environment !== environment ||
      subscription.price_id !== PRICE_AD_FREE_MONTHLY ||
      !ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status) ||
      !subscription.current_period_end
    ) {
      return latest;
    }

    const expiry = Date.parse(subscription.current_period_end);
    if (!Number.isFinite(expiry) || expiry <= now) return latest;
    if (!latest || expiry > Date.parse(latest)) return subscription.current_period_end;
    return latest;
  }, null);

  return expiresAt
    ? { isAdFree: true, source: 'subscription', expiresAt }
    : { isAdFree: false, source: null, expiresAt: null };
}

const AdFreeContext = createContext<AdFreeContextValue | null>(null);

export function AdFreeProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const environment = getPaddleEnvironment();
  const userId = user?.id ?? null;
  const requestSequence = useRef(0);
  const [state, setState] = useState<AdFreeState>(() => unresolvedState(null));

  const refresh = useCallback(async () => {
    const requestId = ++requestSequence.current;

    if (authLoading) {
      setState(unresolvedState(userId));
      return;
    }

    if (!userId) {
      setState({
        subjectId: null,
        isAdFree: false,
        source: null,
        expiresAt: null,
        isLoading: false,
        isResolved: true,
        error: null,
      });
      return;
    }

    setState((previous) => ({
      ...(previous.subjectId === userId ? previous : unresolvedState(userId)),
      subjectId: userId,
      isLoading: previous.subjectId !== userId || !previous.isResolved,
      error: null,
    }));

    try {
      const [subscriptionsResult, purchasesResult] = await Promise.all([
        supabase
          .from('subscriptions')
          .select('price_id,status,current_period_end,environment')
          .eq('user_id', userId)
          .eq('environment', environment),
        supabase
          .from('purchases')
          .select('price_id,environment,revoked_at')
          .eq('user_id', userId)
          .eq('environment', environment),
      ]);

      if (subscriptionsResult.error) throw subscriptionsResult.error;
      if (purchasesResult.error) throw purchasesResult.error;
      if (requestId !== requestSequence.current) return;

      const entitlement = resolveAdFreeEntitlement(
        subscriptionsResult.data ?? [],
        purchasesResult.data ?? [],
        environment,
      );
      setState({
        subjectId: userId,
        ...entitlement,
        isLoading: false,
        isResolved: true,
        error: null,
      });
    } catch (cause) {
      if (requestId !== requestSequence.current) return;
      const error = cause instanceof Error ? cause : new Error('Lecture du droit sans pub impossible');
      setState((previous) => ({
        ...(previous.subjectId === userId ? previous : unresolvedState(userId)),
        subjectId: userId,
        isLoading: false,
        error,
      }));
    }
  }, [authLoading, environment, userId]);

  useEffect(() => {
    void refresh();
    if (authLoading || !userId) return;

    const channel = supabase
      .channel(`ad-free:${userId}:${environment}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${userId}`,
        },
        () => void refresh(),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'purchases',
          filter: `user_id=eq.${userId}`,
        },
        () => void refresh(),
      )
      .subscribe();

    return () => {
      requestSequence.current += 1;
      void supabase.removeChannel(channel);
    };
  }, [authLoading, environment, refresh, userId]);

  useEffect(() => {
    if (authLoading || !userId) return;

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const intervalId = window.setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [authLoading, refresh, userId]);

  const effectiveState = useMemo(() => {
    if (authLoading || state.subjectId !== userId) return unresolvedState(userId);
    return state;
  }, [authLoading, state, userId]);

  useEffect(() => {
    if (!effectiveState.expiresAt) return;
    const remaining = Date.parse(effectiveState.expiresAt) - Date.now();
    const delay = Math.min(Math.max(remaining + 250, 0), MAX_EXPIRY_TIMER_MS);
    const timeoutId = window.setTimeout(() => void refresh(), delay);
    return () => window.clearTimeout(timeoutId);
  }, [effectiveState.expiresAt, refresh]);

  const value = useMemo<AdFreeContextValue>(
    () => ({ ...effectiveState, environment, refresh }),
    [effectiveState, environment, refresh],
  );

  return <AdFreeContext.Provider value={value}>{children}</AdFreeContext.Provider>;
}

/**
 * État partagé du droit sans pub. En l'absence accidentelle du provider, le
 * droit reste non résolu afin qu'aucune publicité ne parte avant vérification.
 */
export function useAdFree(): AdFreeContextValue {
  const context = useContext(AdFreeContext);
  return context ?? {
    ...unresolvedState(null),
    environment: getPaddleEnvironment(),
    refresh: async () => undefined,
  };
}
