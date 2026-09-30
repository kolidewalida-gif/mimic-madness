import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

type Listener = () => void;
const inboxes = new Map<string, { listeners: Set<Listener>; stop: () => void }>();

/** Share one authenticated channel and recovery poll per signed-in user. */
export function subscribeInbox(userId: string, listener: Listener) {
  let inbox = inboxes.get(userId);
  if (!inbox) {
    const listeners = new Set<Listener>();
    const notify = () => listeners.forEach(refresh => refresh());
    const channel = supabase.channel(`player-inbox:${userId}`, { config: { private: true } })
      .on('broadcast', { event: 'inbox_changed' }, notify);
    let stopped = false;
    void supabase.realtime.setAuth().then(() => {
      if (!stopped) channel.subscribe(status => { if (status === 'SUBSCRIBED') notify(); });
    }).catch(() => { /* Visible-window polling still recovers the inbox. */ });
    const recover = () => { if (document.visibilityState === 'visible') notify(); };
    // This also supports older deployments until the SQL migration is applied.
    const poll = window.setInterval(recover, 2500);
    window.addEventListener('focus', recover);
    window.addEventListener('online', recover);
    document.addEventListener('visibilitychange', recover);
    inbox = { listeners, stop: () => {
      stopped = true; window.clearInterval(poll);
      window.removeEventListener('focus', recover); window.removeEventListener('online', recover);
      document.removeEventListener('visibilitychange', recover); void supabase.removeChannel(channel);
    } };
    inboxes.set(userId, inbox);
  }
  inbox.listeners.add(listener);
  return () => {
    inbox.listeners.delete(listener);
    if (!inbox.listeners.size) { inbox.stop(); inboxes.delete(userId); }
  };
}

export function useInboxRefresh(refresh: () => void) {
  const { user } = useAuth();
  const userId = user?.id;
  const latest = useRef(refresh); latest.current = refresh;
  useEffect(() => userId ? subscribeInbox(userId, () => latest.current()) : undefined, [userId]);
}
