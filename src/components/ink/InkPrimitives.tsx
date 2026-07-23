/**
 * Reusable cartoon graffiti primitives for the Ink game screens.
 * All ink-mode game screens import these to keep a perfectly
 * uniform DA (purple/cyan/yellow/red palette, 4px black borders,
 * 3D shadows, Caveat font with graffiti text-shadow).
 */
import { motion } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export const GRAFFITI_TEXT_SHADOW =
  '2px 2px 0 #0a0810, -1.5px -1.5px 0 #0a0810, 1.5px -1.5px 0 #0a0810, -1.5px 1.5px 0 #0a0810, 1.5px 1.5px 0 #0a0810';
export const GRAFFITI_TEXT_SHADOW_SM =
  '1.5px 1.5px 0 #0a0810, -1px -1px 0 #0a0810, 1px -1px 0 #0a0810, -1px 1px 0 #0a0810, 1px 1px 0 #0a0810';

/* ============================================================
   Game stage — full-screen background with phase-aware halos
============================================================ */
export const InkGameStage = ({
  accent = '#a855f7',
  children,
  className,
}: {
  accent?: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      'min-h-screen bg-[#0a0510] text-white relative overflow-hidden',
      className,
    )}
  >
    <div className="fixed inset-0 pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f0820] via-[#0a0510] to-[#160a26]" />
      <div
        className="absolute top-0 left-1/3 w-[700px] h-[400px] rounded-full opacity-30"
        style={{
          background: `radial-gradient(ellipse, ${accent}66, transparent 70%)`,
          filter: 'blur(100px)',
        }}
      />
      <div
        className="absolute bottom-0 right-1/4 w-[500px] h-[300px] rounded-full opacity-20"
        style={{
          background: `radial-gradient(ellipse, ${accent}55, transparent 70%)`,
          filter: 'blur(80px)',
        }}
      />
    </div>
    <div className="relative z-10">{children}</div>
  </div>
);

/* ============================================================
   Cartoon card (bordered + shadowed)
============================================================ */
export const InkCard = ({
  accent,
  className,
  children,
  highlighted = false,
  showSparkles = true,
  innerAccent = true,
}: {
  accent?: string;
  className?: string;
  children: React.ReactNode;
  highlighted?: boolean;
  showSparkles?: boolean;
  innerAccent?: boolean;
}) => (
  <div
    className={cn('relative rounded-3xl overflow-hidden', className)}
    style={{
      background:
        'linear-gradient(180deg, #1a0d2e 0%, #160a26 50%, #0f0820 100%)',
      border: '4px solid #0a0810',
      boxShadow: highlighted
        ? `0 8px 0 #0a0810, 0 14px 30px ${accent ?? '#a855f7'}55, inset 0 2px 0 rgba(255,255,255,0.08)`
        : '0 6px 0 #0a0810, inset 0 1px 0 rgba(255,255,255,0.06)',
    }}
  >
    {innerAccent && accent && (
      <div
        className="absolute inset-1.5 rounded-[1.3rem] pointer-events-none"
        style={{ border: `2px solid ${accent}66` }}
      />
    )}
    {showSparkles && accent && (
      <Sparkles
        className="absolute top-3 right-3 w-4 h-4 z-10"
        style={{
          color: accent,
          filter: 'drop-shadow(1px 1px 0 #0a0810)',
        }}
      />
    )}
    <div className="relative">{children}</div>
  </div>
);

