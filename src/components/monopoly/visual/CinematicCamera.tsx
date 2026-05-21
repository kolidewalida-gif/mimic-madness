/**
 * CinematicCamera.tsx — Mario-Party-style dynamic camera for MimicPoly.
 *
 * Wraps drei's `<OrbitControls>` with a 4-state machine:
 *
 *     idle ─┬──► focus ──► follow ──► (focus | userOverride)
 *           │      ▲
 *           │      │
 *           └─►userOverride◄── any OrbitControls drag/zoom input
 *
 * State semantics (design.md → Components §`<CinematicCamera>` and
 * Requirements 7.1–7.8):
 *
 *   - `idle`         — slow azimuthal orbit (< 5°/s) + ±2% radial breathing
 *                      zoom around the current target. No automated target
 *                      movement.
 *
 *   - `follow`       — soft per-frame lerp of `controls.target` toward
 *                      `activeTokenPosition`, lerp factor ∈ [0.06, 0.18]
 *                      (Req 7.3). Falls back to `idle` when no active token
 *                      position is provided.
 *
 *   - `focus`        — easeOutCubic tween of `controls.target` from a
 *                      captured starting point to a destination point over
 *                      `durationFor({kind: 'camera_focus'})` (600–1500 ms,
 *                      Req 7.4) for `focusTarget`, or
 *                      `durationFor({kind: 'whip_pan'})` (< 500 ms,
 *                      Req 7.5) for `whipPanTrigger`. Auto-transitions to
 *                      `follow` on completion.
 *
 *   - `userOverride` — pure manual control. Held for ≥ 4 s after the last
 *                      OrbitControls `start` event (Req 7.6); after the
 *                      hold, the FSM returns to `idle` so automated framing
 *                      resumes.
 *
 * Reduced-motion (Req 7.8 / 12.1):
 *   When `reducedMotion === true` the FSM is collapsed to a permanent
 *   `userOverride` framing — no idle drift, no follow lerp, no focus
 *   tween, no whip-pan. `OrbitControls` still works so the player can
 *   inspect the board manually.
 *
 * Floor clamp (Req 7.7):
 *   Every frame, after all state-driven transforms and after the shake
 *   offset, `camera.position` is rescaled so `‖p‖ ≥ 8` units. The clamp
 *   protects against the camera clipping into the board base, into
 *   buildings, or into tokens regardless of how the FSM moved it.
 *
 * Screen shake integration:
 *   Reads `{x, y, z}` each frame from `useScreenShakeOptional()` and adds
 *   them as an instantaneous offset to `camera.position`. The optional
 *   variant returns `null` when no `<FXLayerProvider>` is mounted (e.g.
 *   isolated test mounts), which the camera tolerates by skipping the
 *   shake step.
 *
 * Negative invariants:
 *   - never reads or writes Supabase rows;
 *   - never imports from `useMonopolyGame` or any audio engine;
 *   - never renders any FPS / hardware overlay (Req 11.8 / 8.8).
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 12.1.
 */

import * as React from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

import { durationFor } from './durations';
import { useScreenShakeOptional } from './FXLayer';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * 3-component vector in board-local world coordinates. Kept as a plain
 * structural type so callers can pass either Three.js vectors (which already
 * have x/y/z) or fresh literals derived from `getBoardPosition(tile)` without
 * extra conversion.
 */
export interface CameraVec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Public props of `<CinematicCamera>`.
 *
 * All fields are optional / nullable so the component can mount before any
 * gameplay state is available — the FSM stays in `idle` (or `userOverride`
 * under reduced motion) until the parent forwards a non-null value.
 *
 * `focusTarget.ts` and `whipPanTrigger.ts` are change-detection tokens: the
 * camera only re-arms a tween when `ts` differs from the previously seen
 * value. This makes the contract idempotent under React's StrictMode double
 * render and tolerant of late-joining clients that seed from a snapshot
 * already containing the latest trigger.
 */
