import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const db = supabase as any;

export interface SocialReaction {
  id: string;
  post_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

/**
 * useSocialReactions — emoji reactions on a post with live Realtime sync.
 */
export const useSocialReactions = (postId: string | null) => {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<SocialReaction[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!postId) { setReactions([]); return; }
    setLoading(true);
    const { data } = await db
      .from('social_post_reactions')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    setReactions((data ?? []) as SocialReaction[]);
    setLoading(false);
  }, [postId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!postId) return;
    const channel = supabase
      .channel(`reactions:${postId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'social_post_reactions', filter: `post_id=eq.${postId}` },
        (payload) => setReactions((prev) => (prev.some((r) => r.id === (payload.new as any).id) ? prev : [...prev, payload.new as SocialReaction])),
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'social_post_reactions', filter: `post_id=eq.${postId}` },
        (payload) => setReactions((prev) => prev.filter((r) => r.id !== (payload.old as any).id)),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [postId]);

  const myReaction = user ? reactions.find((r) => r.user_id === user.id) ?? null : null;

  const toggle = useCallback(async (emoji: string) => {
    if (!user || !postId) return;
    const existing = reactions.find((r) => r.user_id === user.id);
    if (existing && existing.emoji === emoji) {
      setReactions((prev) => prev.filter((r) => r.id !== existing.id));
      await db.from('social_post_reactions').delete().eq('id', existing.id);
      return;
    }
    if (existing) {
      await db.from('social_post_reactions').delete().eq('id', existing.id);
    }
    await db.from('social_post_reactions').insert({ post_id: postId, user_id: user.id, emoji });
  }, [user, postId, reactions]);

  const counts = reactions.reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
    return acc;
  }, {});

  return { reactions, counts, myReaction, loading, toggle, refresh: fetchAll };
};
