/**
 * Building.tsx — selector exports
 *
 * The selectors live in this file (alongside the future `<Building>` React
 * component added in task 7.2) because the component, the property-based test
 * suite, and the rendering logic all share the same types and slot geometry.
 * Keeping them co-located ensures a single source of truth for:
 *   - the building "kind" derivation rules (Requirement 3.1, 3.2, 3.3, 3.5),
 *   - the deterministic per-house slot positions used by the 3D mesh layout.
 *
 * This file currently exports only pure selector functions — no JSX, no
 * imports, no side effects. Property 4 from `design.md` is verified against
 * these exports.
 */

/**
 * Snapshot shape consumed by `resolveBuildingKind`.
 *
 * Matches the relevant subset of `MonopolyProperty` (see `design.md` →
 * Data Models). Kept structural to avoid coupling the selector to the
 * Supabase row type at this layer.
 */
export interface BuildingSnapshot {
  houses: number;
  owner_id: string | null;
  is_mortgaged: boolean;
}

/**
 * Discriminated union of building visual states.
 *
 * `count` is only present for `kind === 'house'` and equals the number of
 * houses (1..4) to render at the slot positions returned by
 * {@link houseSlotPositions}.
 */
export type BuildingKind =
  | { kind: 'empty' }
  | { kind: 'terrain' }
  | { kind: 'house'; count: 1 | 2 | 3 | 4 }
  | { kind: 'hotel' }
  | { kind: 'mortgaged' };

/**
 * Deterministic x-coordinates for up to four cartoon houses on a tile.
 *
 * Pairwise gaps:
 *   |-0.18 - (-0.5)| = 0.32
 *   |0.18 - (-0.18)| = 0.36
 *   |0.5  -  0.18 | = 0.32
 *
 * The smallest pairwise distance is `0.32`, which is `>= 0.3` and therefore
 * satisfies the no-overlap invariant from Requirement 3.2 / Property 4.
 *
 * Exported so that the `<Building>` component (task 7.2) can render house
 * meshes at exactly the same coordinates the selector reasons about.
 */
export const HOUSE_X_SLOTS = [-0.5, -0.18, 0.18, 0.5] as const;

/**
 * Common z-coordinate for every house slot. Matches the design document's
 * tile-local layout (`z = -0.4`).
 */
const HOUSE_Z = -0.4;

/**
 * Derive the visual "kind" of a building from its property snapshot.
 *
 * Rules (deterministic, matching design.md → Property 4):
 *   1. `is_mortgaged === true`              → `{ kind: 'mortgaged' }`
 *      (overlay precedence — design Property 4 step 1)
 *   2. `houses === 5`                       → `{ kind: 'hotel' }`
 *   3. `1 <= houses <= 4`                   → `{ kind: 'house', count: houses }`
 *   4. `owner_id !== null && houses === 0`  → `{ kind: 'terrain' }`
 *   5. `owner_id === null && houses === 0`  → `{ kind: 'empty' }`
 *
 * Defensive: any `houses` value outside `[0, 5]` (negative or > 5) throws a
 * `RangeError` so upstream bugs surface immediately rather than rendering a
 * silently-wrong scene.
 *
 * Validates Requirements 3.1, 3.2, 3.3, 3.5.
 */
export function resolveBuildingKind(p: BuildingSnapshot): BuildingKind {
  // Mortgage overlays the underlying kind (rule 1).
  if (p.is_mortgaged === true) {
    return { kind: 'mortgaged' };
  }

  const { houses, owner_id } = p;

  if (!Number.isInteger(houses) || houses < 0 || houses > 5) {
    throw new RangeError(
      `resolveBuildingKind: houses must be an integer in [0, 5], got ${houses}`,
    );
  }

  if (houses === 5) {
    return { kind: 'hotel' };
  }

  if (houses >= 1 && houses <= 4) {
    return { kind: 'house', count: houses as 1 | 2 | 3 | 4 };
  }

  // houses === 0 from here on.
  if (owner_id !== null) {
    return { kind: 'terrain' };
  }

  return { kind: 'empty' };
}

/**
 * Return the deterministic (x, z) slot positions for `n` cartoon houses on
 * a tile. Picks the first `n` entries from {@link HOUSE_X_SLOTS} and pins
 * `z` to `-0.4` for every slot.
 *
 * Invariants (Property 4 / Requirement 3.2):
 *   - exactly `n` positions are returned;
 *   - all positions share the same `z`;
 *   - pairwise x-distance is `>= 0.3` (smallest gap in `HOUSE_X_SLOTS` is 0.32).
 *
 * `n` outside `[1, 4]` throws a `RangeError`.
 */
