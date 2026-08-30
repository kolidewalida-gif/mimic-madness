import { useEffect, type ReactNode } from 'react';

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

const LEGACY_THEME_STORAGE_KEYS = [
  'game-theme',
  'ink-mode-enabled',
  'ink-beta-surface',
  'inkbeta-dark',
] as const;

/**
 * Applique Ink Beta de façon déterministe à toute l’application.
 *
 * Le fournisseur reste monté au même endroit afin que les tokens soient prêts
 * pour toutes les routes, mais il n’expose plus de contexte ni de sélecteur :
 * Ink Beta est désormais l’unique identité visuelle.
 */
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
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
    body.classList.remove(
      'cartoon-mode',
      'neverlikethat-mode',
      'beta-paper',
      'inkbeta-dark',
    );
    body.classList.add('theme-inkbeta', 'ink-mode', 'inkbeta-mode', 'beta-ink');

    try {
      LEGACY_THEME_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    } catch {
      // Le stockage peut être indisponible en navigation privée stricte.
    }
  }, []);

  return children;
};
