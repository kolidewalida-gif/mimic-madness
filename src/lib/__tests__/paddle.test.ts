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
const RUNTIME_CLIENT_TOKEN = 'test_runtime_client_token';

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  vi.stubEnv('VITE_PAYMENTS_CLIENT_TOKEN', 'test_build_client_token');
  vi.stubEnv('VITE_PAYMENTS_ENVIRONMENT', '');

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
    options: { body?: { priceId?: string; environment?: string } },
  ) => ({
    data: {
      transactionId: options.body?.priceId === 'ad_free_monthly'
        ? 'txn_monthly_test'
        : 'txn_lifetime_test',
      clientToken: RUNTIME_CLIENT_TOKEN,
      environment: options.body?.environment,
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
      token: RUNTIME_CLIENT_TOKEN,
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

  it('reste en Sandbox quand aucun jeton client n’est injecté au build', async () => {
    vi.stubEnv('VITE_PAYMENTS_CLIENT_TOKEN', '');
    const {
      getPaddleEnvironment,
      openPaddleCheckout,
      PRICE_AD_FREE_MONTHLY,
    } = await import('@/lib/paddle');

    expect(getPaddleEnvironment()).toBe('sandbox');
    await openPaddleCheckout({ offer: PRICE_AD_FREE_MONTHLY });

    expect(mocks.invoke).toHaveBeenCalledWith('get-paddle-price', {
      body: { priceId: PRICE_AD_FREE_MONTHLY, environment: 'sandbox' },
    });
    expect(mocks.initialize).toHaveBeenCalledWith({
      token: RUNTIME_CLIENT_TOKEN,
      eventCallback: expect.any(Function),
    });
  });
});
