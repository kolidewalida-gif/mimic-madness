import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { useOnlinePresence } from '@/hooks/useOnlinePresence';
import { useGameInvitations } from '@/hooks/useGameInvitations';

export type NotifType = 'invite' | 'friend_request' | 'friend_online' | 'comment';

export interface AppNotification {
  id: string;
  type: NotifType;
  title: string;
  body?: string;
  ts: number;
  read: boolean;
}

const STORAGE_KEY = 'mimic.notifications.v1';
const MAX_ITEMS = 40;
// Don't re-notify that the same friend came online more than once per window.
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

const load = (): AppNotification[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AppNotification[]) : [];
  } catch {
    return [];
  }
};

const persist = (items: AppNotification[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    /* ignore quota */
  }
};

/**
 * useNotifications — a lightweight, Realtime-fed notification centre.
 *
 * Aggregates awareness events from systems that already exist:
 *   • game invitations   (useGameInvitations)
 *   • friend requests    (useFriends.pendingRequests)
 *   • a friend coming online (useOnlinePresence)
 *   • new comments on the current user's own clips (social_post_comments)
 *
 * The list is de-duplicated by a stable id and persisted to localStorage so
 * it survives navigation/remounts without re-notifying.
 */
export const useNotifications = () => {
  const { user } = useAuth();
  const { friends, pendingRequests } = useFriends();
  const { presenceState } = useOnlinePresence();
  const { pendingInvitations } = useGameInvitations();

  const [items, setItems] = useState<AppNotification[]>(() => load());
  const seenIds = useRef<Set<string>>(new Set(load().map((n) => n.id)));
  const myPostIds = useRef<Set<string>>(new Set());
  const onlineBaseline = useRef(false);
  const prevOnline = useRef<Set<string>>(new Set());

  const push = useCallback((incoming: Omit<AppNotification, 'read' | 'ts'> & { ts?: number }) => {
    if (seenIds.current.has(incoming.id)) return;
    seenIds.current.add(incoming.id);
    setItems((prev) => {
      const next = [{ ...incoming, ts: incoming.ts ?? Date.now(), read: false }, ...prev].slice(0, MAX_ITEMS);
      persist(next);
      return next;
    });
  }, []);

  // --- Game invitations -> notifications ---------------------------------
  useEffect(() => {
    for (const inv of pendingInvitations) {
      push({
        id: `invite:${inv.id}`,
        type: 'invite',
        title: `${inv.sender_name} t'invite à jouer`,
        body: `Lobby ${inv.lobby_code}`,
      });
    }
  }, [pendingInvitations, push]);

  // --- Friend requests -> notifications ----------------------------------
  useEffect(() => {
    for (const req of pendingRequests) {
      push({
        id: `friend_req:${req.id}`,
        type: 'friend_request',
        title: `${req.requesterProfile?.display_name || 'Un joueur'} veut t'ajouter`,
        body: 'Demande d’ami en attente',
      });
    }
  }, [pendingRequests, push]);

  // --- Friend comes online -----------------------------------------------
  useEffect(() => {
    const friendIds = new Set(friends.map((f) => f.user_id));
    const nowOnline = new Set<string>();
    for (const [uid, p] of Object.entries(presenceState)) {
      if (p.online && friendIds.has(uid)) nowOnline.add(uid);
    }
    // Skip the first pass so we don't announce everyone already online.
    if (!onlineBaseline.current) {
      onlineBaseline.current = true;
      prevOnline.current = nowOnline;
      return;
    }
    for (const uid of nowOnline) {
      if (!prevOnline.current.has(uid)) {
        const friend = friends.find((f) => f.user_id === uid);
        const bucket = Math.floor(Date.now() / ONLINE_WINDOW_MS);
        push({
          id: `online:${uid}:${bucket}`,
          type: 'friend_online',
          title: `${friend?.display_name || 'Un ami'} est en ligne`,
        });
      }
    }
    prevOnline.current = nowOnline;
  }, [presenceState, friends, push]);

  // --- Comments on my own clips ------------------------------------------
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      const { data } = await supabase.from('social_posts').select('id').eq('owner_id', user.id);
      if (cancelled) return;
      myPostIds.current = new Set((data ?? []).map((p: any) => p.id));
    })();

    const channel = supabase
      .channel(`notif-comments:${user.id}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'social_post_comments' },
        (payload) => {
          const c = payload.new as { id?: string; post_id?: string; user_id?: string; user_name?: string; body?: string };
          if (!c?.id || !c.post_id) return;
          if (c.user_id === user.id) return; // don't notify my own comments
          if (!myPostIds.current.has(c.post_id)) return; // only on my clips
          push({
            id: `comment:${c.id}`,
            type: 'comment',
            title: `${c.user_name || 'Un joueur'} a commenté ton clip`,
            body: c.body ? `« ${c.body.slice(0, 60)} »` : undefined,
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, push]);

  const unreadCount = items.reduce((n, x) => n + (x.read ? 0 : 1), 0);

  const markAllRead = useCallback(() => {
    setItems((prev) => {
      const next = prev.map((n) => (n.read ? n : { ...n, read: true }));
      persist(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((n) => n.id !== id);
      persist(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    persist([]);
  }, []);

  return { items, unreadCount, markAllRead, remove, clear };
};
