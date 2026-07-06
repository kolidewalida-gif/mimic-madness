/**
 * Device capability detection — used to keep the app stable on constrained
 * browsers (Xbox / PlayStation / smart-TV), which have little RAM and weak GPUs
 * and crash or stutter on heavy WebGL (Spline/three.js), canvas particles and
 * backdrop-blur.
 */

function ua(): string {
  return (typeof navigator !== 'undefined' ? navigator.userAgent : '').toLowerCase();
}

/** True on game consoles (their browsers are the most memory/GPU constrained). */
export function isXbox(): boolean {
  return /\bxbox\b/.test(ua());
}

/** Console or smart-TV browser (UA-based, reliable enough for these devices). */
export function isConsoleOrTv(): boolean {
  return /\b(xbox|playstation|nintendo|smart-?tv|smarttv|tizen|web0s|webos|netcast|hbbtv|viera|bravia|aquos|googletv|android tv|crkey|dtv)\b/.test(ua());
}

/**
 * Broad "low power" check: consoles/TVs, or devices reporting little RAM / few
 * CPU cores. Used to switch off the most expensive visual effects.
 */
export function isLowPowerDevice(): boolean {
  if (isConsoleOrTv()) return true;
  const nav = navigator as unknown as { deviceMemory?: number; hardwareConcurrency?: number };
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory > 0 && nav.deviceMemory <= 3) return true;
  if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency > 0 && nav.hardwareConcurrency <= 2) return true;
  return false;
}
