import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// Callback ref for handling new invitations
let onNewInvitationCallback: ((invitation: GameInvitation) => void) | null = null;

export const setOnNewInvitationCallback = (callback: ((invitation: GameInvitation) => void) | null) => {
  onNewInvitationCallback = callback;
};

interface GameInvitation {
  id: string;
  sender_id: string;
  sender_name: string;
  receiver_id: string;
  lobby_code: string;
  status: string;
  created_at: string;
  expires_at: string;
}

// ---------------------------------------------------------------------------
// SINGLETON STORE
// Multiple components subscribe to invitations; we keep a single Realtime
// channel per user and broadcast state via useSyncExternalStore so every
// consumer stays in sync without duplicate channels (which previously caused
// missed invitations and conflicts on the same channel name).
// ---------------------------------------------------------------------------
type Listener = () => void;
let storeUserId: string | null = null;
let storeInvitations: GameInvitation[] = [];
let storeChannel: ReturnType<typeof supabase.channel> | null = null;
let storeRefCount = 0;
const storeListeners = new Set<Listener>();
let storePollTimer: ReturnType<typeof setInterval> | null = null;

const emit = () => {
  storeListeners.forEach((l) => l());
};

const setInvitations = (next: GameInvitation[]) => {
  storeInvitations = next;
  emit();
};

const fetchInvitationsFor = async (userId: string) => {
  const { data, error } = await supabase
    .from('game_invitations')
    .select('*')
    .eq('receiver_id', userId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });
  if (!error && data && storeUserId === userId) {
    setInvitations(data as GameInvitation[]);
  }
};

const startStore = (userId: string) => {
  if (storeUserId === userId && storeChannel) return;
  stopStore();
  storeUserId = userId;
  fetchInvitationsFor(userId);

  const channelName = `game-invitations-realtime-${userId}`;
  storeChannel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'game_invitations',
        filter: `receiver_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          const inv = payload.new as GameInvitation;
          if (inv.status === 'pending') {
            // Avoid duplicates if already fetched
            if (!storeInvitations.some((i) => i.id === inv.id)) {
              setInvitations([inv, ...storeInvitations]);
            }
            if (onNewInvitationCallback) onNewInvitationCallback(inv);
          }
        } else {
          fetchInvitationsFor(userId);
        }
      },
    )
    .subscribe();

  // Safety poll every 30s to recover from any missed realtime event
  storePollTimer = setInterval(() => {
    if (storeUserId) fetchInvitationsFor(storeUserId);
  }, 30000);
};

const stopStore = () => {
  if (storeChannel) {
    supabase.removeChannel(storeChannel);
    storeChannel = null;
  }
  if (storePollTimer) {
    clearInterval(storePollTimer);
    storePollTimer = null;
  }
  storeUserId = null;
  storeInvitations = [];
  emit();
};

const subscribe = (listener: Listener) => {
  storeListeners.add(listener);
  storeRefCount++;
  return () => {
    storeListeners.delete(listener);
    storeRefCount--;
    if (storeRefCount <= 0) {
      // Delay tear-down briefly in case of remount churn
      setTimeout(() => {
        if (storeRefCount <= 0) stopStore();
      }, 1000);
    }
  };
};

const getSnapshot = () => storeInvitations;

export const useGameInvitations = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Start/stop singleton based on user
  useEffect(() => {
    if (!user) {
      stopStore();
      return;
    }
    startStore(user.id);
  }, [user?.id]);

  const pendingInvitations = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const fetchInvitations = useCallback(async () => {
    if (user) await fetchInvitationsFor(user.id);
  }, [user?.id]);

  // Send invitation to a friend
  const sendInvitation = useCallback(async (receiverId: string, lobbyCode: string, senderName: string) => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Delete any existing pending invitations from this sender to this receiver
      await supabase
        .from('game_invitations')
        .delete()
        .eq('sender_id', user.id)
        .eq('receiver_id', receiverId)
        .eq('status', 'pending');

      // Create new invitation
      const { error } = await supabase
        .from('game_invitations')
        .insert({
          sender_id: user.id,
          sender_name: senderName,
          receiver_id: receiverId,
          lobby_code: lobbyCode,
          status: 'pending'
        });

      if (error) throw error;
      toast.success('Invitation envoyée !');
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error("Erreur lors de l'envoi de l'invitation");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Accept invitation
  const acceptInvitation = useCallback(async (invitationId: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from('game_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitationId)
      .select()
      .single();

    if (error) {
      toast.error("Erreur lors de l'acceptation");
      return null;
    }

    setInvitations(storeInvitations.filter((inv) => inv.id !== invitationId));
    return data?.lobby_code || null;
  }, []);

  // Decline invitation
  const declineInvitation = useCallback(async (invitationId: string) => {
    const { error } = await supabase
      .from('game_invitations')
      .update({ status: 'declined' })
      .eq('id', invitationId);

    if (error) {
      toast.error('Erreur lors du refus');
      return;
    }

    setInvitations(storeInvitations.filter((inv) => inv.id !== invitationId));
  }, []);

  return {
    pendingInvitations,
    isLoading,
    sendInvitation,
    acceptInvitation,
    declineInvitation,
    refreshInvitations: fetchInvitations
  };
};