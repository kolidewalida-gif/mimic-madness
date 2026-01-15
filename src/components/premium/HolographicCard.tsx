import { cn } from '@/lib/utils';
import { ReactNode, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface HolographicCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: 'primary' | 'accent' | 'success' | 'warning' | 'rainbow';
  intensity?: 'low' | 'medium' | 'high' | 'extreme';
  interactive?: boolean;
}

export const HolographicCard = ({
  children,
  className = '',
  glowColor = 'primary',
  intensity = 'medium',
  interactive = true
}: HolographicCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glowX, setGlowX] = useState(50);
  const [glowY, setGlowY] = useState(50);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    setRotateX((y - 0.5) * -20);
    setRotateY((x - 0.5) * 20);
    setGlowX(x * 100);
    setGlowY(y * 100);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setGlowX(50);
    setGlowY(50);
  };

  const glowColors = {
    primary: 'hsl(var(--primary))',
    accent: 'hsl(var(--accent))',
    success: 'hsl(var(--success))',
    warning: 'hsl(var(--warning))',
    rainbow: ''
  };

  const intensityValues = {
    low: { blur: 30, opacity: 0.2, borderOpacity: 0.3 },
    medium: { blur: 50, opacity: 0.35, borderOpacity: 0.5 },
    high: { blur: 70, opacity: 0.5, borderOpacity: 0.7 },
    extreme: { blur: 100, opacity: 0.7, borderOpacity: 1 }
  };

  const { blur, opacity, borderOpacity } = intensityValues[intensity];

  return (
    <motion.div
      ref={cardRef}
      className={cn(
        'relative rounded-2xl overflow-hidden',
        'bg-card/80 backdrop-blur-xl',
        'border border-white/10',
        className
      )}
      style={{
        transformStyle: 'preserve-3d',
        perspective: '1000px'
      }}
      animate={{
        rotateX: interactive ? rotateX : 0,
        rotateY: interactive ? rotateY : 0
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Rainbow holographic overlay */}
      {glowColor === 'rainbow' && (
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            background: `
              radial-gradient(circle at ${glowX}% ${glowY}%, 
                hsl(0 100% 50% / ${opacity}) 0%, 
                hsl(60 100% 50% / ${opacity}) 20%,
                hsl(120 100% 50% / ${opacity}) 40%,
                hsl(180 100% 50% / ${opacity}) 60%,
                hsl(240 100% 50% / ${opacity}) 80%,
                hsl(300 100% 50% / ${opacity}) 100%
              )
            `,
            filter: `blur(${blur}px)`,
            mixBlendMode: 'overlay'
          }}
        />
      )}

      {/* Single color glow */}
      {glowColor !== 'rainbow' && (
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-300"
          style={{
            background: `radial-gradient(circle at ${glowX}% ${glowY}%, ${glowColors[glowColor]} 0%, transparent 70%)`,
            opacity: opacity,
            filter: `blur(${blur}px)`
          }}
        />
      )}

      {/* Animated border gradient */}
      <div
        className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{
          background: glowColor === 'rainbow'
            ? `linear-gradient(45deg, 
                hsl(0 100% 50% / ${borderOpacity}),
                hsl(60 100% 50% / ${borderOpacity}),
                hsl(120 100% 50% / ${borderOpacity}),
                hsl(180 100% 50% / ${borderOpacity}),
                hsl(240 100% 50% / ${borderOpacity}),
                hsl(300 100% 50% / ${borderOpacity}),
                hsl(0 100% 50% / ${borderOpacity})
              )`
            : `linear-gradient(135deg, ${glowColors[glowColor]} 0%, transparent 50%, ${glowColors[glowColor]} 100%)`,
          backgroundSize: '200% 200%',
          animation: 'gradient 3s ease infinite',
          padding: '1px',
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'xor',
          WebkitMaskComposite: 'xor'
        }}
      />

      {/* Scan line effect */}
      <div
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)'
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
};
