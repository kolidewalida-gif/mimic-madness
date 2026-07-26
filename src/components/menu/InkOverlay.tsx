import { useCallback, useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Shared dialog behaviour for every Ink menu overlay: Escape to close, focus
 * moved inside on open, focus trapped while open, and focus returned to the
 * trigger on close. Previously each panel reimplemented a subset of this, and
 * most implemented none of it.
 */
const useDialogBehaviour = (isOpen: boolean, onClose: () => void) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    restoreRef.current = document.activeElement as HTMLElement | null;

    const focusFirst = () => {
      const panel = panelRef.current;
      if (!panel) return;
      const target =
        panel.querySelector<HTMLElement>('[data-autofocus]') ??
        panel.querySelector<HTMLElement>(FOCUSABLE) ??
        panel;
      target.focus({ preventScroll: true });
    };
    const raf = requestAnimationFrame(focusFirst);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter((item) => item.offsetParent !== null || item === document.activeElement);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown, true);
      restoreRef.current?.focus?.({ preventScroll: true });
    };
  }, [isOpen, onClose]);

  return panelRef;
};

interface InkOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** Icon shown in the header badge. */
  icon?: ReactNode;
  /** Gradient of the header icon badge. */
  iconGradient?: string;
  /** Short line under the title (counts, progress, hints). */
  subtitle?: ReactNode;
  /** Extra controls rendered left of the close button. */
  actions?: ReactNode;
  /** Rendered under the header, outside the scroll area (tabs, progress bars). */
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Accessible label of the backdrop button. */
  closeLabel?: string;
  /** Edge the drawer slides in from. Ignored by InkModal. */
  side?: 'left' | 'right';
}

const Header = ({
  title, titleId, icon, iconGradient, subtitle, actions, onClose, closeLabel,
}: Pick<InkOverlayProps, 'title' | 'icon' | 'iconGradient' | 'subtitle' | 'actions' | 'onClose' | 'closeLabel'> & { titleId: string }) => (
  <div className="ink-panel-header flex flex-shrink-0 items-center justify-between gap-3 px-5 py-4">
    <div className="flex min-w-0 items-center gap-3">
      {icon && (
        <span
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-white"
          style={{
            background: iconGradient ?? 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
            border: 'var(--ink-border)',
            boxShadow: 'var(--ink-shadow)',
          }}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <h2 id={titleId} className="ink-title truncate text-3xl">{title}</h2>
        {subtitle && <p className="mt-0.5 truncate text-xs font-bold text-white/45">{subtitle}</p>}
      </div>
    </div>
    <div className="flex flex-shrink-0 items-center gap-2">
      {actions}
      <button
        type="button"
        onClick={onClose}
        className="ink-close-button menu-icon-control menu-focus"
        aria-label={closeLabel ?? `Fermer ${title}`}
      >
        <X className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
      </button>
    </div>
  </div>
);

/** Right-side drawer. Replaces 6 near-identical hand-rolled drawers. */
export const InkDrawer = ({
  isOpen, onClose, title, icon, iconGradient, subtitle, actions, toolbar, children, className, closeLabel,
  side = 'right',
}: InkOverlayProps) => {
  const titleId = useId();
  const panelRef = useDialogBehaviour(isOpen, onClose);
  const close = useCallback(() => onClose(), [onClose]);
  const offscreen = side === 'right' ? '100%' : '-100%';

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            aria-label={closeLabel ?? `Fermer ${title}`}
            className="ink-z-drawer-backdrop fixed inset-0 h-full w-full cursor-default bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            ref={panelRef}
            initial={{ x: offscreen }}
            animate={{ x: 0 }}
            exit={{ x: offscreen }}
            transition={{ type: 'spring', damping: 26, stiffness: 240 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cn(
              'menu-dialog menu-dialog-safe ink-z-drawer fixed bottom-0 top-0 flex w-full max-w-md flex-col',
              side === 'right' ? 'right-0' : 'left-0',
              className,
            )}
            style={{
              background: 'var(--ink-panel-gradient)',
              [side === 'right' ? 'borderLeft' : 'borderRight']: '4px solid var(--ink-outline)',
              boxShadow: `${side === 'right' ? '-8px' : '8px'} 0 24px rgba(0,0,0,0.5)`,
            }}
          >
            <Header
              title={title} titleId={titleId} icon={icon} iconGradient={iconGradient}
              subtitle={subtitle} actions={actions} onClose={close} closeLabel={closeLabel}
            />
            {toolbar}
            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
};

/** Centred modal. Same accessibility contract as InkDrawer. */
export const InkModal = ({
  isOpen, onClose, title, icon, iconGradient, subtitle, actions, toolbar, children, className, closeLabel,
}: InkOverlayProps) => {
  const titleId = useId();
  const panelRef = useDialogBehaviour(isOpen, onClose);
  const close = useCallback(() => onClose(), [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="ink-z-modal fixed inset-0 flex items-center justify-center p-4">
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            aria-label={closeLabel ?? `Fermer ${title}`}
            className="absolute inset-0 h-full w-full cursor-default bg-black/85 backdrop-blur-md"
          />
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.9, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 18 }}
            transition={{ type: 'spring', damping: 24, stiffness: 260 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cn(
              'menu-dialog menu-dialog-safe ink-panel-surface relative flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-3xl',
              className,
            )}
          >
            <Header
              title={title} titleId={titleId} icon={icon} iconGradient={iconGradient}
              subtitle={subtitle} actions={actions} onClose={close} closeLabel={closeLabel}
            />
            {toolbar}
            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

/** Tab row shared by the reward / badge / quest panels. */
export const InkTabs = <T extends string>({ value, onChange, items, accent }: {
  value: T;
  onChange: (next: T) => void;
  items: { key: T; label: string }[];
  accent: string;
}) => (
  <div role="tablist" className="flex flex-shrink-0 border-b-2 border-white/10">
    {items.map((item) => (
      <button
        key={item.key}
        type="button"
        role="tab"
        aria-selected={value === item.key}
        onClick={() => onChange(item.key)}
        className={cn('ink-tab menu-focus', value === item.key && 'is-active')}
      >
        {item.label}
        {value === item.key && (
          <motion.span
            layoutId="ink-tab-underline"
            className="absolute bottom-0 left-2 right-2 h-1 rounded-full"
            style={{ background: accent }}
          />
        )}
      </button>
    ))}
  </div>
);
