/**
 * Mimic (karaoké compétitif) — design tokens.
 * ISOLATED module: nothing here is imported by other game modes.
 * Premium "stage / spotlight" identity: deep night, warm gold spotlight,
 * electric magenta→gold accent, glassy panels.
 */
export const MIMIC = {
  bg: '#080611',
  bgSoft: '#100c1e',
  panel: 'rgba(18,14,30,0.74)',
  hair: 'rgba(255,255,255,0.10)',
  hairSoft: 'rgba(255,255,255,0.06)',
  text: '#f6f3ff',
  sub: 'rgba(246,243,255,0.55)',
  gold: '#ffcf4a',
  magenta: '#ff2e97',
  violet: '#9b6cff',
  cyan: '#22e0ff',
  emerald: '#22e39a',
  rose: '#ff4d6d',
};

/** Signature gradient for the "MIMIC" wordmark / hero accents. */
export const MIMIC_SPECTRUM = 'linear-gradient(100deg, #ffcf4a 0%, #ff2e97 55%, #9b6cff 100%)';

export const mglow = (c: string, strength = 0.5) =>
  `0 0 24px ${c}${Math.round(strength * 255).toString(16).padStart(2, '0')}`;

/** Color for a live Mimic % value (red → gold → emerald). */
export function scoreColor(pct: number): string {
  if (pct >= 90) return MIMIC.emerald;
  if (pct >= 75) return MIMIC.gold;
  if (pct >= 55) return MIMIC.violet;
  return MIMIC.rose;
}

/** Short qualitative label for a sub-score (0-100). */
export function grade(v: number): string {
  if (v >= 92) return 'Excellent';
  if (v >= 80) return 'Très bon';
  if (v >= 65) return 'Bon';
  if (v >= 45) return 'Correct';
  return 'À revoir';
}
