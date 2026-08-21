import { useEffect, useMemo, useState } from 'react';
import { Activity, ChevronDown, ChevronUp, Copy, Trash2, Check } from 'lucide-react';
import {
  clearDiagnostics,
  formatDiagnostics,
  subscribeDiagnostics,
  type DiagnosticEntry,
} from '@/lib/diagnostics';

/**
 * Panneau de diagnostic réservé aux administrateurs.
 *
 * Les logs Supabase montrent ce qui arrive au serveur, jamais ce que le client
 * a décidé de ne pas envoyer. Or c'est précisément là que se logent les écrans
 * bloqués en attente : abonnement temps réel qui n'aboutit pas, instantané
 * refusé, lecture jamais tentée. Ce panneau rend cette moitié manquante visible,
 * et copiable d'un clic pour être transmise telle quelle.
 */

const LEVEL_STYLE: Record<DiagnosticEntry['level'], { color: string; background: string }> = {
  info: { color: '#93c5fd', background: 'rgba(59,130,246,0.12)' },
  warn: { color: '#fcd34d', background: 'rgba(251,191,36,0.14)' },
  error: { color: '#fca5a5', background: 'rgba(239,68,68,0.16)' },
};

const FONT = "'Outfit', sans-serif";

interface DiagnosticsOverlayProps {
  /** Le panneau ne se monte que pour un administrateur. */
  enabled: boolean;
}

export const DiagnosticsOverlay = ({ enabled }: DiagnosticsOverlayProps) => {
  const [entries, setEntries] = useState<DiagnosticEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [justCopied, setJustCopied] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  useEffect(() => {
    if (!enabled) return;
    return subscribeDiagnostics(setEntries);
  }, [enabled]);

  // L'état réseau explique à lui seul une bonne partie des blocages.
  useEffect(() => {
    if (!enabled) return;
    const update = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, [enabled]);

  const errorCount = useMemo(
    () => entries.filter((entry) => entry.level === 'error').length,
    [entries],
  );

  // Les dernières entrées d'abord : c'est ce qu'on regarde quand ça bloque.
  const visible = useMemo(() => [...entries].reverse().slice(0, 60), [entries]);

  const handleCopy = async () => {
    const text = formatDiagnostics(entries);
    try {
      await navigator.clipboard.writeText(text);
      setJustCopied(true);
      window.setTimeout(() => setJustCopied(false), 1500);
    } catch {
      // Presse-papiers refusé (contexte non sécurisé) : on laisse une sortie.
      console.info(text);
    }
  };

  if (!enabled) return null;

  return (
    <div
      className="fixed right-3 top-16 z-[200] flex flex-col items-end gap-2"
      style={{ fontFamily: FONT }}
    >
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black text-white"
        style={{
          background: errorCount > 0 ? 'rgba(239,68,68,0.85)' : 'rgba(26,13,46,0.92)',
          border: '1px solid var(--ink-line)',
        }}
        aria-expanded={isOpen}
        aria-label="Journal de diagnostic"
      >
        <Activity className="h-3.5 w-3.5" />
        Diag
        <span className="tabular-nums opacity-70">{entries.length}</span>
        {errorCount > 0 && <span className="tabular-nums">· {errorCount} err</span>}
        {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
      </button>

      {isOpen && (
        <div
          className="flex w-[min(92vw,520px)] flex-col rounded-2xl p-3"
          style={{
            background: 'linear-gradient(180deg, #1a0d2e, #0f0820)',
            border: '1px solid var(--ink-line)',
            maxHeight: 'min(60vh, 480px)',
          }}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-white/60">
              Réseau : {isOnline ? 'en ligne' : 'hors ligne'}
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-black text-white"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid var(--ink-line)' }}
              >
                {justCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {justCopied ? 'Copié' : 'Copier'}
              </button>
              <button
                type="button"
                onClick={clearDiagnostics}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-black text-white"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid var(--ink-line)' }}
              >
                <Trash2 className="h-3 w-3" />
                Vider
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {visible.length === 0 ? (
              <p className="py-4 text-center text-xs text-white/40">Aucun événement.</p>
            ) : (
              <ol className="space-y-1">
                {visible.map((entry, index) => {
                  const style = LEVEL_STYLE[entry.level];
                  return (
                    <li
                      key={`${entry.at}-${index}`}
                      className="rounded-lg px-2 py-1.5"
                      style={{ background: style.background }}
                    >
                      <div className="flex items-baseline gap-2">
                        <span className="text-[10px] tabular-nums text-white/40">
                          {new Date(entry.at).toISOString().slice(11, 19)}
                        </span>
                        <span
                          className="text-[10px] font-black uppercase tracking-wide"
                          style={{ color: style.color }}
                        >
                          {entry.scope}
                        </span>
                        <span className="text-[11px] font-semibold text-white/90">
                          {entry.message}
                        </span>
                      </div>
                      {entry.data && (
                        <pre className="mt-0.5 overflow-x-auto whitespace-pre-wrap break-all text-[10px] leading-snug text-white/50">
                          {JSON.stringify(entry.data)}
                        </pre>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