export function houseSlotPositions(
  n: 1 | 2 | 3 | 4,
): Array<{ x: number; z: number }> {
  if (!Number.isInteger(n) || n < 1 || n > 4) {
    throw new RangeError(
      `houseSlotPositions: n must be an integer in [1, 4], got ${n}`,
    );
  }

  const slots: Array<{ x: number; z: number }> = [];
  for (let i = 0; i < n; i++) {
    slots.push({ x: HOUSE_X_SLOTS[i], z: HOUSE_Z });
  }
  return slots;
}

// ============================================================================
// <Building> React component (task 7.2)
// ----------------------------------------------------------------------------
// Renders a tile's building stack from a property snapshot. The visual "kind"
// is resolved by the pure {@link resolveBuildingKind} selector above so the
// rendering logic and the property-based test suite share the same rules.
//
// Animation behaviour (design Property 5 / Requirements 3.4, 3.6, 11.4):
//
//   - Grow tween: when `growEvent.ts` changes, the wrapper group scales
//     0 → 1 with elastic overshoot over `durationFor('building_grow', rm)`
//     ms, then settles at scale 1. Reduced motion collapses to a single
//     linear ramp inside `durationFor`'s 200ms cap (Req 12.2 — no elastic
//     overshoot, which would feel jarring under that accessibility setting).
//
//   - Mortgage tilt: when `isMortgaged` is true the inner group renders
//     under the documented `[0.2, 0, 0.15]` rotation. Flipping back to
//     false triggers a snap-back tween interpolating each axis to 0 over
//     `durationFor('building_unmortgage')` (Requirement 3.6).
//
//   - Far LOD: each `<HouseMesh>` is replaced with a `<RoundedBox>` body
//     only (no roof, no wireframe) when `lod === 'far'`. The hotel renders
//     as a single mesh in both LODs (Requirement 11.4).
//
// Determinism (Req 11.7 / 10.7):
//
//   The component never calls `Math.random()` or `Date.now()`. All animation
//   timing is driven by `useFrame`'s `clock.elapsedTime`. The only externally
//   observable effect is a one-shot `DUST_PUFF` dispatched via the FXBus
//   when a grow tween starts (or, when no FXLayerProvider is in the tree,
//   logged via `console.debug` so isolated unit tests can still observe
//   the contract).
//
//   No Supabase reads/writes, no React Query, no audio, no other side
//   effects. Side effects are confined to the FX dispatch above.
//
// Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 11.4
// ============================================================================

import * as React from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Text } from '@react-three/drei';
import * as THREE from 'three';
import { durationFor } from './durations';
import { useFXBusOptional } from './FXLayer';

// ---------------------------------------------------------------------------
// Visual constants
// ---------------------------------------------------------------------------

/**
 * Mortgage tilt euler angles `[x, y, z]` in radians. Matches the visual
 * spec from task 7.2 (the inner tilt group leans slightly forward and to
 * the right so the "closed" state reads at a glance).
 */
const MORTGAGE_TILT: readonly [number, number, number] = [0.2, 0, 0.15];

/** Cartoon house body and roof colour (matches the existing scene palette). */
const HOUSE_COLOR = '#22c55e';

/** Cartoon hotel body, roof, and door colours. */
const HOTEL_BODY_COLOR = '#ef4444';
const HOTEL_ROOF_COLOR = '#dc2626';
const HOTEL_DOOR_COLOR = '#fbbf24';

/**
 * Desaturated grey used for every material when the building is mortgaged.
 * A single neutral grey reads more clearly as "out of service" than a
 * partial blend, and removes any ambiguity at low LOD.
 */
const MORTGAGED_COLOR = '#888888';

/** Y-coordinate at which house meshes sit on top of a tile. */
const HOUSE_Y = 0.25;
/** Y-coordinate of the hotel mesh centre. */
const HOTEL_Y = 0.32;

/**
 * `easeOutElastic` for the building grow tween (Requirement 3.4).
 *
 * Standard formulation:
 *   c4 = 2π / 3
 *   ease(t) = 2^(-10t) · sin((10t − 0.75) · c4) + 1
 *
 * Clamped at the endpoints so a `t` slightly outside `[0, 1]` (caused by
 * floating-point drift on the elapsed-time math) never returns garbage.
 */
