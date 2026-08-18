/**
 * Flat UI kit for the Ink menus (home + lobby).
 *
 * Design rules, deliberately narrow so the menus cannot drift again:
 *   - one surface colour, one accent colour, 1px borders
 *   - no gradients, no offset "3D" shadows, no outlined text
 *   - no cursive font — everything is Outfit / system sans
 *   - motion is limited to short colour/opacity transitions (CSS only)
 *
 * The visual values live in the `.if-*` block at the bottom of src/index.css.
 * These components only compose them, so restyling means editing one CSS file.
 */
import { forwardRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ============================================================
   Button
============================================================ */
type ButtonVariant = 'primary' | 'neutral' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface FlatButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingLabel?: string;
  /** Leading icon node, rendered before the label. */
  icon?: ReactNode;
  block?: boolean;
  children?: ReactNode;
}

export const FlatButton = forwardRef<HTMLButtonElement, FlatButtonProps>(
  (
    {
      variant = 'neutral',
      size = 'md',
      loading = false,
      loadingLabel,
      icon,
      block = false,
      className,
      disabled,
      children,
      type = 'button',
      ...rest
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'if-btn menu-focus',
        `if-btn--${variant}`,
        size === 'lg' && 'if-btn--lg',
        size === 'sm' && 'if-btn--sm',
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {loadingLabel ?? children}
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  ),
);
FlatButton.displayName = 'FlatButton';

/* ============================================================
   Icon button — square, 40px, always needs an aria-label
============================================================ */
export interface FlatIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

export const FlatIconButton = forwardRef<HTMLButtonElement, FlatIconButtonProps>(
  ({ label, className, children, type = 'button', ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn('if-icon-btn menu-icon-control menu-focus', className)}
      {...rest}
    >
      {children}
    </button>
  ),
);
FlatIconButton.displayName = 'FlatIconButton';

/* ============================================================
   Panel — the only container
============================================================ */
export const FlatPanel = ({
  className,
  children,
  inset = false,
}: {
  className?: string;
  children: ReactNode;
  inset?: boolean;
}) => (
  <div className={cn(inset ? 'if-panel-inset' : 'if-panel', className)}>{children}</div>
);

/** Small uppercase section label. */
export const FlatLabel = ({ className, children }: { className?: string; children: ReactNode }) => (
  <span className={cn('if-label', className)}>{children}</span>
);

/** Pill used for counts, status and hints. */
export const FlatTag = ({
  accent = false,
  className,
  children,
}: {
  accent?: boolean;
  className?: string;
  children: ReactNode;
}) => (
  <span className={cn('if-tag', accent && 'if-tag--accent', className)}>{children}</span>
);

export const FlatDivider = ({ className }: { className?: string }) => (
  <hr className={cn('if-divider', className)} />
);

/* ============================================================
   Image with multi-candidate fallback

   Mode artwork lives in /public and some files may be missing. Try each
   candidate in order, then fall back to the mode emoji rather than showing a
   broken image.
============================================================ */
export const FlatImage = ({
  candidates,
  alt,
  fallback,
  className,
}: {
  candidates: string[];
  alt: string;
  fallback: ReactNode;
  className?: string;
}) => {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  if (failed || candidates.length === 0) return <>{fallback}</>;

  return (
    <img
      src={candidates[index]}
      alt={alt}
      className={className}
      draggable={false}
      onError={() => {
        if (index + 1 < candidates.length) setIndex(index + 1);
        else setFailed(true);
      }}
    />
  );
};

/* ============================================================
   Selectable tile — game mode picker row
============================================================ */
export const FlatTile = ({
  selected = false,
  disabled = false,
  onClick,
  art,
  title,
  subtitle,
  trailing,
  className,
}: {
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  art?: ReactNode;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  className?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-pressed={selected}
    className={cn('if-tile menu-focus', selected && 'is-selected', className)}
  >
    {art && <span className="if-tile-art">{art}</span>}
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-semibold">{title}</span>
      {subtitle && (
        <span className="if-mute mt-0.5 block truncate text-xs font-normal">{subtitle}</span>
      )}
    </span>
    {trailing}
  </button>
);

/* ============================================================
   Avatar — image or initial
============================================================ */
export const FlatAvatar = ({
  name,
  src,
  className,
}: {
  name: string;
  src?: string;
  className?: string;
}) => (
  <span className={cn('if-avatar', className)}>
    {src ? <img src={src} alt="" draggable={false} /> : (name[0] ?? '?').toUpperCase()}
  </span>
);