/* ============================================================
   Cartoon button — graffiti CTA with 3D shadow
============================================================ */
export const InkButton = ({
  children,
  onClick,
  color = '#a855f7',
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
  const sizeClass =
    size === 'sm'
      ? 'px-3 py-2 text-base'
      : size === 'lg'
        ? 'px-6 py-4 text-2xl'
        : 'px-5 py-3 text-xl';
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={loading}
      whileHover={!isDisabled ? { scale: 1.04, rotate: -1.5 } : undefined}
      whileTap={!isDisabled ? { scale: 0.96 } : undefined}
      className={cn(
        'menu-focus relative inline-flex items-center justify-center gap-2 rounded-2xl font-black leading-none transition-opacity',
        sizeClass,
        isDisabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
      style={{
        background:
          variant === 'filled'
            ? `linear-gradient(180deg, ${color}, ${color}cc)`
            : 'transparent',
        border: variant === 'filled' ? '3px solid #0a0810' : `3px solid ${color}`,
        boxShadow:
          variant === 'filled'
            ? '0 4px 0 #0a0810, inset 0 1px 0 rgba(255,255,255,0.25)'
            : 'none',
        color: 'white',
        fontFamily: "'Caveat', cursive",
        textShadow: variant === 'filled' ? GRAFFITI_TEXT_SHADOW_SM : undefined,
      }}
    >
      {loading ? (
        <span className="inline-flex items-center justify-center gap-2" role="status">
          <Loader2 className="h-[1em] w-[1em] animate-spin" aria-hidden="true" />
          {loadingLabel}
        </span>
      ) : children}
    </motion.button>
  );
};

/* ============================================================
   Cartoon header pill — phase indicator at top of screen
============================================================ */
export const InkPhasePill = ({
  icon: Icon,
  label,
  accent = '#a855f7',
}: {
  icon: any;
  label: string;
  accent?: string;
}) => (
  <motion.div
    initial={{ scale: 0, rotate: -10 }}
    animate={{ scale: 1, rotate: -2 }}
    transition={{ type: 'spring', stiffness: 280, damping: 16 }}
    className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
    style={{
      background: `linear-gradient(180deg, ${accent}, ${accent}cc)`,
      border: '3px solid #0a0810',
      boxShadow: '0 4px 0 #0a0810',
    }}
  >
    <Icon className="w-4 h-4 text-white" strokeWidth={2.5} />
    <span
      className="text-sm font-black uppercase tracking-wider text-white leading-none"
      style={{
        fontFamily: "'Caveat', cursive",
        textShadow: GRAFFITI_TEXT_SHADOW_SM,
      }}
    >
      {label}
    </span>
  </motion.div>
);

/* ============================================================
   Cartoon title — graffiti XL
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
      ? 'text-6xl md:text-7xl'
      : size === 'lg'
        ? 'text-3xl md:text-4xl'
        : 'text-4xl md:text-5xl';
  return (
    <h1
      className={cn(
        'font-black tracking-tight leading-none text-white',
        sizeClass,
        className,
      )}
      style={{
        fontFamily: "'Caveat', cursive",
        textShadow: GRAFFITI_TEXT_SHADOW,
      }}
    >
      {children}
    </h1>
  );
};

/* ============================================================
   Cartoon icon badge (wobble animated)
============================================================ */
export const InkIconBadge = ({
  icon: Icon,
  color = '#a855f7',
  size = 'md',
  wobble = true,
}: {
  icon: any;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  wobble?: boolean;
}) => {
  const sizeMap = { sm: 'w-9 h-9', md: 'w-12 h-12', lg: 'w-16 h-16' };
  const iconSizeMap = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-7 w-7' };
  const Wrapper = wobble ? motion.div : 'div';
  const wobbleProps = wobble
    ? {
        animate: { rotate: [-5, 5, -5] },
        transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' as const },
      }
    : {};
  return (
    <Wrapper
      {...(wobbleProps as object)}
      className={cn(
        'rounded-2xl flex items-center justify-center flex-shrink-0',
        sizeMap[size],
      )}
      style={{
        background: `linear-gradient(135deg, ${color}, ${color}cc)`,
        border: '3px solid #0a0810',
        boxShadow: '0 4px 0 #0a0810, inset 0 2px 0 rgba(255,255,255,0.25)',
      }}
    >
      <Icon
        className={cn(iconSizeMap[size], 'text-white')}
        strokeWidth={2.5}
      />
    </Wrapper>
  );
};

/* ============================================================
   Cartoon stamp badge (e.g. "À TOI", "Suspect")
============================================================ */
export const InkStamp = ({
  color = '#fbbf24',
  rotate = -8,
  children,
}: {
  color?: string;
  rotate?: number;
  children: React.ReactNode;
}) => (
  <div
    className="relative px-2.5 py-1 inline-flex items-center justify-center rounded-lg"
    style={{
      background: `linear-gradient(180deg, ${color}, ${color}cc)`,
      border: '2.5px solid #0a0810',
      boxShadow: '0 3px 0 #0a0810',
      transform: `rotate(${rotate}deg)`,
    }}
  >
    <span
      className="text-xs font-black uppercase tracking-wider text-white leading-none"
      style={{
        fontFamily: "'Caveat', cursive",
        textShadow: GRAFFITI_TEXT_SHADOW_SM,
      }}
    >
      {children}
    </span>
  </div>
);

/* ============================================================
   Cartoon timer bar (rainbow gradient + urgent pulse)
============================================================ */
export const InkTimerBar = ({
  progress,
  urgent = false,
  accent = '#a855f7',
  className,
}: {
  /** 0-100 */
  progress: number;
  urgent?: boolean;
  accent?: string;
  className?: string;
}) => (
  <div
    className={cn('relative h-3 rounded-full overflow-hidden', className)}
    style={{
      background: 'rgba(0,0,0,0.5)',
      border: '2px solid #0a0810',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)',
    }}
  >
    <motion.div
      className="h-full rounded-full"
      animate={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
      transition={{ duration: 0.4, ease: 'linear' }}
      style={{
        background: urgent
          ? 'linear-gradient(90deg, #fbbf24, #ef4444)'
          : `linear-gradient(90deg, ${accent}, ${accent}cc)`,
        boxShadow: `0 0 8px ${urgent ? '#ef4444' : accent}88`,
      }}
    />
  </div>
);

/* ============================================================
   Score / value pill (compact stat indicator)
============================================================ */
export const InkPill = ({
  label,
  value,
  color = '#a855f7',
}: {
  label: string;
  value: string | number;
  color?: string;
}) => (
  <div
    className="px-3 py-1.5 rounded-2xl flex items-center gap-2"
    style={{
      background: `linear-gradient(180deg, ${color}33, ${color}10)`,
      border: '2.5px solid #0a0810',
      boxShadow: '0 3px 0 #0a0810',
    }}
  >
    <span
      className="text-[10px] uppercase tracking-wider font-black text-white/70"
      style={{ fontFamily: "'Caveat', cursive" }}
    >
      {label}
    </span>
    <span
      className="text-base font-black leading-none"
      style={{
        fontFamily: "'Caveat', cursive",
        color,
        textShadow: GRAFFITI_TEXT_SHADOW_SM,
      }}
    >
      {value}
    </span>
  </div>
);
