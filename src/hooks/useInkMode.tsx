import { useTheme } from '@/hooks/useTheme';

/**
 * Hook to determine if Ink mode is active and provide Ink-specific utilities
 * Updated: now uses black/red palette instead of black/white
 */
export const useInkMode = () => {
  const { theme, inkModeEnabled } = useTheme();

  const isInkMode = inkModeEnabled && theme === 'ink';

  return {
    isInkMode,
    // Utility classes for Ink mode (black/red)
    inkClasses: {
      card: isInkMode
        ? 'bg-card border border-border rounded-2xl shadow-lg'
        : '',
      button: isInkMode
        ? 'bg-primary text-primary-foreground hover:bg-primary-hover border-0'
        : '',
      buttonOutline: isInkMode
        ? 'bg-transparent text-primary border-2 border-primary hover:bg-primary hover:text-primary-foreground'
        : '',
      text: isInkMode
        ? 'text-foreground'
        : '',
      textMuted: isInkMode
        ? 'text-muted-foreground'
        : '',
      background: isInkMode
        ? 'bg-background'
        : '',
      input: isInkMode
        ? 'bg-input border border-input-border focus:border-primary focus:ring-primary'
        : '',
    },
    // Font for ink mode
    inkFont: isInkMode ? { fontFamily: "'Caveat', cursive" } : {},
  };
};
