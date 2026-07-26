import { memo } from 'react';
import { motion } from 'framer-motion';
import { Keyboard } from 'lucide-react';
import { InkModal } from '@/components/menu/InkOverlay';

interface InkShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Screen-specific shortcuts. Each screen passes exactly what it registers. */
  extra?: { keys: string[]; label: string }[];
}

/**
 * Only the shortcuts that every screen really registers live here. Anything
 * screen-specific must be passed via `extra`, otherwise the help lies: the
 * lobby never registered `M`, yet the modal advertised it.
 */
const BASE_SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['?'], label: 'Afficher cette aide' },
  { keys: ['Esc'], label: 'Fermer la fenêtre ouverte' },
];

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd
    className="inline-flex h-7 min-w-[28px] items-center justify-center px-2 text-sm font-black"
    style={{
      background: 'linear-gradient(180deg, #fbbf24 0%, #d97706 100%)',
      border: 'var(--ink-border-thin)',
      borderRadius: '0.5rem',
      boxShadow: '0 3px 0 var(--ink-outline), inset 0 1px 0 rgba(255,255,255,0.3)',
      color: 'var(--ink-outline)',
      fontFamily: "'Caveat', cursive",
    }}
  >
    {children}
  </kbd>
);

const InkShortcutsModalComponent = ({ isOpen, onClose, extra = [] }: InkShortcutsModalProps) => {
  const all = [...BASE_SHORTCUTS, ...extra];

  return (
    <InkModal
      isOpen={isOpen}
      onClose={onClose}
      title="Raccourcis"
      subtitle={`${all.length} raccourcis sur cet écran`}
      icon={<Keyboard className="h-5 w-5" strokeWidth={2.5} />}
    >
      <ul className="space-y-2">
        {all.map((shortcut, idx) => (
          <motion.li
            key={`${shortcut.label}-${idx}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(idx, 10) * 0.04 }}
            className="flex items-center justify-between gap-3 rounded-2xl p-3"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
              border: 'var(--ink-border-thin)',
              boxShadow: 'var(--ink-shadow-sm)',
            }}
          >
            <span className="text-base font-bold text-white/90" style={{ fontFamily: "'Caveat', cursive" }}>
              {shortcut.label}
            </span>
            <span className="flex flex-shrink-0 items-center gap-1">
              {shortcut.keys.map((key, i) => (
                <span key={i} className="flex items-center gap-1">
                  <Kbd>{key}</Kbd>
                  {i < shortcut.keys.length - 1 && <span className="font-bold text-white/40">+</span>}
                </span>
              ))}
            </span>
          </motion.li>
        ))}
      </ul>
      <p className="mt-3 text-center text-xs font-bold text-white/40" style={{ fontFamily: "'Caveat', cursive" }}>
        Appuie sur ? à tout moment pour rouvrir cette aide
      </p>
    </InkModal>
  );
};

export const InkShortcutsModal = memo(InkShortcutsModalComponent);