export interface CinematicCameraProps {
  /**
   * Current world-space position of the active player's token (Requirement
   * 7.3). When non-null, drives the `follow` state's per-frame lerp.
   */
  activeTokenPosition?: CameraVec3 | null;
  /**
   * One-shot focus request. The camera enters `focus` whenever `ts`
   * changes, easing the OrbitControls target from its current value to
   * `position` over `durationFor({kind: 'camera_focus'})` (Requirement 7.4).
   */
  focusTarget?: { position: CameraVec3; ts: number } | null;
  /**
   * One-shot whip-pan request, typically dispatched on `DICE_ROLL` doubles
   * (Requirement 7.5). The camera whips toward `activeTokenPosition` over
   * `durationFor({kind: 'whip_pan'})` (< 500 ms). Ignored when
   * `activeTokenPosition` is null (no destination to whip to).
   */
  whipPanTrigger?: { ts: number } | null;
  /**
   * `prefers-reduced-motion: reduce` gate. When true, the FSM collapses to
   * a permanent `userOverride` framing (Requirement 7.8 / 12.1).
   */
  reducedMotion?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** FSM state labels. Exported for tests asserting state-machine invariants. */
export type CamState = 'idle' | 'follow' | 'focus' | 'userOverride';

/**
 * Floor clamp distance in world units (Requirement 7.7).
 *
 * The board base sits in a roughly 22×22 footprint. Eight units from origin
 * keeps the camera comfortably outside any tile / building / token mesh
 * regardless of azimuth or polar angle.
 */
export const FLOOR_CLAMP_DISTANCE = 8;

/**
 * Hold time (in seconds) during which the FSM stays in `userOverride` after
 * the most recent OrbitControls input (Requirement 7.6, "≥ 4 s").
 */
export const USER_OVERRIDE_HOLD_S = 4;

/**
 * Per-frame lerp factor for `follow` mode. Lies in `[0.06, 0.18]`
 * (Requirement 7.3); the chosen value of 0.10 sits comfortably in the
 * middle so the motion reads as smooth on both 60 Hz and 30 Hz refresh.
 */
export const FOLLOW_LERP_FACTOR = 0.10;

/**
 * Idle azimuthal orbit rate in radians per second.
 *
 * 3 °/s = `(3 × π) / 180 ≈ 0.0524` rad/s, well under the 5 °/s ceiling
 * documented in Requirement 7.1.
 */
export const IDLE_ORBIT_RAD_PER_S = (3 * Math.PI) / 180;

/**
 * Peak amplitude of the breathing-zoom radial scale, expressed as a unitless
 * fraction. ±2 % around the current camera→target distance keeps the
 * oscillation subtle while still producing a perceptible "alive" feel
 * (Requirement 7.1, "tiny breathing zoom").
 */
const IDLE_BREATHING_AMPLITUDE = 0.02;

/**
 * Period of the breathing-zoom oscillation, in seconds. A 4-second cycle
 * matches a relaxed human breath rate (~15 breaths/min).
 */
const IDLE_BREATHING_PERIOD_S = 4;

/**
 * OrbitControls bounds — preserved verbatim from the legacy
 * `MonopolyBoard3D` configuration so no behaviour regresses for users who
 * rely on the existing zoom / polar limits.
 */
const ORBIT_MIN_DISTANCE = 10;
const ORBIT_MAX_DISTANCE = 32;
const ORBIT_MIN_POLAR_ANGLE = 0.25;
const ORBIT_MAX_POLAR_ANGLE = Math.PI / 2.1;
const ORBIT_ROTATE_SPEED = 0.6;
const ORBIT_ZOOM_SPEED = 0.8;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Cubic ease-out used by the `focus` tween. Standard CSS-grade easing
 * (`1 - (1 - t)^3`) — fast at start, soft on landing — chosen because it
 * matches the "cinematic zoom-in" feel called out by Requirement 7.4.
 *
 * Pure: same `t` always yields the same value. Input is clamped to `[0, 1]`
 * so callers passing slightly-overshooting `elapsedMs / duration` (rounding
 * artefacts) don't get out-of-range easing values.
 */
function easeOutCubic(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - x, 3);
}

