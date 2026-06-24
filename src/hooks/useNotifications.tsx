import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const db = supabase as any;

export interface AppNotification {
  id: string;
  user_id: string;
  actor_id: string | null;
  actor_name: string | null;
  type: 'like' | 'reaction' | 'follow' | string;
  post_id: string | null;
  emoji: string | null;
  is_read: boolean;
  created_at: string;
}

/**
 * useNotifications — live feed of notifications for the current user.
 * Subscribes to Realtime INSERT/UPDATE/DELETE on `public.notifications`
 * filtered by `user_id=eq.<me>` so the list stays in sync without reload.
 */
export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await db
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifications((data ?? []) as AppNotification[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => setNotifications((prev) => [payload.new as AppNotification, ...prev].slice(0, 50)),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => setNotifications((prev) => prev.map((n) => (n.id === (payload.new as any).id ? (payload.new as AppNotification) : n))),
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => setNotifications((prev) => prev.filter((n) => n.id !== (payload.old as any).id)),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = useCallback(async (id: string) => {
    if (!user) return;
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    await db.from('notifications').update({ is_read: true }).eq('id', id).eq('user_id', user.id);
  }, [user]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await db.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
  }, [user]);

  const remove = useCallback(async (id: string) => {
    if (!user) return;
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await db.from('notifications').delete().eq('id', id).eq('user_id', user.id);
  }, [user]);

  return { notifications, loading, unreadCount, markAsRead, markAllAsRead, remove, refresh: fetchAll };
};
