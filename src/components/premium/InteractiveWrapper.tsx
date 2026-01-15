import { cn } from '@/lib/utils';
import { ReactNode, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePremiumSoundEffects, PremiumSoundType } from '@/hooks/usePremiumSoundEffects';

interface Ripple {
  id: number;
  x: number;
  y: number;
}

interface InteractiveWrapperProps {
  children: ReactNode;
  className?: string;
  // Sound settings
  clickSound?: PremiumSoundType | false;
  hoverSound?: PremiumSoundType | false;
  soundVolume?: number;
  // Visual effects
  ripple?: boolean;
  rippleColor?: string;
  glow?: boolean;
  glowColor?: string;
  glowIntensity?: 'low' | 'medium' | 'high';
  // Hover effects
  hoverScale?: number;
  hoverLift?: boolean;
  magnetic?: boolean;
  // Tilt effect
  tilt?: boolean;
  tiltIntensity?: number;
  // Click effects
  clickScale?: number;
  // General
  disabled?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export const InteractiveWrapper = ({
  children,
  className = '',
  clickSound = 'click',
  hoverSound = 'hoverSoft',
  soundVolume = 0.5,
  ripple = true,
  rippleColor = 'hsl(var(--primary) / 0.3)',
  glow = false,
  glowColor = 'hsl(var(--primary))',
  glowIntensity = 'medium',
  hoverScale = 1.02,
  hoverLift = false,
  magnetic = false,
  tilt = false,
  tiltIntensity = 10,
  clickScale = 0.98,
  disabled = false,
  onClick
}: InteractiveWrapperProps) => {
  const { playSound } = usePremiumSoundEffects();
  const [isHovered, setIsHovered] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [magneticOffset, setMagneticOffset] = useState({ x: 0, y: 0 });
  const [tiltRotation, setTiltRotation] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const glowSizes = {
    low: { blur: 10, spread: 5 },
    medium: { blur: 20, spread: 10 },
    high: { blur: 40, spread: 20 }
  };

  const handleMouseEnter = useCallback(() => {
    if (disabled) return;
    setIsHovered(true);
    if (hoverSound) playSound(hoverSound, soundVolume);
  }, [disabled, hoverSound, playSound, soundVolume]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setMagneticOffset({ x: 0, y: 0 });
    setTiltRotation({ x: 0, y: 0 });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (disabled || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    if (magnetic) {
      const magnetX = (x - 0.5) * 20;
      const magnetY = (y - 0.5) * 20;
      setMagneticOffset({ x: magnetX, y: magnetY });
    }

    if (tilt) {
      const tiltX = (y - 0.5) * tiltIntensity;
      const tiltY = (x - 0.5) * -tiltIntensity;
      setTiltRotation({ x: tiltX, y: tiltY });
    }
  }, [disabled, magnetic, tilt, tiltIntensity]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (disabled) return;

    // Create ripple
    if (ripple && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const newRipple: Ripple = {
        id: Date.now(),
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      setRipples(prev => [...prev, newRipple]);
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id));
      }, 600);
    }

    if (clickSound) playSound(clickSound, soundVolume);
    onClick?.(e);
  }, [disabled, ripple, clickSound, playSound, soundVolume, onClick]);

  return (
    <motion.div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden cursor-pointer',
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        className
      )}
      style={{
        transformStyle: 'preserve-3d',
        perspective: tilt ? '1000px' : undefined
      }}
      animate={{
        x: magnetic ? magneticOffset.x : 0,
        y: magnetic ? magneticOffset.y : hoverLift && isHovered ? -5 : 0,
        rotateX: tilt ? tiltRotation.x : 0,
        rotateY: tilt ? tiltRotation.y : 0,
        scale: isHovered ? hoverScale : 1,
        boxShadow: glow && isHovered
          ? `0 0 ${glowSizes[glowIntensity].blur}px ${glowSizes[glowIntensity].spread}px ${glowColor}`
          : 'none'
      }}
      whileTap={{ scale: clickScale }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 25
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
    >
      {children}

      {/* Ripple effects */}
      <AnimatePresence>
        {ripples.map(r => (
          <motion.span
            key={r.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: r.x,
              top: r.y,
              background: rippleColor,
              transform: 'translate(-50%, -50%)'
            }}
            initial={{ width: 0, height: 0, opacity: 0.6 }}
            animate={{ width: 300, height: 300, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        ))}
      </AnimatePresence>

      {/* Hover glow overlay */}
      {glow && (
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-inherit"
          animate={{
            opacity: isHovered ? 0.15 : 0
          }}
          style={{
            background: `radial-gradient(circle at center, ${glowColor}, transparent 70%)`
          }}
        />
      )}
    </motion.div>
  );
};
