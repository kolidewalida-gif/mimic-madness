import { cn } from '@/lib/utils';
import { ReactNode, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface ElectricBorderProps {
  children: ReactNode;
  className?: string;
  color?: 'primary' | 'accent' | 'success' | 'rainbow';
  speed?: 'slow' | 'medium' | 'fast';
  intensity?: 'low' | 'medium' | 'high';
  animated?: boolean;
}

export const ElectricBorder = ({
  children,
  className = '',
  color = 'primary',
  speed = 'medium',
  intensity = 'medium',
  animated = true
}: ElectricBorderProps) => {
  const [position, setPosition] = useState(0);

  const colorMap = {
    primary: 'hsl(var(--primary))',
    accent: 'hsl(var(--accent))',
    success: 'hsl(var(--success))',
    rainbow: ''
  };

  const speedMap = {
    slow: 4000,
    medium: 2000,
    fast: 1000
  };

  const intensityMap = {
    low: { glow: 10, opacity: 0.5 },
    medium: { glow: 20, opacity: 0.7 },
    high: { glow: 40, opacity: 1 }
  };

  const { glow, opacity } = intensityMap[intensity];

  useEffect(() => {
    if (!animated) return;
    
    let animationFrame: number;
    let startTime: number;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = ((timestamp - startTime) % speedMap[speed]) / speedMap[speed];
      setPosition(progress * 360);
      animationFrame = requestAnimationFrame(animate);
    };
    
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [animated, speed]);

  const getGradient = () => {
    if (color === 'rainbow') {
      return `conic-gradient(from ${position}deg, 
        hsl(0 100% 50%), 
        hsl(60 100% 50%), 
        hsl(120 100% 50%), 
        hsl(180 100% 50%), 
        hsl(240 100% 50%), 
        hsl(300 100% 50%), 
        hsl(0 100% 50%)
      )`;
    }
    const baseColor = colorMap[color];
    return `conic-gradient(from ${position}deg, 
      ${baseColor}, 
      transparent 30%, 
      ${baseColor} 45%, 
      transparent 60%, 
      ${baseColor} 75%, 
      transparent 90%, 
      ${baseColor}
    )`;
  };

  return (
    <div className={cn('relative p-[2px] rounded-xl', className)}>
      {/* Electric border background */}
      <motion.div
        className="absolute inset-0 rounded-xl"
        style={{
          background: getGradient(),
          opacity: opacity,
          filter: `blur(${animated ? 1 : 0}px)`
        }}
      />
      
      {/* Glow effect */}
      <div
        className="absolute inset-0 rounded-xl pointer-events-none"
        style={{
          boxShadow: color === 'rainbow'
            ? `0 0 ${glow}px hsl(var(--primary) / 0.5), 0 0 ${glow * 2}px hsl(var(--accent) / 0.3)`
            : `0 0 ${glow}px ${colorMap[color]}40, 0 0 ${glow * 2}px ${colorMap[color]}20`
        }}
      />

      {/* Content container */}
      <div className="relative bg-card rounded-xl overflow-hidden">
        {children}
      </div>

      {/* Sparkle particles */}
      {animated && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full"
              style={{
                background: color === 'rainbow' 
                  ? `hsl(${i * 60} 100% 70%)`
                  : colorMap[color],
                boxShadow: `0 0 6px ${color === 'rainbow' ? `hsl(${i * 60} 100% 70%)` : colorMap[color]}`
              }}
              animate={{
                x: ['0%', '100%', '100%', '0%', '0%'],
                y: ['0%', '0%', '100%', '100%', '0%'],
                opacity: [0, 1, 1, 1, 0]
              }}
              transition={{
                duration: speedMap[speed] / 1000 * 2,
                delay: i * (speedMap[speed] / 1000 / 3),
                repeat: Infinity,
                ease: 'linear'
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
