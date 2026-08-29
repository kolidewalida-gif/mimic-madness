import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// `social_post_comments` is not yet in the generated Supabase types.
// Cast to any so this hook degrades gracefully until the table is added.
const db = supabase as any;

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
      const { data, error } = await db
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

  // Realtime — apply changes straight from the payload so a comment posted by
  // any player appears instantly for everyone, without reloading. INSERT rows
  // are appended (de-duplicated, replacing the author's optimistic copy);
  // DELETE rows are removed. REPLICA IDENTITY FULL (set in the migration)
  // guarantees the deleted row id is present in `payload.old`.
  useEffect(() => {
    if (!postId) return;
    const channel = supabase
      .channel(`comments:${postId}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'social_post_comments', filter: `post_id=eq.${postId}` },
        (payload) => {
          const row = payload.new as SocialComment;
          if (!row?.id) return;
          setComments((prev) => {
            if (prev.some((c) => c.id === row.id)) return prev; // already have it
            // Drop the matching optimistic (tmp-) entry from the author, if any.
            const withoutOptimistic = prev.filter(
              (c) => !(c.id.startsWith('tmp-') && c.user_id === row.user_id && c.body === row.body),
            );
            const merged = [...withoutOptimistic, row];
            merged.sort((a, b) => a.created_at.localeCompare(b.created_at));
            return merged;
          });
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'social_post_comments', filter: `post_id=eq.${postId}` },
        (payload) => {
          const removed = payload.old as { id?: string };
          if (!removed?.id) return;
          setComments((prev) => prev.filter((c) => c.id !== removed.id));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

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
        const { error } = await db.from('social_post_comments').insert({
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
    async (commentId: string): Promise<boolean> => {
      if (!user) return false;
      const { error } = await db
        .from('social_post_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id);
      if (error) return false;
      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
      return true;
    },
    [user],
  );

  return { comments, loading, posting, addComment, removeComment };
};