function easeOutElastic(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const c4 = (2 * Math.PI) / 3;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

// ---------------------------------------------------------------------------
// FX bus (task 5.3 wiring)
// ---------------------------------------------------------------------------
//
// The `<FXLayer>` provider (task 5.3) exposes `useFXBus()` for one-shot
// effect dispatch. We use the optional variant so this component still
// renders correctly inside isolated test mounts that don't include an
// FXLayer in the tree — the dispatch becomes a no-op fallback there
// (the previous `console.debug` placeholder is preserved on that path
// so unit tests / dev tools can still observe the contract).

// ---------------------------------------------------------------------------
// Helper meshes (internal — not exported)
// ---------------------------------------------------------------------------

interface MeshLodProps {
  lod: 'near' | 'far';
  desaturated: boolean;
}

/**
 * Cartoon house: green box (0.22³) + green diamond roof + black wireframe
 * outline. Far LOD swaps the whole thing for a `<RoundedBox>` body only —
 * no roof, no wireframe (Requirement 11.4).
 */
function HouseMesh({ lod, desaturated }: MeshLodProps): React.ReactElement {
  const bodyColor = desaturated ? MORTGAGED_COLOR : HOUSE_COLOR;
  const emissive = desaturated ? '#000000' : HOUSE_COLOR;
  const emissiveIntensity = desaturated ? 0 : 0.25;

  if (lod === 'far') {
    return (
      <RoundedBox args={[0.22, 0.22, 0.22]} radius={0.04} smoothness={2}>
        <meshStandardMaterial
          color={bodyColor}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          roughness={0.6}
          metalness={0.15}
        />
      </RoundedBox>
    );
  }

  return (
    <group>
      {/* Body */}
      <mesh>
        <boxGeometry args={[0.22, 0.22, 0.22]} />
        <meshStandardMaterial
          color={bodyColor}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          roughness={0.5}
          metalness={0.2}
        />
      </mesh>
      {/* Roof — square box rotated 45° on the z-axis. */}
      <mesh position={[0, 0.16, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.18, 0.18, 0.18]} />
        <meshStandardMaterial
          color={bodyColor}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          roughness={0.6}
        />
      </mesh>
      {/* Black wireframe outline for a "drawn" silhouette. */}
      <mesh>
        <boxGeometry args={[0.222, 0.222, 0.222]} />
        <meshBasicMaterial color="var(--ink-line)" wireframe />
      </mesh>
    </group>
  );
}

/**
 * Cartoon hotel: red rectangular building (0.45 × 0.4 × 0.35), red roof,
 * gold door. Renders as a single mesh in both LODs (Requirement 11.4 only
 * specifies LOD swaps for `<HouseMesh>`).
 */
function HotelMesh({ desaturated }: { desaturated: boolean }): React.ReactElement {
  const body = desaturated ? MORTGAGED_COLOR : HOTEL_BODY_COLOR;
  const roof = desaturated ? MORTGAGED_COLOR : HOTEL_ROOF_COLOR;
  const door = desaturated ? MORTGAGED_COLOR : HOTEL_DOOR_COLOR;

  return (
    <group>
      <mesh>
        <boxGeometry args={[0.45, 0.4, 0.35]} />
        <meshStandardMaterial color={body} roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.27, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.32, 0.32, 0.37]} />
        <meshStandardMaterial color={roof} roughness={0.5} />
      </mesh>
      <mesh position={[0, -0.05, 0.18]}>
        <boxGeometry args={[0.1, 0.16, 0.02]} />
        <meshStandardMaterial color={door} roughness={0.6} />
      </mesh>
    </group>
  );
}

interface TerrainBadgeProps {
  color: string;
}

/**
 * Owned-but-empty terrain badge (Requirement 3.1).
 *
 * A flat rounded rectangle (0.6 × 0.05 × 0.4) in the owner's colour with a
 * thin black ink border and two tiny fence posts on the top edges. Renders
 * identically in both LOD modes — geometry is already minimal.
 */
