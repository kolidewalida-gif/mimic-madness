import { useTheme } from '@/hooks/useTheme';

/**
 * Hook to determine if Ink mode is active and provide Ink-specific utilities
 */
export const useInkMode = () => {
  const { theme, inkModeEnabled } = useTheme();
  
  const isInkMode = inkModeEnabled && theme === 'ink';
  
  return {
    isInkMode,
    // Utility classes for Ink mode
    inkClasses: {
      card: isInkMode 
        ? 'bg-white border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]' 
        : '',
      button: isInkMode 
        ? 'bg-black text-white hover:bg-black/80 border-0' 
        : '',
      buttonOutline: isInkMode 
        ? 'bg-white text-black border-2 border-black hover:bg-black hover:text-white' 
        : '',
      text: isInkMode 
        ? 'text-black' 
        : '',
      textMuted: isInkMode 
        ? 'text-black/50' 
        : '',
      background: isInkMode 
        ? 'bg-white' 
        : '',
      input: isInkMode 
        ? 'bg-black/5 border-2 border-black/20 focus:border-black' 
        : '',
    },
    // Font for ink mode
    inkFont: isInkMode ? { fontFamily: "'Caveat', cursive" } : {},
  };
};
