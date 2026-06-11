import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeType = 'neon' | 'cosmic' | 'fire' | 'ice' | 'ink' | 'cartoon' | 'neverlikethat';

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  themes: ThemeType[];
  inkModeEnabled: boolean;
  setInkModeEnabled: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const themes: ThemeType[] = ['neon', 'cosmic', 'fire', 'ice', 'ink', 'cartoon', 'neverlikethat'];

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
    name: 'Cyber Hub',
    emoji: '⚡',
    description: 'Cyan & Magenta — console next-gen',
    colors: {
      // #00f0ff cyan primary
      primary: '186 100% 50%',
      // Magenta secondary #ff006e
      secondary: '336 100% 50%',
      // Hot magenta accent
      accent: '336 100% 50%',
      // Deep midnight blue-black
      background: '240 40% 5%',
      foreground: '0 0% 98%',
      card: '240 35% 9%',
      cardForeground: '0 0% 98%',
      muted: '240 25% 14%',
      mutedForeground: '186 20% 70%',
      border: '186 80% 35%',
      glow: '186 100% 50%',
      glowSecondary: '336 100% 55%',
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
    description: 'Noir & Rouge minimaliste',
    colors: {
      primary: '0 85% 55%',
      secondary: '0 0% 14%',
      accent: '0 75% 45%',
      background: '0 0% 4%',
      foreground: '0 0% 96%',
      card: '0 0% 7%',
      cardForeground: '0 0% 96%',
      muted: '0 0% 12%',
      mutedForeground: '0 0% 65%',
      border: '0 0% 14%',
      glow: '0 85% 55%',
      glowSecondary: '0 75% 45%',
    },
  },
  cartoon: {
    name: 'Cartoon',
    emoji: '💥',
    description: 'Comic BD - couleurs vives & contours',
    colors: {
      primary: '48 100% 55%',      // jaune vif
      secondary: '350 95% 58%',    // rouge BD
      accent: '195 95% 55%',       // cyan pop
      background: '40 70% 92%',    // crème
      foreground: '0 0% 8%',       // noir encre
      card: '0 0% 100%',
      cardForeground: '0 0% 8%',
      muted: '40 40% 88%',
      mutedForeground: '0 0% 25%',
      border: '0 0% 8%',
      glow: '48 100% 55%',
      glowSecondary: '350 95% 58%',
    },
  },
  neverlikethat: {
    name: 'Never Like That',
    emoji: '🤖',
    description: 'Scène 3D interactive & spotlight',
    colors: {
      primary: '217 91% 60%',      // bleu électrique
      secondary: '270 95% 65%',    // violet néon
      accent: '190 95% 55%',       // cyan
      background: '240 28% 4%',    // noir bleuté profond
      foreground: '0 0% 98%',
      card: '240 22% 8%',
      cardForeground: '0 0% 98%',
      muted: '240 16% 14%',
      mutedForeground: '240 10% 68%',
      border: '240 22% 18%',
      glow: '217 91% 60%',
      glowSecondary: '270 95% 65%',
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

    // Add cartoon-mode class for comic-book overrides
    if (theme === 'cartoon') {
      document.body.classList.add('cartoon-mode');
    } else {
      document.body.classList.remove('cartoon-mode');
    }

    // Add neverlikethat-mode class for the 3D scene theme overrides
    if (theme === 'neverlikethat') {
      document.body.classList.add('neverlikethat-mode');
    } else {
      document.body.classList.remove('neverlikethat-mode');
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
