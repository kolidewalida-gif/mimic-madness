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
    setLoading(true);
    setError(null);
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
  }, [tab, weekKey, user]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Realtime: refresh on insert/delete + counter updates
  useEffect(() => {
    const channel = supabase
      .channel(`social-feed:${tab}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'social_posts' },
        () => fetchFeed(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'social_post_likes' },
        () => fetchFeed(),
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
      const { data, error: insertErr } = await supabase
        .from('social_posts')
        .insert({
          clip_id: clipId,
          challenge_clip_id: challengeClipId ?? null,
          owner_id: user.id,
          owner_name: (user as any).user_metadata?.full_name || user.email?.split('@')[0] || 'Joueur',
          caption: caption ?? null,
          week_key: weekKey,
        })
        .select()
        .single();
      if (insertErr) {
        console.error('[social] publish error', insertErr);
        return null;
      }
      return data as SocialPost;
    },
    [user, weekKey],
  );

  const toggleLike = useCallback(
    async (postId: string) => {
      if (!user) return;
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      // Optimistic update
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

      if (post.liked_by_me) {
        await supabase
          .from('social_post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('social_post_likes')
          .insert({ post_id: postId, user_id: user.id });
      }
    },
    [user, posts],
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