function TerrainBadge({ color }: TerrainBadgeProps): React.ReactElement {
  return (
    <group position={[0, 0.025, -0.4]}>
      {/* Owner-colour pad. */}
      <mesh>
        <boxGeometry args={[0.6, 0.05, 0.4]} />
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.1} />
      </mesh>
      {/* Thin black ink outline (slightly larger wireframe). */}
      <mesh>
        <boxGeometry args={[0.61, 0.052, 0.41]} />
        <meshBasicMaterial color="var(--ink-line)" wireframe />
      </mesh>
      {/* Two small fence posts on the top (back) edge. */}
      <mesh position={[-0.18, 0.07, -0.18]}>
        <boxGeometry args={[0.04, 0.1, 0.04]} />
        <meshStandardMaterial color="var(--ink-line)" roughness={0.9} />
      </mesh>
      <mesh position={[0.18, 0.07, -0.18]}>
        <boxGeometry args={[0.04, 0.1, 0.04]} />
        <meshStandardMaterial color="var(--ink-line)" roughness={0.9} />
      </mesh>
    </group>
  );
}

/**
 * Chained-icon overlay for mortgaged buildings (Requirement 3.5).
 *
 * Renders the `⛓` glyph as a drei `<Text>` at the position documented in
 * task 7.2 (`[0, 0.4, -0.4]`). The wrapper group provides any tilt; the
 * icon itself stays stationary relative to that group.
 */
function ChainedIcon(): React.ReactElement {
  return (
    <Text
      position={[0, 0.4, -0.4]}
      fontSize={0.28}
      anchorX="center"
      anchorY="middle"
      outlineWidth={0.015}
      outlineColor="var(--ink-line)"
      color="#ffffff"
    >
      ⛓
    </Text>
  );
}

// ---------------------------------------------------------------------------
// <Building> public component
// ---------------------------------------------------------------------------

/**
 * One-shot grow trigger. The producer (animation queue / consumer Tile)
 * passes a fresh `ts` whenever a `BUILDING_GROW` render event fires; the
 * component compares against its last seen ts in a ref to start a new
 * tween (and exactly one DUST_PUFF dispatch).
 */
export interface BuildingGrowEvent {
  from: number;
  to: number;
  ts: number;
}

/**
 * Public props of `<Building>`.
 *
 * `tileIndex` is currently informational (carried through to make consumer
 * debug logs meaningful) — visual layout is fully driven by the other props.
 */
export interface BuildingProps {
  tileIndex: number;
  /** 0..5 from `monopoly_properties.houses` (5 = hotel). */
  houses: number;
  /** Owner's token colour, or `null` when the property is unowned. */
  ownerColor: string | null;
  /** Mirrors `monopoly_properties.is_mortgaged`. */
  isMortgaged: boolean;
  /** Optional one-shot grow trigger; latest unseen `ts` starts the tween. */
  growEvent?: BuildingGrowEvent;
  /**
   * `prefers-reduced-motion: reduce` (Req 12.2). Defaults to `false` so
   * tests and isolated mounts behave like the normal-motion path.
   */
  reducedMotion?: boolean;
  /**
   * Distance LOD bucket selected by `lodFor(distance)` (Req 11.4).
   * Defaults to `'near'` when unspecified.
   */
  lod?: 'near' | 'far';
}

/**
 * `<Building>` — main renderer for a tile's building stack.
 *
 * Render branches (Requirements 3.1, 3.2, 3.3, 3.5):
 *   - `kind === 'empty'`        → returns `null` (no DOM/scene presence).
 *   - `kind === 'terrain'`      → `<TerrainBadge>` in the owner's colour.
 *   - `kind === 'house'`        → `count` `<HouseMesh>` instances at the
 *                                 deterministic slots from
 *                                 `houseSlotPositions(count)`.
 *   - `kind === 'hotel'`        → a single `<HotelMesh>`.
 *   - `kind === 'mortgaged'`    → renders the underlying non-mortgaged kind
 *                                 with desaturated materials, the documented
 *                                 `[0.2, 0, 0.15]` tilt wrapper, and a `⛓`
 *                                 `<Text>` overlay.
 */
