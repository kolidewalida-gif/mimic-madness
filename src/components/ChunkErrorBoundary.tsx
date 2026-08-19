import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

interface ChunkErrorBoundaryProps {
  children: ReactNode;
}

interface ChunkErrorBoundaryState {
  error: Error | null;
}

/**
 * A lazily imported chunk that fails to load must not take the session down.
 *
 * Screens and icon bundles are split into separate files, so a redeploy can
 * leave a still-open tab asking for a hash that no longer exists. The server
 * then answers with something that is not JavaScript and the dynamic import
 * throws. Without a boundary that error escapes rendering, React unmounts the
 * tree, the lobby channel closes and the game looks permanently stuck on
 * "Reconnexion…" while the real cause is invisible.
 *
 * A reload fetches the current index.html and its matching assets, which is
 * the only real remedy for a stale chunk reference.
 */
const isChunkLoadError = (error: Error): boolean =>
  /dynamically imported module|Importing a module script failed|Loading chunk|MIME type/i
    .test(`${error.name} ${error.message}`);

export class ChunkErrorBoundary extends Component<
  ChunkErrorBoundaryProps,
  ChunkErrorBoundaryState
> {
  state: ChunkErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ChunkErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[app] rendering failed:', error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const stale = isChunkLoadError(error);

    return (
      <div
        className="menu-screen-safe fixed inset-0 z-[10030] flex items-center justify-center bg-[#0a0510] p-4 text-white"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="chunk-error-title"
      >
        <div className="w-full max-w-sm rounded-3xl border border-white/15 bg-[#100b1d] p-6 text-center">
          <h2 id="chunk-error-title" className="text-2xl font-black">
            {stale ? 'Nouvelle version disponible' : 'Une erreur est survenue'}
          </h2>
          <p className="mt-2 text-sm font-medium text-white/60">
            {stale
              ? "Le jeu a été mis à jour pendant ta partie. Recharge la page pour récupérer la dernière version."
              : "L'écran n'a pas pu s'afficher. Recharge la page pour repartir d'un état propre."}
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="menu-focus mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 font-black transition-colors hover:bg-white/15"
          >
            <RefreshCw className="h-5 w-5" /> Recharger
          </button>
        </div>
      </div>
    );
  }
}
