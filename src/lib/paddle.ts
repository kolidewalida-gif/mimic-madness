import { supabase } from '@/integrations/supabase/client';

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;
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

declare global {
  interface Window {
    Paddle?: PaddleSdk;
  }
}

export function getPaddleEnvironment(): PaddleEnvironment {
  return clientToken?.startsWith('test_') ? 'sandbox' : 'live';
}

const paddleEventListeners = new Set<(event: PaddleEvent) => void>();
let paddleInitializationPromise: Promise<void> | null = null;

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

function configurePaddle(): void {
  if (!clientToken) throw new Error('Le paiement Paddle n’est pas configuré.');
  if (!window.Paddle) throw new Error('Le SDK Paddle ne s’est pas chargé.');

  window.Paddle.Environment.set(
    getPaddleEnvironment() === 'sandbox' ? 'sandbox' : 'production',
  );
  window.Paddle.Initialize({
    token: clientToken,
    eventCallback: publishPaddleEvent,
  });
}

export async function initializePaddle(): Promise<void> {
  if (paddleInitializationPromise) return paddleInitializationPromise;
  if (!clientToken) throw new Error('Le paiement Paddle n’est pas configuré.');

  paddleInitializationPromise = new Promise<void>((resolve, reject) => {
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
        configurePaddle();
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
    paddleInitializationPromise = null;
    throw error;
  });

  return paddleInitializationPromise;
}

export async function createPaddleTransaction(offer: PaddleOffer): Promise<string> {
  const { data, error } = await supabase.functions.invoke('get-paddle-price', {
    body: { priceId: offer, environment: getPaddleEnvironment() },
  });
  if (error || typeof data?.transactionId !== 'string') {
    throw new Error('Cette offre Paddle est momentanément indisponible.');
  }
  return data.transactionId;
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
  const [, transactionId] = await Promise.all([
    initializePaddle(),
    createPaddleTransaction(offer),
  ]);
  if (!window.Paddle) throw new Error('Le SDK Paddle ne s’est pas chargé.');

  window.Paddle.Checkout.open({
    transactionId,
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
