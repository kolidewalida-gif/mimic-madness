/**
 * DiceSet.tsx — two cartoon dice with a deterministic angular trajectory.
 *
 * Renders a pair of `<RoundedBox>` cubes that:
 *   - tumble through a damped, deterministic angular path while
 *     `rolling === true`,
 *   - lerp onto the canonical {@link FACE_ROTATIONS} euler angles for
 *     `(d1, d2)` once `rolling` flips back to `false`,
 *   - emit a one-shot `SHOCKWAVE` particle burst plus a screen-shake
 *     pulse on the settle moment, and
 *   - flash an extra `SPARKLE` burst plus a "DOUBLE !" billboard for
 *     `DOUBLE_STAMP_MS` when `d1 === d2`.
 *
 * Determinism (Req 4.2 / Property 1).
 *   The trajectory is seeded from `hashDicePair(d1, d2)` using the same
 *   LCG family used by `particles/effects.ts`. Two clients diffing the
 *   same Supabase snapshot therefore see exactly the same path.
 *
 * Timing budget (Req 4.6 / Property 5).
 *   - `dice_tumble`        ≈ 1050 ms  — `useFrame`-driven angular sweep.
 *   - `dice_settle_shake`  ≈  225 ms  — linear ease-out lerp + FX.
 *   - Total                ≈ 1275 ms < 1500 ms cap, comfortably below
 *     the host's 1400 ms `setTimeout(handleLandingFor)` so the game
 *     loop is never blocked by visuals.
 *
 * Reduced motion (Req 12.2).
 *   No tumble at all. Dice mount at the final face rotation and fade in
 *   over `dice_settle_shake` (capped to 200 ms by `durationFor`). The
 *   "DOUBLE !" billboard and sparkle burst are suppressed under reduced
 *   motion to honour the documented 200 ms ceiling.
 *
 * Side effects.
 *   - Optional FX dispatch via {@link useFXBusOptional}: `SHOCKWAVE`
 *     centred on the dice and `SPARKLE` for doubles. Falls back to
 *     `console.debug` when no `<FXLayerProvider>` is mounted (test path).
 *   - Optional screen shake via {@link useScreenShakeOptional}, with a
 *     magnitude in [2, 6] linearly mapped from the dice sum (2..12).
 *   - No Supabase reads/writes, no audio, no DOM overlay (Req 11.8).
 *
 * Validates Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 12.2.
 */

import * as React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Text } from '@react-three/drei';

/* stub — drei removed Sparkles in v10 */
function Sparkles(_props: Record<string, unknown>) { return null; }
import * as THREE from 'three';

import { durationFor } from './durations';
import { useFXBusOptional, useScreenShakeOptional } from './FXLayer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Valid face values for a six-sided die. */
type DieFace = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Public props of `<DiceSet>`.
 *
 * Mirrors the design contract: two nullable face values (`null` while no
 * roll has happened yet — Supabase fields default to `null`), a `rolling`
 * flag driven by the animation queue's `DICE_ROLL` event window, and two
 * optional knobs:
 *
 *   - `reducedMotion` — when `true`, the tumble path is skipped and the
 *     dice fade in at their final face rotation over 200 ms.
 *   - `position` — base world position for the pair. Each die is offset
 *     ±1 unit on x relative to this anchor.
 */
