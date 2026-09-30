import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { useInboxRefresh } from './useInboxRefresh';
import { messagingClient, type MessageGroup, type GroupMessage } from '@/lib/messagingClient';
import { dmMessageSchema, safeParse } from '@/lib/validation';

export function useMessageGroups() {
  const { user } = useAuth(); const userId = user?.id;
  const [groups, setGroups] = useState<MessageGroup[]>([]);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const active = useRef(userId); active.current = userId;
  const busy = useRef<string | null>(null);
  const flight = useRef<Promise<void> | null>(null);
  const queued = useRef<string | null>(null);
  const refresh = useCallback((): Promise<void> => {
    if (!userId) return Promise.resolve();
    if (busy.current === userId) { queued.current = userId; return flight.current ?? Promise.resolve(); }
    busy.current = userId;
    const request = (async () => {
    try {
      const { data, error: failure } = await messagingClient.rpc('get_message_groups');
      if (active.current !== userId) return;
      if (failure) { setAvailable(false); setError('Les groupes ne sont pas disponibles pour le moment.'); return; }
      setAvailable(true); setError('');
      const next = (Array.isArray(data) ? data : []) as unknown as MessageGroup[];
      setGroups(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    } catch { if (active.current === userId) setError('Connexion interrompue. On réessaie automatiquement.'); }
    finally {
      if (busy.current === userId) busy.current = null;
      if (queued.current === userId) { queued.current = null; if (active.current === userId) void refresh(); }
    }
    })();
    flight.current = request; return request;
  }, [userId]);
  useEffect(() => { setGroups([]); setAvailable(null); setError(''); void refresh(); }, [refresh]);
  useInboxRefresh(() => { void refresh(); });
  const create = async (name: string, ids: string[]) => {
    const result = await messagingClient.rpc('create_message_group', { p_name: name.trim(), p_member_ids: ids });
    if (result.error) throw result.error;
    if (flight.current) await flight.current;
    await refresh(); return result.data;
  };
  const update = async (id: string, name: string, ids: string[]) => {
    const { error: failure } = await messagingClient.rpc('update_message_group', { p_group_id: id, p_name: name.trim(), p_add_members: ids });
    if (failure) throw failure;
    if (flight.current) await flight.current;
    await refresh();
  };
  const leave = async (id: string) => {
    const { error: failure } = await messagingClient.rpc('leave_message_group', { p_group_id: id });
    if (failure) throw failure;
    if (flight.current) await flight.current;
    await refresh();
  };
  return { groups, available, error, refresh, create, update, leave };
}

export function useGroupMessages(groupId: string | null) {
  const { user } = useAuth(); const userId = user?.id;
  const scope = `${userId}:${groupId}`; const active = useRef(scope); active.current = scope;
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false); const [loadingOlder, setLoadingOlder] = useState(false);
  const busy = useRef<string | null>(null); const sending = useRef(false);
  const queued = useRef<string | null>(null);
  const refresh = useCallback(async (): Promise<void> => {
    if (!userId || !groupId) return;
    if (busy.current === scope) { queued.current = scope; return; }
    busy.current = scope;
    try {
      const { data, error: failure } = await messagingClient.from('group_messages').select('*').eq('group_id', groupId).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(200);
      if (active.current !== scope) return;
      if (failure) { setError('Impossible de charger le groupe.'); return; }
      setError(''); setHasMore((data?.length ?? 0) === 200);
      setMessages(previous => {
        const merged = new Map(previous.map(row => [row.id, row])); data?.forEach(row => merged.set(row.id, row));
        const next = [...merged.values()].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
        return JSON.stringify(previous) === JSON.stringify(next) ? previous : next;
      });
    } catch { if (active.current === scope) setError('Connexion interrompue.'); }
    finally {
      if (active.current === scope) setLoading(false);
      if (busy.current === scope) busy.current = null;
      if (queued.current === scope) { queued.current = null; if (active.current === scope) void refresh(); }
    }
  }, [userId, groupId, scope]);
  useEffect(() => { setMessages([]); setLoading(!!groupId); setError(''); setHasMore(false); void refresh(); }, [refresh, groupId]);
  useInboxRefresh(() => { void refresh(); });
  const send = async (content: string) => {
    const text = safeParse(dmMessageSchema, content);
    if (!userId || !groupId || !text || sending.current) return { data: null, error: new Error('Envoi impossible') };
    sending.current = true;
    try {
      const result = await messagingClient.from('group_messages').insert({ group_id: groupId, sender_id: userId, content: text }).select().single();
      if (!result.error && result.data && active.current === scope) setMessages(previous => previous.some(row => row.id === result.data!.id) ? previous : [...previous, result.data!]);
      return result;
    } catch { return { data: null, error: new Error('Connexion interrompue') }; }
    finally { sending.current = false; }
  };
  const markRead = useCallback(async (until: string) => {
    if (groupId) {
      const { error: failure } = await messagingClient.rpc('mark_message_group_read', { p_group_id: groupId, p_read_until: until });
      if (failure) throw failure;
    }
  }, [groupId]);
  const loadOlder = async () => {
    if (!groupId || !hasMore || !messages.length || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const first = messages[0];
      const { data, error: failure } = await messagingClient.from('group_messages').select('*').eq('group_id', groupId).or(`created_at.lt.${first.created_at},and(created_at.eq.${first.created_at},id.lt.${first.id})`).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(200);
      if (active.current !== scope) return;
      if (failure) { setError('Impossible de charger les messages précédents.'); return; }
      setHasMore((data?.length ?? 0) === 200);
      setMessages(previous => [...new Map([...(data ?? []).reverse(), ...previous].map(row => [row.id, row])).values()]);
    } catch { setError('Connexion interrompue.'); }
    finally { setLoadingOlder(false); }
  };
  return { messages, loading, error, send, markRead, hasMore, loadingOlder, loadOlder };
}
