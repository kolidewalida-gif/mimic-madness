import { motion, AnimatePresence } from 'framer-motion';
import type { StagedTaskState } from '@/hooks/useStagedTask';

/**
 * Voile d'étape : barre de progression, libellé, et rien d'autre.
 *
 * Volontairement générique. Le motif « traitement long rendu visible et sonore »
 * doit se réutiliser tel quel dans les autres modes de jeu : on passe l'état
 * renvoyé par `useStagedTask`, et l'appelant choisit le libellé, la durée
 * minimale et le son.
 */
interface ProcessingOverlayProps {
  state: StagedTaskState;
  /** Emoji ou pictogramme affiché au-dessus de la barre. */
  icon?: string;
  accent?: string;
}

export const ProcessingOverlay = ({
  state,
  icon = '⏳',
  accent = 'var(--ink-accent)',
}: ProcessingOverlayProps) => {
  const percent = Math.round(Math.max(0, Math.min(1, state.ratio)) * 100);

  return (
    <AnimatePresence>
      {state.isRunning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-6"
          style={{ background: 'rgba(5,2,12,0.86)', backdropFilter: 'blur(6px)' }}
          role="status"
          aria-live="polite"
        >
          <motion.div
            initial={{ scale: 0.92, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 260 }}
            className="w-full max-w-sm rounded-3xl p-6 text-center"
            style={{
              background: 'linear-gradient(180deg, #1a0d2e, #0f0820)',
              border: '1px solid var(--ink-line)',
            }}
          >
            <motion.div
              animate={{ rotate: [0, -12, 12, 0], scale: [1, 1.08, 1] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              className="mx-auto mb-3 text-4xl"
            >
              {icon}
            </motion.div>

            <p
              className="mb-4 text-lg font-black text-white"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              {state.label}
            </p>

            <div
              className="h-3 w-full overflow-hidden rounded-full bg-white/10"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-label={state.label}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: accent }}
                animate={{ width: `${percent}%` }}
                transition={{ ease: 'linear', duration: 0.08 }}
              />
            </div>

            <p
              className="mt-2 text-xs font-black tabular-nums text-white/45"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              {percent}%
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