export interface DiceSetProps {
  d1: number | null;
  d2: number | null;
  rolling: boolean;
  reducedMotion?: boolean;
  /** Base position of the dice pair (centre point). Defaults to `[0, 1.2, 0]`. */
  position?: [number, number, number];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Per-face euler rotations (in radians) so a stationary die settles with
 * the requested pip count facing the +Y axis (camera-up).
 *
 * Layout assumed for the cube's six face decals:
 *   - +Y (top)    → 1
 *   - −Y (bottom) → 6
 *   - +Z (front)  → 5
 *   - −Z (back)   → 2
 *   - −X (left)   → 3
 *   - +X (right)  → 4
 *
 * Verification: applying `FACE_ROTATIONS[v]` to the cube above lands
 * face `v` on the +Y axis for every `v ∈ [1..6]` (opposite faces always
 * sum to 7, matching a real die).
 */
const FACE_ROTATIONS: Readonly<Record<DieFace, readonly [number, number, number]>> = {
  1: [0,            0,  0],
  2: [Math.PI / 2,  0,  0],
  3: [0,            0, -Math.PI / 2],
  4: [0,            0,  Math.PI / 2],
  5: [-Math.PI / 2, 0,  0],
  6: [Math.PI,      0,  0],
};

/**
 * Half-extent at which face decals are placed. The cube is 0.7 wide, so
 * `0.355` sits the text marginally outside the surface — visible without
 * z-fighting against the underlying material.
 */
const DECAL_OFFSET = 0.36;

/** Lifetime of the "DOUBLE !" billboard + sparkle flourish (Req 4.5). */
const DOUBLE_STAMP_MS = 1200;

/** Lower bound of the screen-shake magnitude on settle (Req 4.3). */
const SHAKE_MIN_MAGNITUDE = 2;
/** Upper bound of the screen-shake magnitude on settle (Req 4.3). */
const SHAKE_MAX_MAGNITUDE = 6;

// ---------------------------------------------------------------------------
// Deterministic RNG — LCG seeded from (d1, d2)
// ---------------------------------------------------------------------------

/**
 * Hash a `(d1, d2)` pair into a 32-bit unsigned seed. We multiply each
 * value by a different prime and run a small avalanching mix so swapping
 * `d1` and `d2` produces a visibly different stream — the two dice
 * shouldn't tumble in lock-step phase.
 */
function hashDicePair(d1: number, d2: number): number {
  // eslint-disable-next-line @typescript-eslint/no-bitwise
  let h = Math.imul(d1 | 0, 2654435761);
  // eslint-disable-next-line @typescript-eslint/no-bitwise
  h = (h ^ Math.imul(d2 | 0, 1597334677)) >>> 0;
  // Avalanching mix (xorshift-flavoured) so adjacent (d1,d2) pairs land
  // far apart in the keyspace.
  // eslint-disable-next-line @typescript-eslint/no-bitwise
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507);
  // eslint-disable-next-line @typescript-eslint/no-bitwise
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909);
  // eslint-disable-next-line @typescript-eslint/no-bitwise
  h ^= h >>> 16;
  // eslint-disable-next-line @typescript-eslint/no-bitwise
  return h >>> 0;
}

/**
 * Numerical-Recipes LCG (Park-Miller variant). Deterministic, fast, and
 * dependency-free. Returns a function producing values in `[0, 1)`.
 *
 * Mirrors `particles/effects.ts → makeRng` so both modules' bursts share
 * the same statistical properties.
 */
