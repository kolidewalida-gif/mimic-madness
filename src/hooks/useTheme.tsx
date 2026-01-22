import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeType = 'neon' | 'cosmic' | 'fire' | 'ice' | 'ink';

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  themes: ThemeType[];
  inkModeEnabled: boolean;
  setInkModeEnabled: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const themes: ThemeType[] = ['neon', 'cosmic', 'fire', 'ice', 'ink'];

export const themeConfig: Record<ThemeType, {
  name: string;
  emoji: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    muted: string;
    mutedForeground: string;
    border: string;
    glow: string;
    glowSecondary: string;
  };
}> = {
  neon: {
    name: 'Neon',
    emoji: '💜',
    description: 'Violet & Cyan électrique',
    colors: {
      primary: '262 92% 55%',
      secondary: '186 100% 50%',
      accent: '280 100% 60%',
      background: '240 20% 4%',
      foreground: '0 0% 98%',
      card: '240 15% 8%',
      cardForeground: '0 0% 98%',
      muted: '240 10% 15%',
      mutedForeground: '240 5% 65%',
      border: '262 50% 30%',
      glow: '262 92% 55%',
      glowSecondary: '186 100% 50%',
    },
  },
  cosmic: {
    name: 'Cosmic',
    emoji: '🌌',
    description: 'Violet profond & étoiles',
    colors: {
      primary: '280 100% 60%',
      secondary: '220 100% 60%',
      accent: '300 100% 70%',
      background: '260 30% 3%',
      foreground: '0 0% 100%',
      card: '260 25% 7%',
      cardForeground: '0 0% 98%',
      muted: '260 15% 12%',
      mutedForeground: '260 10% 60%',
      border: '280 40% 25%',
      glow: '280 100% 60%',
      glowSecondary: '220 100% 60%',
    },
  },
  fire: {
    name: 'Fire',
    emoji: '🔥',
    description: 'Orange & rouge ardent',
    colors: {
      primary: '25 100% 55%',
      secondary: '0 100% 55%',
      accent: '45 100% 55%',
      background: '15 30% 4%',
      foreground: '0 0% 98%',
      card: '15 25% 8%',
      cardForeground: '0 0% 98%',
      muted: '15 15% 15%',
      mutedForeground: '15 10% 60%',
      border: '25 50% 25%',
      glow: '25 100% 55%',
      glowSecondary: '0 100% 55%',
    },
  },
  ice: {
    name: 'Ice',
    emoji: '❄️',
    description: 'Bleu glacial & blanc',
    colors: {
      primary: '200 100% 55%',
      secondary: '180 100% 45%',
      accent: '210 100% 70%',
      background: '210 40% 4%',
      foreground: '0 0% 100%',
      card: '210 30% 8%',
      cardForeground: '0 0% 98%',
      muted: '210 20% 15%',
      mutedForeground: '210 15% 60%',
      border: '200 40% 25%',
      glow: '200 100% 55%',
      glowSecondary: '180 100% 45%',
    },
  },
  ink: {
    name: 'Ink',
    emoji: '🖤',
    description: 'Noir & blanc minimaliste',
    colors: {
      primary: '0 0% 0%',
      secondary: '0 0% 20%',
      accent: '0 0% 40%',
      background: '0 0% 100%',
      foreground: '0 0% 0%',
      card: '0 0% 98%',
      cardForeground: '0 0% 0%',
      muted: '0 0% 95%',
      mutedForeground: '0 0% 45%',
      border: '0 0% 85%',
      glow: '0 0% 0%',
      glowSecondary: '0 0% 30%',
    },
  },
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeType>(() => {
    const saved = localStorage.getItem('game-theme');
    return (saved as ThemeType) || 'neon';
  });

  const [inkModeEnabled, setInkModeEnabledState] = useState<boolean>(() => {
    return localStorage.getItem('ink-mode-enabled') === 'true';
  });

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    localStorage.setItem('game-theme', newTheme);
  };

  const setInkModeEnabled = (enabled: boolean) => {
    setInkModeEnabledState(enabled);
    localStorage.setItem('ink-mode-enabled', enabled ? 'true' : 'false');
    
    // If enabling ink mode, also set the theme to ink
    if (enabled) {
      setTheme('ink');
    }
  };

  // Apply theme CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const config = themeConfig[theme];

    Object.entries(config.colors).forEach(([key, value]) => {
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      root.style.setProperty(`--${cssKey}`, value);
    });

    // Set additional theme-specific variables
    root.style.setProperty('--theme-glow', `hsl(${config.colors.glow})`);
    root.style.setProperty('--theme-glow-secondary', `hsl(${config.colors.glowSecondary})`);
    
    // Update body class for theme-specific styles
    document.body.className = document.body.className
      .replace(/theme-\w+/g, '')
      .trim();
    document.body.classList.add(`theme-${theme}`);
    
    // Add ink-mode class for special styling
    if (theme === 'ink') {
      document.body.classList.add('ink-mode');
    } else {
      document.body.classList.remove('ink-mode');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes, inkModeEnabled, setInkModeEnabled }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
