import { supabase } from '@/integrations/supabase/client';

const buildClientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;
const configuredEnvironment = import.meta.env.VITE_PAYMENTS_ENVIRONMENT as string | undefined;
const PADDLE_SCRIPT_URL = 'https://cdn.paddle.com/paddle/v2/paddle.js';
const PADDLE_SCRIPT_TIMEOUT_MS = 10_000;

export type PaddleEnvironment = 'sandbox' | 'live';
export const PRICE_AD_FREE_MONTHLY = 'ad_free_monthly' as const;
export const PRICE_SUPPORTER_LIFETIME = 'supporter_lifetime' as const;
export type PaddleOffer =
  | typeof PRICE_AD_FREE_MONTHLY
  | typeof PRICE_SUPPORTER_LIFETIME;

export interface PaddleEvent {
  name: string;
  data?: Record<string, unknown>;
}

interface PaddleCheckoutOptions {
  transactionId: string;
  customer?: { email: string };
  settings: {
    displayMode: 'overlay';
    locale: 'fr';
    theme: 'dark';
  };
}

interface PaddleSdk {
  Environment: { set: (environment: 'sandbox' | 'production') => void };
  Initialize: (options: {
    token: string;
    eventCallback: (event: unknown) => void;
  }) => void;
  Checkout: { open: (options: PaddleCheckoutOptions) => void };
}

interface PaddleRuntimeConfig {
  clientToken: string;
  environment: PaddleEnvironment;
}

interface PaddleTransaction extends PaddleRuntimeConfig {
  transactionId: string;
}

declare global {
  interface Window {
    Paddle?: PaddleSdk;
  }
}

/** Le Sandbox est le mode sûr par défaut ; le Live doit toujours être explicite. */
export function getPaddleEnvironment(): PaddleEnvironment {
  if (configuredEnvironment === 'live' || configuredEnvironment === 'sandbox') {
    return configuredEnvironment;
  }
  return buildClientToken?.startsWith('live_') ? 'live' : 'sandbox';
}

const paddleEventListeners = new Set<(event: PaddleEvent) => void>();
let paddleInitialization: { key: string; promise: Promise<void> } | null = null;

function publishPaddleEvent(rawEvent: unknown) {
  if (!rawEvent || typeof rawEvent !== 'object') return;
  const event = rawEvent as { name?: unknown; data?: unknown };
  if (typeof event.name !== 'string') return;
  const normalized: PaddleEvent = {
    name: event.name,
    ...(event.data && typeof event.data === 'object'
      ? { data: event.data as Record<string, unknown> }
      : {}),
  };
  paddleEventListeners.forEach((listener) => listener(normalized));
}

function configurePaddle({ clientToken, environment }: PaddleRuntimeConfig): void {
  if (!window.Paddle) throw new Error('Le SDK Paddle ne s’est pas chargé.');

  window.Paddle.Environment.set(environment === 'sandbox' ? 'sandbox' : 'production');
  window.Paddle.Initialize({
    token: clientToken,
    eventCallback: publishPaddleEvent,
  });
}

export async function initializePaddle(config: PaddleRuntimeConfig): Promise<void> {
  const initializationKey = `${config.environment}:${config.clientToken}`;
  if (paddleInitialization?.key === initializationKey) {
    return paddleInitialization.promise;
  }
  if (paddleInitialization) {
    throw new Error('La configuration Paddle a changé. Recharge la page puis réessaie.');
  }

  const promise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${PADDLE_SCRIPT_URL}"]`,
    );
    const script = existing ?? document.createElement('script');
    let settled = false;

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
      callback();
    };
    const handleLoad = () => finish(() => {
      try {
        configurePaddle(config);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
    const handleError = () => finish(() => reject(new Error('Le chargement de Paddle a échoué.')));
    const timeoutId = window.setTimeout(handleError, PADDLE_SCRIPT_TIMEOUT_MS);

    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });

    if (!existing) {
      script.src = PADDLE_SCRIPT_URL;
      script.async = true;
      document.head.appendChild(script);
    } else if (window.Paddle) {
      handleLoad();
    }
  }).catch((error: unknown) => {
    paddleInitialization = null;
    throw error;
  });

  paddleInitialization = { key: initializationKey, promise };
  return promise;
}

export async function createPaddleTransaction(offer: PaddleOffer): Promise<PaddleTransaction> {
  const requestedEnvironment = getPaddleEnvironment();
  const { data, error } = await supabase.functions.invoke('get-paddle-price', {
    body: { priceId: offer, environment: requestedEnvironment },
  });
  const expectedTokenPrefix = requestedEnvironment === 'sandbox' ? 'test_' : 'live_';
  if (
    error ||
    typeof data?.transactionId !== 'string' ||
    data?.environment !== requestedEnvironment ||
    typeof data?.clientToken !== 'string' ||
    !data.clientToken.startsWith(expectedTokenPrefix)
  ) {
    throw new Error('Cette offre Paddle est momentanément indisponible.');
  }
  return {
    transactionId: data.transactionId,
    clientToken: data.clientToken,
    environment: data.environment,
  };
}

export function subscribeToPaddleEvents(listener: (event: PaddleEvent) => void): () => void {
  paddleEventListeners.add(listener);
  return () => paddleEventListeners.delete(listener);
}

export async function openPaddleCheckout({
  offer,
  email,
}: {
  offer: PaddleOffer;
  email?: string;
}): Promise<void> {
  // Crée d’abord la transaction : cela évite les transactions orphelines si le SDK échoue.
  const transaction = await createPaddleTransaction(offer);
  await initializePaddle(transaction);
  if (!window.Paddle) throw new Error('Le SDK Paddle ne s’est pas chargé.');

  window.Paddle.Checkout.open({
    transactionId: transaction.transactionId,
    ...(email ? { customer: { email } } : {}),
    settings: {
      displayMode: 'overlay',
      locale: 'fr',
      theme: 'dark',
    },
  });
}

export async function getPaddleCustomerPortalUrl(): Promise<string> {
  const { data, error } = await supabase.functions.invoke('create-paddle-portal', {
    body: { environment: getPaddleEnvironment() },
  });
  if (error || typeof data?.url !== 'string') {
    throw new Error('Le portail client est momentanément indisponible.');
  }

  const url = new URL(data.url);
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.paddle.com')) {
    throw new Error('Le portail client a renvoyé une adresse invalide.');
  }
  return url.toString();
}