function makeRng(seed: number): () => number {
  // eslint-disable-next-line @typescript-eslint/no-bitwise
  let state = (seed >>> 0) || 1;
  return function next(): number {
    // eslint-disable-next-line @typescript-eslint/no-bitwise
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

// ---------------------------------------------------------------------------
// Trajectory
// ---------------------------------------------------------------------------

/**
 * Per-die tumble parameters: angular rates and starting phases on each
 * principal axis. Rates are in "half-rotations per tumble window" — the
 * default ranges produce roughly 3..5 full rotations per axis across the
 * `dice_tumble` budget.
 */
interface AxisTrajectory {
  rateX: number;
  rateY: number;
  rateZ: number;
  phaseX: number;
  phaseY: number;
  phaseZ: number;
}

function buildDieTrajectory(rng: () => number): AxisTrajectory {
  return {
    rateX: 8 + rng() * 6,
    rateY: 7 + rng() * 5,
    rateZ: 6 + rng() * 4,
    phaseX: rng() * Math.PI * 2,
    phaseY: rng() * Math.PI * 2,
    phaseZ: rng() * Math.PI * 2,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Type guard for `DieFace`. Defends against malformed Supabase rows. */
function isValidFace(v: number): v is DieFace {
  return Number.isInteger(v) && v >= 1 && v <= 6;
}

/** Snap a `THREE.Group`'s rotation to the given euler triple. */
function applyEulerToGroup(
  group: THREE.Group | null,
  target: readonly [number, number, number],
): void {
  if (!group) return;
  group.rotation.set(target[0], target[1], target[2]);
}

/**
 * Drive a die's tumble rotation as a function of normalised time `t ∈ [0, 1]`.
 *
 * The rotation is `target + decayingTumble(t)`, where the tumble
 * amplitude decays as `(1 − t)²`. At `t === 1` the decay is exactly zero
 * so the dice lands on the target euler triple — meaning the subsequent
 * settle lerp (Phase 2) only smooths out residual sub-frame drift.
 *
 * Pure: same `(traj, target, t)` always yields the same rotation. The
 * underlying `Math.sin` is a function call, so two clients on different
 * machines compute byte-identical results (within IEEE 754 tolerances).
 */
function applyTumble(
  group: THREE.Group | null,
  traj: AxisTrajectory,
  target: readonly [number, number, number],
  t: number,
): void {
  if (!group) return;
  // Quadratic decay so the wild oscillation tapers smoothly into the
  // landing rotation. Linear decay would still feel "active" right up
  // to the last frame; quadratic is closer to a real damped pendulum.
  const damping = (1 - t) * (1 - t);
  // Normalised "spin time": a single tumble window covers π radians of
  // phase per unit `rate`, so a rate of 8 produces ~4 full rotations
  // over the window — visually vigorous without becoming a strobe.
  const spinTime = t * Math.PI;
  const tx = Math.sin(traj.phaseX + spinTime * traj.rateX) * Math.PI * damping;
  const ty = Math.sin(traj.phaseY + spinTime * traj.rateY) * Math.PI * damping;
  const tz = Math.sin(traj.phaseZ + spinTime * traj.rateZ) * Math.PI * damping;
  group.rotation.x = target[0] + tx;
  group.rotation.y = target[1] + ty;
  group.rotation.z = target[2] + tz;
}

/** Captured starting rotation snapshot used by the settle lerp. */
interface EulerSnapshot {
  x: number;
  y: number;
  z: number;
}

function snapshotRotation(group: THREE.Group | null): EulerSnapshot {
  if (!group) return { x: 0, y: 0, z: 0 };
  return { x: group.rotation.x, y: group.rotation.y, z: group.rotation.z };
}

/**
 * Linear interpolation from a captured `start` rotation toward `target`
 * by eased progress `eased ∈ [0, 1]`. Avoids the exponential
 * `lerp(current, target, k)` per-frame pattern, which would never reach
 * the target exactly on a fixed time budget.
 */
function lerpEulerLinear(
  group: THREE.Group | null,
  start: EulerSnapshot,
  target: readonly [number, number, number],
  eased: number,
): void {
  if (!group) return;
  group.rotation.x = start.x + (target[0] - start.x) * eased;
  group.rotation.y = start.y + (target[1] - start.y) * eased;
  group.rotation.z = start.z + (target[2] - start.z) * eased;
}

// ---------------------------------------------------------------------------
// DieMesh — internal helper
// ---------------------------------------------------------------------------

interface DieMeshProps {
  /** Whether materials should fade in (reduced-motion path). */
  fadeIn: boolean;
  /** Fade-in progress in [0, 1]; ignored when `fadeIn` is false. */
  fadeProgress: number;
}

/**
 * One cartoon die: white rounded cube + black ink wireframe + six face
 * `<Text>` decals. The face decals are positioned so that with rotation
 * `FACE_ROTATIONS[v]` applied to the parent group, face `v` lands on top.
 *
 * Reduced-motion mounts pass `fadeIn === true` with a `fadeProgress` ramp
 * driven from a parent `useEffect` so the dice gracefully appear without
 * any tumble (Req 12.2).
 */
function DieMesh({ fadeIn, fadeProgress }: DieMeshProps): React.ReactElement {
  const opacity = fadeIn ? Math.max(0, Math.min(1, fadeProgress)) : 1;
  const transparent = opacity < 1;

  return (
    <group>
      {/* Body — white rounded cube with the warm cartoon-paper tint. */}
      <RoundedBox args={[0.7, 0.7, 0.7]} radius={0.1} smoothness={3}>
        <meshStandardMaterial
          color="#ffffff"
          metalness={0.15}
          roughness={0.35}
          emissive={new THREE.Color('#fff8e7')}
          emissiveIntensity={0.1}
          transparent={transparent}
          opacity={opacity}
        />
      </RoundedBox>
      {/* Black wireframe outline for the "drawn" silhouette. */}
      <mesh>
        <boxGeometry args={[0.74, 0.74, 0.74]} />
        <meshBasicMaterial
          color="var(--ink-line)"
          wireframe
          transparent={transparent}
          opacity={opacity}
        />
      </mesh>
      {/* Six face decals — opposite faces sum to 7. */}
      <FaceDecal value={1} position={[0, DECAL_OFFSET, 0]} rotation={[-Math.PI / 2, 0, 0]} opacity={opacity} />
      <FaceDecal value={6} position={[0, -DECAL_OFFSET, 0]} rotation={[Math.PI / 2, 0, 0]} opacity={opacity} />
      <FaceDecal value={5} position={[0, 0, DECAL_OFFSET]} rotation={[0, 0, 0]} opacity={opacity} />
      <FaceDecal value={2} position={[0, 0, -DECAL_OFFSET]} rotation={[0, Math.PI, 0]} opacity={opacity} />
      <FaceDecal value={3} position={[-DECAL_OFFSET, 0, 0]} rotation={[0, -Math.PI / 2, 0]} opacity={opacity} />
      <FaceDecal value={4} position={[DECAL_OFFSET, 0, 0]} rotation={[0, Math.PI / 2, 0]} opacity={opacity} />
    </group>
  );
}

interface FaceDecalProps {
  value: number;
  position: [number, number, number];
  rotation: [number, number, number];
  opacity: number;
}

function FaceDecal({ value, position, rotation, opacity }: FaceDecalProps): React.ReactElement {
  return (
    <Text
      position={position}
      rotation={rotation}
      fontSize={0.42}
      color="var(--ink-line)"
      anchorX="center"
      anchorY="middle"
      outlineWidth={0.012}
      outlineColor="var(--ink-line)"
      fontWeight="bold"
      fillOpacity={opacity}
      strokeOpacity={opacity}
    >
      {value.toString()}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// <DiceSet> — public component
// ---------------------------------------------------------------------------

/**
 * Render a pair of cartoon dice driven by Supabase-derived `(d1, d2)`
 * face values and a queue-driven `rolling` flag.
 *
 * Returns `null` when either face value is missing or out of `[1, 6]` —
 * this is the legitimate pre-roll state of `monopoly_games.last_dice_*`
 * and an explicit early-out keeps the scene graph clean.
 */
export function DiceSet(props: DiceSetProps): React.ReactElement | null {
  const {
    d1,
    d2,
    rolling,
    reducedMotion = false,
    position = [0, 1.2, 0],
  } = props;

  // --- Group refs ------------------------------------------------------
  // The two `<group>`s rotated by the per-frame loop. Position is set in
  // JSX (left/right offsets) and never modified at runtime.
  const die1Ref = useRef<THREE.Group | null>(null);
  const die2Ref = useRef<THREE.Group | null>(null);

  // --- Optional FX dispatch buses --------------------------------------
  const fxBus = useFXBusOptional();
  const screenShake = useScreenShakeOptional();

  // --- Deterministic trajectory ----------------------------------------
  // Memoised on `(d1, d2)` so two clients with the same Supabase row see
  // the same path, and so the same memoised value drives both the tumble
  // phase and any debugging instrumentation.
  const trajectory = useMemo(() => {
    if (d1 === null || d2 === null) return null;
    if (!isValidFace(d1) || !isValidFace(d2)) return null;
    const rng = makeRng(hashDicePair(d1, d2));
    return {
      die1: buildDieTrajectory(rng),
      die2: buildDieTrajectory(rng),
    };
  }, [d1, d2]);

  // --- Animation refs --------------------------------------------------
  // `clock.elapsedTime`-anchored anchors so the loop is frame-rate
  // independent and unit tests can fast-forward by ticking `useFrame`.
  const rollStartElapsedRef = useRef<number | null>(null);
  const settleStartElapsedRef = useRef<number | null>(null);
  const settleStartRotationsRef = useRef<{
    die1: EulerSnapshot;
    die2: EulerSnapshot;
  } | null>(null);
  const prevRollingRef = useRef<boolean>(rolling);
  const settleEmittedRef = useRef<boolean>(false);

  // --- Doubles flourish state -----------------------------------------
  // State (rather than ref) because the JSX overlay's visibility depends
  // on it; React must re-render when it flips.
  const [doubleVisible, setDoubleVisible] = useState(false);
  const doubleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Reduced-motion fade-in progress --------------------------------
  // Drives `<DieMesh>`'s material opacity from 0 → 1 over 200 ms when
  // `reducedMotion` is true. Outside reduced motion this stays at 1.
  const [fadeProgress, setFadeProgress] = useState<number>(reducedMotion ? 0 : 1);

  // ---- Effects --------------------------------------------------------

  // Rolling transition tracker. Reset settle/roll anchors so a new roll
  // always starts the FX dispatch fresh.
  useEffect(() => {
    const wasRolling = prevRollingRef.current;
    prevRollingRef.current = rolling;

    if (rolling === true) {
      // New roll begins — clear any in-flight settle bookkeeping.
      settleStartElapsedRef.current = null;
      settleStartRotationsRef.current = null;
      rollStartElapsedRef.current = null;
      settleEmittedRef.current = false;
    } else if (wasRolling === true && rolling === false) {
      // Rolling just ended; the settle frame in `useFrame` will capture
      // the start rotation and emit FX exactly once.
      settleStartElapsedRef.current = null;
      settleStartRotationsRef.current = null;
      settleEmittedRef.current = false;
    }
  }, [rolling]);

  // Cleanup the doubles timer on unmount.
  useEffect(() => {
    return () => {
      if (doubleTimeoutRef.current !== null) {
        clearTimeout(doubleTimeoutRef.current);
        doubleTimeoutRef.current = null;
      }
    };
  }, []);

  // Reduced-motion fade-in. Driven by `requestAnimationFrame` so the
  // ramp is independent of the scene's `useFrame` loop (which we still
  // skip the tumble inside).
  useEffect(() => {
    if (!reducedMotion) {
      setFadeProgress(1);
      return undefined;
    }
    if (d1 === null || d2 === null) {
      setFadeProgress(0);
      return undefined;
    }
    setFadeProgress(0);
    const start =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
    const fadeDur = durationFor({ kind: 'dice_settle_shake' }, true);
    let cancelled = false;
    let frame: number = 0;
    const tick = (): void => {
      if (cancelled) return;
      const nowMs =
        typeof performance !== 'undefined' && typeof performance.now === 'function'
          ? performance.now()
          : Date.now();
      const elapsed = nowMs - start;
      const p = fadeDur > 0 ? Math.min(1, elapsed / fadeDur) : 1;
      setFadeProgress(p);
      if (p < 1 && typeof requestAnimationFrame === 'function') {
        frame = requestAnimationFrame(tick);
      }
    };
    if (typeof requestAnimationFrame === 'function') {
      frame = requestAnimationFrame(tick);
    } else {
      // Headless / SSR fallback: just snap to fully visible.
      setFadeProgress(1);
    }
    return () => {
      cancelled = true;
      if (frame !== 0 && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(frame);
      }
    };
  }, [reducedMotion, d1, d2]);

  // ---- Per-frame integration loop ------------------------------------
  useFrame((state) => {
    if (d1 === null || d2 === null || !isValidFace(d1) || !isValidFace(d2)) {
      return;
    }

    const now = state.clock.elapsedTime;

    // Reduced-motion: hold the dice at their final face and let the
    // material fade-in (driven from the React effect above) handle the
    // visual entrance. No tumble, no settle FX.
    if (reducedMotion) {
      applyEulerToGroup(die1Ref.current, FACE_ROTATIONS[d1]);
      applyEulerToGroup(die2Ref.current, FACE_ROTATIONS[d2]);
      return;
    }

    if (rolling) {
      // ---- Phase 1: tumble ----
      if (rollStartElapsedRef.current === null) {
        rollStartElapsedRef.current = now;
      }
      const elapsedMs = (now - rollStartElapsedRef.current) * 1000;
      const tumbleDur = durationFor({ kind: 'dice_tumble' }, false);
      const t = tumbleDur > 0 ? Math.min(1, elapsedMs / tumbleDur) : 1;

      if (trajectory !== null) {
        applyTumble(die1Ref.current, trajectory.die1, FACE_ROTATIONS[d1], t);
        applyTumble(die2Ref.current, trajectory.die2, FACE_ROTATIONS[d2], t);
      }
      return;
    }

    // ---- Phase 2: settle ----
    if (settleStartElapsedRef.current === null) {
      settleStartElapsedRef.current = now;
      settleStartRotationsRef.current = {
        die1: snapshotRotation(die1Ref.current),
        die2: snapshotRotation(die2Ref.current),
      };
    }

    const settleElapsedMs = (now - settleStartElapsedRef.current) * 1000;
    const settleDur = durationFor({ kind: 'dice_settle_shake' }, false);

    // Emit `SHOCKWAVE` + screen shake exactly once on the first settle
    // frame. Bracketed by `settleEmittedRef` so a frame stutter that
    // re-enters this branch can't double-fire the FX (Req 11.7).
    if (!settleEmittedRef.current) {
      settleEmittedRef.current = true;
      const sum = d1 + d2;
      // Map sum (2..12) linearly into magnitude (2..6). Using a lerp
      // rather than the raw sum keeps the upper bound exactly at 6
      // (Req 4.3) for a 6+6 = 12 roll.
      const magnitude =
        SHAKE_MIN_MAGNITUDE +
        ((sum - 2) / 10) * (SHAKE_MAX_MAGNITUDE - SHAKE_MIN_MAGNITUDE);
      const shakeMs = settleDur;

      if (fxBus !== null) {
        fxBus.play({
          kind: 'SHOCKWAVE',
          origin: { x: position[0], y: position[1], z: position[2] },
          durationMs: shakeMs,
        });
      } else {
        // No FXLayerProvider in the tree (test mount). Logged so unit
        // tests can still observe the dispatch contract.
        // eslint-disable-next-line no-console
        console.debug('[DiceSet] settle SHOCKWAVE', { d1, d2 });
      }

      if (screenShake !== null) {
        screenShake.trigger(magnitude, shakeMs);
      } else {
        // eslint-disable-next-line no-console
        console.debug('[DiceSet] screenShake', { magnitude, durMs: shakeMs });
      }

      // Doubles flourish (Req 4.5).
      if (d1 === d2) {
        setDoubleVisible(true);
        if (doubleTimeoutRef.current !== null) {
          clearTimeout(doubleTimeoutRef.current);
        }
        doubleTimeoutRef.current = setTimeout(() => {
          setDoubleVisible(false);
          doubleTimeoutRef.current = null;
        }, DOUBLE_STAMP_MS);

        if (fxBus !== null) {
          fxBus.play({
            kind: 'SPARKLE',
            origin: { x: position[0], y: position[1] + 0.6, z: position[2] },
            color: '#fbbf24',
          });
        }
      }
    }

    if (settleDur <= 0 || settleElapsedMs >= settleDur) {
      // Settle window elapsed — snap exactly onto the final face.
      applyEulerToGroup(die1Ref.current, FACE_ROTATIONS[d1]);
      applyEulerToGroup(die2Ref.current, FACE_ROTATIONS[d2]);
      return;
    }

    // Cubic ease-out lerp from the captured start rotation to the
    // canonical face rotation.
    const start = settleStartRotationsRef.current;
    if (start !== null) {
      const t = settleElapsedMs / settleDur;
      const eased = 1 - Math.pow(1 - t, 3);
      lerpEulerLinear(die1Ref.current, start.die1, FACE_ROTATIONS[d1], eased);
      lerpEulerLinear(die2Ref.current, start.die2, FACE_ROTATIONS[d2], eased);
    }
  });

  // ---- Render ---------------------------------------------------------
  if (d1 === null || d2 === null || !isValidFace(d1) || !isValidFace(d2)) {
    return null;
  }

  return (
    <group position={position}>
      <group ref={die1Ref} position={[-1, 0, 0]}>
        <DieMesh fadeIn={reducedMotion} fadeProgress={fadeProgress} />
      </group>
      <group ref={die2Ref} position={[1, 0, 0]}>
        <DieMesh fadeIn={reducedMotion} fadeProgress={fadeProgress} />
      </group>

      {/* Doubles flourish: extra sparkle burst + "DOUBLE !" billboard. */}
      {/* Suppressed under reduced motion so the 200 ms cap is honoured. */}
      {doubleVisible && d1 === d2 && !reducedMotion && (
        <group position={[0, 1.0, 0]}>
          <Sparkles
            count={20}
            scale={[2.5, 1, 2.5]}
            size={4}
            speed={0.8}
            color="#fbbf24"
          />
          <Text
            position={[0, 0.5, 0]}
            fontSize={0.5}
            color="#fbbf24"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.05}
            outlineColor="var(--ink-line)"
            fontWeight="bold"
          >
            DOUBLE !
          </Text>
        </group>
      )}
    </group>
  );
}
