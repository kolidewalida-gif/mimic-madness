import { ReactNode, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { playSfx, SoundTypeV2 } from '@/hooks/useSoundEffectsV2';

type HoverEffectType = 
  | 'glow' 
  | 'electric' 
  | 'cyber' 
  | 'holographic' 
  | 'magnetic' 
  | 'ripple' 
  | 'morph' 
  | 'scan'
  | 'trail'
  | 'neon';

interface InteractiveWrapperProps {
  children: ReactNode;
  effect?: HoverEffectType;
  hoverSound?: SoundTypeV2 | 'none';
  clickSound?: SoundTypeV2 | 'none';
  magneticStrength?: number;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}

export const InteractiveWrapper = ({
  children,
  effect = 'glow',
  hoverSound = 'uiHoverSoft',
  clickSound = 'uiClick',
  magneticStrength = 0.15,
  className = '',
  disabled = false,
  onClick
}: InteractiveWrapperProps) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const [ripplePosition, setRipplePosition] = useState({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseEnter = useCallback(() => {
    if (disabled) return;
    setIsHovering(true);
    if (hoverSound !== 'none') {
      playSfx(hoverSound, 0.4);
    }
  }, [disabled, hoverSound]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    if (elementRef.current && effect === 'magnetic') {
      elementRef.current.style.transform = '';
    }
  }, [effect]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !elementRef.current) return;

    const rect = elementRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setRipplePosition({ x, y });

    // Apply magnetic effect
    if (effect === 'magnetic') {
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distanceX = (e.clientX - centerX) * magneticStrength;
      const distanceY = (e.clientY - centerY) * magneticStrength;
      elementRef.current.style.transform = `translate(${distanceX}px, ${distanceY}px)`;
    }

    // Update CSS variables for ripple effect
    elementRef.current.style.setProperty('--x', `${x}%`);
    elementRef.current.style.setProperty('--y', `${y}%`);
  }, [disabled, effect, magneticStrength]);

  const handleClick = useCallback(() => {
    if (disabled) return;
    if (clickSound !== 'none') {
      playSfx(clickSound);
    }
    onClick?.();
  }, [disabled, clickSound, onClick]);

  const getEffectClass = () => {
    switch (effect) {
      case 'glow': return 'hover-glow-intense';
      case 'electric': return 'hover-electric';
      case 'cyber': return 'hover-cyber';
      case 'holographic': return 'hover-holographic';
      case 'magnetic': return 'hover-magnetic';
      case 'ripple': return 'hover-ripple';
      case 'morph': return 'hover-morph';
      case 'scan': return 'hover-scan';
      case 'trail': return 'hover-trail';
      case 'neon': return 'hover-neon-border';
      default: return '';
    }
  };

  return (
    <div
      ref={elementRef}
      className={cn(
        'transition-all duration-300',
        getEffectClass(),
        disabled && 'pointer-events-none opacity-50',
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      style={{
        '--x': `${ripplePosition.x}%`,
        '--y': `${ripplePosition.y}%`
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
};

export default InteractiveWrapper;
