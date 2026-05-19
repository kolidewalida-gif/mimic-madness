import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, Sparkles, X } from 'lucide-react';

interface InkShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Extra context-specific shortcuts (e.g. Enter to start, C to copy lobby) */
  extra?: { keys: string[]; label: string }[];
}

const GRAFFITI_TEXT_SHADOW =
  '2px 2px 0 #0a0810, -1.5px -1.5px 0 #0a0810, 1.5px -1.5px 0 #0a0810, -1.5px 1.5px 0 #0a0810, 1.5px 1.5px 0 #0a0810';

const BASE_SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['?'], label: "Afficher cette aide" },
  { keys: ['Esc'], label: 'Fermer la modale ouverte' },
  { keys: ['M'], label: 'Couper / activer le son' },
  { keys: ['S'], label: 'Ouvrir les paramètres' },
];

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd
    className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 text-sm font-black"
    style={{
      background: 'linear-gradient(180deg, #fbbf24 0%, #d97706 100%)',
      border: '2.5px solid #0a0810',
      borderRadius: '0.5rem',
      boxShadow: '0 3px 0 #0a0810, inset 0 1px 0 rgba(255,255,255,0.3)',
      color: '#0a0810',
      fontFamily: "'Caveat', cursive",
    }}
  >
    {children}
  </kbd>
);

const InkShortcutsModalComponent = ({ isOpen, onClose, extra = [] }: InkShortcutsModalProps) => {
  const all = [...BASE_SHORTCUTS, ...extra];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-[80] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20, rotate: -2 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotate: -1 }}
            exit={{ opacity: 0, scale: 0.85, y: 20, rotate: 2 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md max-h-[calc(100dvh-2rem)] flex flex-col rounded-3xl overflow-hidden"
            style={{
              background:
                'linear-gradient(180deg, #1a0d2e 0%, #160a26 50%, #0f0820 100%)',
              border: '4px solid #0a0810',
              boxShadow:
                '0 12px 0 #0a0810, 0 18px 40px rgba(168,85,247,0.35), inset 0 2px 0 rgba(255,255,255,0.08)',
            }}
          >
            <div
              className="absolute inset-1.5 rounded-[1.3rem] pointer-events-none"
              style={{ border: '2px solid rgba(168,85,247,0.4)' }}
            />

            <Sparkles
              className="absolute top-3 left-4 w-4 h-4 text-amber-400 z-10"
              style={{ filter: 'drop-shadow(1px 1px 0 #0a0810)' }}
            />
            <Sparkles
              className="absolute top-3 right-14 w-3.5 h-3.5 text-pink-400 z-10"
              style={{ filter: 'drop-shadow(1px 1px 0 #0a0810)' }}
            />

            {/* HEADER */}
            <div
              className="relative px-5 py-4 flex items-center justify-between"
              style={{
                background:
                  'linear-gradient(180deg, rgba(168,85,247,0.18), rgba(168,85,247,0.05))',
                borderBottom: '3px solid #0a0810',
              }}
            >
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: [-5, 5, -5] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="w-11 h-11 rounded-2xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
                    border: '3px solid #0a0810',
                    boxShadow: '0 4px 0 #0a0810',
                  }}
                >
                  <Keyboard className="h-5 w-5 text-white" strokeWidth={2.5} />
                </motion.div>
                <h3
                  className="text-3xl font-black text-white leading-none"
                  style={{
                    fontFamily: "'Caveat', cursive",
                    textShadow: GRAFFITI_TEXT_SHADOW,
                  }}
                >
                  Raccourcis
                </h3>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                style={{
                  background: 'rgba(239,68,68,0.2)',
                  border: '2.5px solid #0a0810',
                  boxShadow: '0 3px 0 #0a0810',
                }}
              >
                <X className="w-5 h-5" strokeWidth={3} />
              </motion.button>
            </div>

            {/* LIST */}
            <div className="relative p-5 space-y-2 overflow-y-auto custom-scrollbar">
              {all.map((sc, idx) => (
                <motion.div
                  key={`${sc.label}-${idx}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="flex items-center justify-between gap-3 p-3 rounded-2xl"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
                    border: '2.5px solid #0a0810',
                    boxShadow: '0 2px 0 #0a0810',
                  }}
                >
                  <span
                    className="text-base font-bold text-white/90"
                    style={{ fontFamily: "'Caveat', cursive" }}
                  >
                    {sc.label}
                  </span>
                  <div className="flex items-center gap-1">
                    {sc.keys.map((k, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <Kbd>{k}</Kbd>
                        {i < sc.keys.length - 1 && (
                          <span className="text-white/40 font-bold">+</span>
                        )}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
              <p
                className="text-center text-xs text-white/40 mt-3 font-bold"
                style={{ fontFamily: "'Caveat', cursive" }}
              >
                Appuie sur ? à tout moment pour rouvrir cette aide
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const InkShortcutsModal = memo(InkShortcutsModalComponent);
