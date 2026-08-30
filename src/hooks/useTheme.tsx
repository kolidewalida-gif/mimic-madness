import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/** L’unique thème visuel de l’application. */
export const DEFAULT_THEME = 'inkbeta' as const;
export type ThemeType = typeof DEFAULT_THEME;

export const INK_BETA_THEME = {
  name: 'Ink Beta',
  colors: {
    primary: '355 100% 59%',
    secondary: '260 18% 8%',
    accent: '45 100% 58%',
    background: '260 18% 3%',
    foreground: '41 44% 92%',
    card: '258 18% 10%',
    cardForeground: '41 44% 92%',
    muted: '258 14% 16%',
    mutedForeground: '41 12% 70%',
    border: '0 0% 8%',
    glow: '355 100% 59%',
    glowSecondary: '45 100% 58%',
  },
} as const;

const INK_BETA_DARK_STORAGE_KEY = 'inkbeta-dark';
const LEGACY_THEME_STORAGE_KEYS = [
  'game-theme',
  'ink-mode-enabled',
  'ink-beta-surface',
] as const;

interface ThemeContextValue {
  inkbetaDark: boolean;
  setInkbetaDark: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const readInkBetaDarkPreference = (): boolean => {
  try {
    return localStorage.getItem(INK_BETA_DARK_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

/**
 * Applique Ink Beta à toute l’application et expose uniquement sa variante
 * sombre. Ink Beta reste l’unique identité : le réglage change les valeurs de
 * fond et de panneau, pas la structure ni la famille graphique.
 */
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [inkbetaDark, setInkbetaDarkState] = useState(readInkBetaDarkPreference);

  const setInkbetaDark = useCallback((enabled: boolean) => {
    setInkbetaDarkState(enabled);
    try {
      localStorage.setItem(INK_BETA_DARK_STORAGE_KEY, enabled ? 'true' : 'false');
    } catch {
      // Le stockage peut être indisponible en navigation privée stricte.
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    Object.entries(INK_BETA_THEME.colors).forEach(([key, value]) => {
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      root.style.setProperty(`--${cssKey}`, value);
    });
    root.style.setProperty('--theme-glow', `hsl(${INK_BETA_THEME.colors.glow})`);
    root.style.setProperty('--theme-glow-secondary', `hsl(${INK_BETA_THEME.colors.glowSecondary})`);

    for (const className of [...body.classList]) {
      if (className.startsWith('theme-')) body.classList.remove(className);
    }
    body.classList.remove('cartoon-mode', 'neverlikethat-mode', 'beta-paper');
    body.classList.add('theme-inkbeta', 'ink-mode', 'inkbeta-mode', 'beta-ink');
    body.classList.toggle('inkbeta-dark', inkbetaDark);

    try {
      LEGACY_THEME_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    } catch {
      // Le stockage peut être indisponible en navigation privée stricte.
    }
  }, [inkbetaDark]);

  const value = useMemo(
    () => ({ inkbetaDark, setInkbetaDark }),
    [inkbetaDark, setInkbetaDark],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
