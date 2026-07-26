import { cn } from '@/lib/utils';
import { ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSoundEffects } from '@/hooks/useSoundEffects';

interface PremiumButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'glow' | 'neon' | 'holographic' | 'cyber';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'accent' | 'success' | 'warning';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  sound?: boolean;
  /** Defaults to "button" so the component never submits a form by accident. */
  type?: 'button' | 'submit' | 'reset';
  /** Required for icon-only buttons: the props were previously dropped. */
  'aria-label'?: string;
  'aria-pressed'?: boolean;
  'aria-expanded'?: boolean;
  title?: string;
}

export const PremiumButton = ({
  children,
  onClick,
  variant = 'default',
  size = 'md',
  color = 'primary',
  disabled = false,
  loading = false,
  className = '',
  sound = true,
  type = 'button',
  title,
  'aria-label': ariaLabel,
  'aria-pressed': ariaPressed,
  'aria-expanded': ariaExpanded,
}: PremiumButtonProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const { playSound } = useSoundEffects();

  const colorMap = {
    primary: {
      bg: 'hsl(var(--primary))',
      hover: 'hsl(var(--primary-hover))',
      glow: 'hsl(var(--primary) / 0.5)',
      text: 'hsl(var(--primary-foreground))'
    },
    accent: {
      bg: 'hsl(var(--accent))',
      hover: 'hsl(var(--accent))',
      glow: 'hsl(var(--accent) / 0.5)',
      text: 'hsl(var(--accent-foreground))'
    },
    success: {
      bg: 'hsl(var(--success))',
      hover: 'hsl(var(--success))',
      glow: 'hsl(var(--success) / 0.5)',
      text: '#fff'
    },
    warning: {
      bg: 'hsl(var(--warning))',
      hover: 'hsl(var(--warning))',
      glow: 'hsl(var(--warning) / 0.5)',
      text: '#000'
    }
  };

  const sizeMap = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-7 py-3.5 text-lg',
    xl: 'px-10 py-5 text-xl'
  };

  const { bg, hover, glow, text } = colorMap[color];

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;

    // Create ripple effect
    const rect = e.currentTarget.getBoundingClientRect();
    const ripple = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      id: Date.now()
    };
    setRipples(prev => [...prev, ripple]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== ripple.id)), 600);

    if (sound) playSound('click');
    onClick?.();
  };

  const handleMouseEnter = () => {
    if (disabled || loading) return;
    setIsHovered(true);
    if (sound) playSound('hoverMedium');
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'glow':
        return {
          boxShadow: isHovered
            ? `0 0 20px ${glow}, 0 0 40px ${glow}, 0 0 60px ${glow}`
            : `0 0 10px ${glow}, 0 0 20px ${glow}`,
          background: bg
        };
      case 'neon':
        return {
          background: 'transparent',
          border: `2px solid ${bg}`,
          boxShadow: isHovered
            ? `inset 0 0 20px ${glow}, 0 0 20px ${glow}, 0 0 40px ${glow}`
            : `inset 0 0 10px ${glow}40, 0 0 10px ${glow}`,
          color: bg
        };
      case 'holographic':
        return {
          background: `linear-gradient(135deg, ${bg}, hsl(var(--accent)), ${bg})`,
          backgroundSize: '200% 200%',
          animation: 'gradient 3s ease infinite',
          boxShadow: isHovered
            ? `0 0 30px ${glow}, 0 0 60px hsl(var(--accent) / 0.5)`
            : `0 0 15px ${glow}`
        };
      case 'cyber':
        return {
          background: `linear-gradient(45deg, ${bg} 0%, transparent 50%, ${bg} 100%)`,
          clipPath: 'polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%)',
          boxShadow: isHovered ? `0 0 30px ${glow}` : `0 0 10px ${glow}`
        };
      default:
        return {
          background: isHovered ? hover : bg,
          boxShadow: isHovered ? `0 0 20px ${glow}` : 'none'
        };
    }
  };

  return (
    <motion.button
      className={cn(
        'relative font-display font-semibold rounded-xl overflow-hidden',
        'transition-all duration-300 ease-out',
        sizeMap[size],
        disabled && 'opacity-50 cursor-not-allowed',
        loading && 'cursor-wait',
        className
      )}
      style={{
        color: variant === 'neon' ? bg : text,
        ...getVariantStyles()
      }}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      disabled={disabled || loading}
      type={type}
      title={title}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      aria-expanded={ariaExpanded}
      aria-busy={loading}
    >
      {/* Scan line overlay for cyber variant */}
      {variant === 'cyber' && (
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)'
          }}
        />
      )}

      {/* Ripple effects */}
      <AnimatePresence>
        {ripples.map(ripple => (
          <motion.span
            key={ripple.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              background: 'rgba(255, 255, 255, 0.4)',
              transform: 'translate(-50%, -50%)'
            }}
            initial={{ width: 0, height: 0, opacity: 0.5 }}
            animate={{ width: 300, height: 300, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        ))}
      </AnimatePresence>

      {/* Loading spinner */}
      {loading && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-inherit"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="w-5 h-5 border-2 border-current border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>
      )}

      {/* Content */}
      <span className={cn('relative z-10', loading && 'opacity-0')}>
        {children}
      </span>
    </motion.button>
  );
};
