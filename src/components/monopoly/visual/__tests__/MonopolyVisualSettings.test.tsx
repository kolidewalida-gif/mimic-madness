/**
 * MonopolyVisualSettings.test.tsx — unit tests for the pure helpers and
 * provider wiring shipped by `MonopolyVisualSettings.tsx` (task 4.1).
 *
 * Property-based coverage of `perfTierFor` and `lodFor` lives in the
 * dedicated PBT file (task 5.4 / Property 10). These tests focus on the
 * documented examples + the React Context plumbing that PBT can't easily
 * exercise.
 */

import { describe, expect, it, vi } from 'vitest';
import * as React from 'react';
import { render, screen } from '@testing-library/react';

import {
  BUILDING_LOD_NEAR,
  FPS_HIGH_THRESHOLD,
  FPS_LOW_THRESHOLD,
  MonopolyVisualSettingsProvider,
  deriveSettings,
  lodFor,
  perfTierFor,
  useMonopolyVisualSettings,
} from '../MonopolyVisualSettings';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Install a deterministic `matchMedia` mock for the duration of a single
 * test. Returns a cleanup function so tests stay isolated even if jsdom
 * caches the descriptor across test files.
 */
function installMatchMediaMock(matches: Record<string, boolean>): () => void {
  const original = (window as unknown as { matchMedia?: typeof window.matchMedia })
    .matchMedia;
  const stub = (query: string): MediaQueryList => {
    return {
      matches: matches[query] === true,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList;
  };
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: stub,
  });
  return () => {
    if (original) {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: original,
      });
    } else {
      delete (window as unknown as { matchMedia?: typeof window.matchMedia }).matchMedia;
    }
  };
}

// ---------------------------------------------------------------------------
// lodFor
// ---------------------------------------------------------------------------

describe('lodFor', () => {
  it("returns 'near' strictly under the documented threshold", () => {
    expect(lodFor(0)).toBe('near');
    expect(lodFor(BUILDING_LOD_NEAR - 0.01)).toBe('near');
  });

  it("returns 'far' at and above the threshold", () => {
    expect(lodFor(BUILDING_LOD_NEAR)).toBe('far');
    expect(lodFor(BUILDING_LOD_NEAR + 100)).toBe('far');
  });
});

// ---------------------------------------------------------------------------
// perfTierFor
// ---------------------------------------------------------------------------

describe('perfTierFor', () => {
  it("returns 'medium' for an empty series (insufficient data)", () => {
    expect(perfTierFor([])).toBe('medium');
  });

  it("returns 'high' when every sample is at or above the high threshold", () => {
    expect(perfTierFor([60, 60, 60])).toBe('high');
    expect(perfTierFor([FPS_HIGH_THRESHOLD, FPS_HIGH_THRESHOLD])).toBe('high');
  });

  it("returns 'low' for a sustained 2-sample window strictly below the threshold", () => {
    expect(perfTierFor([60, 30, 30, 60])).toBe('low');
    expect(perfTierFor([FPS_LOW_THRESHOLD - 1, FPS_LOW_THRESHOLD - 1])).toBe('low');
  });

  it('does not flip to low on a single-sample dip', () => {
    expect(perfTierFor([60, 30, 60, 60])).toBe('medium');
  });

  it("does not flip to low when the window touches the threshold (strict <)", () => {
    expect(perfTierFor([FPS_LOW_THRESHOLD, FPS_LOW_THRESHOLD])).not.toBe('low');
  });

  it("returns 'medium' for any series that is neither all-high nor sustained-low", () => {
    expect(perfTierFor([50, 50, 50])).toBe('medium');
    expect(perfTierFor([60, 50, 60])).toBe('medium');
  });
});

// ---------------------------------------------------------------------------
// deriveSettings
// ---------------------------------------------------------------------------

