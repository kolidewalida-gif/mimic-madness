import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'recentLobbies';
const MAX_ENTRIES = 8;

export interface RecentLobby {
  code: string;
  joinedAt: number;
}

/** Persisted list of recently joined lobby codes (most recent first). */
export const useRecentLobbies = () => {
  const [recent, setRecent] = useState<RecentLobby[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as RecentLobby[];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (it) => typeof it?.code === 'string' && typeof it?.joinedAt === 'number',
      );
    } catch {
      return [];
    }
  });

  const persist = useCallback((next: RecentLobby[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* noop: storage may be full */
    }
  }, []);

  /** Push a new lobby code to the top of the list (deduplicated, capped). */
  const pushLobby = useCallback(
    (code: string) => {
      const trimmed = code.trim().toUpperCase();
      if (!trimmed) return;
      setRecent((prev) => {
        const filtered = prev.filter((it) => it.code !== trimmed);
        const next = [{ code: trimmed, joinedAt: Date.now() }, ...filtered].slice(
          0,
          MAX_ENTRIES,
        );
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const removeLobby = useCallback(
    (code: string) => {
      const trimmed = code.trim().toUpperCase();
      setRecent((prev) => {
        const next = prev.filter((it) => it.code !== trimmed);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const clear = useCallback(() => {
    setRecent([]);
    persist([]);
  }, [persist]);

  // Sync across tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      try {
        const parsed = e.newValue
          ? (JSON.parse(e.newValue) as RecentLobby[])
          : [];
        setRecent(Array.isArray(parsed) ? parsed : []);
      } catch {
        /* noop */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return { recent, pushLobby, removeLobby, clear };
};
