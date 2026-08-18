/**
 * Blindtest "Neon Vinyl" design tokens.
 * A premium dark music-lounge identity: near-black base, glassy panels,
 * electric magenta→violet→cyan signature spectrum, gold highlight.
 * Category colors act as the dynamic per-round accent.
 */
export const BT = {
  bg: '#06060d',
  bgSoft: '#0c0c18',
  panel: 'rgba(16,16,28,0.72)',
  panelSolid: 'linear-gradient(180deg, rgba(26,24,44,0.9), rgba(10,10,20,0.92))',
  hair: 'rgba(255,255,255,0.10)',
  hairSoft: 'rgba(255,255,255,0.06)',
  text: '#f5f5fc',
  sub: 'rgba(245,245,252,0.55)',
  magenta: '#ff2e97',
  violet: 'var(--ink-accent)',
  cyan: '#22e0ff',
  gold: '#ffcf4a',
  emerald: '#22e39a',
  rose: '#ff4d6d',
};

/** Signature spectrum gradient used for titles / hero accents. */
export const BT_SPECTRUM = 'linear-gradient(100deg, #ff2e97 0%, var(--ink-accent) 45%, #22e0ff 100%)';

/** Soft neon glow for a given color. */
export const glow = (c: string, strength = 0.5) =>
  `0 0 24px ${c}${Math.round(strength * 255).toString(16).padStart(2, '0')}`;

/** Fine grain / halftone overlay as a CSS background (no asset needed). */
export const GRAIN_BG =
  'radial-gradient(rgba(255,255,255,0.045) 1px, transparent 1px)';
