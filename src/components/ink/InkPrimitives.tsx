/**
 * Reusable "Superman" comic primitives for the Ink game screens.
 * All ink-mode game screens import these to keep a uniform DA:
 * deep sky-blue backgrounds, a soft golden sun bloom, red/gold/blue accents,
 * dark comic ink borders, 3D shadows, Caveat font with comic text-shadow.
 *
 * Tasteful, not garish — blue dominates, gold is a sparing highlight.
 */
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ============================================================
   PALETTE (Superman)
============================================================ */
export const HERO = {
  ink: '#08132b', // dark comic outline (deep navy, softer than pure black)
  skyDeep: '#061a3d',
  blue: '#2b6cf6', // Superman royal/sky blue — primary
  blueSoft: '#5b96ff',
  gold: '#f5c518', // print gold — highlight
  red: '#e0332e', // Superman red — accent / CTA
  paper: '#eef4ff', // cloud off-white
};

export const GRAFFITI_TEXT_SHADOW =
  '2px 2px 0 #08132b, -1.5px -1.5px 0 #08132b, 1.5px -1.5px 0 #08132b, -1.5px 1.5px 0 #08132b, 1.5px 1.5px 0 #08132b';
export const GRAFFITI_TEXT_SHADOW_SM =
  '1.5px 1.5px 0 #08132b, -1px -1px 0 #08132b, 1px -1px 0 #08132b, -1px 1px 0 #08132b, 1px 1px 0 #08132b';

/* ============================================================
   Game stage — full-screen Superman sky with sun bloom
============================================================ */
export const InkGameStage = ({
  accent = HERO.blue,
  children,
  className,
}: {
  accent?: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      'min-h-screen bg-[#050f24] text-white relative overflow-hidden',
      className,
    )}
  >
    <div className="fixed inset-0 pointer-events-none">
      {/* deep sky gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#12356e] via-[#0a1f45] to-[#050d1e]" />
      {/* warm golden sun bloom (top center) */}
      <div
        className="absolute -top-24 left-1/2 -translate-x-1/2 w-[900px] h-[520px] rounded-full opacity-45"
        style={{
          background:
            'radial-gradient(ellipse, rgba(255,224,140,0.55), rgba(247,183,51,0.28) 45%, transparent 72%)',
          filter: 'blur(70px)',
        }}
      />
      {/* soft cloud puffs */}
      <div
        className="absolute top-[18%] left-[8%] w-[420px] h-[220px] rounded-full opacity-[0.12]"
        style={{ background: 'radial-gradient(ellipse, #ffffff, transparent 70%)', filter: 'blur(50px)' }}
      />
      <div
        className="absolute bottom-[12%] right-[6%] w-[520px] h-[260px] rounded-full opacity-[0.1]"
        style={{ background: 'radial-gradient(ellipse, #cfe0ff, transparent 70%)', filter: 'blur(60px)' }}
      />
      {/* accent halo (mode-tinted) */}
      <div
        className="absolute bottom-0 right-1/4 w-[520px] h-[300px] rounded-full opacity-20"
        style={{ background: `radial-gradient(ellipse, ${accent}66, transparent 70%)`, filter: 'blur(90px)' }}
      />
      {/* subtle top light rays */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: 'repeating-linear-gradient(100deg, transparent 0 26px, rgba(255,255,255,0.6) 26px 27px)' }}
      />
    </div>
    <div className="relative z-10">{children}</div>
  </div>
);

/* ============================================================
   Comic card (bordered + shadowed)
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
        'linear-gradient(180deg, #0f2c5e 0%, #0b2148 50%, #071634 100%)',
      border: '4px solid #08132b',
      boxShadow: highlighted
        ? `0 8px 0 #08132b, 0 14px 30px ${accent ?? HERO.blue}55, inset 0 2px 0 rgba(255,255,255,0.1)`
        : '0 6px 0 #08132b, inset 0 1px 0 rgba(255,255,255,0.08)',
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
        style={{ color: accent, filter: 'drop-shadow(1px 1px 0 #08132b)' }}
      />
    )}
    <div className="relative">{children}</div>
  </div>
);

/* ============================================================
   Comic button — heroic CTA with 3D shadow
============================================================ */
export const InkButton = ({
  children,
  onClick,
  color = HERO.blue,
  disabled = false,
  variant = 'filled',
  size = 'md',
  className,
  type = 'button',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  color?: string;
  disabled?: boolean;
  variant?: 'filled' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  type?: 'button' | 'submit';
}) => {
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
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.04, rotate: -1.5 } : undefined}
      whileTap={!disabled ? { scale: 0.96 } : undefined}
      className={cn(
        'relative inline-flex items-center justify-center gap-2 rounded-2xl font-black leading-none transition-opacity',
        sizeClass,
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
      style={{
        background:
          variant === 'filled'
            ? `linear-gradient(180deg, ${color}, ${color}cc)`
            : 'transparent',
        border: variant === 'filled' ? '3px solid #08132b' : `3px solid ${color}`,
        boxShadow:
          variant === 'filled'
            ? '0 4px 0 #08132b, inset 0 1px 0 rgba(255,255,255,0.3)'
            : 'none',
        color: 'white',
        fontFamily: "'Caveat', cursive",
        textShadow: variant === 'filled' ? GRAFFITI_TEXT_SHADOW_SM : undefined,
      }}
    >
      {children}
    </motion.button>
  );
};

