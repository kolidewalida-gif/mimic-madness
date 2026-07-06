import { useEffect } from 'react';

/**
 * Global gamepad / TV navigation — app-wide, non-invasive.
 *
 * Reads the Gamepad API and drives DOM focus via spatial navigation, so the
 * whole app becomes playable with a controller on a console / smart-TV browser
 * WITHOUT touching individual components:
 *   • D-pad / left stick  → move focus to the nearest focusable in that direction
 *   • A (South, btn 0)    → click the focused element
 *   • B (East, btn 1)     → "back" (Escape / a [data-back] button)
 *   • Shoulders (4/5)     → page scroll
 *
 * Adds `gamepad-active` (strong focus rings) and `tv-mode` (perf-friendly CSS)
 * classes on <html>. `tv-mode` is also auto-enabled on known TV/console UAs.
 * When no gamepad is used, this hook does nothing visible.
 */

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[role="button"]:not([aria-disabled="true"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function isVisible(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  if (r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) return false;
  const s = getComputedStyle(el);
  if (s.visibility === 'hidden' || s.display === 'none' || s.pointerEvents === 'none' || Number(s.opacity) === 0) return false;
  return el.offsetParent !== null || s.position === 'fixed';
}

function getFocusables(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isVisible);
}

type Dir = 'up' | 'down' | 'left' | 'right';

function moveFocus(dir: Dir) {
  const items = getFocusables();
  if (!items.length) return;
  const active = document.activeElement as HTMLElement | null;
  if (!active || !items.includes(active) || active === document.body) {
    items[0].focus();
    items[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
    return;
  }
  const ar = active.getBoundingClientRect();
  const acx = ar.left + ar.width / 2;
  const acy = ar.top + ar.height / 2;
  let best: HTMLElement | null = null;
  let bestScore = Infinity;
  for (const el of items) {
    if (el === active) continue;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = cx - acx;
    const dy = cy - acy;
    let inDir = false;
    let primary = 0;
    let secondary = 0;
    if (dir === 'right') { inDir = dx > 6; primary = dx; secondary = Math.abs(dy); }
    else if (dir === 'left') { inDir = dx < -6; primary = -dx; secondary = Math.abs(dy); }
    else if (dir === 'down') { inDir = dy > 6; primary = dy; secondary = Math.abs(dx); }
    else { inDir = dy < -6; primary = -dy; secondary = Math.abs(dx); }
    if (!inDir) continue;
    // prefer well-aligned + close targets
    const score = primary + secondary * 2.2;
    if (score < bestScore) { bestScore = score; best = el; }
  }
  if (best) {
    best.focus();
    best.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }
}

function activateFocused() {
  const el = document.activeElement as HTMLElement | null;
  if (!el || el === document.body) {
    const items = getFocusables();
    if (items.length) items[0].focus();
    return;
  }
  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return; // don't hijack text fields
  el.click();
}

function goBack() {
  const backBtn = document.querySelector<HTMLElement>('[data-back], [data-gamepad-back]');
  if (backBtn) { backBtn.click(); return; }
  // dispatch Escape so modals/drawers listening for it close
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }));
}

function isTvUserAgent(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return /\b(smart-?tv|smarttv|tizen|web0s|webos|netcast|hbbtv|viera|aquos|playstation|xbox|nintendo|googletv|android tv|crkey|bravia|dtv)\b/.test(ua);
}

export function useGamepadNavigation() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('getGamepads' in navigator)) return;

    const root = document.documentElement;
    if (isTvUserAgent()) root.classList.add('tv-mode');

    let raf = 0;
    let active = false;
    // per-direction next-allowed timestamp (auto-repeat while held)
    const nextAt: Record<Dir, number> = { up: 0, down: 0, left: 0, right: 0 };
    const prevButtons: boolean[] = [];
    let lastScroll = 0;

    const REPEAT_FIRST = 260;
    const REPEAT_RATE = 130;
    const AXIS_THRESH = 0.55;

    const activate = () => {
      if (active) return;
      active = true;
      root.classList.add('gamepad-active', 'tv-mode');
    };

    const tryDir = (dir: Dir, pressed: boolean, now: number) => {
      if (!pressed) { nextAt[dir] = 0; return; }
      if (now >= nextAt[dir]) {
        moveFocus(dir);
        nextAt[dir] = now + (nextAt[dir] === 0 ? REPEAT_FIRST : REPEAT_RATE);
      }
    };

    const loop = () => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = Array.from(pads).find((p) => p && p.connected) || null;
      if (gp) {
        const now = performance.now();
        const b = gp.buttons.map((x) => x.pressed);
        const ax = gp.axes;
        // any input activates TV/gamepad mode
        if (b.some(Boolean) || ax.some((v) => Math.abs(v) > AXIS_THRESH)) activate();

        if (active) {
          const up = b[12] || ax[1] < -AXIS_THRESH;
          const down = b[13] || ax[1] > AXIS_THRESH;
          const left = b[14] || ax[0] < -AXIS_THRESH;
          const right = b[15] || ax[0] > AXIS_THRESH;
          tryDir('up', up, now);
          tryDir('down', down, now);
          tryDir('left', left, now);
          tryDir('right', right, now);

          // edge-triggered buttons
          if (b[0] && !prevButtons[0]) activateFocused();     // A
          if (b[1] && !prevButtons[1]) goBack();               // B
          // shoulders → scroll page
          if ((b[5] || b[7]) && now - lastScroll > 90) { window.scrollBy({ top: 120, behavior: 'smooth' }); lastScroll = now; }
          if ((b[4] || b[6]) && now - lastScroll > 90) { window.scrollBy({ top: -120, behavior: 'smooth' }); lastScroll = now; }

          for (let i = 0; i < b.length; i++) prevButtons[i] = b[i];
        }
      }
      raf = requestAnimationFrame(loop);
    };

    const onConnect = () => { activate(); if (!raf) raf = requestAnimationFrame(loop); };
    window.addEventListener('gamepadconnected', onConnect);

    // start polling immediately (some browsers already report a connected pad)
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('gamepadconnected', onConnect);
      if (raf) cancelAnimationFrame(raf);
      root.classList.remove('gamepad-active');
    };
  }, []);
}

/** Mount once at the app root to enable app-wide gamepad/TV navigation. */
export function GamepadNavigation() {
  useGamepadNavigation();
  return null;
}
