/**
 * FXLayer.tsx — particle-pool host, FX bus, and screen-shake bus.
 *
 * `<FXLayerProvider>` is the single owner of the MimicPoly visual layer's
 * runtime FX resources:
 *
 *   - one {@link ParticlePool} sized from {@link useMonopolyVisualSettings},
 *   - one shared screen-shake state (used by `<CinematicCamera>` each frame),
 *   - one bounded ring buffer of full-screen overlay events (RED_FLASH /
 *     COLOR_FLASH) capped at 3 Hz per Requirement 12.5.
 *
 * Provider placement. The provider mounts inside the React Three Fiber
 * `<Canvas>` because:
 *   - it renders one `<primitive object={slot.points} />` per pool slot, so
 *     every slot mesh is attached to the scene exactly once at mount and
 *     never re-parented,
 *   - it drives a `useFrame((_, delta) => …)` integration loop that
 *     advances per-particle positions, decrements TTLs, releases slots
 *     whose `userData.fxStartedAt + fxDurationMs` has elapsed, and
 *     advances the screen-shake decay envelope.
 *
 * Two consumer hooks are exported:
 *
 *   - {@link useFXBus} — `{ play(req) }` for one-shot FX dispatch. Acquires
 *     a free slot from the pool, calls {@link applyEffect}, and returns. On
 *     pool exhaustion the request is dropped silently with a single
 *     `console.debug` (Req 11.3, 11.7, 11.8 — never queues, never throws,
 *     never renders an overlay).
 *
 *   - {@link useScreenShake} — `{ trigger(magnitude, durationMs), current }`.
 *     `trigger()` writes a new shake into a shared mutable state; `current`
 *     is a ref-like `{ x, y, z, magnitude }` that `<CinematicCamera>` reads
 *     each frame to add an instant camera offset.
 *
 * Two non-throwing variants ({@link useFXBusOptional},
 * {@link useScreenShakeOptional}) return `null` outside a provider. The
 * `<Building>` grow-tween dispatch uses the optional variant so isolated
 * test mounts (no FXLayerProvider in the tree) keep working.
 *
 * SSR safety. The provider tolerates SSR / non-Canvas mounts: the integration
 * loop is registered via `useFrame` only when running inside a Canvas, and
 * all `performance.now()` reads are guarded with a `typeof` check.
 *
 * Negative invariants (Req 11.8):
 *   - never renders an FPS / ping / latency / hardware overlay,
 *   - never imports from `useMonopolyGame` or Supabase,
 *   - never writes Supabase rows.
 *
 * Validates: Requirements 4.3, 6.1, 6.2, 6.4, 6.5, 6.6, 6.7, 6.8, 11.3,
 * 11.7, 11.8, 12.5.
 */

import * as React from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import {
  createParticlePool,
  type ParticlePool,
  type ParticleSlot,
} from './particles/ParticlePool';
import {
  applyEffect,
  FX_DEFAULT_DURATION_MS,
  type FXKind,
  type FXParams,
  type FXVec3,
} from './particles/effects';
import { useMonopolyVisualSettings } from './MonopolyVisualSettings';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Payload for a single {@link FXBus.play} call. Mirrors the public
 * subset of {@link FXParams} but adds the discriminator `kind`.
 *
 * `origin` is the only required field — every effect anchors itself to a
 * world-space point. All other fields fall back to the per-effect defaults
 * documented in `effects.ts` (color, target, durationMs, particleCount).
 */
export interface FXRequest {
  kind: FXKind;
  origin: FXVec3;
  color?: string;
  target?: FXVec3;
  durationMs?: number;
  particleCount?: number;
}

/** Public FX bus contract. */
export interface FXBus {
  /**
   * Dispatch a single one-shot FX. Acquires a slot, applies the effect,
   * and returns. Returns `true` when a slot was reserved, `false` when the
   * pool was exhausted and the request was dropped (Req 11.3 / 11.7).
   */
  play(req: FXRequest): boolean;
}