/* ============================================================
   Comic header pill — phase indicator at top of screen
============================================================ */
export const InkPhasePill = ({
  icon: Icon,
  label,
  accent = HERO.blue,
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
      border: '3px solid #08132b',
      boxShadow: '0 4px 0 #08132b',
    }}
  >
    <Icon className="w-4 h-4 text-white" strokeWidth={2.5} />
    <span
      className="text-sm font-black uppercase tracking-wider text-white leading-none"
      style={{ fontFamily: "'Caveat', cursive", textShadow: GRAFFITI_TEXT_SHADOW_SM }}
    >
      {label}
    </span>
  </motion.div>
);

/* ============================================================
   Comic title — heroic XL
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
      className={cn('font-black tracking-tight leading-none text-white', sizeClass, className)}
      style={{ fontFamily: "'Caveat', cursive", textShadow: GRAFFITI_TEXT_SHADOW }}
    >
      {children}
    </h1>
  );
};

/* ============================================================
   Comic icon badge (wobble animated)
============================================================ */
export const InkIconBadge = ({
  icon: Icon,
  color = HERO.blue,
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
      className={cn('rounded-2xl flex items-center justify-center flex-shrink-0', sizeMap[size])}
      style={{
        background: `linear-gradient(135deg, ${color}, ${color}cc)`,
        border: '3px solid #08132b',
        boxShadow: '0 4px 0 #08132b, inset 0 2px 0 rgba(255,255,255,0.25)',
      }}
    >
      <Icon className={cn(iconSizeMap[size], 'text-white')} strokeWidth={2.5} />
    </Wrapper>
  );
};

/* ============================================================
   Comic stamp badge (e.g. "À TOI", "Suspect")
============================================================ */
export const InkStamp = ({
  color = HERO.gold,
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
      border: '2.5px solid #08132b',
      boxShadow: '0 3px 0 #08132b',
      transform: `rotate(${rotate}deg)`,
    }}
  >
    <span
      className="text-xs font-black uppercase tracking-wider text-white leading-none"
      style={{ fontFamily: "'Caveat', cursive", textShadow: GRAFFITI_TEXT_SHADOW_SM }}
    >
      {children}
    </span>
  </div>
);

/* ============================================================
   Comic timer bar (gold→red urgent)
============================================================ */
export const InkTimerBar = ({
  progress,
  urgent = false,
  accent = HERO.blue,
  className,
}: {
  progress: number;
  urgent?: boolean;
  accent?: string;
  className?: string;
}) => (
  <div
    className={cn('relative h-3 rounded-full overflow-hidden', className)}
    style={{
      background: 'rgba(0,0,0,0.5)',
      border: '2px solid #08132b',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)',
    }}
  >
    <motion.div
      className="h-full rounded-full"
      animate={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
      transition={{ duration: 0.4, ease: 'linear' }}
      style={{
        background: urgent
          ? 'linear-gradient(90deg, #f5c518, #e0332e)'
          : `linear-gradient(90deg, ${accent}, ${accent}cc)`,
        boxShadow: `0 0 8px ${urgent ? '#e0332e' : accent}88`,
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
  color = HERO.blue,
}: {
  label: string;
  value: string | number;
  color?: string;
}) => (
  <div
    className="px-3 py-1.5 rounded-2xl flex items-center gap-2"
    style={{
      background: `linear-gradient(180deg, ${color}33, ${color}10)`,
      border: '2.5px solid #08132b',
      boxShadow: '0 3px 0 #08132b',
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
      style={{ fontFamily: "'Caveat', cursive", color, textShadow: GRAFFITI_TEXT_SHADOW_SM }}
    >
      {value}
    </span>
  </div>
);
