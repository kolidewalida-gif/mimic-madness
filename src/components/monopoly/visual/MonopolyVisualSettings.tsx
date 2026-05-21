/**
 * MonopolyVisualSettings.tsx
 *
 * Centralised performance + accessibility provider for the MimicPoly visual
 * layer. Exposes a single `MonopolyVisualSettings` value that every render
 * subtree (3D scene, FX layer, camera, 2D UI) reads from instead of
 * re-detecting `prefers-reduced-motion` / mobile / perf-tier on its own.
 *
 * Public exports:
 *   - {@link MonopolyVisualSettings} interface (read-only settings shape)
 *   - {@link MonopolyVisualSettingsProvider} React component
 *   - {@link useMonopolyVisualSettings} hook
 *   - {@link useFpsProbe} hidden hook (no JSX, console.debug only)
 *   - {@link perfTierFor} pure FPS-series classifier
 *   - {@link lodFor} pure distance LOD selector
 *
 * Negative invariants enforced by this module (Req 11.8 / 8.8):
 *   - Provider returns `{children}` only; no FPS / ping / hardware overlay.
 *   - `useFpsProbe` never renders any element; instrumentation goes to
 *     `console.debug` and is therefore stripped from production builds when
 *     the host disables debug logging.
 *
 * SSR safety: every `window`, `performance`, `matchMedia`, and
 * `requestAnimationFrame` access is guarded with a `typeof` check so the
 * module can be imported in jsdom (Vitest) and any future SSR pass without
 * throwing.
 *
 * Validates: Requirements 11.2, 11.4, 11.8, 12.1, 12.4
 */

