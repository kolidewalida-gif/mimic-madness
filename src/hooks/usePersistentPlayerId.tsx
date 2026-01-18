import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

const LOCAL_STORAGE_KEY = 'mimic-master-guest-player-id';

/**
 * Returns a persistent player ID:
 * - If user is logged in: returns the auth user ID (persists forever)
 * - If guest: returns a localStorage-based UUID (persists per browser)
 */
export const usePersistentPlayerId = () => {
  const { user, isLoading } = useAuth();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(true);

  useEffect(() => {
    if (isLoading) return;

    if (user?.id) {
      // Logged in user - use their auth ID
      setPlayerId(user.id);
      setIsGuest(false);
    } else {
      // Guest user - use localStorage ID
      let guestId = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!guestId) {
        guestId = crypto.randomUUID();
        localStorage.setItem(LOCAL_STORAGE_KEY, guestId);
      }
      setPlayerId(guestId);
      setIsGuest(true);
    }
  }, [user?.id, isLoading]);

  return {
    playerId,
    isGuest,
    isLoading: isLoading || playerId === null,
  };
};

/**
 * Generates a player ID for game sessions.
 * Returns auth user ID if logged in, otherwise generates a new UUID.
 */
export const getGamePlayerId = (authUserId?: string): string => {
  if (authUserId) {
    return authUserId;
  }
  // For guests, try to use stored ID, otherwise generate new
  let guestId = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!guestId) {
    guestId = crypto.randomUUID();
    localStorage.setItem(LOCAL_STORAGE_KEY, guestId);
  }
  return guestId;
};
