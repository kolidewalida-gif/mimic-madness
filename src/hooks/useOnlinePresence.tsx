import { useEffect, useCallback, useSyncExternalStore } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface PresenceState {
  [userId: string]: {
    online: boolean;
    lobbyCode: string | null;
    lastSeen: string;
  };
}

/**
 * Singleton online presence store.
 * One Realtime channel for the entire app — shared across every component
 * that calls useOnlinePresence. Fixes the "always offline" bug caused by
 * 5+ components each creating their own channel with the same name.
 */
type Listener = () => void;
let presenceState: PresenceState = {};
let presenceChannel: RealtimeChannel | null = null;
let presenceUserId: string | null = null;
let presenceLobbyCode: string | null = null;
let presenceSubscribed = false;
let presenceRefCount = 0;
let presenceHeartbeat: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<Listener>();

const emit = () => listeners.forEach((l) => l());

const trackSelf = () => {
  if (!presenceChannel || !presenceSubscribed || !presenceUserId) return;
  presenceChannel
    .track({
      user_id: presenceUserId,
      online: true,
      lobbyCode: presenceLobbyCode,
      lastSeen: new Date().toISOString(),
    })
    .catch(() => {});
};

const startPresence = (userId: string) => {
  if (presenceUserId === userId && presenceChannel) return;
  stopPresence();
  presenceUserId = userId;
  presenceSubscribed = false;

  const channel = supabase.channel('online-users', {
    config: { presence: { key: userId } },
  });
  presenceChannel = channel;

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const next: PresenceState = {};
      Object.entries(state).forEach(([uid, presences]) => {
        if (presences && (presences as any[]).length > 0) {
          const p = (presences as any[])[0];
          next[uid] = {
            online: true,
            lobbyCode: p.lobbyCode || null,
            lastSeen: p.lastSeen || new Date().toISOString(),
          };
        }
      });
      presenceState = next;
      emit();
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      if (newPresences && newPresences.length > 0) {
        const p = newPresences[0] as any;
        presenceState = {
          ...presenceState,
          [key]: {
            online: true,
            lobbyCode: p.lobbyCode || null,
            lastSeen: p.lastSeen || new Date().toISOString(),
          },
        };
        emit();
      }
    })
    .on('presence', { event: 'leave' }, ({ key }) => {
      presenceState = {
        ...presenceState,
        [key]: { online: false, lobbyCode: null, lastSeen: new Date().toISOString() },
      };
      emit();
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        presenceSubscribed = true;
        trackSelf();
      }
    });

  presenceHeartbeat = setInterval(trackSelf, 30000);
};

const stopPresence = () => {
  if (presenceHeartbeat) {
    clearInterval(presenceHeartbeat);
    presenceHeartbeat = null;
  }
  if (presenceChannel) {
    supabase.removeChannel(presenceChannel);
    presenceChannel = null;
  }
  presenceSubscribed = false;
  presenceUserId = null;
  presenceState = {};
  emit();
};

const subscribe = (l: Listener) => {
  listeners.add(l);
  presenceRefCount++;
  return () => {
    listeners.delete(l);
    presenceRefCount--;
    if (presenceRefCount <= 0) {
      setTimeout(() => {
        if (presenceRefCount <= 0) stopPresence();
      }, 1000);
    }
  };
};

const getSnapshot = () => presenceState;

export const useOnlinePresence = (lobbyCode?: string | null) => {
  const { user } = useAuth();

  // Start singleton when user logs in
  useEffect(() => {
    if (!user) {
      stopPresence();
      return;
    }
    startPresence(user.id);
  }, [user?.id]);

  // Push lobbyCode changes to the shared track payload
  useEffect(() => {
    if (lobbyCode !== undefined) {
      presenceLobbyCode = lobbyCode ?? null;
      trackSelf();
    }
  }, [lobbyCode]);

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const getUserStatus = useCallback(
    (userId: string) =>
      state[userId] || { online: false, lobbyCode: null, lastSeen: '' },
    [state],
  );

  const updatePresence = useCallback(async (newLobbyCode?: string | null) => {
    if (newLobbyCode !== undefined) presenceLobbyCode = newLobbyCode ?? null;
    trackSelf();
  }, []);

  return { presenceState: state, getUserStatus, updatePresence };
};
