import { useEffect, useCallback } from 'react';

type CursorEffect = 'magnetic' | 'repel' | 'follow' | 'expand' | 'shrink' | 'glow' | 'rainbow';

interface UseCursorEffectOptions {
  effect: CursorEffect;
  strength?: number;
  radius?: number;
}

export const useCursorEffect = (
  ref: React.RefObject<HTMLElement>,
  options: UseCursorEffectOptions
) => {
  const { effect, strength = 0.3, radius = 100 } = options;

  const applyMagneticEffect = useCallback((element: HTMLElement, mouseX: number, mouseY: number) => {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const distanceX = mouseX - centerX;
    const distanceY = mouseY - centerY;
    const distance = Math.sqrt(distanceX ** 2 + distanceY ** 2);
    
    if (distance < radius) {
      const pull = (1 - distance / radius) * strength;
      const translateX = distanceX * pull;
      const translateY = distanceY * pull;
      element.style.transform = `translate(${translateX}px, ${translateY}px)`;
    } else {
      element.style.transform = '';
    }
  }, [strength, radius]);

  const applyRepelEffect = useCallback((element: HTMLElement, mouseX: number, mouseY: number) => {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const distanceX = mouseX - centerX;
    const distanceY = mouseY - centerY;
    const distance = Math.sqrt(distanceX ** 2 + distanceY ** 2);
    
    if (distance < radius) {
      const push = (1 - distance / radius) * strength;
      const translateX = -distanceX * push;
      const translateY = -distanceY * push;
      element.style.transform = `translate(${translateX}px, ${translateY}px)`;
    } else {
      element.style.transform = '';
    }
  }, [strength, radius]);

  const applyGlowEffect = useCallback((element: HTMLElement, mouseX: number, mouseY: number) => {
    const rect = element.getBoundingClientRect();
    const x = ((mouseX - rect.left) / rect.width) * 100;
    const y = ((mouseY - rect.top) / rect.height) * 100;
    
    element.style.setProperty('--glow-x', `${x}%`);
    element.style.setProperty('--glow-y', `${y}%`);
    element.style.background = `radial-gradient(circle at var(--glow-x) var(--glow-y), hsl(var(--primary) / 0.2), transparent 50%)`;
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleMouseMove = (e: MouseEvent) => {
      switch (effect) {
        case 'magnetic':
          applyMagneticEffect(element, e.clientX, e.clientY);
          break;
        case 'repel':
          applyRepelEffect(element, e.clientX, e.clientY);
          break;
        case 'glow':
          applyGlowEffect(element, e.clientX, e.clientY);
          break;
        case 'expand':
          element.style.transform = 'scale(1.05)';
          break;
        case 'shrink':
          element.style.transform = 'scale(0.95)';
          break;
      }
    };

    const handleMouseLeave = () => {
      element.style.transform = '';
      element.style.background = '';
    };

    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [ref, effect, applyMagneticEffect, applyRepelEffect, applyGlowEffect]);
};

export default useCursorEffect;
