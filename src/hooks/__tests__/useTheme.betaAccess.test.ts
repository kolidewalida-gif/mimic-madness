/**
 * Accès public au thème Ink Beta, désormais expérience par défaut.
 */
import { describe, it, expect } from 'vitest';
import {
  themes,
  visibleThemes,
  isAdminOnlyTheme,
  isInkFamily,
  ADMIN_ONLY_THEMES,
  DEFAULT_THEME,
  type ThemeType,
} from '../useTheme';

describe('thème Ink Beta public', () => {
  it('est le thème par défaut des nouveaux visiteurs', () => {
    expect(DEFAULT_THEME).toBe('inkbeta');
  });

  it('n’est plus réservé aux administrateurs', () => {
    expect(isAdminOnlyTheme('inkbeta')).toBe(false);
    expect(ADMIN_ONLY_THEMES).not.toContain('inkbeta');
  });

  it('reste visible pour tous les visiteurs', () => {
    expect(visibleThemes(true, false)).toContain('inkbeta');
    expect(visibleThemes(false, false)).toContain('inkbeta');
  });

  it('ne filtre aucun thème public', () => {
    expect(visibleThemes(false, false)).toEqual(themes);
  });

  it('garde la même liste pendant la résolution du rôle', () => {
    expect(visibleThemes(false, true)).toEqual(themes);
  });
});

describe('famille ink', () => {
  it('regroupe ink et inkbeta', () => {
    expect(isInkFamily('ink')).toBe(true);
    expect(isInkFamily('inkbeta')).toBe(true);
  });

  it('exclut les autres thèmes', () => {
    for (const theme of ['neon', 'cosmic', 'fire', 'ice', 'cartoon', 'neverlikethat'] as ThemeType[]) {
      expect(isInkFamily(theme)).toBe(false);
    }
  });
});

describe('nom du thème beta', () => {
  it("ne contient pas de tiret, sinon le nettoyage des classes body laisse un résidu", () => {
    // ThemeProvider fait `className.replace(/theme-\w+/g, '')`, et `\w` ne
    // matche pas le tiret : `theme-ink-beta` ne serait rogné qu'en `-beta`.
    for (const theme of themes) {
      expect(theme).not.toContain('-');
      expect(`theme-${theme}`.replace(/theme-\w+/g, '').trim()).toBe('');
    }
  });
});
