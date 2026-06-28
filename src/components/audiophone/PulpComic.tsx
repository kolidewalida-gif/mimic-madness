/**
 * PULP COMIC design system — Audio Phone mode.
 *
 * A mature, premium "printed comic / Spider-Verse / Arcane" identity:
 *  - Deep black + charcoal base, off-white ink, sparing red/blue/yellow accents
 *  - Bebas Neue poster lettering with chromatic aberration + halftone + grain
 *  - Painted, slightly irregular panels (hand-inked borders)
 *  - Cinematic film grain, halftone dots, projector flicker, paper texture
 *  - Spider-Verse motion: overshoot, micro-shake, flicker
 *
 * Every Audio Phone screen imports these so the whole mode reads as ONE world.
 */
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/* ============================================================
   PALETTE
============================================================ */
export const PULP = {
  ink: '#08070a',
  black: '#0a0a0c',
  charcoal: '#16141c',
  charcoal2: '#1d1a24',
  paper: '#f3ede0',
  paperDim: '#cfc7b6',
  red: '#ff2e3f', // cinematic red — primary accent
  blue: '#2f7bff', // electric blue — secondary
  yellow: '#ffce2b', // print yellow — highlight
  purple: '#b14dff', // neon purple — rare accent
  green: '#3ddc84',
};

/* Poster lettering font stack */
export const PULP_FONT = "'Bebas Neue', 'Anton', 'Impact', sans-serif";

/* Inline noise used for film grain */
const GRAIN_URI =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")";

/* ============================================================
   Chromatic-aberration / halftone helper for titles
============================================================ */
export const pulpTextShadow = (a = PULP.red, b = PULP.blue) =>
  `2.5px 0 0 ${a}aa, -2.5px 0 0 ${b}aa, 0 5px 14px rgba(0,0,0,0.7)`;

/* ============================================================
   FILM GRAIN + HALFTONE overlays (drop into any container)
============================================================ */
export const PulpGrain = ({ opacity = 0.09 }: { opacity?: number }) => (
  <motion.div
    aria-hidden
    className="pointer-events-none absolute inset-0 z-20"
    style={{
      backgroundImage: GRAIN_URI,
      backgroundSize: '140px 140px',
      mixBlendMode: 'overlay',
      opacity,
    }}
    animate={{
      backgroundPosition: [
        '0px 0px',
        '-30px 12px',
        '18px -22px',
        '-12px 26px',
        '0px 0px',
      ],
    }}
    transition={{ duration: 0.55, repeat: Infinity, ease: 'linear' }}
  />
);

export const PulpHalftone = ({
  className,
  color = 'rgba(0,0,0,0.55)',
  size = 5,
  fade = true,
}: {
  className?: string;
  color?: string;
  size?: number;
  fade?: boolean;
}) => (
  <div
    aria-hidden
    className={cn('pointer-events-none absolute inset-0', className)}
    style={{
      backgroundImage: `radial-gradient(${color} ${size * 0.22}px, transparent ${size * 0.3}px)`,
      backgroundSize: `${size}px ${size}px`,
      WebkitMaskImage: fade
        ? 'radial-gradient(ellipse at center, black 35%, transparent 78%)'
        : undefined,
      maskImage: fade
        ? 'radial-gradient(ellipse at center, black 35%, transparent 78%)'
        : undefined,
    }}
  />
);

/* ============================================================
   STAGE — full-screen cinematic backdrop
============================================================ */
export const PulpStage = ({
  accent = PULP.red,
  accent2 = PULP.blue,
  children,
  className,
}: {
  accent?: string;
  accent2?: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      'relative min-h-screen overflow-hidden text-[color:var(--pulp-paper)]',
      className,
    )}
    style={
      {
        '--pulp-paper': PULP.paper,
        background: `radial-gradient(circle at 50% -10%, ${PULP.charcoal2}, ${PULP.black} 60%, ${PULP.ink} 100%)`,
      } as React.CSSProperties
    }
  >
    {/* Ink spotlight halos */}
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        background: `radial-gradient(60% 45% at 22% 18%, ${accent}26, transparent 70%), radial-gradient(55% 50% at 82% 88%, ${accent2}22, transparent 72%)`,
      }}
    />
    {/* Big halftone field */}
    <PulpHalftone color="rgba(255,255,255,0.05)" size={7} />
    {/* Diagonal speed-lines, very subtle */}
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-[0.05]"
      style={{
        backgroundImage:
          'repeating-linear-gradient(115deg, transparent 0 22px, rgba(255,255,255,0.5) 22px 23px)',
      }}
    />
    {/* Vignette */}
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        boxShadow: 'inset 0 0 200px 60px rgba(0,0,0,0.85)',
        background:
          'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)',
      }}
    />
    {/* Projector flicker */}
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0 bg-white"
      animate={{ opacity: [0, 0.015, 0, 0.025, 0, 0.01, 0] }}
      transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
    />
    <PulpGrain />
    <div className="relative z-30">{children}</div>
  </div>
);

