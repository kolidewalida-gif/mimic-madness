import { memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Share2, X } from 'lucide-react';
import { SocialExperience } from '@/components/SocialExperience';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useDialogBehaviour } from '@/components/menu/InkOverlay';

interface SocialStudioDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const SocialStudioDialogComponent = ({
  isOpen,
  onClose,
}: SocialStudioDialogProps) => {
  const isTopLayer = useCallback(() => {
    if (typeof document === 'undefined') return true;
    return document.querySelector([
      '.social-viewer-overlay',
      '.social-public-profile-overlay',
      '.ik-game-invite-layer',
      '[data-radix-portal] [role="dialog"][data-state="open"]',
    ].join(',')) === null;
  }, []);
  const dialogRef = useDialogBehaviour(isOpen, onClose, isTopLayer);
  useBodyScrollLock(isOpen);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="social-studio-overlay menu-dialog force-cursor">
          <motion.button
            type="button"
            data-cartoon-skip
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="social-studio-backdrop"
            aria-label="Fermer Social"
          />
          <motion.div
            ref={dialogRef}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="social-studio-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="social-studio-title"
          >
            <header className="social-studio-header">
              <div className="social-studio-brand">
                <span className="social-studio-logo">
                  <Share2 aria-hidden="true" />
                </span>
                <div>
                  <span className="social-studio-kicker">MIMIC COMMUNITY</span>
                  <h2 id="social-studio-title">Social Studio</h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="ibs-status ibs-status--online">
                  <span className="h-1.5 w-1.5 rounded-full bg-current" /> LIVE
                </span>
                <button
                  type="button"
                  data-back
                  onClick={onClose}
                  className="social-studio-close menu-icon-control"
                  aria-label="Fermer Social"
                >
                  <X aria-hidden="true" />
                </button>
              </div>
            </header>
            <div className="min-h-0 flex-1 overflow-hidden">
              <SocialExperience />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export const SocialStudioDialog = memo(SocialStudioDialogComponent);
