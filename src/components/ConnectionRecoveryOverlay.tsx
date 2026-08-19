import { useEffect } from 'react';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';
import { Loader2, RefreshCw, WifiOff } from 'lucide-react';

interface ConnectionRecoveryOverlayProps {
  state: 'offline' | 'reconnecting';
  onRetry: () => void;
}

export const ConnectionRecoveryOverlay = ({ state, onRetry }: ConnectionRecoveryOverlayProps) => {
  const offline = state === 'offline';
  const { setSituation, clearSituationOverride, autoMode } = useBackgroundMusic();

  useEffect(() => {
    if (autoMode) {
      // Changing situation preserves the current play/pause state. Do not force
      // playback: a player who paused music explicitly stays in control.
      setSituation('connection', { priority: 10, source: 'connection-recovery' });
    }
    return () => clearSituationOverride('connection-recovery');
  }, [autoMode, setSituation, clearSituationOverride]);

  // Browsers fire `online` as soon as connectivity comes back. Retry
  // immediately so players do not have to press the button after a short drop.
  useEffect(() => {
    if (!offline) return;
    const retryWhenOnline = () => onRetry();
    window.addEventListener('online', retryWhenOnline);
    return () => window.removeEventListener('online', retryWhenOnline);
  }, [offline, onRetry]);

  // Reconnecting is a transient, self-healing state: the channel is rebuilt
  // automatically in the background. Locking the whole screen for it stopped
  // players mid-upload and made every control look broken, so it gets a banner
  // instead. Only a genuine loss of connectivity blocks the game.
  if (!offline) {
    return (
      <div
        className="menu-screen-safe pointer-events-none fixed inset-x-0 top-0 z-[10020] flex justify-center p-3"
        role="status"
        aria-live="polite"
      >
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/15 bg-[#100b1d]/95 px-4 py-2.5 text-white shadow-2xl">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--ink-accent-text)]" />
          <span className="text-sm font-black">Reconnexion…</span>
          <button
            type="button"
            onClick={onRetry}
            className="menu-focus inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] transition-colors hover:bg-white/15"
          >
            <RefreshCw className="h-3 w-3" /> Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="menu-dialog menu-screen-safe fixed inset-0 z-[10020] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="connection-recovery-title"
      aria-describedby="connection-recovery-description"
    >
      <div className="w-full max-w-sm rounded-3xl border border-white/15 bg-[#100b1d] p-6 text-center text-white shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/5">
          <WifiOff className="h-7 w-7 text-rose-400" />
        </div>
        <h2 id="connection-recovery-title" className="text-2xl font-black">
          Connexion perdue
        </h2>
        <p id="connection-recovery-description" className="mt-2 text-sm font-medium text-white/60">
          La partie est conservée. Vérifie ton réseau puis réessaie.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="menu-focus mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 font-black transition-colors hover:bg-white/15"
        >
          <RefreshCw className="h-5 w-5" /> Réessayer
        </button>
      </div>
    </div>
  );
};