/**
 * Clamp the lerp factor to the `[0.06, 0.18]` band documented in
 * Requirement 7.3. Centralised so a future tuning that overshoots the
 * spec is caught at runtime instead of silently shipping.
 */
function clampedFollowFactor(factor: number): number {
  return Math.max(0.06, Math.min(0.18, factor));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Mutable bookkeeping for the camera FSM.
 *
 * Stored in a single ref so per-frame updates never trigger React renders
 * (the camera moves at frame-rate; re-rendering React on every tick would
 * be catastrophic for performance). Field semantics:
 *
 *   - `state`              — current FSM label.
 *   - `userInputAt`        — `clock.elapsedTime` at which the most recent
 *                            OrbitControls `start` event fired. `-Infinity`
 *                            when no input has happened in this session;
 *                            `+Infinity` is a one-frame sentinel meaning
 *                            "input just fired, adopt this frame's elapsed
 *                            time". The hold timer compares against
 *                            `clock.elapsedTime` so it's frame-rate
 *                            independent.
 *   - `focusStartElapsed`  — `clock.elapsedTime` at which the active focus
 *                            tween started. `null` when no tween is running.
 *   - `focusFromTarget`    — captured starting target when the tween armed.
 *   - `focusToTarget`      — destination target.
 *   - `focusDurationMs`    — total duration of the active tween, looked up
 *                            from `durationFor` per kind (camera_focus vs
 *                            whip_pan).
 *   - `lastFocusTs`        — most recently consumed `focusTarget.ts`. Used
 *                            for change detection so re-renders with the
 *                            same prop don't replay the tween.
 *   - `lastWhipPanTs`      — same idea for `whipPanTrigger.ts`.
 */
interface CamRefShape {
  state: CamState;
  userInputAt: number;
  focusStartElapsed: number | null;
  focusFromTarget: THREE.Vector3;
  focusToTarget: THREE.Vector3;
  focusDurationMs: number;
  lastFocusTs: number | null;
  lastWhipPanTs: number | null;
  /**
   * Baseline camera→target radius captured each time the FSM (re-)enters
   * `idle`. The breathing zoom oscillates around this baseline rather than
   * being applied multiplicatively each frame — applying a fresh
   * `(1 ± amp)` factor to the already-breathed radius would compound a
   * very small bias every frame and cause the camera to slowly drift in
   * or out over the course of a minute. Re-captured on every idle entry
   * so user-driven zoom changes from a previous `userOverride` window
   * become the new neutral.
   */
  idleBaselineRadius: number | null;
  /** Previous FSM state, used to detect an idle (re-)entry edge. */
  prevState: CamState | null;
}

/**
 * `<CinematicCamera>` — drei `<OrbitControls>` plus a 4-state FSM that
 * frames the action like a Mario-Party broadcast.
 *
 * Mounting requirements:
 *   - Must live inside a `<Canvas>` (uses `useFrame` and `useThree`).
 *   - May live outside an `<FXLayerProvider>`; shake integration is
 *     skipped via {@link useScreenShakeOptional}.
 *   - Should be the only `<OrbitControls>` in the MimicPoly scene tree;
 *     mounting two would lead to fighting input handlers.
 */
export function CinematicCamera(
  props: CinematicCameraProps,
): React.ReactElement {
  const {
    activeTokenPosition = null,
    focusTarget = null,
    whipPanTrigger = null,
    reducedMotion = false,
  } = props;

  const controlsRef = React.useRef<OrbitControlsImpl | null>(null);
  const { camera } = useThree();
  const shake = useScreenShakeOptional();

  // FSM bookkeeping. Initial state mirrors the reduced-motion gate so the
  // very first frame already reflects the user's accessibility preference.
  // The lazy-init function prevents the THREE.Vector3 allocations from
  // re-running on every render under StrictMode.
  const fsmRef = React.useRef<CamRefShape | null>(null);
  if (fsmRef.current === null) {
    fsmRef.current = {
      state: reducedMotion ? 'userOverride' : 'idle',
      userInputAt: -Infinity,
      focusStartElapsed: null,
      focusFromTarget: new THREE.Vector3(),
      focusToTarget: new THREE.Vector3(),
      focusDurationMs: 0,
      lastFocusTs: null,
      lastWhipPanTs: null,
      idleBaselineRadius: null,
      prevState: null,
    };
  }

  // Pre-allocated scratch vectors, reused every frame. Avoids per-frame GC
  // pressure that would otherwise dominate the hot path on weaker devices
  // (Req 11.7 — "no synchronous… blocking work longer than 8 ms").
  const tmpTargetRef = React.useRef(new THREE.Vector3());
  const tmpOffsetRef = React.useRef(new THREE.Vector3());

  // Mirror reduced-motion changes into the FSM. A user toggling the OS
  // setting mid-session must immediately collapse the camera to
  // userOverride (Req 12.1). On the way back out we restart from idle so
  // automated framing resumes — the next focus / hop trigger will pick up.
  React.useEffect(() => {
    const ref = fsmRef.current;
    if (ref === null) return;
    if (reducedMotion) {
      ref.state = 'userOverride';
      // Clear any in-flight focus tween so it doesn't fire when motion is
      // re-enabled later.
      ref.focusStartElapsed = null;
    } else if (ref.state === 'userOverride') {
      // Only auto-resume to idle when the *only* reason we were locked in
      // userOverride was the reducedMotion flag. A genuine drag-induced
      // override (userInputAt finite) should keep its 4 s hold.
      if (!Number.isFinite(ref.userInputAt) || ref.userInputAt === -Infinity) {
        ref.state = 'idle';
      }
    }
  }, [reducedMotion]);

  /**
   * OrbitControls `onStart` handler — fires on every drag / zoom / rotate
   * gesture. Flips the FSM to `userOverride` and arms the hold timer with
   * a `+Infinity` sentinel; the next `useFrame` tick replaces the sentinel
   * with the actual `clock.elapsedTime`, so the 4 s window is anchored to
   * the renderer clock and stays frame-rate independent (Req 7.6).
   *
   * Wrapped in `useCallback` so its identity stays stable across renders;
   * drei's `<OrbitControls>` re-attaches the listener whenever the
   * callback identity changes, and a fresh closure every render would
   * thrash the underlying EventDispatcher.
   */
  const handleStart = React.useCallback((): void => {
    const ref = fsmRef.current;
    if (ref === null) return;
    // Even under reduced-motion we record the input timestamp so a future
    // toggle out of reduced-motion still respects the hold. The state is
    // already userOverride in that branch.
    ref.state = 'userOverride';
    ref.userInputAt = Number.POSITIVE_INFINITY;
    // Cancel any in-flight focus tween — user input wins.
    ref.focusStartElapsed = null;
  }, []);

  useFrame((rsState, deltaSeconds) => {
    const ref = fsmRef.current;
    const controls = controlsRef.current;
    if (ref === null) return;

    const elapsed = rsState.clock.elapsedTime;
    // Clamp delta to absorb backgrounded-tab gaps (a 5 s freeze followed
    // by a single huge dt would otherwise spin the camera halfway around
    // the board in one frame).
    const dt = Math.max(0, Math.min(0.1, deltaSeconds));

    // Adopt the clock-time anchor for a freshly-fired user input.
    if (ref.userInputAt === Number.POSITIVE_INFINITY) {
      ref.userInputAt = elapsed;
    }

    // ---- 1. State transitions ------------------------------------------

    // Reduced-motion lock. Nothing else can move the FSM out of
    // userOverride while this prop is true (Req 7.8 / 12.1).
    if (reducedMotion) {
      ref.state = 'userOverride';
    } else {
      // Whip-pan trigger detection. We always update `lastWhipPanTs` so a
      // ts arriving during userOverride is consumed (and therefore not
      // replayed when override expires) — a stale visual cue for an event
      // that already happened would feel disconnected.
      if (whipPanTrigger !== null && whipPanTrigger.ts !== ref.lastWhipPanTs) {
        ref.lastWhipPanTs = whipPanTrigger.ts;
        if (
          ref.state !== 'userOverride' &&
          activeTokenPosition !== null &&
          controls !== null
        ) {
          ref.focusFromTarget.copy(controls.target);
          ref.focusToTarget.set(
            activeTokenPosition.x,
            activeTokenPosition.y,
            activeTokenPosition.z,
          );
          ref.focusDurationMs = durationFor({ kind: 'whip_pan' }, false);
          ref.focusStartElapsed = elapsed;
          ref.state = 'focus';
        }
      }

      // Focus-target trigger detection. Same consume-and-drop pattern as
      // the whip-pan branch.
      if (focusTarget !== null && focusTarget.ts !== ref.lastFocusTs) {
        ref.lastFocusTs = focusTarget.ts;
        if (ref.state !== 'userOverride' && controls !== null) {
          ref.focusFromTarget.copy(controls.target);
          ref.focusToTarget.set(
            focusTarget.position.x,
            focusTarget.position.y,
            focusTarget.position.z,
          );
          ref.focusDurationMs = durationFor({ kind: 'camera_focus' }, false);
          ref.focusStartElapsed = elapsed;
          ref.state = 'focus';
        }
      }

      // userOverride hold expiration (Req 7.6, "≥ 4 s after any
      // OrbitControls input"). Once the hold lapses the FSM returns to
      // `idle`; a subsequent focus trigger will pull it into `focus`.
      if (ref.state === 'userOverride') {
        if (
          Number.isFinite(ref.userInputAt) &&
          elapsed - ref.userInputAt > USER_OVERRIDE_HOLD_S
        ) {
          ref.state = 'idle';
        }
      }
    }

    // ---- 2. State behaviour --------------------------------------------

    if (controls !== null) {
      if (ref.state === 'focus') {
        if (ref.focusStartElapsed === null) {
          // Defensive: should never happen, but if a focus state was
          // reached without an armed start time we fall back gracefully
          // to follow rather than freezing the camera.
          ref.state = 'follow';
        } else {
          const elapsedMs = (elapsed - ref.focusStartElapsed) * 1000;
          const dur = Math.max(1, ref.focusDurationMs);
          const t = elapsedMs / dur;
          if (t >= 1) {
            // Tween complete — snap to destination and progress to follow
            // so the camera keeps tracking the active token afterward.
            controls.target.copy(ref.focusToTarget);
            ref.focusStartElapsed = null;
            ref.state = 'follow';
          } else {
            const eased = easeOutCubic(t);
            tmpTargetRef.current
              .copy(ref.focusFromTarget)
              .lerp(ref.focusToTarget, eased);
            controls.target.copy(tmpTargetRef.current);
          }
        }
      } else if (ref.state === 'follow') {
        if (activeTokenPosition !== null) {
          tmpTargetRef.current.set(
            activeTokenPosition.x,
            activeTokenPosition.y,
            activeTokenPosition.z,
          );
          controls.target.lerp(
            tmpTargetRef.current,
            clampedFollowFactor(FOLLOW_LERP_FACTOR),
          );
        } else {
          // No active token to follow; drop back to idle drift so the
          // camera doesn't freeze in an arbitrary mid-board pose.
          ref.state = 'idle';
        }
      } else if (ref.state === 'idle' && !reducedMotion) {
        // (Re-)entry edge: capture the current camera→target distance as
        // the breathing baseline. On the very first idle frame we don't
        // know the user's preferred zoom yet (drei is just hooking up),
        // so we read `controls.getDistance()` directly which queries the
        // freshly-attached spherical state.
        if (ref.prevState !== 'idle' || ref.idleBaselineRadius === null) {
          ref.idleBaselineRadius = controls.getDistance();
        }

        // Slow azimuthal orbit. setAzimuthalAngle writes through to the
        // OrbitControls internal `spherical` so the rotation persists
        // across frames (manually rotating `camera.position` would be
        // overwritten by `controls.update()` on the next tick).
        const cur = controls.getAzimuthalAngle();
        controls.setAzimuthalAngle(cur + IDLE_ORBIT_RAD_PER_S * dt);

        // Breathing zoom. Anchored to the captured baseline radius so
        // the oscillation never compounds: each frame we scale the
        // current offset to *exactly* `baseline × (1 + A·sin(φ))` rather
        // than multiplying by `(1 + A·sin(φ))` directly. Clamped to the
        // OrbitControls min/max distance so a caller with an unusually
        // large baseline can't push the camera through the bounds.
        const breathPhase = (elapsed * 2 * Math.PI) / IDLE_BREATHING_PERIOD_S;
        const targetRadius = Math.max(
          ORBIT_MIN_DISTANCE,
          Math.min(
            ORBIT_MAX_DISTANCE,
            ref.idleBaselineRadius *
              (1 + IDLE_BREATHING_AMPLITUDE * Math.sin(breathPhase)),
          ),
        );
        const offset = tmpOffsetRef.current
          .copy(camera.position)
          .sub(controls.target);
        const currentRadius = offset.length();
        if (currentRadius > 1e-6) {
          offset.multiplyScalar(targetRadius / currentRadius);
          camera.position.copy(controls.target).add(offset);
        }
      }
      // userOverride: do nothing — drei's `<OrbitControls>` already drives
      // `camera.position` from user input via its own internal useFrame.
    }

    // ---- 3. Screen-shake offset ----------------------------------------
    // Add the FX layer's current shake offset directly to the camera
    // position. Shake state is a damped oscillation that decays toward 0
    // (handled in FXLayer); we read the live values, no integration here.
    if (shake !== null) {
      camera.position.x += shake.current.x;
      camera.position.y += shake.current.y;
      camera.position.z += shake.current.z;
    }

    // ---- 4. Floor clamp (Req 7.7) --------------------------------------
    // Enforced last so neither the FSM, nor screen shake, nor a future
    // additive effect can ever push the camera inside the board base.
    // Distance check uses the squared length to avoid an unnecessary
    // sqrt when the camera is already outside the clamp radius.
    const px = camera.position.x;
    const py = camera.position.y;
    const pz = camera.position.z;
    const distSq = px * px + py * py + pz * pz;
    const minSq = FLOOR_CLAMP_DISTANCE * FLOOR_CLAMP_DISTANCE;
    if (distSq < minSq) {
      const len = Math.sqrt(distSq);
      if (len > 1e-6) {
        const factor = FLOOR_CLAMP_DISTANCE / len;
        camera.position.multiplyScalar(factor);
      } else {
        // Degenerate case: camera at origin. Push along +x to satisfy the
        // clamp deterministically rather than picking a random direction.
        camera.position.set(FLOOR_CLAMP_DISTANCE, 0, 0);
      }
    }

    // ---- 5. Bookkeeping for next frame ---------------------------------
    // Track the previous state so the idle-entry edge can re-capture the
    // breathing baseline radius. We also drop the cached baseline whenever
    // we leave idle so a future re-entry picks up whatever distance the
    // user / focus tween settled on (rather than re-using a stale value
    // from a previous idle window).
    if (ref.state !== 'idle') {
      ref.idleBaselineRadius = null;
    }
    ref.prevState = ref.state;
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableZoom
      enableRotate
      minDistance={ORBIT_MIN_DISTANCE}
      maxDistance={ORBIT_MAX_DISTANCE}
      minPolarAngle={ORBIT_MIN_POLAR_ANGLE}
      maxPolarAngle={ORBIT_MAX_POLAR_ANGLE}
      target={[0, 0, 0]}
      autoRotate={false}
      rotateSpeed={ORBIT_ROTATE_SPEED}
      zoomSpeed={ORBIT_ZOOM_SPEED}
      onStart={handleStart}
    />
  );
}
