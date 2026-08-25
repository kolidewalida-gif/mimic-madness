import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { isConsoleOrTv } from '@/lib/deviceCapabilities';

/*
 * `inkbeta` s'écrit sans tiret volontairement. L'effet plus bas nettoie les
 * classes de thème avec `replace(/theme-\w+/g, '')`, et `\w` ne matche pas le
 * tiret : avec `ink-beta` la classe `theme-ink-beta` ne serait rognée qu'en
 * `-beta`, résidu qui s'accumulerait sur `body` à chaque changement de thème.
 */
export type ThemeType = 'neon' | 'cosmic' | 'fire' | 'ice' | 'ink' | 'inkbeta' | 'cartoon' | 'neverlikethat';

/**
 * Surface du thème beta : papier clair ou encre sombre.
 *
 * Deux jeux de tokens complets, commutables. Les filets noirs épais du chrome
 * « kiosque » sont le seul langage graphique qui reste lisible sur les deux,
 * d'où ce choix de langage plutôt qu'un habillage à base de dégradés.
 */
export type BetaSurface = 'paper' | 'ink';

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  themes: ThemeType[];
  inkModeEnabled: boolean;
  setInkModeEnabled: (enabled: boolean) => void;
  betaSurface: BetaSurface;
  setBetaSurface: (surface: BetaSurface) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const themes: ThemeType[] = ['neon', 'cosmic', 'fire', 'ice', 'ink', 'inkbeta', 'cartoon', 'neverlikethat'];

/**
 * Thèmes qui n'apparaissent que pour les administrateurs.
 *
 * Verrou cosmétique, pas frontière de sécurité : l'écran beta est chargé en
 * `React.lazy`, donc un joueur ordinaire ne télécharge jamais son chunk, mais
 * quelqu'un de déterminé pourrait le forcer. C'est suffisant pour une beta
 * fermée de thème visuel.
 */
export const ADMIN_ONLY_THEMES: readonly ThemeType[] = ['inkbeta'];

export const isAdminOnlyTheme = (theme: ThemeType): boolean =>
  ADMIN_ONLY_THEMES.includes(theme);

/**
 * `ink` et `inkbeta` partagent toute la plomberie d'interface : pas de fond
 * animé, pas de barre musicale, Social Studio au lieu du hub, lobby Ink. Seul
 * l'écran d'accueil diffère. Les écrans testent donc l'appartenance à la
 * famille plutôt que l'égalité avec `'ink'`.
 */
export const isInkFamily = (theme: ThemeType): boolean =>
  theme === 'ink' || theme === 'inkbeta';

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
  /*
   * Beta fermée du menu, réservée aux administrateurs. Palette reprise de
   * `PULP` (src/components/audiophone/PulpComic.tsx) : encre #08070a, papier
   * #f3ede0, rouge #ff2e3f, jaune #ffce2b. Volontairement rouge et noir dans
   * le sélecteur, pour se distinguer du violet d'`ink` d'un coup d'œil.
   */
  inkbeta: {
    name: 'Ink Beta',
    emoji: '🧪',
    description: 'Album de stickers — beta admin',
    colors: {
      primary: '355 100% 59%',      // PULP.red #ff2e3f
      secondary: '260 18% 8%',      // charbon
      accent: '45 100% 58%',        // PULP.yellow #ffce2b
      background: '260 18% 3%',     // PULP.ink #08070a
      foreground: '41 44% 92%',     // PULP.paper #f3ede0
      card: '258 18% 10%',
      cardForeground: '41 44% 92%',
      muted: '258 14% 16%',
      mutedForeground: '41 12% 70%',
      border: '0 0% 8%',
      glow: '355 100% 59%',
      glowSecondary: '45 100% 58%',
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
    // Ink is the default experience for everyone (unless they picked another theme)
    const initial = (saved as ThemeType) || 'ink';
    // Consoles / smart-TVs can't handle the heavy 3D Spline theme (react-spline
    // + three.js + physics) — it crashes/freezes the Xbox browser. Force a
    // lightweight theme there so the app stays stable.
    if (initial === 'neverlikethat' && isConsoleOrTv()) return 'ink';
    return initial;
  });

  const [inkModeEnabled, setInkModeEnabledState] = useState<boolean>(() => {
    const stored = localStorage.getItem('ink-mode-enabled');
    // Default ON when the user has no saved preference yet
    return stored === null ? true : stored === 'true';
  });

  /* Papier par défaut : le thème INK est une page de carnet, et le fond clair
     est ce qui porte l'identité. La surface encre reste disponible en second
     choix pour jouer le soir. */
  const [betaSurface, setBetaSurfaceState] = useState<BetaSurface>(() => {
    const stored = localStorage.getItem('ink-beta-surface');
    return stored === 'ink' ? 'ink' : 'paper';
  });

  const setBetaSurface = (surface: BetaSurface) => {
    setBetaSurfaceState(surface);
    localStorage.setItem('ink-beta-surface', surface);
  };

  const setTheme = (newTheme: ThemeType) => {
    // Never allow the heavy 3D Spline theme on consoles/TVs (would crash Xbox).
    const safe = newTheme === 'neverlikethat' && isConsoleOrTv() ? 'ink' : newTheme;
    setThemeState(safe);
    localStorage.setItem('game-theme', safe);
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
    
    /*
     * `ink-mode` vaut pour les deux thèmes de la famille : c'est lui qui
     * remappe les tokens shadcn et neutralise les `backdrop-filter`, dont la
     * beta a autant besoin que l'ink stable.
     */
    if (isInkFamily(theme)) {
      document.body.classList.add('ink-mode');
    } else {
      document.body.classList.remove('ink-mode');
    }

    /* Classe dédiée pour les surcharges qui ne concernent QUE la beta. */
    if (theme === 'inkbeta') {
      document.body.classList.add('inkbeta-mode');
    } else {
      document.body.classList.remove('inkbeta-mode');
    }

    /*
     * La surface ne s'applique que sous la beta. Sans ce garde, revenir à
     * `ink` en ayant choisi le papier laisserait un canvas clair sous un thème
     * conçu pour le sombre.
     */
    document.body.classList.remove('beta-paper', 'beta-ink');
    if (theme === 'inkbeta') {
      document.body.classList.add(betaSurface === 'paper' ? 'beta-paper' : 'beta-ink');
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
  }, [theme, betaSurface]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        themes,
        inkModeEnabled,
        setInkModeEnabled,
        betaSurface,
        setBetaSurface,
      }}
    >
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

/**
 * Renvoie les thèmes que ce visiteur peut réellement choisir.
 *
 * Pendant que le statut admin se résout (`isLoading`), on laisse la liste
 * complète : la retirer puis la remettre ferait clignoter le sélecteur.
 */
export const visibleThemes = (isAdmin: boolean, isLoading: boolean): ThemeType[] =>
  isAdmin || isLoading ? themes : themes.filter((t) => !isAdminOnlyTheme(t));

/**
 * Ramène un visiteur non-admin sur `ink` s'il a un thème réservé en mémoire.
 *
 * `localStorage` est modifiable par l'utilisateur, et un ancien administrateur
 * garde sa valeur. La correction attend `!isLoading` : appliquée pendant le
 * chargement, elle éjecterait les vrais admins avant que leur rôle ne remonte.
 */
export const useRestrictedThemeGuard = (isAdmin: boolean, isLoading: boolean): void => {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (isLoading) return;
    if (!isAdmin && isAdminOnlyTheme(theme)) setTheme('ink');
  }, [isAdmin, isLoading, theme, setTheme]);
};
