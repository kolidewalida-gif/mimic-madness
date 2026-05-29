import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface SocialComment {
  id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  body: string;
  created_at: string;
}

/**
 * useSocialComments — read + post comments on a social feed post.
 * Realtime-subscribed so new comments from any client appear instantly.
 * Gracefully degrades if the comments table doesn't exist yet (returns empty).
 */
export const useSocialComments = (postId: string | null) => {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<SocialComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);

  const fetchComments = useCallback(async () => {
    if (!postId) {
      setComments([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('social_post_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      if (!error && data) {
        setComments((prev) => {
          // Keep any optimistic (tmp-*) comments that haven't been confirmed yet
          const optimistic = prev.filter((c) => c.id.startsWith('tmp-'));
          const confirmed = data as SocialComment[];
          // Merge: confirmed first, then any optimistic not yet in confirmed
          const confirmedIds = new Set(confirmed.map((c) => c.id));
          const pendingOptimistic = optimistic.filter((c) => !confirmedIds.has(c.id));
          return [...confirmed, ...pendingOptimistic];
        });
      }
    } catch {
      /* table may not exist yet — degrade gracefully */
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Realtime
  useEffect(() => {
    if (!postId) return;
    const channel = supabase
      .channel(`comments:${postId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'social_post_comments', filter: `post_id=eq.${postId}` },
        () => fetchComments(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, fetchComments]);

  const addComment = useCallback(
    async (body: string): Promise<boolean> => {
      if (!user || !postId) return false;
      const trimmed = body.trim().slice(0, 300);
      if (!trimmed) return false;
      setPosting(true);
      // Optimistic
      const optimistic: SocialComment = {
        id: `tmp-${Date.now()}`,
        post_id: postId,
        user_id: user.id,
        user_name: profile?.display_name || 'Joueur',
        body: trimmed,
        created_at: new Date().toISOString(),
      };
      setComments((prev) => [...prev, optimistic]);
      try {
        const { error } = await supabase.from('social_post_comments').insert({
          post_id: postId,
          user_id: user.id,
          user_name: profile?.display_name || 'Joueur',
          body: trimmed,
        });
        if (error) {
          setComments((prev) => prev.filter((c) => c.id !== optimistic.id));
          return false;
        }
        return true;
      } finally {
        setPosting(false);
      }
    },
    [user, postId, profile],
  );

  const removeComment = useCallback(
    async (commentId: string) => {
      if (!user) return;
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      await supabase.from('social_post_comments').delete().eq('id', commentId).eq('user_id', user.id);
    },
    [user],
  );

  return { comments, loading, posting, addComment, removeComment };
};
