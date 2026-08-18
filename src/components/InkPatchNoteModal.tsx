import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Zap, Bug, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InkModal } from '@/components/menu/InkOverlay';

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
    <InkModal
      isOpen={open}
      onClose={handleClose}
      title={latest.title}
      subtitle={`v${latest.version} · ${latest.date}`}
      icon={<Sparkles className="w-5 h-5" strokeWidth={2.5} />}
      className="max-w-lg"
    >
      <div className="space-y-2">
        {latest.changes.map((change, i) => {
          const cfg = typeConfig[change.type];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 + Math.min(i, 10) * 0.04 }}
              className="flex items-start gap-3"
            >
              <span
                className={cn(
                  'mt-0.5 flex flex-shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold',
                  cfg.color,
                )}
              >
                {cfg.icon}
                <span className="hidden sm:inline">{cfg.label}</span>
              </span>
              <p className="text-sm leading-snug text-white/85">{change.text}</p>
            </motion.div>
          );
        })}
      </div>

      {PATCH_NOTES.length > 1 && (
        <details className="group mt-4">
          <summary className="menu-focus flex cursor-pointer list-none items-center gap-1 py-2 text-xs text-white/50 transition-colors hover:text-white">
            <span className="inline-block transition-transform group-open:rotate-90" aria-hidden="true">▶</span>
            Versions précédentes
          </summary>
          <div className="mt-2 space-y-4 border-t border-white/10 pt-3">
            {PATCH_NOTES.slice(1).map((note) => (
              <div key={note.version}>
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-white/60">v{note.version}</span>
                  <span className="text-xs text-white/40">— {note.date}</span>
                  <span className="text-xs font-semibold text-white/60" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    {note.title}
                  </span>
                </div>
                <ul className="space-y-1">
                  {note.changes.map((c, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs text-white/55">
                      <span className="mt-0.5 text-purple-300" aria-hidden="true">•</span>
                      {c.text}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
      )}

      <button
        type="button"
        onClick={handleClose}
        data-autofocus
        className="menu-action menu-focus mt-5 w-full rounded-xl text-lg font-black text-white"
        style={{
          background: 'linear-gradient(180deg, #a855f7, #6b21a8)',
          border: 'var(--ink-border)',
          boxShadow: 'var(--ink-shadow)',
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        C'est parti !
      </button>
    </InkModal>
  );
};
