import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const db = supabase as any;

export interface FollowRow {
  follower_id: string;
  following_id: string;
  created_at: string;
}

/**
 * useFollows — live follower/following lists for a target user (default: me).
 * Realtime-subscribed so toggling a follow elsewhere reflects instantly here.
 */
export const useFollows = (targetUserId?: string) => {
  const { user } = useAuth();
  const uid = targetUserId ?? user?.id ?? null;

  const [followers, setFollowers] = useState<FollowRow[]>([]);
  const [following, setFollowing] = useState<FollowRow[]>([]);
  const [myFollowingIds, setMyFollowingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!uid) { setFollowers([]); setFollowing([]); setLoading(false); return; }
    setLoading(true);
    const [{ data: f1 }, { data: f2 }] = await Promise.all([
      db.from('social_follows').select('*').eq('following_id', uid),
      db.from('social_follows').select('*').eq('follower_id', uid),
    ]);
    setFollowers((f1 ?? []) as FollowRow[]);
    setFollowing((f2 ?? []) as FollowRow[]);
    if (user) {
      const { data: mine } = await db.from('social_follows').select('following_id').eq('follower_id', user.id);
      setMyFollowingIds(new Set((mine ?? []).map((r: any) => r.following_id)));
    }
    setLoading(false);
  }, [uid, user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Realtime on the whole table — payloads are filtered client-side.
  useEffect(() => {
    if (!uid) return;
    const channel = supabase
      .channel(`follows:${uid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'social_follows' },
        (payload) => {
          const row = (payload.new ?? payload.old) as FollowRow;
          if (!row) return;
          if (row.follower_id === uid || row.following_id === uid || (user && (row.follower_id === user.id || row.following_id === user.id))) {
            fetchAll();
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [uid, user, fetchAll]);

  const isFollowing = useCallback((otherUserId: string) => myFollowingIds.has(otherUserId), [myFollowingIds]);

  const follow = useCallback(async (otherUserId: string) => {
    if (!user || otherUserId === user.id) return;
    setMyFollowingIds((prev) => new Set(prev).add(otherUserId));
    await db.from('social_follows').insert({ follower_id: user.id, following_id: otherUserId });
  }, [user]);

  const unfollow = useCallback(async (otherUserId: string) => {
    if (!user) return;
    setMyFollowingIds((prev) => { const n = new Set(prev); n.delete(otherUserId); return n; });
    await db.from('social_follows').delete().eq('follower_id', user.id).eq('following_id', otherUserId);
  }, [user]);

  const toggleFollow = useCallback(async (otherUserId: string) => {
    if (myFollowingIds.has(otherUserId)) await unfollow(otherUserId);
    else await follow(otherUserId);
  }, [myFollowingIds, follow, unfollow]);

  return {
    followers,
    following,
    followersCount: followers.length,
    followingCount: following.length,
    isFollowing,
    follow,
    unfollow,
    toggleFollow,
    loading,
    refresh: fetchAll,
  };
};
