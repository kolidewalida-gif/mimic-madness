import { memo, useRef, useEffect, useCallback, ReactNode } from 'react';

interface InkParallaxContainerProps {
  children: ReactNode;
  intensity?: number;
  className?: string;
}

const InkParallaxContainerComponent = ({
  children,
  intensity = 3,
  className = '',
}: InkParallaxContainerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const isTouchDevice = useRef(false);

  useEffect(() => {
    isTouchDevice.current =
      'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isTouchDevice.current) return;
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      targetRef.current = {
        x: ((e.clientX - cx) / cx) * intensity,
        y: ((e.clientY - cy) / cy) * intensity,
      };
    },
    [intensity],
  );

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleMouseMove]);

  useEffect(() => {
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const animate = () => {
      currentRef.current.x = lerp(
        currentRef.current.x,
        targetRef.current.x,
        0.06,
      );
      currentRef.current.y = lerp(
        currentRef.current.y,
        targetRef.current.y,
        0.06,
      );

      if (containerRef.current) {
        containerRef.current.style.transform = `perspective(1200px) rotateX(${-currentRef.current.y}deg) rotateY(${currentRef.current.x}deg)`;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {children}
    </div>
  );
};

export const InkParallaxContainer = memo(InkParallaxContainerComponent);
