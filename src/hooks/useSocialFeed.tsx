import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { weeklyPeriodKey } from '@/lib/questDefinitions';

export interface SocialPost {
  id: string;
  clip_id: string;
  challenge_clip_id: string | null;
  owner_id: string;
  owner_name: string;
  caption: string | null;
  week_key: string;
  likes_count: number;
  views_count: number;
  comments_count?: number;
  is_featured: boolean;
  created_at: string;
  /** computed client-side: did the current user already like this post? */
  liked_by_me?: boolean;
}

export type SocialFeedTab = 'top_week' | 'recent' | 'mine';

/**
 * useSocialFeed — read + interact with the public Imitation feed.
 *
 *  - 'top_week': posts of the current ISO week, sorted by likes.
 *  - 'recent':   latest posts across the whole feed.
 *  - 'mine':     posts owned by the current user.
 *  - publish(clipId, caption?, challengeClipId?): create a post.
 *  - toggleLike(postId): like / unlike.
 *  - remove(postId): owner-only delete.
 *
 * Realtime: subscribes to `social_posts` and `social_post_likes` so counters
 * and new posts appear instantly across clients.
 */
export const useSocialFeed = (tab: SocialFeedTab = 'top_week') => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const weekKey = weeklyPeriodKey();

  const fetchFeed = useCallback(async () => {
    setError(null);
    // Only show the full-page loader on the very first fetch. Subsequent
    // refetches (triggered by realtime updates like a like) keep the
    // existing posts visible to avoid unmounting the viewer.
    setLoading((prev) => (posts.length === 0 ? true : prev));
    try {
      let query = supabase
        .from('social_posts')
        .select('*')
        .eq('is_hidden', false);

      if (tab === 'top_week') {
        query = query.eq('week_key', weekKey).order('likes_count', { ascending: false }).limit(10);
      } else if (tab === 'recent') {
        query = query.order('created_at', { ascending: false }).limit(40);
      } else if (tab === 'mine') {
        if (!user) {
          setPosts([]);
          setLoading(false);
          return;
        }
        query = query.eq('owner_id', user.id).order('created_at', { ascending: false }).limit(40);
      }

      const { data, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;

      let enriched = (data ?? []) as SocialPost[];

      // Hydrate `liked_by_me` for the current user (one query, all posts)
      if (user && enriched.length > 0) {
        const ids = enriched.map((p) => p.id);
        const { data: likes } = await supabase
          .from('social_post_likes')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', ids);
        const liked = new Set((likes ?? []).map((l) => l.post_id));
        enriched = enriched.map((p) => ({ ...p, liked_by_me: liked.has(p.id) }));
      }

      setPosts(enriched);
    } catch (err: any) {
      console.error('[social] fetch error', err);
      setError(err?.message ?? 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, weekKey, user]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Realtime: refresh on insert/delete + counter updates.
  // We only listen to `social_posts` directly — `social_post_likes` is
  // implicit because the trigger on the like table updates `likes_count`
  // on `social_posts`, which fires the row UPDATE we listen for. This
  // avoids double-fetching on every like.
  useEffect(() => {
    const channel = supabase
      .channel(`social-feed:${tab}`)
      // New / removed posts require a full refetch (ordering, membership).
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'social_posts' },
        () => fetchFeed(),
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'social_posts' },
        () => fetchFeed(),
      )
      // Counter changes (likes/comments/views) are patched in place so the
      // feed never reloads — the "For You" video keeps playing on every like.
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'social_posts' },
        (payload) => {
          const next = payload.new as Partial<SocialPost> & { id?: string };
          if (!next?.id) return;
          setPosts((prev) =>
            prev.map((p) =>
              p.id === next.id
                ? {
                    ...p,
                    likes_count: next.likes_count ?? p.likes_count,
                    comments_count: next.comments_count ?? p.comments_count,
                    views_count: next.views_count ?? p.views_count,
                    caption: next.caption ?? p.caption,
                    is_featured: next.is_featured ?? p.is_featured,
                  }
                : p,
            ),
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tab, fetchFeed]);

  const publish = useCallback(
    async (
      clipId: string,
      caption?: string | null,
      challengeClipId?: string | null,
    ): Promise<SocialPost | null> => {
      if (!user) return null;
      // Server-side RPC: validates clip ownership against video_clips,
      // enforces 3-posts-per-day quota, trims caption, sets owner_name from
      // profile. Replaces the open `.insert()` that allowed publishing
      // arbitrary clips.
      const { data: postId, error: rpcErr } = await supabase.rpc(
        'publish_social_post',
        {
          p_clip_id: clipId,
          p_challenge_clip_id: challengeClipId ?? null,
          p_caption: caption ?? null,
        },
      );
      if (rpcErr || !postId) {
        console.error('[social] publish error', rpcErr);
        return null;
      }
      // Hydrate the new row so the caller can show feedback / id.
      const { data: row } = await supabase
        .from('social_posts')
        .select('*')
        .eq('id', postId)
        .maybeSingle();
      return (row as SocialPost) ?? null;
    },
    [user],
  );

  const toggleLike = useCallback(
    async (postId: string) => {
      if (!user) return;

      // Optimistic update. Uses a functional update so this callback keeps a
      // stable identity (deps: [user]) — otherwise it changes on every fetch
      // and forces the memoized viewer to re-render / the video to restart.
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                liked_by_me: !p.liked_by_me,
                likes_count: p.likes_count + (p.liked_by_me ? -1 : 1),
              }
            : p,
        ),
      );

      // Server RPC: idempotent toggle. Avoids race where two clicks insert
      // duplicate likes (rare but possible) and centralizes the auth check.
      await supabase.rpc('toggle_social_like', { p_post_id: postId });
    },
    [user],
  );

  const remove = useCallback(
    async (postId: string) => {
      if (!user) return;
      await supabase.from('social_posts').delete().eq('id', postId).eq('owner_id', user.id);
      // Realtime listener will refresh; optimistically drop it now
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    },
    [user],
  );

  return {
    posts,
    loading,
    error,
    publish,
    toggleLike,
    remove,
    refresh: fetchFeed,
  };
};
