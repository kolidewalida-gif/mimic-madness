import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface NeonTextProps {
  children: ReactNode;
  color?: 'primary' | 'accent' | 'success' | 'warning' | 'white';
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  animate?: 'pulse' | 'flicker' | 'breathe' | 'none';
  className?: string;
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'p';
}

export const NeonText = ({
  children,
  color = 'primary',
  size = 'lg',
  animate = 'pulse',
  className = '',
  as: Component = 'span'
}: NeonTextProps) => {
  const colorMap = {
    primary: {
      text: 'hsl(var(--primary))',
      glow: 'hsl(var(--primary) / 0.8)',
      shadow: 'hsl(var(--primary) / 0.5)'
    },
    accent: {
      text: 'hsl(var(--accent))',
      glow: 'hsl(var(--accent) / 0.8)',
      shadow: 'hsl(var(--accent) / 0.5)'
    },
    success: {
      text: 'hsl(var(--success))',
      glow: 'hsl(var(--success) / 0.8)',
      shadow: 'hsl(var(--success) / 0.5)'
    },
    warning: {
      text: 'hsl(var(--warning))',
      glow: 'hsl(var(--warning) / 0.8)',
      shadow: 'hsl(var(--warning) / 0.5)'
    },
    white: {
      text: '#fff',
      glow: 'rgba(255,255,255,0.8)',
      shadow: 'rgba(255,255,255,0.5)'
    }
  };

  const sizeMap = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl',
    '4xl': 'text-4xl md:text-5xl'
  };

  const { text, glow, shadow } = colorMap[color];

  const animationVariants = {
    pulse: {
      textShadow: [
        `0 0 5px ${glow}, 0 0 10px ${glow}, 0 0 20px ${shadow}, 0 0 40px ${shadow}`,
        `0 0 10px ${glow}, 0 0 20px ${glow}, 0 0 40px ${shadow}, 0 0 80px ${shadow}`,
        `0 0 5px ${glow}, 0 0 10px ${glow}, 0 0 20px ${shadow}, 0 0 40px ${shadow}`
      ],
      transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' as const }
    },
    flicker: {
      opacity: [1, 0.8, 1, 0.9, 1, 0.7, 1],
      textShadow: [
        `0 0 10px ${glow}, 0 0 20px ${shadow}`,
        `0 0 5px ${glow}, 0 0 10px ${shadow}`,
        `0 0 15px ${glow}, 0 0 30px ${shadow}`,
        `0 0 8px ${glow}, 0 0 15px ${shadow}`,
        `0 0 12px ${glow}, 0 0 25px ${shadow}`
      ],
      transition: { duration: 0.5, repeat: Infinity, repeatType: 'reverse' as const }
    },
    breathe: {
      scale: [1, 1.02, 1],
      textShadow: [
        `0 0 10px ${glow}, 0 0 20px ${shadow}`,
        `0 0 20px ${glow}, 0 0 40px ${shadow}`,
        `0 0 10px ${glow}, 0 0 20px ${shadow}`
      ],
      transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' as const }
    },
    none: {}
  };

  return (
    <motion.span
      className={cn(
        'font-display font-bold',
        sizeMap[size],
        className
      )}
      style={{
        color: text,
        textShadow: `0 0 10px ${glow}, 0 0 20px ${shadow}, 0 0 40px ${shadow}`
      }}
      animate={animate !== 'none' ? animationVariants[animate] : undefined}
    >
      {children}
    </motion.span>
  );
};