export function Building(props: BuildingProps): React.ReactElement | null {
  const {
    houses,
    ownerColor,
    isMortgaged,
    growEvent,
    reducedMotion = false,
    lod = 'near',
  } = props;

  // --- Visual kind derivation --------------------------------------------
  // Always run the canonical selector so the property-based tests, the
  // animation queue, and the renderer agree on what to draw. `owner_id`
  // presence is what the selector reads, so we forward a placeholder
  // string when an owner colour is supplied.
  const kind = useMemo(
    () =>
      resolveBuildingKind({
        houses,
        owner_id: ownerColor === null ? null : 'X',
        is_mortgaged: isMortgaged,
      }),
    [houses, ownerColor, isMortgaged],
  );

  // When the canonical kind is `'mortgaged'`, we still need to render the
  // structure underneath the desaturation/tilt/chain overlay. Re-running
  // the selector with `is_mortgaged: false` gives the correct underlying
  // kind (terrain / house / hotel / empty) without re-implementing rules.
  const underlyingKind = useMemo(
    () =>
      resolveBuildingKind({
        houses,
        owner_id: ownerColor === null ? null : 'X',
        is_mortgaged: false,
      }),
    [houses, ownerColor],
  );

  // --- Animation refs ----------------------------------------------------
  // `groupRef` carries the grow scale tween; the inner `tiltGroupRef`
  // carries the mortgage tilt + unmortgage snap-back, so the two
  // animations never interfere (scale and rotation are orthogonal).
  const groupRef = useRef<THREE.Group | null>(null);
  const tiltGroupRef = useRef<THREE.Group | null>(null);

  // FX bus for the one-shot DUST_PUFF on grow tweens. Optional because
  // <Building> may be rendered in test contexts without an FXLayerProvider
  // in the tree; the optional variant returns null in that case and we
  // fall back to the console.debug observation contract.
  const fxBus = useFXBusOptional();

  // Grow tween bookkeeping. `lastGrowTsRef` deduplicates re-renders that
  // forward the same event object so a single Supabase update produces
  // exactly one tween + DUST_PUFF per BUILDING_GROW (Req 5.6 / 10.7).
  // We store the `clock.elapsedTime` at which the tween started rather
  // than wall-clock time — so animation timing is deterministic and
  // unit tests can fast-forward by simulating useFrame ticks.
  const lastGrowTsRef = useRef<number | null>(null);
  const growStartElapsedRef = useRef<number | null>(null);
  const growArmedRef = useRef(false);

  // Unmortgage snap-back bookkeeping. Same pattern as the grow tween:
  // store the elapsed-time start instead of a wall-clock timestamp.
  const prevMortgagedRef = useRef<boolean>(isMortgaged);
  const unmortgageArmedRef = useRef(false);
  const unmortgageStartElapsedRef = useRef<number | null>(null);

  // Arm a grow tween whenever the consumer forwards a new `ts`. We only
  // record that the tween needs to start; the actual elapsed-time anchor
  // is captured in the next `useFrame` tick so the animation is clock-
  // driven rather than wall-clock-driven.
  useEffect(() => {
    const ts = growEvent?.ts;
    if (ts !== undefined && ts !== lastGrowTsRef.current) {
      lastGrowTsRef.current = ts;
      growArmedRef.current = true;
      // Reset any in-flight tween so the new event always plays from 0.
      growStartElapsedRef.current = null;
    }
  }, [growEvent?.ts]);

  // Detect the `true → false` mortgage flip and arm the snap-back tween.
  useEffect(() => {
    if (prevMortgagedRef.current === true && isMortgaged === false) {
      unmortgageArmedRef.current = true;
      unmortgageStartElapsedRef.current = null;
    }
    prevMortgagedRef.current = isMortgaged;
  }, [isMortgaged]);

  // --- Per-frame animation -----------------------------------------------
  useFrame((state) => {
    const now = state.clock.elapsedTime;

    // --- Grow tween: scale 0 → 1 with elastic overshoot ----------------
    if (groupRef.current) {
      if (growArmedRef.current && growStartElapsedRef.current === null) {
        // First frame after arming: capture the elapsed-time anchor and
        // dispatch the one-shot DUST_PUFF.
        growStartElapsedRef.current = now;
        growArmedRef.current = false;

        // Compute the dust origin in the tile's local frame. The puff
        // sits slightly above the tile surface and back from the curb
        // so it reads as kicked-up dust around the new building's base.
        const dustOrigin = { x: 0, y: 0.25, z: -0.4 };

        if (fxBus !== null) {
          // Real dispatch — pool exhaustion is a soft no-op handled by
          // the FX bus itself (Req 11.3). The grow tween proceeds
          // regardless of whether the puff actually played.
          fxBus.play({
            kind: 'DUST_PUFF',
            origin: dustOrigin,
            color: ownerColor ?? undefined,
          });
        } else {
          // No FXLayerProvider in the tree (e.g. unit tests). Logged at
          // debug level so spies can still observe the dispatch
          // contract without depending on the provider being mounted.
          // eslint-disable-next-line no-console
          console.debug('[Building] grow DUST_PUFF', {
            tileIndex: props.tileIndex,
          });
        }
      }

      if (growStartElapsedRef.current !== null) {
        const elapsedMs = (now - growStartElapsedRef.current) * 1000;
        const durationMs = durationFor(
          { kind: 'building_grow' },
          reducedMotion,
        );
        if (elapsedMs >= durationMs || durationMs <= 0) {
          groupRef.current.scale.set(1, 1, 1);
          growStartElapsedRef.current = null;
        } else {
          const t = elapsedMs / durationMs;
          // Reduced-motion: a flat linear ramp so the cap stays inside
          // 200ms without an elastic overshoot that would feel jarring
          // under that accessibility setting (Req 12.2).
          const scale = reducedMotion ? t : easeOutElastic(t);
          groupRef.current.scale.set(scale, scale, scale);
        }
      } else if (!growArmedRef.current) {
        // Steady-state: keep the wrapper at full scale.
        groupRef.current.scale.set(1, 1, 1);
      }
    }

    // --- Mortgage tilt + unmortgage snap-back --------------------------
    if (tiltGroupRef.current) {
      if (unmortgageArmedRef.current && unmortgageStartElapsedRef.current === null) {
        unmortgageStartElapsedRef.current = now;
        unmortgageArmedRef.current = false;
      }

      if (unmortgageStartElapsedRef.current !== null) {
        const elapsedMs =
          (now - unmortgageStartElapsedRef.current) * 1000;
        const durationMs = durationFor(
          { kind: 'building_unmortgage' },
          reducedMotion,
        );
        if (elapsedMs >= durationMs || durationMs <= 0) {
          tiltGroupRef.current.rotation.set(0, 0, 0);
          unmortgageStartElapsedRef.current = null;
        } else {
          // Cubic ease-out from MORTGAGE_TILT to (0, 0, 0).
          const t = elapsedMs / durationMs;
          const eased = 1 - Math.pow(1 - t, 3);
          const k = 1 - eased;
          tiltGroupRef.current.rotation.set(
            MORTGAGE_TILT[0] * k,
            MORTGAGE_TILT[1] * k,
            MORTGAGE_TILT[2] * k,
          );
        }
      } else {
        // Steady-state: full tilt iff currently mortgaged, else upright.
        if (isMortgaged) {
          tiltGroupRef.current.rotation.set(
            MORTGAGE_TILT[0],
            MORTGAGE_TILT[1],
            MORTGAGE_TILT[2],
          );
        } else {
          tiltGroupRef.current.rotation.set(0, 0, 0);
        }
      }
    }
  });

  // --- Render -------------------------------------------------------------
  if (kind.kind === 'empty') {
    return null;
  }

  const desaturated = kind.kind === 'mortgaged';
  // When mortgaged, fall back to the underlying kind so the render switch
  // below covers exactly the four "concrete" branches.
  const drawKind = kind.kind === 'mortgaged' ? underlyingKind : kind;

  let inner: React.ReactNode = null;
  if (drawKind.kind === 'terrain') {
    inner = (
      <TerrainBadge
        color={
          desaturated
            ? MORTGAGED_COLOR
            : ownerColor ?? '#9ca3af'
        }
      />
    );
  } else if (drawKind.kind === 'house') {
    const slots = houseSlotPositions(drawKind.count);
    inner = (
      <>
        {slots.map((slot, i) => (
          <group key={i} position={[slot.x, HOUSE_Y, slot.z]}>
            <HouseMesh lod={lod} desaturated={desaturated} />
          </group>
        ))}
      </>
    );
  } else if (drawKind.kind === 'hotel') {
    inner = (
      <group position={[0, HOTEL_Y, -0.4]}>
        <HotelMesh desaturated={desaturated} />
      </group>
    );
  }
  // `drawKind.kind === 'empty'` falls through with `inner === null`. This
  // only happens in the pathological case of a mortgaged tile with no
  // owner and zero houses; we still render the chain overlay below so the
  // mortgage state is visible somehow.

  return (
    <group ref={groupRef}>
      <group ref={tiltGroupRef}>
        {inner}
        {kind.kind === 'mortgaged' && <ChainedIcon />}
      </group>
    </group>
  );
}
