/**
 * Shared primitives for the Ink game screens.
 *
 * Flat redesign: the public API (component names, prop names, prop types) is
 * unchanged so the 13 game screens that import these keep working, but the
 * rendering is now flat — one surface colour, 1px borders, no gradients, no
 * offset "3D" shadows, no outlined text, no infinite animations.
 *
 * `accent` is still honoured: it tints borders, icons and values so each game
 * mode keeps its own identity without reintroducing glow or gradients.
 *
 * Visual values come from the `--ink-*` tokens in src/index.css.
 */
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Any icon-like component (lucide icons in practice). */
type IconComponent = React.ElementType;

/**
 * Kept for backwards compatibility: several screens still spread these into a
 * `textShadow`. Flat design has no outlined text, so they resolve to `none`.
 */
export const GRAFFITI_TEXT_SHADOW = 'none';
export const GRAFFITI_TEXT_SHADOW_SM = 'none';

/* ============================================================
   Game stage — plain full-screen background
============================================================ */
export const InkGameStage = ({
  accent,
  children,
  className,
}: {
  accent?: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      'if-root min-h-screen relative overflow-hidden',
      className,
    )}
    style={accent ? ({ ['--ink-accent' as string]: accent } as React.CSSProperties) : undefined}
  >
    <div className="relative z-10">{children}</div>
  </div>
);

/* ============================================================
   Card — the only container
============================================================ */
export const InkCard = ({
  accent,
  className,
  children,
  highlighted = false,
  // Kept for API compatibility; flat cards have no sparkle or inner outline.
  showSparkles: _showSparkles = true,
  innerAccent: _innerAccent = true,
}: {
  accent?: string;
  className?: string;
  children: React.ReactNode;
  highlighted?: boolean;
  showSparkles?: boolean;
  innerAccent?: boolean;
}) => (
  <div
    className={cn('if-panel relative overflow-hidden', className)}
    style={
      highlighted
        ? { borderColor: accent ?? 'var(--ink-accent)' }
        : undefined
    }
  >
    {children}
  </div>
);

/* ============================================================
   Button
============================================================ */
export const InkButton = ({
  children,
  onClick,
  color,
  disabled = false,
  loading = false,
  loadingLabel = 'Chargement…',
  variant = 'filled',
  size = 'md',
  className,
  type = 'button',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  color?: string;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  variant?: 'filled' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  type?: 'button' | 'submit';
}) => {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        'if-btn menu-focus',
        variant === 'filled' ? 'if-btn--primary' : 'if-btn--neutral',
        size === 'lg' && 'if-btn--lg',
        size === 'sm' && 'if-btn--sm',
        className,
      )}
      style={
        color
          ? variant === 'filled'
            ? { background: color }
            : { borderColor: color, color }
          : undefined
      }
    >
      {loading ? (
        <span className="inline-flex items-center justify-center gap-2" role="status">
          <Loader2 className="h-[1em] w-[1em] animate-spin" aria-hidden="true" />
          {loadingLabel}
        </span>
      ) : (
        children
      )}
    </button>
  );
};

/* ============================================================
   Phase indicator pill
============================================================ */
export const InkPhasePill = ({
  icon: Icon,
  label,
  accent,
}: {
  icon: IconComponent;
  label: string;
  accent?: string;
}) => (
  <div
    className="if-tag if-tag--accent"
    style={accent ? { borderColor: accent, color: accent } : undefined}
  >
    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
    <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
  </div>
);

/* ============================================================
   Title
============================================================ */
export const InkTitle = ({
  children,
  size = 'xl',
  className,
}: {
  children: React.ReactNode;
  size?: 'lg' | 'xl' | 'xxl';
  className?: string;
}) => {
  const sizeClass =
    size === 'xxl'
      ? 'text-3xl md:text-4xl'
      : size === 'lg'
        ? 'text-lg md:text-xl'
        : 'text-2xl md:text-3xl';
  return (
    <h1 className={cn('ink-title', sizeClass, className)}>{children}</h1>
  );
};

/* ============================================================
   Icon badge
============================================================ */
export const InkIconBadge = ({
  icon: Icon,
  color,
  size = 'md',
  // Kept for API compatibility; flat badges never wobble.
  wobble: _wobble = true,
}: {
  icon: IconComponent;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  wobble?: boolean;
}) => {
  const sizeMap = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-12 h-12' };
  const iconSizeMap = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-6 w-6' };
  return (
    <span
      className={cn(
        'flex flex-shrink-0 items-center justify-center rounded-[var(--ink-radius-sm)] border',
        sizeMap[size],
      )}
      style={{
        borderColor: color ?? 'var(--ink-line)',
        color: color ?? 'var(--ink-text-dim)',
        background: 'var(--ink-surface-2)',
      }}
    >
      <Icon className={iconSizeMap[size]} aria-hidden="true" />
    </span>
  );
};

/* ============================================================
   Stamp badge (e.g. "À TOI", "Suspect")
============================================================ */
export const InkStamp = ({
  color,
  // Kept for API compatibility; flat stamps are not rotated.
  rotate: _rotate = -8,
  children,
}: {
  color?: string;
  rotate?: number;
  children: React.ReactNode;
}) => (
  <span
    className="if-tag"
    style={color ? { borderColor: color, color } : undefined}
  >
    <span className="text-[0.6875rem] font-semibold uppercase tracking-wide">{children}</span>
  </span>
);

/* ============================================================
   Timer bar
============================================================ */
export const InkTimerBar = ({
  progress,
  urgent = false,
  accent,
  className,
}: {
  /** 0-100 */
  progress: number;
  urgent?: boolean;
  accent?: string;
  className?: string;
}) => (
  <div
    className={cn('ink-progress', className)}
    role="progressbar"
    aria-valuenow={Math.round(Math.max(0, Math.min(100, progress)))}
    aria-valuemin={0}
    aria-valuemax={100}
  >
    <span
      style={{
        width: `${Math.max(0, Math.min(100, progress))}%`,
        background: urgent ? '#ef4444' : accent ?? 'var(--ink-accent)',
      }}
    />
  </div>
);

/* ============================================================
   Score / value pill
============================================================ */
export const InkPill = ({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) => (
  <span className="if-tag">
    <span className="if-label">{label}</span>
    <span
      className="text-sm font-bold leading-none"
      style={{ color: color ?? 'var(--ink-text)' }}
    >
      {value}
    </span>
  </span>
);
