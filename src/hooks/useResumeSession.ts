import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * useResumeSession — Auto-recovery for crashed/closed-tab sessions.
 *
 * When a player joins a lobby we persist a small breadcrumb in localStorage:
 *   { lobbyCode, lobbyId, playerId, playerName, savedAt }
 *
 * On app boot, this hook:
 *   1. Reads the breadcrumb (if any).
 *   2. Verifies the lobby still exists and the player is still listed.
 *   3. If so, exposes a `resumable` payload so the app can offer
 *      "Reprendre la partie" or auto-rejoin.
 *   4. Clears stale breadcrumbs that point to deleted lobbies / kicked players
 *      so the UX doesn't keep prompting for a session that's already gone.
 *
 * Breadcrumb is updated on every state change via `saveResumeSession` and
 * cleared via `clearResumeSession` when the user voluntarily leaves.
 */

const STORAGE_KEY = 'mimic-master-active-session';
const MAX_AGE_MS = 1000 * 60 * 60 * 6; // 6h — beyond this we assume it's stale

export interface ResumeSession {
  lobbyCode: string;
  lobbyId: string;
  playerId: string;
  playerName: string;
  savedAt: number;
}

export const saveResumeSession = (session: Omit<ResumeSession, 'savedAt'>) => {
  try {
    const payload: ResumeSession = { ...session, savedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota/private mode errors */
  }
};

export const clearResumeSession = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
};

export const readResumeSession = (): ResumeSession | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ResumeSession;
    if (!parsed?.lobbyCode || !parsed?.lobbyId || !parsed?.playerId) return null;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export type ResumeStatus =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'ready'; session: ResumeSession }
  | { kind: 'stale' }
  | { kind: 'none' };

interface UseResumeSessionOptions {
  enabled: boolean;
}

/**
 * Reactive snapshot of "is there a resumable session and is it still valid?".
 * Components can poll this hook on mount to decide whether to show a banner
 * or auto-rejoin. Pass `enabled=false` while still on home before the app is
 * ready to accept a rejoin (e.g. during the splash animation).
 */
export const useResumeSession = ({ enabled }: UseResumeSessionOptions) => {
  const [status, setStatus] = useState<ResumeStatus>({ kind: 'idle' });

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const session = readResumeSession();
    if (!session) {
      setStatus({ kind: 'none' });
      return;
    }

    setStatus({ kind: 'checking' });

    const verify = async () => {
      try {
        const { data: lobby } = await supabase
          .from('lobbies')
          .select('id, code, status')
          .eq('id', session.lobbyId)
          .maybeSingle();

        if (!lobby || lobby.code !== session.lobbyCode) {
          if (!cancelled) {
            clearResumeSession();
            setStatus({ kind: 'stale' });
          }
          return;
        }

        const { data: player } = await supabase
          .from('lobby_players')
          .select('player_id')
          .eq('lobby_id', session.lobbyId)
          .eq('player_id', session.playerId)
          .maybeSingle();

        if (!player) {
          if (!cancelled) {
            clearResumeSession();
            setStatus({ kind: 'stale' });
          }
          return;
        }

        if (!cancelled) setStatus({ kind: 'ready', session });
      } catch (err) {
        // Network failure — keep the breadcrumb so the user can retry, but
        // surface "stale" so we don't auto-prompt aggressively.
        console.error('[resume] verification failed:', err);
        if (!cancelled) setStatus({ kind: 'stale' });
      }
    };

    void verify();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return status;
};
