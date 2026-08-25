/**
 * Accès au thème beta réservé aux administrateurs.
 *
 * Deux invariants comptent ici, et le second est facile à casser :
 *  - un joueur ordinaire ne doit jamais voir `inkbeta` dans un sélecteur ;
 *  - pendant que le rôle admin se résout, la liste ne doit pas changer, sinon
 *    le sélecteur clignote chez les administrateurs à chaque chargement.
 */
import { describe, it, expect } from 'vitest';
import {
  themes,
  visibleThemes,
  isAdminOnlyTheme,
  isInkFamily,
  ADMIN_ONLY_THEMES,
  type ThemeType,
} from '../useTheme';

describe('thèmes réservés aux administrateurs', () => {
  it('inkbeta est déclaré comme réservé', () => {
    expect(isAdminOnlyTheme('inkbeta')).toBe(true);
    expect(ADMIN_ONLY_THEMES).toContain('inkbeta');
  });

  it("aucun thème historique n'est devenu réservé", () => {
    const publics: ThemeType[] = ['neon', 'cosmic', 'fire', 'ice', 'ink', 'cartoon', 'neverlikethat'];
    for (const theme of publics) {
      expect(isAdminOnlyTheme(theme)).toBe(false);
    }
  });

  it('reste sélectionnable par un administrateur', () => {
    expect(visibleThemes(true, false)).toContain('inkbeta');
  });

  it("n'apparaît pas pour un joueur ordinaire", () => {
    expect(visibleThemes(false, false)).not.toContain('inkbeta');
  });

  it('ne retire rien d\'autre que les thèmes réservés', () => {
    const visible = visibleThemes(false, false);
    expect(visible).toHaveLength(themes.length - ADMIN_ONLY_THEMES.length);
    expect(visible).toContain('ink');
    expect(visible).toContain('cartoon');
  });

  it('garde la liste stable tant que le rôle admin est en cours de résolution', () => {
    // `useAdmin` part à isAdmin=false puis interroge Supabase. Filtrer pendant
    // ce laps de temps ferait disparaître puis réapparaître l'entrée.
    expect(visibleThemes(false, true)).toContain('inkbeta');
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
