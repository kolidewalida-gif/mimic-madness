import { createElement } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_THEME, INK_BETA_THEME, ThemeProvider } from '../useTheme';

beforeEach(() => {
  localStorage.clear();
  document.body.className = 'theme-neon cartoon-mode beta-paper inkbeta-dark';
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.body.className = '';
});

describe('thème Ink Beta unique', () => {
  it('est la seule identité visuelle déclarée', () => {
    expect(DEFAULT_THEME).toBe('inkbeta');
    expect(INK_BETA_THEME.name).toBe('Ink Beta');
  });

  it('remplace toutes les classes de thèmes historiques', () => {
    render(createElement(ThemeProvider, { children: createElement('div') }));

    expect(document.body.classList.contains('theme-inkbeta')).toBe(true);
    expect(document.body.classList.contains('ink-mode')).toBe(true);
    expect(document.body.classList.contains('inkbeta-mode')).toBe(true);
    expect(document.body.classList.contains('beta-ink')).toBe(true);
    expect(document.body.classList.contains('theme-neon')).toBe(false);
    expect(document.body.classList.contains('cartoon-mode')).toBe(false);
    expect(document.body.classList.contains('beta-paper')).toBe(false);
    expect(document.body.classList.contains('inkbeta-dark')).toBe(false);
  });

  it('ignore et supprime les anciennes préférences sauvegardées', () => {
    localStorage.setItem('game-theme', 'neverlikethat');
    localStorage.setItem('ink-mode-enabled', 'false');
    localStorage.setItem('ink-beta-surface', 'paper');
    localStorage.setItem('inkbeta-dark', 'true');

    render(createElement(ThemeProvider, { children: createElement('div') }));

    expect(localStorage.getItem('game-theme')).toBeNull();
    expect(localStorage.getItem('ink-mode-enabled')).toBeNull();
    expect(localStorage.getItem('ink-beta-surface')).toBeNull();
    expect(localStorage.getItem('inkbeta-dark')).toBeNull();
  });
});
