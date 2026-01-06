import { useRef, useCallback } from 'react';
import { playSfx, SoundTypeV2 } from '@/hooks/useSoundEffectsV2';

interface UseHoverEffectsOptions {
  hoverSound?: SoundTypeV2;
  clickSound?: SoundTypeV2;
  magneticStrength?: number;
  glowOnHover?: boolean;
}

export const useHoverEffects = (options: UseHoverEffectsOptions = {}) => {
  const {
    hoverSound = 'uiHoverSoft',
    clickSound = 'uiClick',
    magneticStrength = 0.2,
    glowOnHover = true
  } = options;

  const elementRef = useRef<HTMLElement>(null);

  const handleMouseEnter = useCallback(() => {
    playSfx(hoverSound, 0.5);
  }, [hoverSound]);

  const handleClick = useCallback(() => {
    playSfx(clickSound);
  }, [clickSound]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (!elementRef.current || magneticStrength === 0) return;

    const rect = elementRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const distanceX = e.clientX - centerX;
    const distanceY = e.clientY - centerY;
    
    const translateX = distanceX * magneticStrength;
    const translateY = distanceY * magneticStrength;
    
    elementRef.current.style.transform = `translate(${translateX}px, ${translateY}px)`;
  }, [magneticStrength]);

  const handleMouseLeave = useCallback(() => {
    if (elementRef.current) {
      elementRef.current.style.transform = '';
    }
  }, []);

  return {
    ref: elementRef,
    handlers: {
      onMouseEnter: handleMouseEnter,
      onClick: handleClick,
      onMouseMove: handleMouseMove,
      onMouseLeave: handleMouseLeave
    }
  };
};

export default useHoverEffects;
