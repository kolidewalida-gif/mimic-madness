import { useCallback, useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const ALWAYS_TOP_LAYER = () => true;

/** Shared focus, Escape and restoration behaviour for every Ink overlay. */
export const useDialogBehaviour = (
  isOpen: boolean,
  onClose: () => void,
  isTopLayer: () => boolean = ALWAYS_TOP_LAYER,
) => {
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
      if (!isTopLayer()) return;
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
      if (items.length === 0) {
        event.preventDefault();
        panel.focus({ preventScroll: true });
        return;
      }
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

    window.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      const trigger = restoreRef.current;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [isOpen, isTopLayer, onClose]);

  return panelRef;
};

interface InkOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: ReactNode;
  iconGradient?: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  closeLabel?: string;
  side?: 'left' | 'right';
  size?: 'default' | 'wide' | 'hub';
  /** Returns false while a nested portal owns Escape and Tab. */
  isTopLayer?: () => boolean;
  /** Uses the shared ref-counted body lock, safe with nested dialogs. */
  lockBody?: boolean;
}

const Header = ({
  title, titleId, icon, iconGradient, subtitle, actions, onClose, closeLabel,
}: Pick<InkOverlayProps, 'title' | 'icon' | 'iconGradient' | 'subtitle' | 'actions' | 'onClose' | 'closeLabel'> & { titleId: string }) => (
  <div className="ink-panel-header flex flex-shrink-0 items-center justify-between gap-3 px-5 py-4">
    <div className="flex min-w-0 items-center gap-3">
      {icon && (
        <span className="ink-panel-icon flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-white" style={{ background: iconGradient ?? 'var(--ink-accent)', border: 'var(--ink-border)', boxShadow: 'var(--ink-shadow)' }} aria-hidden="true">
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <h2 id={titleId} className="ink-panel-title ink-title truncate text-3xl">{title}</h2>
        {subtitle && <p className="ink-panel-subtitle mt-0.5 truncate text-xs font-bold text-white/45">{subtitle}</p>}
      </div>
    </div>
    <div className="ink-panel-actions flex flex-shrink-0 items-center gap-2">
      {actions}
      <button type="button" onClick={onClose} className="ink-close-button menu-icon-control menu-focus" aria-label={closeLabel ?? `Fermer ${title}`}>
        <X className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
      </button>
    </div>
  </div>
);

/** Side drawer used by the historical Ink menus. */
export const InkDrawer = ({
  isOpen, onClose, title, icon, iconGradient, subtitle, actions, toolbar, children,
  className, bodyClassName, closeLabel, isTopLayer = ALWAYS_TOP_LAYER, lockBody = false,
  side = 'right',
}: InkOverlayProps) => {
  const titleId = useId();
  const close = useCallback(() => onClose(), [onClose]);
  const panelRef = useDialogBehaviour(isOpen, close, isTopLayer);
  const offscreen = side === 'right' ? '100%' : '-100%';
  useBodyScrollLock(lockBody && isOpen);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button type="button" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} aria-label={closeLabel ?? `Fermer ${title}`} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="ink-z-drawer-backdrop viewport-overlay viewport-overlay-scrim fixed inset-0 h-full w-full cursor-default bg-[rgba(8,5,24,0.78)]" />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            initial={{ x: offscreen }}
            animate={{ x: 0 }}
            exit={{ x: offscreen }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cn('menu-dialog ink-z-drawer viewport-panel viewport-panel-insets fixed bottom-0 top-0 flex w-full max-w-md flex-col outline-none', side === 'right' ? 'right-0' : 'left-0', className)}
            style={{ background: 'var(--ink-panel-gradient)', [side === 'right' ? 'borderLeft' : 'borderRight']: '4px solid var(--ink-outline)', boxShadow: `${side === 'right' ? '-8px' : '8px'} 0 24px rgba(0,0,0,0.5)` }}
          >
            <Header title={title} titleId={titleId} icon={icon} iconGradient={iconGradient} subtitle={subtitle} actions={actions} onClose={close} closeLabel={closeLabel} />
            {toolbar}
            <div className={cn('ink-panel-body game-scroll custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4', bodyClassName)}>{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
};

/** Centred modal. The hub size fills the usable viewport without nesting scroll areas. */
export const InkModal = ({
  isOpen, onClose, title, icon, iconGradient, subtitle, actions, toolbar, children,
  className, bodyClassName, closeLabel, size = 'default', isTopLayer = ALWAYS_TOP_LAYER,
  lockBody = false,
}: InkOverlayProps) => {
  const titleId = useId();
  const close = useCallback(() => onClose(), [onClose]);
  const panelRef = useDialogBehaviour(isOpen, close, isTopLayer);
  useBodyScrollLock(lockBody && isOpen);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className={cn('ink-z-modal viewport-overlay fixed inset-0 flex items-center justify-center', size === 'hub' && 'viewport-overlay--hub')}>
          <motion.button type="button" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} aria-label={closeLabel ?? `Fermer ${title}`} transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 h-full w-full cursor-default bg-[rgba(8,5,24,0.82)]" />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cn(
              'menu-dialog ink-panel-surface viewport-panel relative flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-3xl outline-none',
              size === 'default' && 'max-w-md',
              size === 'wide' && 'max-w-3xl',
              size === 'hub' && 'h-[min(94dvh,64rem)] max-w-[96rem]',
              className,
            )}
          >
            <Header title={title} titleId={titleId} icon={icon} iconGradient={iconGradient} subtitle={subtitle} actions={actions} onClose={close} closeLabel={closeLabel} />
            {toolbar}
            <div className={cn('ink-panel-body game-scroll custom-scrollbar min-h-0 flex-1 overflow-y-auto p-5', bodyClassName)}>{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export const InkTabs = <T extends string>({ value, onChange, items, accent }: {
  value: T;
  onChange: (next: T) => void;
  items: { key: T; label: string }[];
  accent: string;
}) => (
  <div role="tablist" className="flex flex-shrink-0 border-b-2 border-white/10">
    {items.map((item) => (
      <button key={item.key} type="button" role="tab" aria-selected={value === item.key} onClick={() => onChange(item.key)} className={cn('ink-tab menu-focus', value === item.key && 'is-active')}>
        {item.label}
        {value === item.key && <motion.span layoutId="ink-tab-underline" className="absolute bottom-0 left-2 right-2 h-1 rounded-full" style={{ background: accent }} />}
      </button>
    ))}
  </div>
);

export const InkSection = ({
  title, icon, hint, action, children, className,
}: {
  title: string;
  icon?: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <section className={cn('ink-section', className)}>
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="ink-section-title">{icon && <span aria-hidden="true" className="flex-shrink-0">{icon}</span>}<span className="truncate">{title}</span></h3>
        {hint && <p className="ink-section-hint">{hint}</p>}
      </div>
      {action && <div className="flex flex-shrink-0 items-center gap-2">{action}</div>}
    </div>
    {children}
  </section>
);

export const InkMenuTile = ({
  icon, label, hint, badge, accent, onClick,
}: {
  icon: ReactNode;
  label: string;
  hint?: string;
  badge?: number;
  accent?: string;
  onClick: () => void;
}) => (
  <button type="button" onClick={onClick} className="ink-menu-tile menu-focus" aria-label={hint ? `${label} — ${hint}` : label}>
    <span className="tile-icon" style={{ background: accent ?? 'var(--ink-accent)' }}>{icon}</span>
    <span className="tile-label">{label}</span>
    {hint && <span className="tile-hint">{hint}</span>}
    {badge !== undefined && badge > 0 && <span className="tile-badge" aria-hidden="true">{badge > 99 ? '99+' : badge}</span>}
  </button>
);
