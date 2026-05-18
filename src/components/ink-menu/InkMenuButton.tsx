import { memo, useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { playInkSound } from '@/hooks/useInkSoundEffects';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface InkMenuButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  delay?: number;
  className?: string;
  ariaLabel?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: cn(
    'border-2 border-red-500 bg-red-500/10 text-red-500',
    'hover:bg-red-500 hover:text-white',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ),
  secondary: cn(
    'border border-white/20 text-white/80',
    'hover:border-red-500/50 hover:text-red-400',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ),
  ghost: cn(
    'border-0 text-white/60',
    'hover:text-red-400',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ),
};

const InkMenuButtonComponent = ({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  delay = 0,
  className = '',
  ariaLabel,
}: InkMenuButtonProps) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setTilt({ x: y * -6, y: x * 6 });
    },
    [],
  );

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
  }, []);

  const handleClick = useCallback(() => {
    if (disabled) return;
    playInkSound('brushTap', 0.4);
    onClick?.();
  }, [disabled, onClick]);

  const hoverShadow =
    variant === 'primary'
      ? '0 0 40px rgba(255, 43, 43, 0.6)'
      : '0 0 20px rgba(255, 43, 43, 0.4)';

  return (
    <motion.button
      ref={buttonRef}
      onClick={handleClick}
      disabled={disabled}
      aria-label={ariaLabel}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay,
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{
        scale: 1.02,
        boxShadow: hoverShadow,
        transition: { type: 'spring', stiffness: 300, damping: 20 },
      }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        'w-full py-3 px-5 rounded-xl font-bold text-base transition-colors duration-200',
        variantStyles[variant],
        className,
      )}
      style={{
        transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: tilt.x === 0 && tilt.y === 0 ? 'transform 0.3s ease' : undefined,
      }}
    >
      {children}
    </motion.button>
  );
};

export const InkMenuButton = memo(InkMenuButtonComponent);
