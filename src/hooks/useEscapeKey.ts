import { useEffect } from 'react';

/**
 * Closes an overlay on Escape. Several menus shipped without it, so the only
 * way out was hunting for the close button with the mouse.
 *
 * @param active Whether the overlay is currently open.
 * @param onEscape Called once when Escape is pressed.
 */
export const useEscapeKey = (active: boolean, onEscape: () => void) => {
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onEscape();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [active, onEscape]);
};
