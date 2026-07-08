import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
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
  const current = pending[0];

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
        >
          <motion.div
            initial={{ scale: 0.85, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.85, y: 40 }}
            className={`max-w-md w-full bg-card border-2 rounded-2xl p-6 shadow-2xl ${colorFor(current.severity)}`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-current/10 flex items-center justify-center">
                <Megaphone className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold flex-1 truncate">
                {current.title || 'Annonce globale'}
              </h2>
            </div>
            <p className="text-foreground whitespace-pre-wrap mb-6">{current.message}</p>
            <button
              onClick={() => ack(current.id)}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition"
            >
              J'ai compris
            </button>
            {pending.length > 1 && (
              <div className="text-xs text-center text-muted-foreground mt-3">
                +{pending.length - 1} autre(s) annonce(s)
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};