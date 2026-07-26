import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, AlertTriangle, Info, CheckCircle2, Loader2 } from 'lucide-react';
import { useGlobalAnnouncements } from '@/hooks/useGlobalAnnouncements';

const iconFor = (sev: string) => {
  if (sev === 'warning') return AlertTriangle;
  if (sev === 'critical') return AlertTriangle;
  if (sev === 'success') return CheckCircle2;
  return Info;
};

const colorFor = (sev: string) => {
  if (sev === 'critical') return 'text-destructive border-destructive';
  if (sev === 'warning') return 'text-warning border-warning';
  if (sev === 'success') return 'text-success border-success';
  return 'text-primary border-primary';
};

export const AnnouncementModal = () => {
  const { pending, ack } = useGlobalAnnouncements();
  const [acking, setAcking] = useState(false);
  const current = pending[0];

  // An announcement must be acknowledged, so there is deliberately no Escape or
  // backdrop dismissal here. The button is guarded against double clicks.
  const confirm = useCallback(async () => {
    if (!current || acking) return;
    setAcking(true);
    try {
      await ack(current.id);
    } finally {
      setAcking(false);
    }
  }, [current, acking, ack]);

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="menu-dialog menu-dialog-safe fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="announcement-title"
          aria-describedby="announcement-body"
        >
          <motion.div
            initial={{ scale: 0.85, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.85, y: 40 }}
            className={`w-full max-w-md rounded-2xl border-2 bg-card p-6 shadow-2xl ${colorFor(current.severity)}`}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-current/10" aria-hidden="true">
                <Megaphone className="h-5 w-5" />
              </div>
              <h2 id="announcement-title" className="flex-1 truncate text-xl font-bold">
                {current.title || 'Annonce globale'}
              </h2>
            </div>
            <p id="announcement-body" className="mb-6 whitespace-pre-wrap text-foreground">{current.message}</p>
            <button
              type="button"
              onClick={confirm}
              disabled={acking}
              aria-busy={acking}
              autoFocus
              className="menu-action menu-focus flex w-full items-center justify-center gap-2 rounded-lg bg-primary font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              {acking && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {acking ? 'Enregistrement…' : "J'ai compris"}
            </button>
            {pending.length > 1 && (
              <div className="mt-3 text-center text-xs text-muted-foreground">
                +{pending.length - 1} autre(s) annonce(s)
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};