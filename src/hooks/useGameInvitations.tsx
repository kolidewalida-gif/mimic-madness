import { useState, useEffect, useCallback, useRef } from 'react';
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

export const useGameInvitations = () => {
  const { user } = useAuth();
  const [pendingInvitations, setPendingInvitations] = useState<GameInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch pending invitations
  const fetchInvitations = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('game_invitations')
      .select('*')
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPendingInvitations(data);
    }
  }, [user]);

  // Subscribe to real-time invitation changes
  useEffect(() => {
    if (!user) return;

    fetchInvitations();

    const channel = supabase
      .channel(`game-invitations-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_invitations',
          filter: `receiver_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newInvitation = payload.new as GameInvitation;
            if (newInvitation.status === 'pending') {
              setPendingInvitations(prev => [newInvitation, ...prev]);
              // Trigger premium notification callback
              if (onNewInvitationCallback) {
                onNewInvitationCallback(newInvitation);
              }
            }
          } else if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
            fetchInvitations();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchInvitations]);

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

    setPendingInvitations(prev => prev.filter(inv => inv.id !== invitationId));
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

    setPendingInvitations(prev => prev.filter(inv => inv.id !== invitationId));
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