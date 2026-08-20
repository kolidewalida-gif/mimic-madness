/**
 * Le curseur natif ne doit jamais être masqué sans remplacement.
 *
 * La classe `game-cursor-enabled` applique `cursor: none !important` sur tout le
 * document. Elle était posée dès que le pointeur était fin, avant de savoir si
 * le curseur dessiné allait réellement s'afficher. En mode Ink — l'expérience
 * par défaut — le composant renvoie `null` : la souris devenait donc invisible
 * dans toute l'application.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { GameCursor } from '@/components/GameCursor';

const mocks = vi.hoisted(() => ({
  isInkMode: false,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock('@/hooks/usePlayerLoadout', () => ({
  usePlayerLoadout: () => ({ frameTier: 'none', effectTier: 'none' }),
}));

vi.mock('@/hooks/useInkMode', () => ({
  useInkMode: () => ({ isInkMode: mocks.isInkMode }),
}));

/** Simule un pointeur de souris, sans préférence de mouvement réduit. */
const stubPointer = (fine: boolean, reduceMotion = false) => {
  vi.stubGlobal(
    'matchMedia',
    (query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? reduceMotion : fine,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    }),
  );
};

const nativeCursorHidden = () =>
  document.body.classList.contains('game-cursor-enabled');

beforeEach(() => {
  mocks.isInkMode = false;
  document.body.className = '';
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.body.className = '';
});

describe('GameCursor — visibilité de la souris', () => {
  it('ne masque pas le curseur natif en mode Ink', () => {
    mocks.isInkMode = true;
    stubPointer(true);
    render(<GameCursor />);
    expect(nativeCursorHidden()).toBe(false);
  });

  it('n’affiche aucun curseur dessiné en mode Ink', () => {
    mocks.isInkMode = true;
    stubPointer(true);
    const { container } = render(<GameCursor />);
    expect(container.querySelector('.game-cursor-nib')).toBeNull();
  });

  it('masque le curseur natif seulement quand il est remplacé', () => {
    stubPointer(true);
    const { container } = render(<GameCursor />);
    expect(container.querySelector('.game-cursor-nib')).not.toBeNull();
    expect(nativeCursorHidden()).toBe(true);
  });

  it('ne masque pas le curseur natif sur un pointeur grossier', () => {
    stubPointer(false);
    render(<GameCursor />);
    expect(nativeCursorHidden()).toBe(false);
  });

  it('ne masque pas le curseur natif si le mouvement réduit est demandé', () => {
    stubPointer(true, true);
    render(<GameCursor />);
    expect(nativeCursorHidden()).toBe(false);
  });

  it('rend le curseur natif au démontage', () => {
    stubPointer(true);
    const view = render(<GameCursor />);
    expect(nativeCursorHidden()).toBe(true);
    view.unmount();
    expect(nativeCursorHidden()).toBe(false);
  });

  it('ne laisse jamais le document sans curseur visible', () => {
    // Quelle que soit la configuration, soit le curseur dessiné est présent,
    // soit le curseur natif reste visible.
    for (const ink of [false, true]) {
      for (const fine of [false, true]) {
        mocks.isInkMode = ink;
        stubPointer(fine);
        const { container, unmount } = render(<GameCursor />);
        const hasCustom = container.querySelector('.game-cursor-nib') !== null;
        expect(hasCustom || !nativeCursorHidden()).toBe(true);
        unmount();
      }
    }
  });
});
