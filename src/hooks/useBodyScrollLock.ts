import { useEffect } from 'react';

let activeLocks = 0;
let previousOverflow = '';
let previousPaddingRight = '';

const lockBody = () => {
  if (activeLocks === 0) {
    previousOverflow = document.body.style.overflow;
    previousPaddingRight = document.body.style.paddingRight;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      const currentPadding = Number.parseFloat(window.getComputedStyle(document.body).paddingRight) || 0;
      document.body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';
  }
  activeLocks += 1;
};

const unlockBody = () => {
  activeLocks = Math.max(0, activeLocks - 1);
  if (activeLocks === 0) {
    document.body.style.overflow = previousOverflow;
    document.body.style.paddingRight = previousPaddingRight;
  }
};

/** Locks page scrolling while preserving nested modal behavior. */
export const useBodyScrollLock = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;
    lockBody();
    return unlockBody;
  }, [enabled]);
};
