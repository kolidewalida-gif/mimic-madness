// @vitest-environment jsdom

import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useAdFree: vi.fn(),
  openPaddleCheckout: vi.fn(),
  subscribeToPaddleEvents: vi.fn(),
  refresh: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({ useAuth: mocks.useAuth }));
vi.mock('@/hooks/useAdFree', () => ({ useAdFree: mocks.useAdFree }));
vi.mock('@/lib/paddle', () => ({
  PRICE_AD_FREE_MONTHLY: 'ad_free_monthly',
  PRICE_SUPPORTER_LIFETIME: 'supporter_lifetime',
  openPaddleCheckout: mocks.openPaddleCheckout,
  subscribeToPaddleEvents: mocks.subscribeToPaddleEvents,
}));

import { usePaddleCheckout } from '@/hooks/usePaddleCheckout';
import { PRICE_AD_FREE_MONTHLY, PRICE_SUPPORTER_LIFETIME } from '@/lib/paddle';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const EMAIL = 'joueur@example.test';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useAuth.mockReturnValue({ user: { id: USER_ID, email: EMAIL } });
  mocks.useAdFree.mockReturnValue({ refresh: mocks.refresh });
  mocks.openPaddleCheckout.mockResolvedValue(undefined);
  mocks.subscribeToPaddleEvents.mockReturnValue(mocks.unsubscribe);
});

afterEach(() => {
  cleanup();
});

describe('ouverture du checkout Paddle', () => {
  it.each([
    ['sans pub mensuel', PRICE_AD_FREE_MONTHLY],
    ['supporter à vie', PRICE_SUPPORTER_LIFETIME],
  ])('transmet l’offre %s depuis la session authentifiée', async (_label, offer) => {
    const { result } = renderHook(() => usePaddleCheckout());

    await act(async () => {
      await result.current.openCheckout(offer);
    });

    expect(mocks.openPaddleCheckout).toHaveBeenCalledOnce();
    expect(mocks.openPaddleCheckout).toHaveBeenCalledWith({
      offer,
      email: EMAIL,
    });
    expect(result.current.pendingOffer).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('refuse le checkout sans utilisateur authentifié', async () => {
    mocks.useAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => usePaddleCheckout());

    await act(async () => {
      await result.current.openCheckout(PRICE_AD_FREE_MONTHLY);
    });

    expect(mocks.openPaddleCheckout).not.toHaveBeenCalled();
    expect(result.current.error?.message).toBe(
      'Connecte-toi avant de soutenir Mimic Master.',
    );
  });
});
