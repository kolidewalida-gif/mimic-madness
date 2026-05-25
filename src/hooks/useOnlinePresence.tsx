import { useState, useEffect, useCallback, useRef } from 'react';
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
 * Global online presence hook.
 *
 * Bug fix: the channel is now created ONCE per user session and never
 * re-subscribed when lobbyCode changes. Instead, we call `track()` to
 * update our presence payload without tearing down the connection.
 *
 * This fixes the "always offline" bug where friends appeared offline
 * because the channel was being destroyed/recreated on every lobby change.
 */
export const useOnlinePresence = (lobbyCode?: string | null) => {
  const { user } = useAuth();
  const [presenceState, setPresenceState] = useState<PresenceState>({});
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribedRef = useRef(false);
  const lobbyCodeRef = useRef(lobbyCode);

  // Keep ref in sync without triggering re-subscribe
  useEffect(() => {
    lobbyCodeRef.current = lobbyCode;
  }, [lobbyCode]);

  // Update own presence payload (lobby code changed, etc.)
  const updatePresence = useCallback(async (newLobbyCode?: string | null) => {
    if (!user || !channelRef.current || !isSubscribedRef.current) return;
    try {
      await channelRef.current.track({
        user_id: user.id,
        online: true,
        lobbyCode: newLobbyCode ?? lobbyCodeRef.current ?? null,
        lastSeen: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[Presence] track failed:', err);
    }
  }, [user]);

  // When lobbyCode changes, just re-track (don't re-subscribe)
  useEffect(() => {
    if (isSubscribedRef.current && user) {
      updatePresence(lobbyCode);
    }
  }, [lobbyCode, user, updatePresence]);

  // Subscribe ONCE per user session
  useEffect(() => {
    if (!user) return;

    // Don't re-create if already subscribed
    if (channelRef.current && isSubscribedRef.current) return;

    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });
    channelRef.current = channel;
    isSubscribedRef.current = false;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const newPresence: PresenceState = {};

        Object.entries(state).forEach(([userId, presences]) => {
          if (presences && presences.length > 0) {
            const latestPresence = presences[0] as any;
            newPresence[userId] = {
              online: true,
              lobbyCode: latestPresence.lobbyCode || null,
              lastSeen: latestPresence.lastSeen || new Date().toISOString(),
            };
          }
        });

        setPresenceState(newPresence);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (newPresences && newPresences.length > 0) {
          const presence = newPresences[0] as any;
          setPresenceState((prev) => ({
            ...prev,
            [key]: {
              online: true,
              lobbyCode: presence.lobbyCode || null,
              lastSeen: presence.lastSeen || new Date().toISOString(),
            },
          }));
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setPresenceState((prev) => ({
          ...prev,
          [key]: {
            online: false,
            lobbyCode: null,
            lastSeen: new Date().toISOString(),
          },
        }));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          isSubscribedRef.current = true;
          try {
            await channel.track({
              user_id: user.id,
              online: true,
              lobbyCode: lobbyCodeRef.current ?? null,
              lastSeen: new Date().toISOString(),
            });
          } catch (err) {
            console.warn('[Presence] initial track failed:', err);
          }
        }
      });

    // Heartbeat: re-track every 30s to keep presence alive
    const heartbeat = setInterval(() => {
      if (isSubscribedRef.current && channelRef.current) {
        channelRef.current.track({
          user_id: user.id,
          online: true,
          lobbyCode: lobbyCodeRef.current ?? null,
          lastSeen: new Date().toISOString(),
        }).catch(() => {});
      }
    }, 30000);

    return () => {
      clearInterval(heartbeat);
      isSubscribedRef.current = false;
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
    // Only re-subscribe when user changes (login/logout), NOT on lobbyCode change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Get status for a specific user
  const getUserStatus = useCallback(
    (userId: string) => {
      return presenceState[userId] || { online: false, lobbyCode: null, lastSeen: '' };
    },
    [presenceState],
  );

  return {
    presenceState,
    getUserStatus,
    updatePresence,
  };
};
