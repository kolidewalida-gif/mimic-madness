import { useEffect, useState, useCallback, useRef } from 'react';

type CursorType = 'default' | 'pointer' | 'text' | 'grab' | 'grabbing' | 'loading' | 'success' | 'error';

interface CursorPosition {
  x: number;
  y: number;
}

interface CursorState {
  type: CursorType;
  isPressed: boolean;
  isHovering: boolean;
  trail: CursorPosition[];
}

export const CustomCursor = () => {
  const [position, setPosition] = useState<CursorPosition>({ x: 0, y: 0 });
  const [state, setState] = useState<CursorState>({
    type: 'default',
    isPressed: false,
    isHovering: false,
    trail: []
  });
  const [isVisible, setIsVisible] = useState(true);
  const trailRef = useRef<CursorPosition[]>([]);
  const animationRef = useRef<number>();

  const updateCursorType = useCallback((target: HTMLElement) => {
    const tagName = target.tagName.toLowerCase();
    const isClickable = target.closest('button, a, [role="button"], [onclick], input[type="submit"], input[type="button"]');
    const isInput = target.closest('input, textarea, [contenteditable="true"]');
    const isDraggable = target.closest('[draggable="true"], .draggable');
    const isLoading = target.closest('.loading, [data-loading="true"]');
    const isSuccess = target.closest('.success, [data-success="true"]');
    const isError = target.closest('.error, [data-error="true"]');

    if (isLoading) return 'loading';
    if (isSuccess) return 'success';
    if (isError) return 'error';
    if (isDraggable) return state.isPressed ? 'grabbing' : 'grab';
    if (isInput) return 'text';
    if (isClickable) return 'pointer';
    return 'default';
  }, [state.isPressed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const newPosition = { x: e.clientX, y: e.clientY };
      setPosition(newPosition);
      
      // Add to trail
      trailRef.current = [...trailRef.current.slice(-8), newPosition];
      setState(prev => ({ ...prev, trail: trailRef.current }));
      
      const target = e.target as HTMLElement;
      const newType = updateCursorType(target);
      setState(prev => ({
        ...prev,
        type: newType,
        isHovering: newType === 'pointer'
      }));
    };

    const handleMouseDown = () => {
      setState(prev => ({ ...prev, isPressed: true }));
    };

    const handleMouseUp = () => {
      setState(prev => ({ ...prev, isPressed: false }));
    };

    const handleMouseEnter = () => setIsVisible(true);
    const handleMouseLeave = () => setIsVisible(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseleave', handleMouseLeave);

    // Hide default cursor
    document.body.style.cursor = 'none';
    document.querySelectorAll('*').forEach(el => {
      (el as HTMLElement).style.cursor = 'none';
    });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.body.style.cursor = 'auto';
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [updateCursorType]);

  const getCursorStyles = () => {
    const baseSize = state.isPressed ? 28 : state.isHovering ? 44 : 32;
    const dotSize = state.isPressed ? 6 : 8;
    
    return {
      outer: {
        width: baseSize,
        height: baseSize,
        transition: 'width 0.15s, height 0.15s, opacity 0.15s'
      },
      inner: {
        width: dotSize,
        height: dotSize,
        transition: 'width 0.1s, height 0.1s'
      }
    };
  };

  const getCursorContent = () => {
    switch (state.type) {
      case 'loading':
        return (
          <svg className="animate-spin-slow" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="31.4 31.4" />
          </svg>
        );
      case 'success':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M5 12l5 5L19 7" className="animate-[draw_0.3s_ease-out_forwards]" strokeDasharray="24" strokeDashoffset="24" />
          </svg>
        );
      case 'error':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M6 6l12 12M18 6l-12 12" />
          </svg>
        );
      case 'pointer':
        return (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-accent animate-pulse" />
          </div>
        );
      case 'text':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <rect x="11" y="4" width="2" height="16" rx="1" />
            <rect x="7" y="4" width="10" height="2" rx="1" />
            <rect x="7" y="18" width="10" height="2" rx="1" />
          </svg>
        );
      case 'grab':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className="scale-90">
            <path d="M9 8a1 1 0 011-1h4a1 1 0 110 2h-4a1 1 0 01-1-1zm0 4a1 1 0 011-1h4a1 1 0 110 2h-4a1 1 0 01-1-1zm0 4a1 1 0 011-1h4a1 1 0 110 2h-4a1 1 0 01-1-1z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const styles = getCursorStyles();

  if (!isVisible) return null;

  return (
    <>
      {/* Cursor trail */}
      {state.trail.map((pos, i) => (
        <div
          key={i}
          className="fixed pointer-events-none z-[9998] rounded-full bg-primary/20"
          style={{
            left: pos.x,
            top: pos.y,
            width: 4 + (i * 0.5),
            height: 4 + (i * 0.5),
            opacity: (i + 1) / (state.trail.length * 2),
            transform: 'translate(-50%, -50%)',
            transition: 'opacity 0.1s'
          }}
        />
      ))}
      
      {/* Outer ring */}
      <div
        className={`fixed pointer-events-none z-[9999] rounded-full border-2 transition-all duration-150 ${
          state.isHovering ? 'border-accent' : 'border-primary'
        } ${state.isPressed ? 'scale-90' : ''}`}
        style={{
          left: position.x,
          top: position.y,
          ...styles.outer,
          transform: 'translate(-50%, -50%)',
          backgroundColor: state.isHovering ? 'hsl(var(--accent) / 0.1)' : 'transparent',
          boxShadow: state.isHovering 
            ? '0 0 20px hsl(var(--accent) / 0.5)' 
            : '0 0 10px hsl(var(--primary) / 0.3)'
        }}
      >
        {getCursorContent()}
      </div>
      
      {/* Inner dot */}
      <div
        className={`fixed pointer-events-none z-[10000] rounded-full ${
          state.isHovering ? 'bg-accent' : 'bg-primary'
        }`}
        style={{
          left: position.x,
          top: position.y,
          ...styles.inner,
          transform: 'translate(-50%, -50%)',
          boxShadow: state.isHovering 
            ? '0 0 12px hsl(var(--accent))' 
            : '0 0 8px hsl(var(--primary))'
        }}
      />
    </>
  );
};
