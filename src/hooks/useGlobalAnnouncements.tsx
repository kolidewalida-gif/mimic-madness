import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type Announcement = {
  id: string;
  title: string | null;
  message: string;
  severity: string;
  created_by: string;
  created_at: string;
  expires_at: string | null;
};

export const useGlobalAnnouncements = () => {
  const { user } = useAuth();
  const [pending, setPending] = useState<Announcement[]>([]);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setPending([]);
      return;
    }
    const { data: all } = await supabase
      .from('global_announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    const active = ((all ?? []) as Announcement[]).filter(
      a => !a.expires_at || new Date(a.expires_at).getTime() > Date.now()
    );
    if (active.length === 0) {
      setPending([]);
      return;
    }
    const { data: acks } = await supabase
      .from('announcement_acks')
      .select('announcement_id')
      .eq('user_id', user.id)
      .in('announcement_id', active.map(a => a.id));
    const acked = new Set((acks ?? []).map((a: any) => a.announcement_id));
    setPending(active.filter(a => !acked.has(a.id)).reverse());
  }, [user?.id]);

  useEffect(() => {
    refresh();
    if (!user?.id) return;
    const ch = supabase
      .channel('global-announcements')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'global_announcements' },
        () => refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, refresh]);

  const ack = useCallback(
    async (id: string) => {
      if (!user?.id) return;
      await supabase.from('announcement_acks').insert({ announcement_id: id, user_id: user.id });
      setPending(prev => prev.filter(a => a.id !== id));
    },
    [user?.id]
  );

  return { pending, ack, refresh };
};