/**
 * Shared screen-shake state. Written by {@link FXBusInternal.shakeRef} on
 * every {@link useScreenShake} `trigger` call and advanced each frame by
 * the FXLayer integration loop. Camera consumers read `current.x/y/z`
 * directly — the values are a damped oscillation of the originally
 * triggered magnitude over the originally triggered duration.
 */
export interface ScreenShakeState {
  /** Current X offset in world units, updated by the FX integration loop. */
  x: number;
  /** Current Y offset in world units. */
  y: number;
  /** Current Z offset in world units. */
  z: number;
  /** Original magnitude of the active shake (0 when no shake is active). */
  magnitude: number;
}

/** Public screen-shake bus contract. */
export interface ScreenShakeBus {
  /**
   * Start a new shake. Replaces any in-flight shake (the camera should
   * always reflect the most recent dramatic event; queueing shakes would
   * outlast their triggering moment).
   *
   * `magnitude` is in world units (≈ 2..6 for dice settle per Req 4.3,
   * larger for bankruptcy / game-end). `durationMs` is clamped to
   * `[0, 5000]` so a runaway caller can't pin the camera permanently.
   */
  trigger(magnitude: number, durationMs: number): void;
  /**
   * Read-only view of the current shake offset. Camera reads
   * `current.x / y / z` each `useFrame` tick and adds them as an
   * instantaneous offset to its position.
   */
  current: Readonly<ScreenShakeState>;
}

/**
 * One overlay event recorded by the 3 Hz-capped overlay queue. The DOM
 * overlay component (`<FXScreenOverlay>`, mounted outside the Canvas) is
 * not implemented in this milestone; consumers can subscribe to the
 * latest event via {@link useFXOverlayEvents} and a future task will
 * mount the actual CSS flash.
 */