import * as React from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Performance tier resolved from the rolling FPS probe.
 *
 * Ordering for monotonicity reasoning: `low < medium < high`. The probe is
 * one-way per session (Req 11.2 — "the transition is one-way per game
 * session to avoid hysteresis"): once we drop to `'low'` we never climb back.
 */
export type PerfTier = 'high' | 'medium' | 'low';

/**
 * Centralised settings consumed by the entire MimicPoly visual layer.
 *
 * Field shape matches design.md → "MonopolyVisualSettings" exactly. Defaults
 * are derived from `(reducedMotion, isMobile, perfTier)` by
 * {@link deriveSettings}; `MonopolyVisualSettingsProvider` exposes the
 * derived snapshot through React context.
 */
export interface MonopolyVisualSettings {
  /** `prefers-reduced-motion: reduce` (Req 12.1, 7.8). */
  reducedMotion: boolean;
  /** Coarse pointer + viewport `<= 900px` (Req 11.2). */
  isMobile: boolean;
  /** Current resolved performance tier (Req 11.2). */
  perfTier: PerfTier;
  /** Maximum simultaneous active particle systems (Req 11.3). */
  particleSystemCap: number;
  /** Maximum live particles per system (Req 11.3). */
  particlesPerSystemCap: number;
  /** Shadow map resolution; `0` disables shadows entirely (Req 11.2). */
  shadowMapSize: number;
  /** LOD switch distance for buildings (Req 11.4). */
  buildingLodNear: number;
  /** Whether secondary accent lights render (Req 11.2). */
  enableSecondaryLights: boolean;
  /** Whether the cinematic camera idle drift runs (Req 7.8 / 12.1). */
  cameraIdleDriftEnabled: boolean;
}

// ---------------------------------------------------------------------------
// Constants (exported for tests / consumers reasoning about bounds)
// ---------------------------------------------------------------------------

/** FPS strictly below this threshold counts as "low" (design Property 10). */
export const FPS_LOW_THRESHOLD = 40;

/** FPS at or above this threshold counts as "high" (design Property 10). */
export const FPS_HIGH_THRESHOLD = 55;

/**
 * Number of consecutive 1Hz samples required to confirm a sustained drop
 * (`2` samples = 2 seconds at the documented 1Hz sampling rate).
 */
export const FPS_LOW_WINDOW_SAMPLES = 2;

/** Building LOD switch distance — design "Components" §`<Building>`. */
export const BUILDING_LOD_NEAR = 12;

/** Default particle-system cap (design "MonopolyVisualSettings"). */
const DEFAULT_PARTICLE_SYSTEM_CAP = 8;
/** Particle-system cap on `'low'` perf tier. */
const LOW_PARTICLE_SYSTEM_CAP = 4;
/** Default per-system particle cap. */
const DEFAULT_PARTICLES_PER_SYSTEM = 60;
/** Per-system particle cap on `'low'` perf tier. */
const LOW_PARTICLES_PER_SYSTEM = 24;
/** Shadow map size on `'high'` perf tier. */
const HIGH_SHADOW_SIZE = 1024;
/** Shadow map size on `'medium'` perf tier. */
const MEDIUM_SHADOW_SIZE = 512;
/** Shadow map size on `'low'` perf tier — `0` disables shadows. */
const LOW_SHADOW_SIZE = 0;

/** Mobile detection viewport width upper bound (Req 11.2 documented). */
const MOBILE_MAX_WIDTH = 900;

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * LOD selector for buildings, decor, and any distance-driven mesh swap.
 *
 * Returns `'near'` iff `distance < BUILDING_LOD_NEAR` (12 units), otherwise
 * `'far'`. Pure: same input always yields the same output.
 *
 * Validates Property 10 (LOD half of the invariant).
 */
export function lodFor(distance: number): 'near' | 'far' {
  return distance < BUILDING_LOD_NEAR ? 'near' : 'far';
}

/**
 * Classify a series of 1Hz FPS samples into a {@link PerfTier}.
 *
 * Rules (design Property 10):
 *   - `'low'`    iff there exists a window of {@link FPS_LOW_WINDOW_SAMPLES}
 *                consecutive samples all strictly below
 *                {@link FPS_LOW_THRESHOLD} (i.e. sustained <40 fps for 2 s
 *                at 1Hz sampling).
 *   - `'high'`   iff every sample is `>= FPS_HIGH_THRESHOLD` (55 fps).
 *   - `'medium'` otherwise.
 *   - empty / non-array series → `'medium'` (insufficient data).
 *
 * Monotonicity (design Property 10): given two equal-length series `A`, `B`
 * with `A[i] >= B[i]` for every `i`, `perfTierFor(A)` is **at least** as
 * high as `perfTierFor(B)` in the `low < medium < high` ordering. This is a
 * direct consequence of the rules:
 *   - if `B` is `'high'` (every `B[i] >= 55`), then `A[i] >= B[i] >= 55` so
 *     `A` is also `'high'`;
 *   - if `B` is `'medium'`, no 2-window in `B` is all `< 40`. Any 2-window
 *     in `A` has `A[i] >= B[i]`, so if it were all `< 40` the corresponding
 *     `B` window would be too — contradiction. So `A` is `'medium'` or
 *     `'high'`.
 *   - `'low'` is the bottom of the order; `A >= 'low'` always.
 *
 * Pure: no I/O, no global state.
 */
export function perfTierFor(series: readonly number[]): PerfTier {
  if (!Array.isArray(series) || series.length === 0) {
    return 'medium';
  }

  // Sustained-low scan. We use a strict `<` against FPS_LOW_THRESHOLD so the
  // "≥ 40" boundary remains in 'medium' / 'high' territory and matches the
  // design wording ("FPS < 40 for ≥ 2s").
  for (let i = 0; i + FPS_LOW_WINDOW_SAMPLES <= series.length; i++) {
    let allLow = true;
    for (let j = 0; j < FPS_LOW_WINDOW_SAMPLES; j++) {
      const sample = series[i + j];
      if (!(typeof sample === 'number' && sample < FPS_LOW_THRESHOLD)) {
        allLow = false;
        break;
      }
    }
    if (allLow) return 'low';
  }

  // High: every sample is at or above the high threshold.
  let allHigh = true;
  for (const sample of series) {
    if (!(typeof sample === 'number' && sample >= FPS_HIGH_THRESHOLD)) {
      allHigh = false;
      break;
    }
  }
  if (allHigh) return 'high';

  return 'medium';
}

/**
 * Derive the full {@link MonopolyVisualSettings} snapshot from the three
 * inputs the provider tracks (reduced-motion, mobile, perf-tier).
 *
 * Kept as a separate pure function so consumer tests can build a synthetic
 * settings object from any combination without mounting a Provider.
 */
export function deriveSettings(opts: {
  reducedMotion: boolean;
  isMobile: boolean;
  perfTier: PerfTier;
}): MonopolyVisualSettings {
  const { reducedMotion, isMobile, perfTier } = opts;
  const isLow = perfTier === 'low';
  const isMedium = perfTier === 'medium';

  // Particle caps: design defaults; halved on `'low'` per design table.
  const particleSystemCap = isLow ? LOW_PARTICLE_SYSTEM_CAP : DEFAULT_PARTICLE_SYSTEM_CAP;
  const particlesPerSystemCap = isLow ? LOW_PARTICLES_PER_SYSTEM : DEFAULT_PARTICLES_PER_SYSTEM;

  // Shadows: 1024 / 512 / 0 depending on tier.
  const shadowMapSize = isLow
    ? LOW_SHADOW_SIZE
    : isMedium
    ? MEDIUM_SHADOW_SIZE
    : HIGH_SHADOW_SIZE;

  // Secondary lights are disabled on `'low'` and on mobile when not at
  // `'high'` tier (Req 11.2).
  const enableSecondaryLights = !isLow && !(isMobile && isMedium);

  // Camera idle drift is gated solely by reduced-motion (Req 7.8 / 12.1).
  const cameraIdleDriftEnabled = !reducedMotion;

  return {
    reducedMotion,
    isMobile,
    perfTier,
    particleSystemCap,
    particlesPerSystemCap,
    shadowMapSize,
    buildingLodNear: BUILDING_LOD_NEAR,
    enableSecondaryLights,
    cameraIdleDriftEnabled,
  };
}

// ---------------------------------------------------------------------------
// SSR-safe environment readers
// ---------------------------------------------------------------------------

/**
 * SSR / jsdom-safe `window.matchMedia` accessor.
 *
 * Returns `null` when:
 *   - executing on the server (`window` undefined),
 *   - the host environment lacks `matchMedia` (older jsdom by default),
 *   - or `matchMedia` itself throws (defensive).
 */
function getMatchMedia(query: string): MediaQueryList | null {
  if (typeof window === 'undefined') return null;
  if (typeof window.matchMedia !== 'function') return null;
  try {
    return window.matchMedia(query);
  } catch {
    return null;
  }
}

/** Initial `prefers-reduced-motion` value; `false` when matchMedia is absent. */
function readReducedMotion(): boolean {
  const mql = getMatchMedia('(prefers-reduced-motion: reduce)');
  return mql ? mql.matches === true : false;
}

/** Initial mobile detection; `false` when window / matchMedia are absent. */
function readIsMobile(): boolean {
  if (typeof window === 'undefined') return false;
  const mql = getMatchMedia('(pointer: coarse)');
  const coarse = mql ? mql.matches === true : false;
  // `innerWidth` defaults to a non-mobile sentinel when undefined so the
  // jsdom default doesn't accidentally flip mobile on.
  const width = typeof window.innerWidth === 'number' ? window.innerWidth : MOBILE_MAX_WIDTH + 1;
  return coarse && width <= MOBILE_MAX_WIDTH;
}

/**
 * Subscribe to a `MediaQueryList` change, supporting both the modern
 * `addEventListener('change', ...)` API and the legacy `addListener` shim
 * still seen in older Safari / jsdom.
 *
 * Returns an unsubscribe function (no-op when subscription was impossible).
 */
function subscribeMediaQuery(
  mql: MediaQueryList | null,
  handler: (matches: boolean) => void,
): () => void {
  if (!mql) return () => {};
  const onChange = (ev: MediaQueryListEvent | MediaQueryList): void => {
    handler('matches' in ev ? ev.matches === true : false);
  };
  if (typeof mql.addEventListener === 'function') {
    mql.addEventListener('change', onChange as (ev: MediaQueryListEvent) => void);
    return () => {
      mql.removeEventListener('change', onChange as (ev: MediaQueryListEvent) => void);
    };
  }
  // Legacy fallback (Safari < 14, jsdom variants).
  const legacy = mql as unknown as {
    addListener?: (l: (ev: MediaQueryListEvent) => void) => void;
    removeListener?: (l: (ev: MediaQueryListEvent) => void) => void;
  };
  if (typeof legacy.addListener === 'function') {
    legacy.addListener(onChange as (ev: MediaQueryListEvent) => void);
    return () => {
      legacy.removeListener?.(onChange as (ev: MediaQueryListEvent) => void);
    };
  }
  return () => {};
}

// ---------------------------------------------------------------------------
// useFpsProbe — hidden hook, no JSX
// ---------------------------------------------------------------------------

/**
 * Hidden FPS probe hook.
 *
 * Behaviour (design "MonopolyVisualSettings" + Req 11.2 / 11.8):
 *   1. Drives a `requestAnimationFrame` loop, counting frames over rolling
 *      1-second windows.
 *   2. Each window emits a sample at ~1Hz to a small ring buffer, logged via
 *      `console.debug` only — this hook NEVER renders any element.
 *   3. Classifies the rolling buffer with {@link perfTierFor}; when the tier
 *      becomes `'low'` it invokes `onPerfTierLow` exactly once per session
 *      (one-way downshift, no hysteresis).
 *
 * The hook is SSR-safe: when `window` / `requestAnimationFrame` /
 * `performance.now` are unavailable (Node, jsdom variants) it sets up no
 * loop and `onPerfTierLow` is never called.
 *
 * @param onPerfTierLow Callback invoked once when sustained low FPS is
 *                      detected. The hook stores it in a ref so consumers
 *                      can pass a fresh closure on each render without
 *                      re-creating the rAF loop.
 */
export function useFpsProbe(onPerfTierLow?: () => void): void {
  // Stable ref to the latest callback so the rAF effect can stay mount-only.
  const onPerfTierLowRef = React.useRef<typeof onPerfTierLow>(onPerfTierLow);
  React.useEffect(() => {
    onPerfTierLowRef.current = onPerfTierLow;
  }, [onPerfTierLow]);

  React.useEffect(() => {
    // SSR / no-rAF guards.
    if (typeof window === 'undefined') return undefined;
    if (typeof window.requestAnimationFrame !== 'function') return undefined;
    if (typeof performance === 'undefined' || typeof performance.now !== 'function') {
      return undefined;
    }

    let cancelled = false;
    let dispatchedLow = false; // one-way per mount instance.
    let frameCount = 0;
    let lastSampleAt = performance.now();
    const series: number[] = [];
    let rafId = 0;

    const tick = (): void => {
      if (cancelled) return;
      frameCount += 1;
      const now = performance.now();
      const elapsed = now - lastSampleAt;
      if (elapsed >= 1000) {
        const fps = (frameCount * 1000) / elapsed;
        frameCount = 0;
        lastSampleAt = now;

        // Keep only the last few samples — perfTierFor only needs to see
        // the latest 2-sample window for the 'low' detection, but a small
        // history (8) helps log readability and lets the classifier reason
        // about 'high' too.
        series.push(fps);
        if (series.length > 8) series.shift();

        // Console-only instrumentation (Req 11.8). Rounded for readability.
        // eslint-disable-next-line no-console
        console.debug('[MonopolyVisualSettings] fps', Math.round(fps));

        if (!dispatchedLow && perfTierFor(series) === 'low') {
          dispatchedLow = true;
          // eslint-disable-next-line no-console
          console.debug('[MonopolyVisualSettings] perfTier downshift -> low');
          try {
            onPerfTierLowRef.current?.();
          } catch (err) {
            // The probe must never propagate consumer errors and never
            // disturb gameplay (Req 10.6). Log and continue sampling so a
            // buggy callback doesn't kill the entire visual layer.
            // eslint-disable-next-line no-console
            console.debug('[MonopolyVisualSettings] onPerfTierLow threw', err);
          }
        }
      }
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      if (rafId !== 0 && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(rafId);
      }
    };
    // Mount-only: the latest callback is read via ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// ---------------------------------------------------------------------------
// Provider + consumer hook
// ---------------------------------------------------------------------------

/**
 * Context channel. `null` is the "no provider" sentinel so
 * {@link useMonopolyVisualSettings} can throw a descriptive error rather
 * than silently returning a default (which would mask wiring bugs).
 */
const MonopolyVisualSettingsContext =
  React.createContext<MonopolyVisualSettings | null>(null);

/**
 * Read the current {@link MonopolyVisualSettings} snapshot from context.
 *
 * Throws when called outside a {@link MonopolyVisualSettingsProvider}. This
 * is intentional: every consumer in the MimicPoly tree is expected to be a
 * descendant of the single provider mounted by `MonopolyGameScreen`, and
 * silently falling back to defaults would hide misconfiguration.
 */
export function useMonopolyVisualSettings(): MonopolyVisualSettings {
  const ctx = React.useContext(MonopolyVisualSettingsContext);
  if (ctx === null) {
    throw new Error(
      'useMonopolyVisualSettings must be used within a <MonopolyVisualSettingsProvider>',
    );
  }
  return ctx;
}

/**
 * Optional escape hatch for tests / SSR / Storybook: deep-merge of fields
 * over the auto-derived snapshot. Never used in production paths.
 */
export interface MonopolyVisualSettingsProviderProps {
  children: React.ReactNode;
  /**
   * Test-only overrides applied on top of the auto-derived settings. Useful
   * for unit / smoke tests that want to assert behaviour under reduced
   * motion or `'low'` perf tier without driving the rAF loop.
   */
  overrides?: Partial<MonopolyVisualSettings>;
}

/**
 * Provider that:
 *   - reads `prefers-reduced-motion` and the mobile signal once on mount,
 *   - subscribes to `change` events on both media queries plus `resize`,
 *   - hosts {@link useFpsProbe} so a sustained-low-FPS session flips the
 *     resolved perf tier to `'low'` exactly once,
 *   - exposes the derived snapshot through context.
 *
 * The component returns `{children}` only — it never renders an FPS / ping
 * / hardware text or overlay (Req 11.8).
 */
export function MonopolyVisualSettingsProvider(
  props: MonopolyVisualSettingsProviderProps,
): React.ReactElement {
  const { children, overrides } = props;

  // Initial reads are evaluated lazily so SSR (and any caller that imports
  // this module before window is available) doesn't crash.
  const [reducedMotion, setReducedMotion] = React.useState<boolean>(readReducedMotion);
  const [isMobile, setIsMobile] = React.useState<boolean>(readIsMobile);
  const [perfTier, setPerfTier] = React.useState<PerfTier>('high');

  // ---- prefers-reduced-motion subscription ----
  React.useEffect(() => {
    const mql = getMatchMedia('(prefers-reduced-motion: reduce)');
    if (!mql) return undefined;
    // Re-sync on subscribe in case the value changed between initial read
    // and effect mount (StrictMode double-invoke safe).
    setReducedMotion(mql.matches === true);
    return subscribeMediaQuery(mql, (matches) => setReducedMotion(matches));
  }, []);

  // ---- pointer:coarse + viewport <= 900px subscription ----
  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const recompute = (): void => setIsMobile(readIsMobile());
    recompute();

    const coarseMql = getMatchMedia('(pointer: coarse)');
    const unsubCoarse = subscribeMediaQuery(coarseMql, recompute);

    if (typeof window.addEventListener === 'function') {
      window.addEventListener('resize', recompute);
    }

    return () => {
      unsubCoarse();
      if (typeof window.removeEventListener === 'function') {
        window.removeEventListener('resize', recompute);
      }
    };
  }, []);

  // ---- one-way perf-tier downshift driven by useFpsProbe ----
  // The callback is stable (empty deps) so useFpsProbe doesn't restart its
  // rAF loop on every render. The functional `setPerfTier` form preserves
  // monotonicity in the React-state sense too: once `'low'`, stays `'low'`.
  const handlePerfLow = React.useCallback(() => {
    setPerfTier((prev) => (prev === 'low' ? prev : 'low'));
  }, []);
  useFpsProbe(handlePerfLow);

  const value = React.useMemo<MonopolyVisualSettings>(() => {
    const derived = deriveSettings({ reducedMotion, isMobile, perfTier });
    if (!overrides) return derived;
    return { ...derived, ...overrides };
  }, [reducedMotion, isMobile, perfTier, overrides]);

  // Negative invariant (Req 11.8 / 8.8): no FPS / ping / hardware text or
  // overlay is ever rendered. The provider returns `children` verbatim.
  return (
    <MonopolyVisualSettingsContext.Provider value={value}>
      {children}
    </MonopolyVisualSettingsContext.Provider>
  );
}
