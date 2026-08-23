import { supabase } from '@/integrations/supabase/client';

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

declare global {
  interface Window {
    Paddle: any;
  }
}

/** Offres vendues dans Mimic Master (identifiants stables test/production). */
export const PRICE_AD_FREE_MONTHLY = 'ad_free_monthly';
export const PRICE_SUPPORTER_LIFETIME = 'supporter_lifetime';

export function getPaddleEnvironment(): 'sandbox' | 'live' {
  return clientToken?.startsWith('test_') ? 'sandbox' : 'live';
}

let paddleInitialized = false;

export async function initializePaddle(): Promise<void> {
  if (paddleInitialized) return;
  if (!clientToken) throw new Error('VITE_PAYMENTS_CLIENT_TOKEN is not set');

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://cdn.paddle.com/paddle/v2/paddle.js"]',
    );
    const script = existing ?? document.createElement('script');
    const handleLoad = () => {
      try {
        window.Paddle.Environment.set(
          getPaddleEnvironment() === 'sandbox' ? 'sandbox' : 'production',
        );
        window.Paddle.Initialize({ token: clientToken });
        paddleInitialized = true;
        resolve();
      } catch (error) {
        reject(error as Error);
      }
    };

    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', () => reject(new Error('paddle.js failed')), { once: true });

    if (!existing) {
      script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
      script.async = true;
      document.head.appendChild(script);
    } else if (window.Paddle) {
      handleLoad();
    }
  });
}

const priceIdCache = new Map<string, string>();

export async function getPaddlePriceId(priceId: string): Promise<string> {
  const cached = priceIdCache.get(priceId);
  if (cached) return cached;

  const { data, error } = await supabase.functions.invoke('get-paddle-price', {
    body: { priceId, environment: getPaddleEnvironment() },
  });
  if (error || !data?.paddleId) throw new Error(`Failed to resolve price: ${priceId}`);

  priceIdCache.set(priceId, data.paddleId as string);
  return data.paddleId as string;
}
