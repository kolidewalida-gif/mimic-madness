import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Zap, Bug, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Patch notes config ────────────────────────────────────────────────────
// Bump CURRENT_VERSION whenever you ship new features/fixes.
// Add a new entry at the top of PATCH_NOTES to describe the changes.
export const CURRENT_VERSION = '1.3.0';

type ChangeType = 'new' | 'improved' | 'fix' | 'highlight';

interface Change {
  type: ChangeType;
  text: string;
}

interface PatchNote {
  version: string;
  date: string;
  title: string;
  changes: Change[];
}

export const PATCH_NOTES: PatchNote[] = [
  {
    version: '1.3.0',
    date: '17 mai 2026',
    title: 'Social Hub — Réseau Social Repensé',
    changes: [
      { type: 'highlight', text: 'Nouveau Social Hub : bouton flottant toujours accessible pour gérer vos amis' },
      { type: 'new',       text: 'Panneau latéral avec 4 onglets : Amis, Messages, Demandes, Invitations' },
      { type: 'new',       text: 'Badge de notifications en temps réel sur le bouton flottant' },
      { type: 'new',       text: 'Actions rapides par ami : message, rejoindre, inviter' },
      { type: 'new',       text: 'Onglet Messages dédié avec compteur de non-lus par conversation' },
      { type: 'improved',  text: 'Code ami toujours visible et copiable en un clic' },
      { type: 'improved',  text: 'Interface sociale accessible depuis tous les écrans du jeu' },
      { type: 'improved',  text: 'Statut en ligne des amis avec indicateur visuel (vert/gris)' },
    ],
  },
  {
    version: '1.2.0',
    date: '2 mai 2026',
    title: 'BlurRush & Quiz',
    changes: [
      { type: 'new',      text: 'Mode BlurRush : devinez l\'image pixelisée avant les autres' },
      { type: 'new',      text: 'Mode Quiz avec questions en temps réel' },
      { type: 'improved', text: 'Système de sons adaptatifs selon la situation de jeu' },
      { type: 'fix',      text: 'Correction du transfert d\'hôte en lobby' },
    ],
  },
];
// ───────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'ink-patchnote-seen-version';

const typeConfig: Record<ChangeType, { icon: React.ReactNode; label: string; color: string }> = {
  highlight: {
    icon: <Star className="w-3.5 h-3.5" />,
    label: 'Nouveauté',
    color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  },
  new: {
    icon: <Sparkles className="w-3.5 h-3.5" />,
    label: 'Nouveau',
    color: 'text-primary bg-primary/10 border-primary/30',
  },
  improved: {
    icon: <Zap className="w-3.5 h-3.5" />,
    label: 'Amélioré',
    color: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  },
  fix: {
    icon: <Bug className="w-3.5 h-3.5" />,
    label: 'Correction',
    color: 'text-green-400 bg-green-400/10 border-green-400/30',
  },
};

interface InkPatchNoteModalProps {
  /** Called when the user closes the modal */
  onClose?: () => void;
  /** Force the modal open regardless of version check (for manual "voir les notes") */
  forceOpen?: boolean;
}

export const InkPatchNoteModal = ({ onClose, forceOpen = false }: InkPatchNoteModalProps) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      return;
    }
    const seen = localStorage.getItem(STORAGE_KEY);
    if (seen !== CURRENT_VERSION) {
      setOpen(true);
    }
  }, [forceOpen]);

  const handleClose = () => {
    if (!forceOpen) {
      localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
    }
    setOpen(false);
    onClose?.();
  };

  const latest = PATCH_NOTES[0];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="patchnote-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            key="patchnote-panel"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-lg max-h-[calc(100dvh-2rem)] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Glow halo */}
            <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl pointer-events-none" />

            {/* Card */}
            <div className="relative bg-card border border-primary/30 rounded-2xl overflow-hidden shadow-2xl shadow-primary/10 flex flex-col min-h-0">
              {/* Top accent bar */}
              <div className="h-1 w-full bg-gradient-to-r from-transparent via-primary to-transparent" />

              {/* Header */}
              <div className="flex items-start justify-between p-5 pb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-primary"
                      style={{ fontFamily: "'Caveat', cursive" }}
                    >
                      v{latest.version}
                    </span>
                    <span className="text-xs text-muted-foreground">{latest.date}</span>
                  </div>
                  <h2
                    className="text-2xl font-black text-primary leading-tight"
                    style={{ fontFamily: "'Caveat', cursive" }}
                  >
                    {latest.title}
                  </h2>
                </div>

                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0 mt-0.5"
                  aria-label="Fermer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Changes list */}
              <div className="px-5 pb-2 space-y-2 flex-1 overflow-y-auto custom-scrollbar">
                {latest.changes.map((change, i) => {
                  const cfg = typeConfig[change.type];
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 + i * 0.04 }}
                      className="flex items-start gap-3"
                    >
                      <span
                        className={cn(
                          'flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold flex-shrink-0 mt-0.5',
                          cfg.color
                        )}
                      >
                        {cfg.icon}
                        <span className="hidden sm:inline">{cfg.label}</span>
                      </span>
                      <p className="text-sm text-foreground/85 leading-snug">{change.text}</p>
                    </motion.div>
                  );
                })}
              </div>

              {/* Previous versions (collapsed) */}
              {PATCH_NOTES.length > 1 && (
                <details className="px-5 pb-3 group">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none py-2 list-none flex items-center gap-1">
                    <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                    Versions précédentes
                  </summary>
                  <div className="mt-2 space-y-4 border-t border-border/40 pt-3">
                    {PATCH_NOTES.slice(1).map((note) => (
                      <div key={note.version}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-bold text-muted-foreground">v{note.version}</span>
                          <span className="text-xs text-muted-foreground/60">— {note.date}</span>
                          <span
                            className="text-xs font-semibold text-muted-foreground"
                            style={{ fontFamily: "'Caveat', cursive" }}
                          >
                            {note.title}
                          </span>
                        </div>
                        <ul className="space-y-1">
                          {note.changes.map((c, j) => (
                            <li key={j} className="flex items-start gap-2 text-xs text-muted-foreground/70">
                              <span className="text-primary mt-0.5">•</span>
                              {c.text}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {/* Footer */}
              <div className="px-5 pb-5 pt-1">
                <button
                  onClick={handleClose}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                  style={{ fontFamily: "'Caveat', cursive", fontSize: '1rem' }}
                >
                  C'est parti !
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