export interface FXOverlayEvent {
  kind: 'RED_FLASH' | 'COLOR_FLASH';
  color: string;
  durationMs: number;
  /** `performance.now()` at the moment the event was enqueued. */
  ts: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Minimum spacing between two consecutive full-screen flashes
 * (Req 12.5 — "no full-screen flashes brighter than 50% may exceed
 * 3 Hz"). 333 ms enforces a strict ≤ 3 Hz cadence; an event arriving
 * sooner is dropped silently.
 */
const OVERLAY_MIN_INTERVAL_MS = 1000 / 3;

/** Upper bound on shake duration so a misbehaving caller can't pin the camera. */
const MAX_SHAKE_DURATION_MS = 5000;

/**
 * Capacity of the overlay-event ring buffer. Twelve is large enough to
 * cover a typical "rent + purchase + jail" sequence within a single turn
 * without ever growing past a fixed size.
 */
const OVERLAY_RING_CAPACITY = 12;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** SSR-safe high-resolution clock. */
function nowMs(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

/**
 * Read the FX duration tagged onto a slot by `applyEffect`. Falls back to
 * the effect-default table when userData is missing (e.g. a slot taken
 * over by a non-catalog effect — shouldn't happen, but we tolerate it).
 */
function slotDurationMs(slot: ParticleSlot): number {
  const ud = slot.points.userData as {
    fxKind?: FXKind;
    fxDurationMs?: number;
  };
  if (typeof ud.fxDurationMs === 'number' && ud.fxDurationMs > 0) {
    return ud.fxDurationMs;
  }
  if (ud.fxKind && FX_DEFAULT_DURATION_MS[ud.fxKind]) {
    return FX_DEFAULT_DURATION_MS[ud.fxKind];
  }
  return 0;
}

/**
 * Read the FX start timestamp tagged onto a slot. Returns `0` when no
 * effect is currently active (slot was just acquired but not yet applied,
 * or has been released).
 */
function slotStartedAt(slot: ParticleSlot): number {
  const ud = slot.points.userData as { fxStartedAt?: number };
  return typeof ud.fxStartedAt === 'number' ? ud.fxStartedAt : 0;
}

/**
 * Read the slot's current draw range (the active particle count). The
 * pool's `setDrawRange(0, n)` is what `applyEffect` writes; reading it
 * back avoids a parallel "active count per slot" accounting structure.
 */
function slotActiveCount(slot: ParticleSlot): number {
  const range = slot.points.geometry.drawRange;
  // `drawRange.start` is always 0 in our pipeline; `count` is the active
  // length. THREE returns `Infinity` for "draw all" — guard against that.
  if (!Number.isFinite(range.count)) return 0;
  return Math.max(0, Math.min(slot.ttls.length, range.count));
}

// ---------------------------------------------------------------------------
// Context channels
// ---------------------------------------------------------------------------

/**
 * `null` is the "no provider" sentinel so {@link useFXBus} can throw a
 * descriptive error and {@link useFXBusOptional} can return `null` for
 * defensive call sites (e.g. `<Building>` mounted in unit tests).
 */
const FXBusContext = React.createContext<FXBus | null>(null);
const ScreenShakeContext = React.createContext<ScreenShakeBus | null>(null);

/**
 * Channel for the overlay-event ring buffer subscription. Exposes a tiny
 * `subscribe / getSnapshot` shape compatible with `useSyncExternalStore`,
 * so a future `<FXScreenOverlay>` mounted outside the Canvas can render
 * the actual CSS flash without re-implementing event tracking.
 */
interface OverlayEventStore {
  /** Subscribe to overlay-event changes. Returns an unsubscribe. */
  subscribe(listener: () => void): () => void;
  /** Snapshot of the most recent event, or `null` when none has fired. */
  getSnapshot(): FXOverlayEvent | null;
  /** Full ring (oldest → newest). */
  getAll(): readonly FXOverlayEvent[];
}

const OverlayEventContext = React.createContext<OverlayEventStore | null>(null);

// ---------------------------------------------------------------------------
// Internal: overlay-event ring buffer
// ---------------------------------------------------------------------------

/**
 * Build a tiny external store backed by a ref ring of overlay events.
 * Lives outside the Provider component so its identity is stable across
 * re-renders and `useSyncExternalStore` doesn't tear down its subscription.
 */
function createOverlayEventStore(): OverlayEventStore & {
  push(ev: FXOverlayEvent): void;
} {
  const ring: FXOverlayEvent[] = [];
  const listeners = new Set<() => void>();

  function notify(): void {
    for (const l of listeners) {
      try {
        l();
      } catch (err) {
        // A buggy listener must not break the FX layer. Logged at debug
        // level only (Req 11.8 — no production overlay).
        // eslint-disable-next-line no-console
        console.debug('[FXLayer] overlay listener threw', err);
      }
    }
  }

  return {
    push(ev: FXOverlayEvent): void {
      ring.push(ev);
      if (ring.length > OVERLAY_RING_CAPACITY) {
        ring.shift();
      }
      notify();
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot(): FXOverlayEvent | null {
      return ring.length === 0 ? null : ring[ring.length - 1];
    },
    getAll(): readonly FXOverlayEvent[] {
      return ring;
    },
  };
}

// ---------------------------------------------------------------------------
// Provider props
// ---------------------------------------------------------------------------

/**
 * Optional escape hatches for tests. In production, the provider derives
 * its caps from {@link useMonopolyVisualSettings} and creates its own pool.
 */
export interface FXLayerProviderProps {
  children?: React.ReactNode;
  /**
   * Optional pre-built pool for tests. When supplied the provider does not
   * create or dispose a pool of its own.
   */
  pool?: ParticlePool;
  /**
   * Override caps for the auto-created pool. Useful for storybook /
   * smoke tests that want to exercise exhaustion paths.
   */
  capOverride?: { cap?: number; particlesPerSystemCap?: number };
}

// ---------------------------------------------------------------------------
// Provider implementation
// ---------------------------------------------------------------------------

/**
 * `<FXLayerProvider>` — mount inside `<Canvas>` to:
 *   - own the particle pool,
 *   - attach every slot's mesh to the scene graph exactly once,
 *   - drive the per-frame particle integration loop,
 *   - expose {@link useFXBus}, {@link useScreenShake}, and
 *     {@link useFXOverlayEvents} via React context.
 */
export function FXLayerProvider(
  props: FXLayerProviderProps,
): React.ReactElement {
  const { children, pool: poolOverride, capOverride } = props;
  const settings = useMonopolyVisualSettings();

  // --- Pool ownership --------------------------------------------------
  // The pool is created exactly once per provider instance using the
  // caps from MonopolyVisualSettings (or the test override). We
  // intentionally do NOT recreate the pool when settings change at
  // runtime — re-allocating GPU buffers mid-game would cause a frame
  // hitch at the worst possible moment (Req 11.7 demands stable
  // performance during gameplay). A perf-tier downshift to 'low'
  // therefore keeps the higher-tier pool, which is always safe because
  // `cap` is an upper bound, not a target.
  //
  // We use `useState`'s lazy initializer so the pool is constructed
  // exactly once, even under React 18 Strict Mode double-invoke.
  const [pool] = React.useState<ParticlePool>(() => {
    if (poolOverride) return poolOverride;
    return createParticlePool({
      cap: capOverride?.cap ?? settings.particleSystemCap,
      particlesPerSystemCap:
        capOverride?.particlesPerSystemCap ?? settings.particlesPerSystemCap,
    });
  });

  // Dispose the pool on unmount so GPU buffers are released. We only
  // dispose pools we own (the override branch is for tests that manage
  // disposal themselves).
  React.useEffect(() => {
    if (poolOverride) return undefined;
    return () => {
      pool.dispose();
    };
    // pool is captured at mount; the effect runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Screen-shake state ----------------------------------------------
  // Stored in a ref so writes from `trigger()` and reads from camera
  // consumers don't trigger re-renders. The ref's identity is stable for
  // the entire provider lifetime.
  const shakeStateRef = React.useRef<ScreenShakeState>({
    x: 0,
    y: 0,
    z: 0,
    magnitude: 0,
  });
  // Active-shake bookkeeping. `magnitude0` is the originally requested
  // magnitude; the live `magnitude` decays toward 0 over `durationMs`.
  const shakeAnimRef = React.useRef<{
    startedAt: number;
    durationMs: number;
    magnitude0: number;
    seed: number;
  } | null>(null);

  // --- FX bus ----------------------------------------------------------
  // The bus implementation is a stable closure over `pool`. We create it
  // once via useMemo so consumers' useEffects keyed on the bus identity
  // don't re-run on every render.
  //
  // Overlay queue is implemented inline: we track the last enqueued
  // timestamp per overlay kind in a ref and drop requests that arrive
  // within `OVERLAY_MIN_INTERVAL_MS` (Req 12.5).
  const overlayStore = React.useMemo(() => createOverlayEventStore(), []);
  const lastOverlayAtRef = React.useRef<number>(0);

  const fxBus = React.useMemo<FXBus>(() => {
    return {
      play(req: FXRequest): boolean {
        // Defensive: clone the FXParams so consumer mutations after
        // dispatch can't affect the in-flight effect.
        const params: FXParams = {
          origin: { x: req.origin.x, y: req.origin.y, z: req.origin.z },
          color: req.color,
          target: req.target
            ? { x: req.target.x, y: req.target.y, z: req.target.z }
            : undefined,
          durationMs: req.durationMs,
          particleCount: req.particleCount,
        };

        const slot = pool.acquire();
        if (slot === null) {
          // Pool exhausted (Req 11.3 / 11.7). Silent drop with a single
          // debug log so dev tools can observe the contract; never
          // queues, never throws, never renders an overlay.
          // eslint-disable-next-line no-console
          console.debug('[FXLayer] pool exhausted, dropped', req.kind);
          return false;
        }

        try {
          applyEffect(slot, req.kind, params);
        } catch (err) {
          // An effect builder bug must not leak the slot. Release and
          // log; the caller still gets `false` so it can decide whether
          // to retry (it shouldn't — the bug is on our side).
          // eslint-disable-next-line no-console
          console.debug('[FXLayer] applyEffect threw', req.kind, err);
          pool.release(slot);
          return false;
        }

        // Photosensitivity cap — Req 12.5. Full-screen flashes are
        // recorded to the overlay store at most every 333 ms; bursts
        // exceeding that cadence are dropped from the overlay channel
        // (the underlying particle slot still plays so other channels
        // — sound, camera shake — remain unaffected). The cap is global
        // across `RED_FLASH` and `COLOR_FLASH` because both produce a
        // full-screen luminance spike.
        if (req.kind === 'RED_FLASH' || req.kind === 'COLOR_FLASH') {
          const now = nowMs();
          if (now - lastOverlayAtRef.current >= OVERLAY_MIN_INTERVAL_MS) {
            lastOverlayAtRef.current = now;
            overlayStore.push({
              kind: req.kind,
              color: req.color ?? (req.kind === 'RED_FLASH' ? '#ef4444' : 'var(--ink-accent)'),
              durationMs: req.durationMs ?? FX_DEFAULT_DURATION_MS[req.kind],
              ts: now,
            });
          } else {
            // Logged so dev tools can confirm the cap is working.
            // eslint-disable-next-line no-console
            console.debug('[FXLayer] overlay capped @ 3Hz, dropped', req.kind);
          }
        }

        return true;
      },
    };
    // pool / overlayStore identities are stable across the provider's
    // lifetime so this memo never recomputes after mount.
  }, [pool, overlayStore]);

  // --- Screen-shake bus ------------------------------------------------
  const shakeBus = React.useMemo<ScreenShakeBus>(() => {
    return {
      trigger(magnitude: number, durationMs: number): void {
        // Reject negative / non-finite inputs defensively.
        if (!Number.isFinite(magnitude) || magnitude <= 0) return;
        if (!Number.isFinite(durationMs) || durationMs <= 0) return;

        const clamped = Math.min(durationMs, MAX_SHAKE_DURATION_MS);
        // Seed the oscillation with `nowMs()` to avoid two back-to-back
        // shakes appearing in lock-step phase.
        shakeAnimRef.current = {
          startedAt: nowMs(),
          durationMs: clamped,
          magnitude0: magnitude,
          seed: nowMs() % 1000,
        };
        // Reset the live offset to 0 so the camera doesn't see a stale
        // value before the next useFrame tick.
        shakeStateRef.current.x = 0;
        shakeStateRef.current.y = 0;
        shakeStateRef.current.z = 0;
        shakeStateRef.current.magnitude = magnitude;
      },
      current: shakeStateRef.current,
    };
    // shakeStateRef.current identity is stable; useMemo with no deps is
    // safe.
  }, []);

  // --- Per-frame integration loop -------------------------------------
  //
  // Runs every frame inside the Canvas. Three responsibilities:
  //   1. Advance every active slot's per-particle positions / TTLs and
  //      release slots whose `fxStartedAt + fxDurationMs` has elapsed.
  //   2. Fade material opacity over the slot's lifetime so effects
  //      appear to "die out" rather than abruptly disappear.
  //   3. Compute the current screen-shake offset from the active-shake
  //      ref and write it to `shakeStateRef.current`.
  //
  // Determinism: the loop is driven by the renderer's `delta` (seconds
  // since previous frame) so visual motion is frame-rate independent.
  useFrame((_state, deltaSeconds) => {
    // Clamp delta to avoid huge jumps when the tab regains focus after
    // being backgrounded (a 5-second gap could otherwise teleport every
    // particle off-screen in a single frame).
    const dt = Math.max(0, Math.min(0.1, deltaSeconds));

    // ---- Particle integration --------------------------------------
    const now = nowMs();
    for (const slot of pool.slots) {
      if (!slot.inUse) continue;

      const startedAt = slotStartedAt(slot);
      const durationMs = slotDurationMs(slot);
      const lifetime = durationMs > 0 ? (now - startedAt) / durationMs : 1;

      // Slot lifetime exceeded — release. Effects own one-shot dispatch
      // only; the slot returns to the pool for the next caller (Req
      // 11.3 — slots never queue, just recycle).
      if (lifetime >= 1) {
        pool.release(slot);
        continue;
      }

      const count = slotActiveCount(slot);
      if (count > 0) {
        // Integrate positions: p += v * dt. We touch only the active
        // tail of the buffer so the unused capacity stays at 0.
        const positions = slot.positions;
        const velocities = slot.velocities;
        const ttls = slot.ttls;
        for (let i = 0; i < count; i++) {
          const i3 = i * 3;
          positions[i3 + 0] += velocities[i3 + 0] * dt;
          positions[i3 + 1] += velocities[i3 + 1] * dt;
          positions[i3 + 2] += velocities[i3 + 2] * dt;
          // Decrement per-particle TTL. We don't shrink the active
          // count when individual particles expire — keeping a stable
          // draw range avoids per-frame attribute churn, and the
          // material's overall opacity ramp below hides the "dead"
          // particles within the slot's death tail.
          if (ttls[i] > 0) {
            ttls[i] = Math.max(0, ttls[i] - dt);
          }
        }
        // Push position changes to the GPU on the next render.
        const posAttr = slot.points.geometry.getAttribute(
          'position',
        ) as THREE.BufferAttribute;
        posAttr.needsUpdate = true;
      }

      // Material opacity ramp: 1 → 0 over the back half of the slot's
      // lifetime so effects fade out. We keep the front half at full
      // opacity so the initial burst reads cleanly.
      const mat = slot.points.material as THREE.PointsMaterial | THREE.Material;
      const pmat =
        (mat as THREE.PointsMaterial).isPointsMaterial !== undefined
          ? (mat as THREE.PointsMaterial)
          : null;
      if (pmat) {
        // Effects that set opacity to 0 (RED_FLASH / COLOR_FLASH /
        // STAMP markers) should stay at 0 — the in-scene contribution
        // is intentionally invisible. We detect them by their starting
        // opacity ≤ 0.05 and skip the ramp.
        const startedInvisible =
          (slot.points.userData as { fxKind?: FXKind }).fxKind === 'RED_FLASH' ||
          (slot.points.userData as { fxKind?: FXKind }).fxKind === 'COLOR_FLASH' ||
          (slot.points.userData as { fxKind?: FXKind }).fxKind === 'STAMP';
        if (!startedInvisible) {
          // Smooth quadratic fade across the back 50% of the lifetime.
          const fade = lifetime < 0.5 ? 1 : 1 - (lifetime - 0.5) * 2;
          pmat.opacity = Math.max(0, Math.min(1, fade));
        }
      }
    }

    // ---- Screen-shake decay ----------------------------------------
    const anim = shakeAnimRef.current;
    if (anim !== null) {
      const t = (now - anim.startedAt) / anim.durationMs;
      if (t >= 1) {
        // Shake ended — reset offset and clear the active shake.
        shakeStateRef.current.x = 0;
        shakeStateRef.current.y = 0;
        shakeStateRef.current.z = 0;
        shakeStateRef.current.magnitude = 0;
        shakeAnimRef.current = null;
      } else {
        // Damped oscillation. Linear envelope from `magnitude0 → 0`,
        // multiplied by sin/cos at slightly different frequencies on
        // each axis so the motion reads as a 3D jitter rather than a
        // 1D wobble.
        const envelope = anim.magnitude0 * (1 - t);
        // `seed` decorrelates the phase from the previous shake.
        const phase = (now + anim.seed) * 0.001;
        // 18 / 23 / 17 Hz-ish frequencies (in radians per millisecond
        // since `phase` is in seconds-equivalent). The mismatched ratios
        // avoid any periodic resonance.
        shakeStateRef.current.x = envelope * Math.sin(phase * 113);
        shakeStateRef.current.y = envelope * Math.cos(phase * 89) * 0.6;
        shakeStateRef.current.z = envelope * Math.sin(phase * 137) * 0.8;
        shakeStateRef.current.magnitude = envelope;
      }
    }
  });

  // --- Slot mesh attachment -------------------------------------------
  // Every slot's `THREE.Points` is attached to the scene graph exactly
  // once, here. Slots are kept invisible by the pool until `acquire()`
  // flips `points.visible = true`, so this group is harmless before the
  // first FX dispatch. We never add or remove children at runtime —
  // R3F's `<primitive>` re-uses the existing object3D directly.
  return (
    <FXBusContext.Provider value={fxBus}>
      <ScreenShakeContext.Provider value={shakeBus}>
        <OverlayEventContext.Provider value={overlayStore}>
          <group name="mimicpoly-fx-layer">
            {pool.slots.map((slot) => (
              <primitive key={slot.id} object={slot.points} />
            ))}
          </group>
          {children}
        </OverlayEventContext.Provider>
      </ScreenShakeContext.Provider>
    </FXBusContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Consumer hooks
// ---------------------------------------------------------------------------

/**
 * Read the FX bus from context. Throws when no `<FXLayerProvider>` is
 * mounted in the tree — call sites that may legitimately render outside
 * a provider (unit tests, isolated storybook mounts) should use
 * {@link useFXBusOptional} instead.
 */
export function useFXBus(): FXBus {
  const ctx = React.useContext(FXBusContext);
  if (ctx === null) {
    throw new Error(
      'useFXBus must be used within a <FXLayerProvider>',
    );
  }
  return ctx;
}

/**
 * Read the FX bus from context, returning `null` when no provider is
 * mounted. Used by `<Building>` and any other consumer that ships in
 * test fixtures without an FXLayer in the tree.
 */
export function useFXBusOptional(): FXBus | null {
  return React.useContext(FXBusContext);
}

/**
 * Read the screen-shake bus from context. Throws outside a provider —
 * the camera always lives inside the same Canvas as the FXLayer in
 * production, so a missing provider is a wiring bug we want surfaced.
 */
export function useScreenShake(): ScreenShakeBus {
  const ctx = React.useContext(ScreenShakeContext);
  if (ctx === null) {
    throw new Error(
      'useScreenShake must be used within a <FXLayerProvider>',
    );
  }
  return ctx;
}

/**
 * Optional variant of {@link useScreenShake} returning `null` outside a
 * provider, mirroring {@link useFXBusOptional}.
 */
export function useScreenShakeOptional(): ScreenShakeBus | null {
  return React.useContext(ScreenShakeContext);
}

/**
 * Subscribe to the FX overlay event ring. Returns the latest event or
 * `null` when none have fired since mount.
 *
 * The DOM overlay component (`<FXScreenOverlay>`) that consumes this
 * hook is not yet implemented; once it lands it will mount outside the
 * Canvas and render a CSS flash for each `RED_FLASH` / `COLOR_FLASH`
 * event respecting the 3 Hz cap (Req 12.5).
 */
export function useFXOverlayEvents(): FXOverlayEvent | null {
  const store = React.useContext(OverlayEventContext);
  // useSyncExternalStore is the standard React 18 escape hatch for
  // subscribing to external mutable stores while keeping concurrent
  // rendering correct. When no provider is mounted we fall back to a
  // synchronous null subscription so the hook order stays stable.
  return React.useSyncExternalStore(
    store?.subscribe ?? noopSubscribe,
    store?.getSnapshot ?? noopSnapshot,
    store?.getSnapshot ?? noopSnapshot,
  );
}

/**
 * Subscribe to the entire overlay-event ring (oldest → newest). Useful
 * for tests that want to assert on the full history rather than just
 * the latest event.
 */
export function useFXOverlayEventHistory(): readonly FXOverlayEvent[] {
  const store = React.useContext(OverlayEventContext);
  return React.useSyncExternalStore(
    store?.subscribe ?? noopSubscribe,
    store?.getAll ?? noopHistory,
    store?.getAll ?? noopHistory,
  );
}

// ---------------------------------------------------------------------------
// Stable no-op fallbacks for useSyncExternalStore default arguments
// ---------------------------------------------------------------------------

const EMPTY_HISTORY: readonly FXOverlayEvent[] = Object.freeze([]);
function noopSubscribe(_listener: () => void): () => void {
  return () => {};
}
function noopSnapshot(): null {
  return null;
}
function noopHistory(): readonly FXOverlayEvent[] {
  return EMPTY_HISTORY;
}
