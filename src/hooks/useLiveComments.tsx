import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface LiveComment {
  id: string;
  user_name: string;
  body: string;
  at: number; // timestamp
}

export const useLiveComments = (postId: string | null) => {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [posting, setPosting] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!postId) { setComments([]); return; }
    setComments([]); // reset on post change

    const ch = supabase
      .channel(`live-comments:${postId}`, { config: { broadcast: { self: true } } })
      .on('broadcast', { event: 'comment' }, (msg) => {
        const c = msg.payload as LiveComment;
        if (c?.id && c?.body) {
          setComments((prev) => [...prev.slice(-49), c]); // keep last 50
        }
      })
      .subscribe();

    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); channelRef.current = null; };
  }, [postId]);

  const sendComment = useCallback(async (body: string): Promise<boolean> => {
    if (!user || !postId || !body.trim()) return false;
    setPosting(true);
    const comment: LiveComment = {
      id: `${user.id}-${Date.now()}`,
      user_name: profile?.display_name || 'Joueur',
      body: body.trim().slice(0, 200),
      at: Date.now(),
    };
    try {
      const ch = channelRef.current;
      if (!ch) return false;
      await ch.send({ type: 'broadcast', event: 'comment', payload: comment });
      return true;
    } finally {
      setPosting(false);
    }
  }, [user, postId, profile]);

  return { comments, posting, sendComment };
};
