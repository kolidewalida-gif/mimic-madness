import { ReactNode, useCallback, MouseEvent } from 'react';
import { useInkMode } from '@/hooks/useInkMode';
import { playInkSound, InkSoundType } from '@/hooks/useInkSoundEffects';
import { playSoundEffect } from '@/hooks/useSoundEffects';
import { cn } from '@/lib/utils';

interface InkInteractiveWrapperProps {
  children: ReactNode;
  className?: string;
  onClick?: (e: MouseEvent) => void;
  disabled?: boolean;
  soundOnClick?: boolean;
  soundOnHover?: boolean;
}

/**
 * Interactive wrapper that plays appropriate sounds based on Ink mode
 * In Ink mode: plays minimal, brush-like sounds
 * In Premium mode: plays rich, electronic sounds
 */
export const InkInteractiveWrapper = ({
  children,
  className,
  onClick,
  disabled = false,
  soundOnClick = true,
  soundOnHover = false,
}: InkInteractiveWrapperProps) => {
  const { isInkMode } = useInkMode();

  const handleClick = useCallback((e: MouseEvent) => {
    if (disabled) return;
    
    if (soundOnClick) {
      if (isInkMode) {
        playInkSound('inkClick', 0.4);
      } else {
        playSoundEffect('click', 0.3);
      }
    }
    
    onClick?.(e);
  }, [disabled, soundOnClick, isInkMode, onClick]);

  const handleMouseEnter = useCallback(() => {
    if (disabled || !soundOnHover) return;
    
    if (isInkMode) {
      playInkSound('inkHover', 0.15);
    } else {
      playSoundEffect('hover' as any, 0.1);
    }
  }, [disabled, soundOnHover, isInkMode]);

  return (
    <div 
      className={cn(
        'transition-all duration-200',
        !disabled && 'cursor-pointer',
        !disabled && isInkMode && 'hover:opacity-90 active:scale-[0.98]',
        className
      )}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
    >
      {children}
    </div>
  );
};

/**
 * Play the appropriate sound based on current theme
 */
export const playThemeSound = (
  isInkMode: boolean, 
  inkSound: InkSoundType, 
  premiumSound: string,
  volume: number = 0.3
) => {
  if (isInkMode) {
    playInkSound(inkSound, volume);
  } else {
    playSoundEffect(premiumSound as any, volume);
  }
};
