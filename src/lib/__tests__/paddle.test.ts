// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  environmentSet: vi.fn(),
  initialize: vi.fn(),
  checkoutOpen: vi.fn(),
}));

const PADDLE_SCRIPT_URL = 'https://cdn.paddle.com/paddle/v2/paddle.js';
const RUNTIME_CLIENT_TOKEN = 'test_runtime_client_token';
const ACCESS_TOKEN = 'authenticated_session_token';
const SUPABASE_URL = 'https://project.supabase.co';
const PUBLISHABLE_KEY = 'publishable_key';

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  vi.stubEnv('VITE_PAYMENTS_CLIENT_TOKEN', 'test_build_client_token');
  vi.stubEnv('VITE_PAYMENTS_ENVIRONMENT', '');
  vi.stubEnv('VITE_SUPABASE_URL', SUPABASE_URL);
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', PUBLISHABLE_KEY);
  vi.stubGlobal('fetch', mocks.fetch);

  window.Paddle = {
    Environment: { set: mocks.environmentSet },
    Initialize: mocks.initialize,
    Checkout: { open: mocks.checkoutOpen },
  };
  const script = document.createElement('script');
  script.src = PADDLE_SCRIPT_URL;
  document.head.appendChild(script);

  mocks.fetch.mockImplementation(async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as { priceId?: string; environment?: string };
    return {
      ok: true,
      status: 200,
      json: async () => ({
        transactionId: body.priceId === 'ad_free_monthly'
          ? 'txn_monthly_test'
          : 'txn_lifetime_test',
        clientToken: RUNTIME_CLIENT_TOKEN,
        environment: body.environment,
      }),
    } as Response;
  });
});

afterEach(() => {
  document.querySelectorAll(`script[src="${PADDLE_SCRIPT_URL}"]`).forEach((script) => script.remove());
  delete window.Paddle;
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('payload Paddle', () => {
  it('ouvre chaque offre avec une transaction authentifiée créée côté serveur', async () => {
    const {
      openPaddleCheckout,
      PRICE_AD_FREE_MONTHLY,
      PRICE_SUPPORTER_LIFETIME,
    } = await import('@/lib/paddle');

    await openPaddleCheckout({
      offer: PRICE_AD_FREE_MONTHLY,
      email: 'joueur@example.test',
      accessToken: ACCESS_TOKEN,
    });
    await openPaddleCheckout({
      offer: PRICE_SUPPORTER_LIFETIME,
      accessToken: ACCESS_TOKEN,
    });

    expect(mocks.environmentSet).toHaveBeenCalledWith('sandbox');
    expect(mocks.initialize).toHaveBeenCalledOnce();
    expect(mocks.initialize).toHaveBeenCalledWith({
      token: RUNTIME_CLIENT_TOKEN,
      eventCallback: expect.any(Function),
    });
    expect(mocks.fetch).toHaveBeenNthCalledWith(1, `${SUPABASE_URL}/functions/v1/get-paddle-price`, {
      method: 'POST',
      headers: {
        apikey: PUBLISHABLE_KEY,
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ priceId: PRICE_AD_FREE_MONTHLY, environment: 'sandbox' }),
    });
    expect(mocks.fetch).toHaveBeenNthCalledWith(2, `${SUPABASE_URL}/functions/v1/get-paddle-price`, {
      method: 'POST',
      headers: {
        apikey: PUBLISHABLE_KEY,
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ priceId: PRICE_SUPPORTER_LIFETIME, environment: 'sandbox' }),
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
    await openPaddleCheckout({
      offer: PRICE_AD_FREE_MONTHLY,
      accessToken: ACCESS_TOKEN,
    });

    expect(mocks.fetch).toHaveBeenCalledWith(`${SUPABASE_URL}/functions/v1/get-paddle-price`, {
      method: 'POST',
      headers: {
        apikey: PUBLISHABLE_KEY,
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ priceId: PRICE_AD_FREE_MONTHLY, environment: 'sandbox' }),
    });
    expect(mocks.initialize).toHaveBeenCalledWith({
      token: RUNTIME_CLIENT_TOKEN,
      eventCallback: expect.any(Function),
    });
  });
});