describe('deriveSettings', () => {
  it("uses the documented defaults at perfTier='high'", () => {
    const s = deriveSettings({ reducedMotion: false, isMobile: false, perfTier: 'high' });
    expect(s.particleSystemCap).toBe(8);
    expect(s.particlesPerSystemCap).toBe(60);
    expect(s.shadowMapSize).toBe(1024);
    expect(s.enableSecondaryLights).toBe(true);
    expect(s.cameraIdleDriftEnabled).toBe(true);
  });

  it("halves caps and disables shadows + secondary lights at perfTier='low'", () => {
    const s = deriveSettings({ reducedMotion: false, isMobile: false, perfTier: 'low' });
    expect(s.particleSystemCap).toBe(4);
    expect(s.particlesPerSystemCap).toBe(24);
    expect(s.shadowMapSize).toBe(0);
    expect(s.enableSecondaryLights).toBe(false);
  });

  it('disables idle camera drift under reducedMotion', () => {
    const s = deriveSettings({ reducedMotion: true, isMobile: false, perfTier: 'high' });
    expect(s.cameraIdleDriftEnabled).toBe(false);
  });

  it('disables secondary lights on mobile + medium tier', () => {
    const s = deriveSettings({ reducedMotion: false, isMobile: true, perfTier: 'medium' });
    expect(s.enableSecondaryLights).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Provider + hook
// ---------------------------------------------------------------------------

/** Tiny consumer that surfaces the snapshot in the DOM as JSON. */
function Consumer(): React.ReactElement {
  const settings = useMonopolyVisualSettings();
  return <div data-testid="snapshot">{JSON.stringify(settings)}</div>;
}

describe('MonopolyVisualSettingsProvider', () => {
  it('exposes auto-derived settings to descendants', () => {
    const cleanup = installMatchMediaMock({
      '(prefers-reduced-motion: reduce)': false,
      '(pointer: coarse)': false,
    });
    try {
      render(
        <MonopolyVisualSettingsProvider>
          <Consumer />
        </MonopolyVisualSettingsProvider>,
      );
      const snap = JSON.parse(screen.getByTestId('snapshot').textContent ?? '{}');
      expect(snap.reducedMotion).toBe(false);
      expect(snap.isMobile).toBe(false);
      expect(snap.perfTier).toBe('high');
      expect(snap.buildingLodNear).toBe(BUILDING_LOD_NEAR);
    } finally {
      cleanup();
    }
  });

  it('reads reducedMotion=true from matchMedia', () => {
    const cleanup = installMatchMediaMock({
      '(prefers-reduced-motion: reduce)': true,
      '(pointer: coarse)': false,
    });
    try {
      render(
        <MonopolyVisualSettingsProvider>
          <Consumer />
        </MonopolyVisualSettingsProvider>,
      );
      const snap = JSON.parse(screen.getByTestId('snapshot').textContent ?? '{}');
      expect(snap.reducedMotion).toBe(true);
      expect(snap.cameraIdleDriftEnabled).toBe(false);
    } finally {
      cleanup();
    }
  });

  it('honours test overrides', () => {
    const cleanup = installMatchMediaMock({});
    try {
      render(
        <MonopolyVisualSettingsProvider overrides={{ perfTier: 'low', isMobile: true }}>
          <Consumer />
        </MonopolyVisualSettingsProvider>,
      );
      const snap = JSON.parse(screen.getByTestId('snapshot').textContent ?? '{}');
      expect(snap.perfTier).toBe('low');
      expect(snap.isMobile).toBe(true);
    } finally {
      cleanup();
    }
  });

  it('renders children only — no FPS / ping / hardware overlay', () => {
    const cleanup = installMatchMediaMock({});
    try {
      const { container } = render(
        <MonopolyVisualSettingsProvider>
          <div data-testid="child">child</div>
        </MonopolyVisualSettingsProvider>,
      );
      // Negative invariant: the provider's own DOM contribution is
      // exactly the child subtree (Context.Provider renders no element).
      expect(container.textContent).toBe('child');
      // Sanity: none of the forbidden strings appears in the rendered DOM.
      const html = container.innerHTML.toLowerCase();
      for (const forbidden of ['fps', 'ping', 'latency', 'hardware', 'perf-overlay']) {
        expect(html).not.toContain(forbidden);
      }
    } finally {
      cleanup();
    }
  });

  it('throws a descriptive error when the hook is used outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() => render(<Consumer />)).toThrow(
        /must be used within a <MonopolyVisualSettingsProvider>/,
      );
    } finally {
      spy.mockRestore();
    }
  });
});
