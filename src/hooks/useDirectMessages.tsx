import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useInboxRefresh } from './useInboxRefresh';
import { dmMessageSchema, safeParse } from '@/lib/validation';

export interface DirectMessage {
  id: string; sender_id: string; receiver_id: string; content: string; created_at: string; read_at: string | null;
}
export function mergeDirectMessages(current: DirectMessage[], incoming: DirectMessage[]) {
  const rows = new Map(current.map(row => [row.id, row]));
  incoming.forEach(row => rows.set(row.id, { ...row, read_at: row.read_at ?? rows.get(row.id)?.read_at ?? null }));
  const next = [...rows.values()].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  return JSON.stringify(current) === JSON.stringify(next) ? current : next;
}

/** Latest messages first at the database, chronological in the conversation. */
export function useDirectMessages(friendUserId?: string | null) {
  const { user } = useAuth();
  const userId = user?.id;
  const scope = `${userId ?? ''}:${friendUserId ?? 'all'}`;
  const activeScope = useRef(scope); activeScope.current = scope;
  const pending = useRef<{ scope: string; promise: Promise<void> } | null>(null);
  const queued = useRef<string | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const sending = useRef(false);

  const queryThread = useCallback((before?: DirectMessage) => {
    let query = supabase.from('direct_messages').select('*').order('created_at', { ascending: false }).order('id', { ascending: false }).limit(200);
    const cursor = before ? `or(created_at.lt.${before.created_at},and(created_at.eq.${before.created_at},id.lt.${before.id}))` : '';
    if (friendUserId) query = query.or(`and(sender_id.eq.${userId},receiver_id.eq.${friendUserId}${cursor ? `,${cursor}` : ''}),and(sender_id.eq.${friendUserId},receiver_id.eq.${userId}${cursor ? `,${cursor}` : ''})`);
    else if (cursor) query = query.or(cursor.slice(3, -1));
    return query;
  }, [friendUserId, userId]);

  const load = useCallback((): Promise<void> => {
    if (!userId) { setMessages([]); setLoading(false); return Promise.resolve(); }
    if (pending.current?.scope === scope) { queued.current = scope; return pending.current.promise; }
    const request = { scope, promise: Promise.resolve() };
    request.promise = (async () => {
      try {
        const { data, error: failure } = await queryThread();
        if (activeScope.current !== scope) return;
        if (failure) { setError('La discussion ne peut pas être chargée.'); return; }
        setError(''); setHasMore((data?.length ?? 0) === 200);
        setMessages(previous => mergeDirectMessages(previous, data ?? []));
      } catch { if (activeScope.current === scope) setError('Connexion interrompue. On réessaie automatiquement.'); }
      finally {
        if (activeScope.current === scope) setLoading(false);
        if (pending.current === request) pending.current = null;
        if (queued.current === scope) { queued.current = null; if (activeScope.current === scope) void load(); }
      }
    })();
    pending.current = request; return request.promise;
  }, [userId, scope, queryThread]);

  useEffect(() => { setMessages([]); setError(''); setLoading(true); setHasMore(false); void load(); }, [load]);
  useInboxRefresh(() => { void load(); });

  const send = useCallback(async (content: string) => {
    const text = safeParse(dmMessageSchema, content);
    if (!userId || !friendUserId || !text || sending.current) return { data: null, error: new Error('Envoi impossible') };
    sending.current = true;
    try {
      const result = await supabase.from('direct_messages').insert({ sender_id: userId, receiver_id: friendUserId, content: text }).select().single();
      if (!result.error && result.data && activeScope.current === scope) setMessages(previous => mergeDirectMessages(previous, [result.data]));
      return result;
    } catch { return { data: null, error: new Error('Connexion interrompue') }; }
    finally { sending.current = false; }
  }, [userId, friendUserId, scope]);

  const markRead = useCallback(async (readUntil?: string) => {
    if (!userId || !friendUserId) return;
    let query = supabase.from('direct_messages').update({ read_at: new Date().toISOString() }).is('read_at', null).eq('receiver_id', userId).eq('sender_id', friendUserId);
    if (readUntil) query = query.lte('created_at', readUntil);
    const { error: failure } = await query;
    if (failure) throw failure;
    if (!failure && activeScope.current === scope) setMessages(previous => previous.map(row => row.receiver_id === userId && !row.read_at && (!readUntil || row.created_at <= readUntil) ? { ...row, read_at: new Date().toISOString() } : row));
  }, [userId, friendUserId, scope]);

  const loadOlder = async () => {
    if (!messages.length || loadingOlder || !hasMore) return;
    setLoadingOlder(true);
    try {
      const { data, error: failure } = await queryThread(messages[0]);
      if (activeScope.current !== scope) return;
      if (failure) { setError('Impossible de charger les messages précédents.'); return; }
      setHasMore((data?.length ?? 0) === 200); setMessages(previous => mergeDirectMessages(previous, data ?? []));
    } catch { if (activeScope.current === scope) setError('Connexion interrompue. Réessaie de charger l’historique.'); }
    finally { if (activeScope.current === scope) setLoadingOlder(false); }
  };
  const unreadFromFriend = useMemo(() => messages.filter(row => row.receiver_id === userId && !row.read_at).length, [messages, userId]);
  return { messages, loading, error, send, markRead, unreadFromFriend, refresh: load, hasMore, loadingOlder, loadOlder };
}

export function useUnreadCounts() {
  const { user } = useAuth();
  const userId = user?.id;
  const [counts, setCounts] = useState<Record<string, number>>({});
  const active = useRef(userId); active.current = userId;
  const busy = useRef<string | null>(null);
  const queued = useRef<string | null>(null);
  const load = useCallback(async (): Promise<void> => {
    if (!userId) { setCounts({}); return; }
    if (busy.current === userId) { queued.current = userId; return; }
    busy.current = userId;
    try {
      const { data, error } = await supabase.from('direct_messages').select('sender_id').eq('receiver_id', userId).is('read_at', null);
      if (error || !data || active.current !== userId) return;
      const next: Record<string, number> = {};
      data.forEach(row => { next[row.sender_id] = (next[row.sender_id] ?? 0) + 1; });
      setCounts(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    } catch { /* Keep the last known counters; reconnect will retry. */ }
    finally {
      if (busy.current === userId) busy.current = null;
      if (queued.current === userId) { queued.current = null; if (active.current === userId) void load(); }
    }
  }, [userId]);
  useEffect(() => { setCounts({}); void load(); }, [load]);
  useInboxRefresh(() => { void load(); });
  return counts;
}
