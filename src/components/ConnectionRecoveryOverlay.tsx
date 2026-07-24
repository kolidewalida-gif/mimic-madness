import { Loader2, RefreshCw, WifiOff } from 'lucide-react';

interface ConnectionRecoveryOverlayProps {
  state: 'offline' | 'reconnecting';
  onRetry: () => void;
}

export const ConnectionRecoveryOverlay = ({ state, onRetry }: ConnectionRecoveryOverlayProps) => {
  const offline = state === 'offline';

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
          {offline ? <WifiOff className="h-7 w-7 text-rose-400" /> : <Loader2 className="h-7 w-7 animate-spin text-purple-300" />}
        </div>
        <h2 id="connection-recovery-title" className="text-2xl font-black">
          {offline ? 'Connexion perdue' : 'Reconnexion…'}
        </h2>
        <p id="connection-recovery-description" className="mt-2 text-sm font-medium text-white/60">
          {offline
            ? 'La partie est conservée. Vérifie ton réseau puis réessaie.'
            : 'Synchronisation du lobby et de la manche en cours.'}
        </p>
        <button
          type="button"
          onClick={onRetry}
          disabled={!offline && !navigator.onLine}
          className="menu-focus mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 font-black transition-colors hover:bg-white/15 disabled:opacity-50"
        >
          <RefreshCw className="h-5 w-5" /> Réessayer
        </button>
      </div>
    </div>
  );
};
