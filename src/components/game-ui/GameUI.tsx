/**
 * Mimic Master — shared party-game UI kit.
 *
 * One visual language for every menu, lobby and overlay. All visual values
 * live in the `.if-*` / `.gm-*` layer at the bottom of src/index.css, so a
 * restyle means editing one stylesheet, not chasing inline styles.
 *
 * Retinting: any of these accepts an `accent` colour and exposes it as the
 * `--accent` custom property, which the CSS uses for fills, glows and badges.
 * That's how each game mode keeps its own personality without forking styles.
 */
import {
  forwardRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Expose `accent` to CSS as `--accent`. */
const accentStyle = (accent?: string, extra?: CSSProperties): CSSProperties | undefined =>
  accent ? ({ ...extra, ['--accent' as string]: accent } as CSSProperties) : extra;

/* ============================================================
   GameButton
============================================================ */
type ButtonVariant = 'primary' | 'neutral' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

export interface GameButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Tint for the `primary` fill and its hover glow. */
  accent?: string;
  loading?: boolean;
  loadingLabel?: string;
  icon?: ReactNode;
  block?: boolean;
  children?: ReactNode;
}

export const GameButton = forwardRef<HTMLButtonElement, GameButtonProps>(
  (
    {
      variant = 'neutral',
      size = 'md',
      accent,
      loading = false,
      loadingLabel,
      icon,
      block = false,
      className,
      disabled,
      children,
      type = 'button',
      style,
      ...rest
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      style={accentStyle(accent, style)}
      className={cn(
        'if-btn menu-focus',
        `if-btn--${variant}`,
        size === 'xl' && 'if-btn--xl',
        size === 'lg' && 'if-btn--lg',
        size === 'sm' && 'if-btn--sm',
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <>
          <Loader2 className="h-[1.1em] w-[1.1em] animate-spin" aria-hidden="true" />
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
GameButton.displayName = 'GameButton';

/* ============================================================
   GameIconButton — square, always labelled
============================================================ */
export interface GameIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

export const GameIconButton = forwardRef<HTMLButtonElement, GameIconButtonProps>(
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
GameIconButton.displayName = 'GameIconButton';

/* ============================================================
   GameCard — the only container
============================================================ */
export const GameCard = ({
  className,
  children,
  inset = false,
  accent,
  style,
}: {
  className?: string;
  children: ReactNode;
  inset?: boolean;
  accent?: string;
  style?: CSSProperties;
}) => (
  <div
    style={accentStyle(accent, style)}
    className={cn(inset ? 'if-panel-inset' : 'if-panel', className)}
  >
    {children}
  </div>
);

/* ============================================================
   GameInput
============================================================ */
export interface GameInputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Renders the large, letter-spaced lobby-code variant. */
  code?: boolean;
}

export const GameInput = forwardRef<HTMLInputElement, GameInputProps>(
  ({ code = false, className, ...rest }, ref) => (
    <input
      ref={ref}
      className={cn('if-input', code && 'if-code-input', className)}
      {...rest}
    />
  ),
);
GameInput.displayName = 'GameInput';

/* ============================================================
   GameAvatar
============================================================ */
export const GameAvatar = ({
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

/* ============================================================
   GameBadge / GameTag
============================================================ */
export const GameBadge = ({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) => <span className={cn('if-badge', className)}>{children}</span>;

export const GameTag = ({
  accent,
  className,
  children,
}: {
  accent?: string;
  className?: string;
  children: ReactNode;
}) => (
  <span
    style={accentStyle(accent)}
    className={cn('if-tag', accent && 'if-tag--accent', className)}
  >
    {children}
  </span>
);

export const GameLabel = ({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) => <span className={cn('if-label', className)}>{children}</span>;

export const GameDivider = ({ className }: { className?: string }) => (
  <hr className={cn('if-divider', className)} />
);

/* ============================================================
   GameImage — multi-candidate artwork with graceful fallback

   Mode artwork lives in /public and some files are missing; try each candidate
   then fall back to the mode emoji rather than showing a broken image.
============================================================ */
export const GameImage = ({
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
   ModeHero — the focal panel

   Shows the currently selected mode large: real artwork, name, tagline and
   description. This is what gives the screen a subject instead of a grid.
============================================================ */
export const ModeHero = ({
  name,
  tagline,
  description,
  accent,
  art,
  aside,
  meta,
}: {
  name: string;
  tagline?: string;
  description?: string;
  accent: string;
  art: ReactNode;
  /** Rendered under the description (CTA, tags…). */
  aside?: ReactNode;
  /** Rendered top-right (player count, host hint…). */
  meta?: ReactNode;
}) => (
  <div className="gm-hero" style={accentStyle(accent)}>
    <span className="gm-hero-art" aria-hidden="true">
      {art}
    </span>
    <div className="min-w-0">
      {meta && <div className="mb-2 flex flex-wrap items-center gap-2">{meta}</div>}
      <h2 className="gm-hero-name">{name}</h2>
      {tagline && <p className="gm-hero-tagline">{tagline}</p>}
      {description && <p className="gm-hero-desc">{description}</p>}
      {aside && <div className="mt-4">{aside}</div>}
    </div>
  </div>
);

/* ============================================================
   ModeShelf — one scrollable row of compact mode chips

   A single row always fills its line, which is why this replaced the grid:
   seven cards in a 4-column grid left an obvious half-empty second row.
============================================================ */
export const ModeShelf = ({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) => (
  <div role="group" aria-label={label} className="gm-shelf custom-scrollbar">
    {children}
  </div>
);

export const ModeChip = ({
  name,
  accent,
  art,
  selected = false,
  disabled = false,
  onClick,
  title,
}: {
  name: string;
  accent: string;
  art: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-pressed={selected}
    title={title ?? name}
    style={accentStyle(accent)}
    className={cn('gm-chip menu-focus', selected && 'is-selected')}
  >
    {selected && (
      <span className="gm-chip-dot" aria-hidden="true">
        <Check className="h-3 w-3" strokeWidth={3.5} />
      </span>
    )}
    <span className="gm-chip-art" aria-hidden="true">
      {art}
    </span>
    <span className="gm-chip-name">{name}</span>
  </button>
);

/* ============================================================
   PlayerCard — a roster row
============================================================ */
export const PlayerCard = ({
  name,
  avatarUrl,
  isSelf = false,
  badge,
  meta,
  action,
}: {
  name: string;
  avatarUrl?: string;
  isSelf?: boolean;
  badge?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
}) => (
  <li className={cn('if-row', isSelf && 'is-self')}>
    <GameAvatar name={name} src={avatarUrl} />
    <span className="min-w-0 flex-1">
      <span className="flex items-center gap-1.5">
        <span className="truncate text-sm font-semibold">{name}</span>
        {badge}
      </span>
      {meta && <span className="mt-0.5 block text-xs">{meta}</span>}
    </span>
    {action}
  </li>
);

/* ============================================================
   GameModal — centred overlay for panels that bring their own header
============================================================ */
export const GameModal = ({
  label,
  onClose,
  children,
  className,
  showClose = false,
  title,
}: {
  /** Accessible name of the dialog. */
  label: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  /** Render a standard header row with a close button. */
  showClose?: boolean;
  title?: ReactNode;
}) => (
  <div className="ink-z-modal fixed inset-0 flex items-center justify-center p-4">
    <button
      type="button"
      onClick={onClose}
      aria-label={`Fermer ${label}`}
      className="absolute inset-0 h-full w-full cursor-default bg-[rgba(8,5,24,0.75)] backdrop-blur-sm"
    />
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className={cn(
        'menu-dialog menu-dialog-safe if-panel if-fade relative flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden',
        className,
      )}
    >
      {showClose && (
        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-[var(--ink-line)] px-5 py-3.5">
          <span className="if-h2 truncate">{title ?? label}</span>
          <GameIconButton label={`Fermer ${label}`} onClick={onClose}>
            <X className="h-4 w-4" aria-hidden="true" />
          </GameIconButton>
        </div>
      )}
      {children}
    </div>
  </div>
);

/* ============================================================
   GameHeader — logo left, actions right. Deliberately sparse.
============================================================ */
export const GameHeader = ({
  actions,
  children,
}: {
  actions?: ReactNode;
  children?: ReactNode;
}) => (
  <header className="flex flex-shrink-0 items-center justify-between gap-3 px-4 py-4 sm:px-7">
    <div className="flex min-w-0 items-center gap-3">{children}</div>
    {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
  </header>
);

/**
 * Logo lockup. Uses the artwork shipped in /public when it loads, and falls
 * back to a typographic lockup so the header is never empty.
 */
export const GameLogo = ({
  candidates = ['/home/logo.png'],
  className,
  imgClassName = 'h-9 w-auto sm:h-11',
}: {
  candidates?: string[];
  className?: string;
  imgClassName?: string;
}) => (
  <span className={cn('select-none', className)}>
    <GameImage
      candidates={candidates}
      alt="Mimic Master"
      className={imgClassName}
      fallback={
        <span className="if-display text-xl sm:text-2xl" aria-label="Mimic Master">
          Mimic{' '}
          <span
            style={{
              background:
                'linear-gradient(100deg, var(--c-violet), var(--c-pink) 60%, var(--c-orange))',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Master
          </span>
        </span>
      }
    />
  </span>
);

/**
 * Faint full-screen artwork behind a screen. Purely decorative, and skipped
 * entirely on low-power devices via CSS.
 */
export const GameBackdrop = ({ src }: { src: string }) => (
  <div className="gm-backdrop" style={{ backgroundImage: `url(${src})` }} aria-hidden="true" />
);
