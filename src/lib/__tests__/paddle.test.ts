// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  environmentSet: vi.fn(),
  initialize: vi.fn(),
  checkoutOpen: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: mocks.invoke } },
}));

const PADDLE_SCRIPT_URL = 'https://cdn.paddle.com/paddle/v2/paddle.js';

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  vi.stubEnv('VITE_PAYMENTS_CLIENT_TOKEN', 'test_client_token');

  window.Paddle = {
    Environment: { set: mocks.environmentSet },
    Initialize: mocks.initialize,
    Checkout: { open: mocks.checkoutOpen },
  };
  const script = document.createElement('script');
  script.src = PADDLE_SCRIPT_URL;
  document.head.appendChild(script);

  mocks.invoke.mockImplementation(async (
    _name: string,
    options: { body?: { priceId?: string } },
  ) => ({
    data: {
      transactionId: options.body?.priceId === 'ad_free_monthly'
        ? 'txn_monthly_test'
        : 'txn_lifetime_test',
    },
    error: null,
  }));
});

afterEach(() => {
  document.querySelectorAll(`script[src="${PADDLE_SCRIPT_URL}"]`).forEach((script) => script.remove());
  delete window.Paddle;
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('payload Paddle', () => {
  it('ouvre chaque offre avec une transaction créée côté serveur', async () => {
    const {
      openPaddleCheckout,
      PRICE_AD_FREE_MONTHLY,
      PRICE_SUPPORTER_LIFETIME,
    } = await import('@/lib/paddle');

    await openPaddleCheckout({
      offer: PRICE_AD_FREE_MONTHLY,
      email: 'joueur@example.test',
    });
    await openPaddleCheckout({ offer: PRICE_SUPPORTER_LIFETIME });

    expect(mocks.environmentSet).toHaveBeenCalledWith('sandbox');
    expect(mocks.initialize).toHaveBeenCalledOnce();
    expect(mocks.initialize).toHaveBeenCalledWith({
      token: 'test_client_token',
      eventCallback: expect.any(Function),
    });
    expect(mocks.invoke).toHaveBeenNthCalledWith(1, 'get-paddle-price', {
      body: { priceId: PRICE_AD_FREE_MONTHLY, environment: 'sandbox' },
    });
    expect(mocks.invoke).toHaveBeenNthCalledWith(2, 'get-paddle-price', {
      body: { priceId: PRICE_SUPPORTER_LIFETIME, environment: 'sandbox' },
    });
    expect(mocks.checkoutOpen).toHaveBeenNthCalledWith(1, {
      transactionId: 'txn_monthly_test',
      customer: { email: 'joueur@example.test' },
      settings: { displayMode: 'overlay', locale: 'fr', theme: 'dark' },
    });
    expect(mocks.checkoutOpen).toHaveBeenNthCalledWith(2, {
      transactionId: 'txn_lifetime_test',
      settings: { displayMode: 'overlay', locale: 'fr', theme: 'dark' },
    });
  });
});
