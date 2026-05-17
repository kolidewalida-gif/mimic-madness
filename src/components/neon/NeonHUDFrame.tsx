import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface NeonHUDFrameProps {
  children: ReactNode;
  title?: string;
  badge?: string;
  variant?: 'cyan' | 'magenta' | 'mixed';
  scanline?: boolean;
  glow?: boolean;
  className?: string;
  innerClassName?: string;
  as?: 'div' | 'section' | 'aside' | 'main';
}

/**
 * NeonHUDFrame — Reusable cyber HUD container with corner brackets,
 * optional scan line, and an optional title bar.
 *
 * Designed to render correctly under any theme (uses semantic tokens)
 * but shines brightest with body.theme-neon active.
 */
export const NeonHUDFrame = ({
  children,
  title,
  badge,
  variant = 'cyan',
  scanline = true,
  glow = true,
  className,
  innerClassName,
  as: Tag = 'div',
}: NeonHUDFrameProps) => {
  const edgeColor =
    variant === 'magenta'
      ? 'hsl(var(--secondary))'
      : variant === 'mixed'
      ? 'hsl(var(--primary))'
      : 'hsl(var(--primary))';

  const cornerStroke = variant === 'magenta' ? 'stroke-secondary' : 'stroke-primary';

  return (
    <Tag
      className={cn(
        'relative isolate neon-boot-in',
        glow && 'transition-shadow duration-300',
        className
      )}
      style={{
        // Subtle inner backdrop so contents pop against backdrop grid
        background:
          'linear-gradient(145deg, hsl(var(--card) / 0.85) 0%, hsl(var(--background-secondary) / 0.6) 100%)',
        boxShadow: glow
          ? `inset 0 0 0 1px ${edgeColor.replace(')', ' / 0.45)')}, 0 0 28px ${edgeColor.replace(')', ' / 0.18)')}`
          : `inset 0 0 0 1px ${edgeColor.replace(')', ' / 0.35)')}`,
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Corner brackets */}
      <svg
        className={cn('pointer-events-none absolute inset-0 h-full w-full', cornerStroke)}
        fill="none"
        strokeWidth={1.5}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        {/* TL */}
        <path d="M 0 14 L 0 0 L 14 0" />
        {/* TR */}
        <path d="M 86 0 L 100 0 L 100 14" />
        {/* BL */}
        <path d="M 0 86 L 0 100 L 14 100" />
        {/* BR */}
        <path d="M 86 100 L 100 100 L 100 86" />
      </svg>

      {/* Diagonal accent edge top-right */}
      <div
        className="pointer-events-none absolute -top-px right-6 h-px w-16"
        style={{ background: `linear-gradient(90deg, transparent, ${edgeColor})` }}
      />
      <div
        className="pointer-events-none absolute -bottom-px left-6 h-px w-16"
        style={{ background: `linear-gradient(270deg, transparent, ${edgeColor})` }}
      />

      {/* Optional title bar */}
      {title && (
        <div className="relative flex items-center justify-between border-b border-primary/30 px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="block h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))] animate-pulse" />
            <span
              className="text-xs font-bold uppercase tracking-[0.25em] text-primary"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              {title}
            </span>
          </div>
          {badge && (
            <span
              className="rounded-sm border border-primary/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary/90"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              {badge}
            </span>
          )}
        </div>
      )}

      {/* Content */}
      <div className={cn('relative z-10', innerClassName ?? 'p-4')}>{children}</div>

      {/* Scan line */}
      {scanline && <div className="neon-scan-line" />}
    </Tag>
  );
};

/**
 * NeonTickerLabel — Small Orbitron uppercase HUD label.
 */
export const NeonLabel = ({
  children,
  className,
  tone = 'primary',
}: {
  children: ReactNode;
  className?: string;
  tone?: 'primary' | 'secondary' | 'muted';
}) => (
  <span
    className={cn(
      'inline-block text-[10px] font-bold uppercase tracking-[0.3em]',
      tone === 'primary' && 'text-primary',
      tone === 'secondary' && 'text-secondary',
      tone === 'muted' && 'text-muted-foreground',
      className
    )}
    style={{ fontFamily: 'Orbitron, sans-serif' }}
  >
    {children}
  </span>
);

/**
 * NeonTitle — Big Orbitron headline with cyan→magenta gradient + glow.
 */
export const NeonTitle = ({
  children,
  className,
  as: Tag = 'h2',
}: {
  children: ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'div';
}) => (
  <Tag
    className={cn(
      'bg-gradient-to-r from-primary via-primary-light to-secondary bg-clip-text font-black uppercase tracking-[0.08em] text-transparent neon-text-glow',
      className
    )}
    style={{ fontFamily: 'Orbitron, sans-serif' }}
  >
    {children}
  </Tag>
);

/**
 * NeonButton — Geometric HUD button with corner cuts.
 */
export const NeonButton = ({
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'magenta';
  size?: 'sm' | 'md' | 'lg';
}) => {
  const sizes = {
    sm: 'h-9 px-4 text-xs',
    md: 'h-11 px-6 text-sm',
    lg: 'h-14 px-8 text-base',
  } as const;

  const variants = {
    primary:
      'text-primary-foreground bg-gradient-to-r from-primary to-primary-light hover:from-primary-light hover:to-secondary shadow-[0_0_24px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_36px_hsl(var(--secondary)/0.55)]',
    magenta:
      'text-white bg-gradient-to-r from-secondary to-accent hover:opacity-90 shadow-[0_0_24px_hsl(var(--secondary)/0.45)]',
    ghost:
      'text-primary bg-transparent border border-primary/50 hover:bg-primary/10 hover:border-primary',
  } as const;

  return (
    <button
      {...rest}
      className={cn(
        'relative inline-flex items-center justify-center gap-2 font-bold uppercase tracking-[0.2em] transition-all duration-200',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        // Slanted-corner clip path for HUD look
        '[clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)]',
        sizes[size],
        variants[variant],
        className
      )}
      style={{ fontFamily: 'Orbitron, sans-serif' }}
    >
      {children}
    </button>
  );
};