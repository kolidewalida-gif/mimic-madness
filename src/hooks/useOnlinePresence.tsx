import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface PresenceState {
  [userId: string]: {
    online: boolean;
    lobbyCode: string | null;
    lastSeen: string;
  };
}

export const useOnlinePresence = (lobbyCode?: string | null) => {
  const { user } = useAuth();
  const [presenceState, setPresenceState] = useState<PresenceState>({});

  // Update own presence
  const updatePresence = useCallback(async (newLobbyCode?: string | null) => {
    if (!user) return;

    const channel = supabase.channel('online-users');
    
    await channel.track({
      user_id: user.id,
      online: true,
      lobbyCode: newLobbyCode || null,
      lastSeen: new Date().toISOString()
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id
        }
      }
    });

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
              lastSeen: latestPresence.lastSeen || new Date().toISOString()
            };
          }
        });
        
        setPresenceState(newPresence);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (newPresences && newPresences.length > 0) {
          const presence = newPresences[0] as any;
          setPresenceState(prev => ({
            ...prev,
            [key]: {
              online: true,
              lobbyCode: presence.lobbyCode || null,
              lastSeen: presence.lastSeen || new Date().toISOString()
            }
          }));
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setPresenceState(prev => ({
          ...prev,
          [key]: {
            online: false,
            lobbyCode: null,
            lastSeen: new Date().toISOString()
          }
        }));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            online: true,
            lobbyCode: lobbyCode || null,
            lastSeen: new Date().toISOString()
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, lobbyCode]);

  // Get status for a specific user
  const getUserStatus = useCallback((userId: string) => {
    return presenceState[userId] || { online: false, lobbyCode: null, lastSeen: '' };
  }, [presenceState]);

  return {
    presenceState,
    getUserStatus,
    updatePresence
  };
};