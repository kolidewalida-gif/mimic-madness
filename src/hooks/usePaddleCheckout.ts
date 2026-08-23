import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { useAdFree } from './useAdFree';
import {
  openPaddleCheckout,
  subscribeToPaddleEvents,
  type PaddleOffer,
} from '@/lib/paddle';

const POST_CHECKOUT_REFRESH_DELAYS_MS = [1_500, 5_000, 10_000];

export function usePaddleCheckout() {
  const { user, session } = useAuth();
  const { refresh } = useAdFree();
  const refreshTimers = useRef<number[]>([]);
  const [pendingOffer, setPendingOffer] = useState<PaddleOffer | null>(null);
  const [checkoutCompleted, setCheckoutCompleted] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToPaddleEvents((event) => {
      if (event.name !== 'checkout.completed') return;
      setCheckoutCompleted(true);
      setError(null);
      void refresh();
      POST_CHECKOUT_REFRESH_DELAYS_MS.forEach((delay) => {
        refreshTimers.current.push(window.setTimeout(() => void refresh(), delay));
      });
    });

    return () => {
      unsubscribe();
      refreshTimers.current.forEach((timerId) => window.clearTimeout(timerId));
      refreshTimers.current = [];
    };
  }, [refresh]);

  const openCheckout = useCallback(async (offer: PaddleOffer) => {
    if (!user) {
      setError(new Error('Connecte-toi avant de soutenir Mimic Master.'));
      return;
    }
    const accessToken = session?.access_token;
    if (!accessToken) {
      setError(new Error('Ta session a expiré. Reconnecte-toi puis réessaie.'));
      return;
    }

    setPendingOffer(offer);
    setCheckoutCompleted(false);
    setError(null);
    try {
      await openPaddleCheckout({
        offer,
        email: user.email,
        accessToken,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error('Ouverture du paiement impossible.'));
    } finally {
      setPendingOffer(null);
    }
  }, [session?.access_token, user]);

  return {
    openCheckout,
    pendingOffer,
    isOpening: pendingOffer !== null,
    checkoutCompleted,
    error,
  };
}
