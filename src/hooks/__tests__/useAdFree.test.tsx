// @vitest-environment jsdom

import type { ReactNode } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  getPaddleEnvironment: vi.fn(),
  from: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({ useAuth: mocks.useAuth }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mocks.from,
    channel: mocks.channel,
    removeChannel: mocks.removeChannel,
  },
}));
vi.mock('@/lib/paddle', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/paddle')>();
  return { ...actual, getPaddleEnvironment: mocks.getPaddleEnvironment };
});

import {
  AdFreeProvider,
  resolveAdFreeEntitlement,
  useAdFree,
  type AdFreePurchase,
  type AdFreeSubscription,
} from '@/hooks/useAdFree';
import { PRICE_AD_FREE_MONTHLY, PRICE_SUPPORTER_LIFETIME } from '@/lib/paddle';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const NOW = Date.parse('2026-08-18T12:00:00.000Z');
const FUTURE = '2026-08-18T12:01:00.000Z';
const PAST = '2026-08-18T11:59:00.000Z';

let subscriptionRows: AdFreeSubscription[] = [];
let purchaseRows: AdFreePurchase[] = [];

function createQuery(data: AdFreeSubscription[] | AdFreePurchase[]) {
  let equalityCount = 0;
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockImplementation(() => {
    equalityCount += 1;
    return equalityCount === 2
      ? Promise.resolve({ data, error: null })
      : query;
  });
  return query;
}

function Wrapper({ children }: { children: ReactNode }) {
  return <AdFreeProvider>{children}</AdFreeProvider>;
}

beforeEach(() => {
  subscriptionRows = [];
  purchaseRows = [];
  vi.clearAllMocks();
  mocks.useAuth.mockReturnValue({
    user: { id: USER_ID },
    isLoading: false,
  });
  mocks.getPaddleEnvironment.mockReturnValue('sandbox');
  mocks.from.mockImplementation((table: string) => createQuery(
    table === 'subscriptions' ? subscriptionRows : purchaseRows,
  ));

  const channel = {
    on: vi.fn(),
    subscribe: vi.fn(),
  };
  channel.on.mockReturnValue(channel);
  channel.subscribe.mockReturnValue(channel);
  mocks.channel.mockReturnValue(channel);
  mocks.removeChannel.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('résolution du droit sans pub', () => {
  it('active un abonnement mensuel valide', () => {
    const result = resolveAdFreeEntitlement([
      {
        price_id: PRICE_AD_FREE_MONTHLY,
        status: 'active',
        current_period_end: FUTURE,
        environment: 'sandbox',
      },
    ], [], 'sandbox', NOW);

    expect(result).toEqual({
      isAdFree: true,
      source: 'subscription',
      expiresAt: FUTURE,
    });
  });

  it('refuse un abonnement expiré', () => {
    const result = resolveAdFreeEntitlement([
      {
        price_id: PRICE_AD_FREE_MONTHLY,
        status: 'active',
        current_period_end: PAST,
        environment: 'sandbox',
      },
    ], [], 'sandbox', NOW);

    expect(result).toEqual({ isAdFree: false, source: null, expiresAt: null });
  });

  it('conserve un abonnement annulé jusqu’à son échéance', () => {
    const subscription: AdFreeSubscription = {
      price_id: PRICE_AD_FREE_MONTHLY,
      status: 'canceled',
      current_period_end: FUTURE,
      environment: 'sandbox',
    };

    expect(resolveAdFreeEntitlement([subscription], [], 'sandbox', NOW)).toEqual({
      isAdFree: true,
      source: 'subscription',
      expiresAt: FUTURE,
    });
    expect(resolveAdFreeEntitlement(
      [subscription],
      [],
      'sandbox',
      Date.parse(FUTURE),
    )).toEqual({ isAdFree: false, source: null, expiresAt: null });
  });

  it('donne la priorité au droit supporter à vie', () => {
    const result = resolveAdFreeEntitlement([], [
      { price_id: PRICE_SUPPORTER_LIFETIME, environment: 'sandbox', revoked_at: null },
    ], 'sandbox', NOW);

    expect(result).toEqual({ isAdFree: true, source: 'lifetime', expiresAt: null });
  });

  it('relit les droits à l’échéance et désactive automatiquement le sans-pub', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const expiresAt = new Date(NOW + 1_000).toISOString();
    subscriptionRows = [{
      price_id: PRICE_AD_FREE_MONTHLY,
      status: 'canceled',
      current_period_end: expiresAt,
      environment: 'sandbox',
    }];

    const { result } = renderHook(() => useAdFree(), { wrapper: Wrapper });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current).toMatchObject({
      isResolved: true,
      isAdFree: true,
      source: 'subscription',
      expiresAt,
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_250);
    });

    expect(result.current).toMatchObject({
      isResolved: true,
      isAdFree: false,
      source: null,
      expiresAt: null,
    });
    expect(mocks.from).toHaveBeenCalledTimes(4);
  });
});
