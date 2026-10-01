import { useCallback, useEffect, useRef, useState } from 'react';
import { castMimicMaster, readMimicMasters } from '@/lib/mimicMasterClient';
import type { MimicMasterChoice } from '@/lib/mimicMaster';

export function useMimicMaster(lobbyId: string, roundNumber: number, self: string) {
  const [snapshot, setSnapshot] = useState<{
    scope: string; status: 'loading' | 'ready' | 'unavailable' | 'error'; choice: MimicMasterChoice | null;
  }>({ scope: '', status: 'loading', choice: null });
  const [pending, setPending] = useState(false);
  const scope = `${lobbyId}:${roundNumber}:${self}`;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const writeLock = useRef(false);
  const refreshRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    let active = true;
    let request = 0;
    let reading: Promise<void> | null = null;
    setSnapshot({ scope, status: 'loading', choice: null });
    const load = async () => {
      if (!active) return;
      const token = ++request;
      try {
        const result = await readMimicMasters(lobbyId, roundNumber, self);
        if (!active || token !== request) return;
        setSnapshot({ scope, status: result.available ? 'ready' : 'unavailable',
          choice: result.choices.find(choice => choice.voterPlayerId === self) ?? null });
      } catch {
        if (active && token === request) {
          setSnapshot(previous => ({ ...previous, scope, status: 'error' }));
        }
      }
    };
    const refresh = () => {
      if (reading) return reading;
      reading = load().finally(() => { reading = null; });
      return reading;
    };
    refreshRef.current = async () => {
      // A polling read begun before the write may still be in flight. Wait for
      // it, then force a fresh read instead of applying its pre-write snapshot.
      if (reading) await reading;
      await refresh();
    };
    void refresh();
    // HTTP recovery remains independent of Realtime, including a lost write response.
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 4000);
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false; request++;
      clearInterval(timer);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [lobbyId, roundNumber, self, scope]);

  const choose = useCallback(async (targetIds: string[], sessionId: string, expectedIndex: number) => {
    if (writeLock.current || snapshot.scope !== scope || snapshot.status !== 'ready' || snapshot.choice) return false;
    writeLock.current = true;
    setPending(true);
    const writeScope = scope;
    try {
      const inserted = await castMimicMaster({ lobbyId, roundNumber, playerId: self,
        targetIds, sessionId, expectedIndex });
      if (scopeRef.current === writeScope) await refreshRef.current();
      return inserted;
    } catch (error) {
      if (scopeRef.current === writeScope) await refreshRef.current();
      throw error;
    } finally {
      writeLock.current = false;
      setPending(false);
    }
  }, [lobbyId, roundNumber, self, scope, snapshot]);

  return { status: snapshot.scope === scope ? snapshot.status : 'loading',
    choice: snapshot.scope === scope ? snapshot.choice : null, pending, choose,
    retry: () => refreshRef.current() };
}