/* ============================================================
   TITLE — brush/poster lettering
============================================================ */
export const PulpTitle = ({
  children,
  size = 'lg',
  className,
  accent = PULP.red,
  accent2 = PULP.blue,
  as: Tag = 'h1',
}: {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  accent?: string;
  accent2?: string;
  as?: keyof JSX.IntrinsicElements;
}) => {
  const sizeClass =
    size === 'xl'
      ? 'text-6xl md:text-8xl'
      : size === 'lg'
        ? 'text-5xl md:text-6xl'
        : size === 'md'
          ? 'text-3xl md:text-4xl'
          : 'text-2xl md:text-3xl';
  return (
    <Tag
      className={cn('leading-[0.92] uppercase', sizeClass, className)}
      style={{
        fontFamily: PULP_FONT,
        color: PULP.paper,
        letterSpacing: '0.02em',
        transform: 'skewX(-5deg)',
        WebkitTextStroke: '1px rgba(8,7,10,0.65)',
        textShadow: pulpTextShadow(accent, accent2),
      }}
    >
      {children}
    </Tag>
  );
};

/* ============================================================
   PANEL — painted, slightly irregular inked frame
============================================================ */
const ROUGH_RECT =
  'M3,7 Q2,3 7,3 L38,2.2 Q60,1.4 73,2.6 L93,3.5 Q98,3 97.4,9 L96.4,40 Q97.4,60 96.6,72 L97,92 Q98,98 92,97 L62,98 Q40,98.6 27,97.2 L7,96.4 Q2,97 3,91 L3.6,60 Q2.8,40 3.4,27 Z';

export const PulpPanel = ({
  children,
  className,
  accent = PULP.red,
  fill = 'rgba(18,16,24,0.92)',
  glow = true,
}: {
  children: React.ReactNode;
  className?: string;
  accent?: string;
  fill?: string;
  glow?: boolean;
}) => (
  <div className={cn('relative', className)}>
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full"
      style={{ filter: glow ? `drop-shadow(0 14px 26px rgba(0,0,0,0.6))` : undefined }}
    >
      <path d={ROUGH_RECT} fill={fill} />
      <path
        d={ROUGH_RECT}
        fill="none"
        stroke={PULP.ink}
        strokeWidth={6}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
      <path
        d={ROUGH_RECT}
        fill="none"
        stroke={accent}
        strokeWidth={2.5}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeOpacity={0.9}
      />
    </svg>
    <PulpHalftone color="rgba(255,255,255,0.04)" size={5} />
    <PulpGrain opacity={0.06} />
    <div className="relative z-10">{children}</div>
  </div>
);

/* ============================================================
   STAMP / TAG — rubber-stamp label
============================================================ */
export const PulpTag = ({
  children,
  color = PULP.yellow,
  rotate = -3,
  className,
}: {
  children: React.ReactNode;
  color?: string;
  rotate?: number;
  className?: string;
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 px-3 py-1 uppercase',
      className,
    )}
    style={{
      fontFamily: PULP_FONT,
      letterSpacing: '0.22em',
      fontSize: '0.78rem',
      color,
      border: `2px solid ${color}`,
      background: 'rgba(8,7,10,0.5)',
      boxShadow: `0 0 0 3px rgba(8,7,10,0.6), 3px 3px 0 ${PULP.ink}`,
      transform: `rotate(${rotate}deg)`,
    }}
  >
    {children}
  </span>
);

/* ============================================================
   BUTTON — printed, cut-paper CTA
============================================================ */
const CUT = 'polygon(0 10%, 2.5% 0, 97% 5%, 100% 14%, 99% 90%, 96.5% 100%, 3% 96%, 0 86%)';

export const PulpButton = ({
  children,
  onClick,
  color = PULP.red,
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
  variant?: 'filled' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  type?: 'button' | 'submit';
}) => {
  const pad =
    size === 'lg'
      ? 'px-8 py-4 text-3xl'
      : size === 'sm'
        ? 'px-4 py-2 text-xl'
        : 'px-6 py-3 text-2xl';
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.045, y: -2 } : undefined}
      whileTap={!disabled ? { scale: 0.93 } : undefined}
      transition={{ type: 'spring', stiffness: 500, damping: 18 }}
      className={cn(
        'relative inline-flex items-center justify-center gap-2.5 uppercase leading-none',
        pad,
        disabled && 'opacity-45 cursor-not-allowed',
        className,
      )}
      style={{
        fontFamily: PULP_FONT,
        letterSpacing: '0.06em',
        clipPath: CUT,
        color: variant === 'filled' ? PULP.paper : color,
        background:
          variant === 'filled'
            ? `linear-gradient(160deg, ${color}, ${color}bb)`
            : 'rgba(8,7,10,0.55)',
        border: `3px solid ${variant === 'filled' ? PULP.ink : color}`,
        boxShadow:
          variant === 'filled'
            ? `0 6px 0 ${PULP.ink}, 0 10px 22px ${color}55`
            : `0 6px 0 ${PULP.ink}`,
        textShadow:
          variant === 'filled'
            ? '1.5px 1.5px 0 rgba(8,7,10,0.5)'
            : undefined,
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: GRAIN_URI,
          backgroundSize: '120px 120px',
          mixBlendMode: 'overlay',
        }}
      />
      <span className="relative z-10 inline-flex items-center gap-2.5">{children}</span>
    </motion.button>
  );
};

/* ============================================================
   DIVIDER — inked rule
============================================================ */
export const PulpRule = ({ color = 'rgba(243,237,224,0.2)' }: { color?: string }) => (
  <div
    className="h-[3px] w-full"
    style={{
      background: `repeating-linear-gradient(90deg, ${color} 0 10px, transparent 10px 16px)`,
    }}
  />
);
