import { useState, useEffect, useCallback, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { XpContext } from '@/contexts/XpContext';

interface Friend {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  status: 'pending' | 'accepted' | 'blocked';
  isRequester: boolean;
  currentLobby?: string | null;
}

interface FriendRequest {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  requesterProfile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export const useFriends = () => {
  const { user } = useAuth();
  const xpContext = useContext(XpContext);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFriends = useCallback(async () => {
    if (!user) {
      setFriends([]);
      setPendingRequests([]);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch all friendships involving current user
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (error) throw error;

      if (!friendships || friendships.length === 0) {
        setFriends([]);
        setPendingRequests([]);
        setIsLoading(false);
        return;
      }

      // Get all unique user IDs that are not the current user
      const otherUserIds = friendships.map(f => 
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );

      // Fetch profiles for all friends
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', otherUserIds);

      // Map friendships to friends
      const friendList: Friend[] = friendships
        .filter(f => f.status === 'accepted')
        .map(f => {
          const friendUserId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
          const profile = profiles?.find(p => p.user_id === friendUserId);
          return {
            id: f.id,
            user_id: friendUserId,
            display_name: profile?.display_name || null,
            avatar_url: profile?.avatar_url || null,
            status: 'accepted' as const,
            isRequester: f.requester_id === user.id
          };
        });

      // Get pending requests where current user is addressee
      const pending: FriendRequest[] = friendships
        .filter(f => f.status === 'pending' && f.addressee_id === user.id)
        .map(f => {
          const profile = profiles?.find(p => p.user_id === f.requester_id);
          return {
            id: f.id,
            requester_id: f.requester_id,
            addressee_id: f.addressee_id,
            status: f.status,
            requesterProfile: profile ? {
              display_name: profile.display_name,
              avatar_url: profile.avatar_url
            } : undefined
          };
        });

      setFriends(friendList);
      setPendingRequests(pending);
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    fetchFriends();

    const channel = supabase
      .channel(`friendships-changes-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `requester_id=eq.${user.id}`
        },
        () => fetchFriends()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `addressee_id=eq.${user.id}`
        },
        () => fetchFriends()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchFriends]);

  const sendFriendRequest = useCallback(async (friendCode: string) => {
    if (!user) throw new Error('Not authenticated');

    // Find user by friend code
    const { data: codeData, error: codeError } = await supabase
      .from('friend_codes')
      .select('user_id')
      .eq('code', friendCode.toUpperCase())
      .single();

    if (codeError || !codeData) {
      throw new Error('Code ami invalide');
    }

    if (codeData.user_id === user.id) {
      throw new Error('Vous ne pouvez pas vous ajouter vous-même');
    }

    // Check if friendship already exists
    const { data: existing } = await supabase
      .from('friendships')
      .select('*')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${codeData.user_id}),and(requester_id.eq.${codeData.user_id},addressee_id.eq.${user.id})`)
      .single();

    if (existing) {
      if (existing.status === 'accepted') {
        throw new Error('Vous êtes déjà amis');
      }
      if (existing.status === 'pending') {
        throw new Error('Une demande est déjà en attente');
      }
    }

    // Create friend request
    const { error } = await supabase
      .from('friendships')
      .insert({
        requester_id: user.id,
        addressee_id: codeData.user_id,
        status: 'pending'
      });

    if (error) throw error;

    await fetchFriends();
  }, [user, fetchFriends]);

  const acceptFriendRequest = useCallback(async (friendshipId: string) => {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId);

    if (error) throw error;
    await fetchFriends();
    
    // Award XP for making a new friend
    xpContext?.onFriendAdded();
  }, [fetchFriends, xpContext]);

  const rejectFriendRequest = useCallback(async (friendshipId: string) => {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    if (error) throw error;
    await fetchFriends();
  }, [fetchFriends]);

  const removeFriend = useCallback(async (friendshipId: string) => {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    if (error) throw error;
    await fetchFriends();
  }, [fetchFriends]);

  return {
    friends,
    pendingRequests,
    isLoading,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    refreshFriends: fetchFriends
  };
};
