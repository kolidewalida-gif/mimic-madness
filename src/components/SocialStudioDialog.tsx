import { memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Share2, X } from 'lucide-react';
import { SocialExperience } from '@/components/SocialExperience';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useDialogBehaviour } from '@/components/menu/InkOverlay';
import { menuPanelMotion, menuScrimMotion } from '@/components/menu/overlayMotion';
import overlayStyles from '@/components/menu/InkOverlay.module.css';
import bubble from '@/components/social/BubbleSocial.module.css';

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
  const reduced = useReducedMotion();

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="social-studio-overlay menu-dialog force-cursor">
          <motion.button
            type="button"
            data-cartoon-skip
            tabIndex={-1}
            {...menuScrimMotion(reduced)}
            onClick={onClose}
            className={`social-studio-backdrop ${overlayStyles.scrim}`}
            aria-label="Fermer Social"
          />
          <motion.div
            ref={dialogRef}
            tabIndex={-1}
            {...menuPanelMotion(reduced)}
            className={`${overlayStyles.surface} ${bubble.dialog}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="social-studio-title"
          >
            <header className={bubble.header}>
              <div className={bubble.brand}>
                <span>
                  <Share2 aria-hidden="true" />
                </span>
                <div>
                  <small>MIMIC COMMUNITY</small>
                  <h2 id="social-studio-title">Le coin de la bande.</h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-back
                  onClick={onClose}
                  className={bubble.close}
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
