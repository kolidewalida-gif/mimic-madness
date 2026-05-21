/**
 * BoardZone.tsx — task 8.3
 *
 * Renders one of the 12 MimicPoly board zones (8 color groups + 4 corners)
 * as a self-contained 3D subtree. Each zone owns:
 *
 *   1. **One zone-specific point light** placed at the centroid of the
 *      zone's tile positions, coloured from `ZONE_PALETTES[zoneKey].light`.
 *      Provides the "warm tint" half of the cartoon-premium lighting from
 *      Requirement 1.4.
 *
 *   2. **At least one `<ZoneDecor>` instance** at the centroid (inset
 *      slightly toward the board centre so it doesn't clip into a tile).
 *      Each zone uses the variant declared in its palette
 *      (`palette.decor`), satisfying Requirements 2.2 / 2.3.
 *
 *   3. **A `<MonopolyAccentRing>` around every tile in the zone** when the
 *      active player owns the entire color group, per
 *      `playerOwnsAllInGroup` from `@/lib/monopolyOwnership`. The ring is a
 *      flat, glowing torus pulsed via `useFrame` and coloured from
 *      `TOKEN_COLORS[player.token_type]` (passed through as
 *      `activePlayerColor`). This is the visual half of the "monopole"
 *      ownership feedback referenced by Requirements 3.7 / 8.4.
 *
 *      Corner zones never light their accent ring: they have no concept of
 *      a color-group monopoly. The component short-circuits the predicate
 *      for `corner_*` zone keys by guarding with {@link isColorGroupZone}.
 *
 * Pure rendering. The component performs no Supabase reads/writes, no audio
 * playback, and never dispatches to the FX bus. It receives a snapshot of
 * `properties` plus the active-player context and re-renders deterministically
 * — two clients with the same props see the exact same scene.
 *
 * Reduced motion. The accent ring's emissive pulse is the only animator
 * inside this file. When `reducedMotion === true` the `useFrame` body
 * short-circuits before mutating the material, so the ring stays at its
 * `ACCENT_RING_BASE_INTENSITY` (0.6). The decor's idle animations live
 * inside `<ZoneDecor>` and consult `useMonopolyVisualSettings()` directly.
 *
 * Validates: Requirements 1.4, 2.2, 2.3, 3.7, 8.4
 */

import * as React from 'react';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import {
  BOARD_SPACES,
  getBoardPosition,
  type PropertyGroup,
} from '@/lib/monopolyBoard';
import {
  ZONE_PALETTES,
  type ZoneKey,
  type ZonePalette,
} from '@/lib/monopolyZones';
import { playerOwnsAllInGroup } from '@/lib/monopolyOwnership';

import { ZoneDecor } from './ZoneDecor';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Public props for `<BoardZone>`.
 *
 * `properties` is intentionally typed structurally (rather than re-using
 * the full `MonopolyProperty` row from the game-state layer) so this
 * visual component does not depend on Supabase types. It carries the
 * minimal subset that {@link playerOwnsAllInGroup} reads.
 */
export interface BoardZoneProps {
  /** Which zone (color group or corner) this subtree represents. */
  zoneKey: ZoneKey;
  /** Currently-active player id, or `null` when nobody is acting. */
  activePlayerId: string | null;
  /**
   * Active player's accent color (`TOKEN_COLORS[token_type]`), or `null`
   * when there is no active player. Used as the accent-ring color.
   */
  activePlayerColor: string | null;
  /**
   * Snapshot of every property's ownership row. Read-only — the
   * component never mutates it.
   */
  properties: ReadonlyArray<{
    property_index: number;
    owner_id: string | null;
  }>;
  /**
   * When `true`, the accent-ring pulse animator short-circuits and the
   * ring renders at its steady-state intensity. Defaults to `false`.
   */
  reducedMotion?: boolean;
}

// ---------------------------------------------------------------------------
// Tile-index resolution
// ---------------------------------------------------------------------------

/**
 * Hard-coded corner tile indices, mirroring the `CORNER_ZONES` table in
 * `monopolyZones.ts`. Kept as a separate constant so the switch in
 * {@link zoneTileIndices} stays branch-free for the common case.
 */
const CORNER_TILE_INDICES: Readonly<Partial<Record<ZoneKey, readonly number[]>>> = {
  corner_go: [0],
  corner_jail: [10],
  corner_free: [20],
  corner_gtj: [30],
};

/**
 * Set of `ZoneKey`s that map onto a `PropertyGroup` (the 8 color groups).
 * Used to gate the `playerOwnsAllInGroup` call: corner zones are never a
 * "monopoly" and never light up the accent ring.
 */
const COLOR_GROUP_ZONE_KEYS: ReadonlySet<ZoneKey> = new Set<ZoneKey>([
  'brown',
  'lightblue',
  'pink',
  'orange',
  'red',
  'yellow',
  'green',
  'darkblue',
]);

/** Returns `true` iff `zoneKey` is one of the 8 color-group zones. */
function isColorGroupZone(zoneKey: ZoneKey): boolean {
  return COLOR_GROUP_ZONE_KEYS.has(zoneKey);
}

/**
 * Resolve the tile indices that belong to `zoneKey`.
 *
 * - Corner zones return their single corner index (`[0]`, `[10]`, `[20]`,
 *   or `[30]`) — see {@link CORNER_TILE_INDICES}.
 * - Color-group zones filter `BOARD_SPACES` by `space.group === zoneKey`.
 *   The lowercase color keys in `ZoneKey` line up with `PropertyGroup`
 *   exactly, so no string transformation is needed.
 *
 * Pure: same `zoneKey` always yields the same array (the result is fed
 * into a `useMemo` so callers get referential stability).
 */
function zoneTileIndices(zoneKey: ZoneKey): number[] {
  const corner = CORNER_TILE_INDICES[zoneKey];
  if (corner !== undefined) return [...corner];
  return BOARD_SPACES.filter((s) => s.group === zoneKey).map((s) => s.index);
}

// ---------------------------------------------------------------------------
// Lighting + decor constants
// ---------------------------------------------------------------------------

/** Y-position of the zone point light above the board surface. */
const ZONE_LIGHT_Y = 1.5;
/** Intensity of the per-zone accent point light (Req 1.4). */
const ZONE_LIGHT_INTENSITY = 0.6;
/** Falloff distance of the per-zone accent point light. */
const ZONE_LIGHT_DISTANCE = 6;
/** Y-elevation for the single decor instance per zone. */
const DECOR_Y = 0.5;
/**
 * How far the decor mesh is inset from the board edge toward the centre,
 * in world units. Keeps the decor from clipping into the tile mesh while
 * still reading as "anchored to the zone".
 */
const DECOR_INSET = 0.7;

// ---------------------------------------------------------------------------
// Internal: <MonopolyAccentRing>
// ---------------------------------------------------------------------------

/** Steady-state emissive intensity (also the reduced-motion target). */
const ACCENT_RING_BASE_INTENSITY = 0.6;
/** Bottom of the pulsing emissive envelope in normal-motion mode. */
const ACCENT_RING_MIN_INTENSITY = 0.4;
/** Top of the pulsing emissive envelope in normal-motion mode. */
const ACCENT_RING_MAX_INTENSITY = 1.0;
/** Pulse period, in seconds, of the accent-ring sine driver. */
const ACCENT_RING_PERIOD_SEC = 1.5;
/** Constant material opacity (the ring fades via emissive intensity, not alpha). */
const ACCENT_RING_OPACITY = 0.7;
/** Major radius of the torus, sized just inside the tile footprint. */
const ACCENT_RING_RADIUS = 0.85;
/** Tube radius — kept thin so the ring reads as a glow, not a halo. */
const ACCENT_RING_TUBE = 0.04;
/** Y-elevation above the board surface; just above tile decals to avoid z-fighting. */
const ACCENT_RING_Y = 0.06;

/**
 * Internal props for the per-tile accent ring. Not exported — callers
 * should drive the ring through `<BoardZone>` so the ownership predicate
 * stays the single source of truth (Req 8.4).
 */
interface MonopolyAccentRingProps {
  tileIndex: number;
  color: string;
  reducedMotion: boolean;
}

/**
 * Thin glowing torus laid flat above a board tile, emissive-pulsed on a
 * 1.5 s sine cycle between 0.4 and 1.0. The pulse is implemented via the
 * standard material's `emissiveIntensity` rather than via an opacity
 * tween so the ring's silhouette stays crisp at every phase — the user
 * always perceives it as a continuous loop.
 *
 * Reduced-motion path: `useFrame` short-circuits before mutating the
 * material reference, leaving `emissiveIntensity` at the
 * {@link ACCENT_RING_BASE_INTENSITY} value set at construction time.
 *
 * Position is derived from `getBoardPosition(tileIndex)`, the same
 * helper that places `<Tile>` and `<PlayerToken>` meshes, so the ring is
 * always centred over the tile regardless of camera orientation.
 */
function MonopolyAccentRing(
  props: MonopolyAccentRingProps,
): React.ReactElement {
  const { tileIndex, color, reducedMotion } = props;

  const matRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const pos = useMemo(() => getBoardPosition(tileIndex), [tileIndex]);
  // Memoize the THREE.Color so re-renders don't allocate a new instance
  // on every frame. Both the diffuse and emissive channels share it.
  const ringColor = useMemo(() => new THREE.Color(color), [color]);

  useFrame((state) => {
    // Reduced motion freezes the pulse at the base intensity. We never
    // touch the material in this branch so the steady-state value
    // assigned via JSX persists for the lifetime of the component.
    if (reducedMotion) return;
    const mat = matRef.current;
    if (mat === null) return;

    const t = state.clock.elapsedTime;
    const phase = (t / ACCENT_RING_PERIOD_SEC) * 2 * Math.PI;
    // Map sin ∈ [-1, 1] to k ∈ [0, 1] then to the documented intensity
    // envelope [MIN, MAX]. Order matters: we compute k first so the
    // (MAX - MIN) constant folds at module load time.
    const k = 0.5 + 0.5 * Math.sin(phase);
    mat.emissiveIntensity =
      ACCENT_RING_MIN_INTENSITY +
      (ACCENT_RING_MAX_INTENSITY - ACCENT_RING_MIN_INTENSITY) * k;
  });

  return (
    <mesh
      position={[pos.x, ACCENT_RING_Y, pos.z]}
      rotation={[Math.PI / 2, 0, 0]}
    >
      <torusGeometry args={[ACCENT_RING_RADIUS, ACCENT_RING_TUBE, 8, 32]} />
      <meshStandardMaterial
        ref={matRef}
        color={ringColor}
        emissive={ringColor}
        emissiveIntensity={ACCENT_RING_BASE_INTENSITY}
        transparent
        opacity={ACCENT_RING_OPACITY}
        toneMapped={false}
      />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// <BoardZone> public component
// ---------------------------------------------------------------------------

/**
 * Composes one MimicPoly zone — point light + decor + (optional) accent
 * rings — based on `zoneKey` and the current ownership / active-player
 * context. See the file-level docstring for the rendering contract.
 *
 * Returns `null` when the zone resolves to zero tiles. This guards against
 * future widening of `ZoneKey` (e.g. an out-of-band key) and keeps the
 * subtree honest: a zone with no tiles has nowhere to anchor a light or
 * decor instance.
 */
export function BoardZone(props: BoardZoneProps): React.ReactElement | null {
  const {
    zoneKey,
    activePlayerId,
    activePlayerColor,
    properties,
    reducedMotion = false,
  } = props;

  // Stable handle on the zone's palette. ZONE_PALETTES is a total
  // `Record<ZoneKey, ZonePalette>` so this is always defined — the
  // explicit type annotation guards against future palette changes.
  const palette: ZonePalette = ZONE_PALETTES[zoneKey];

  // ---- All hooks below this point run on every render, regardless of
  // any short-circuit return further down. Keeping their order stable
  // avoids the React "rendered fewer hooks than expected" violation.

  const tileIndices = useMemo(() => zoneTileIndices(zoneKey), [zoneKey]);

  // Centroid of the zone's tile positions. Used for both the point light
  // and (after a small inset) the decor placement.
  const centroid = useMemo(() => {
    if (tileIndices.length === 0) return { x: 0, z: 0 };
    let sx = 0;
    let sz = 0;
    for (const idx of tileIndices) {
      const pos = getBoardPosition(idx);
      sx += pos.x;
      sz += pos.z;
    }
    return { x: sx / tileIndices.length, z: sz / tileIndices.length };
  }, [tileIndices]);

  // Inset the decor toward the board centre so it doesn't sit on top of
  // the tile mesh. When the centroid is at the origin (degenerate case)
  // we leave the decor at the origin too.
  const decorPos = useMemo<[number, number, number]>(() => {
    const len = Math.hypot(centroid.x, centroid.z);
    if (len === 0) return [centroid.x, DECOR_Y, centroid.z];
    const ux = centroid.x / len;
    const uz = centroid.z / len;
    return [centroid.x - ux * DECOR_INSET, DECOR_Y, centroid.z - uz * DECOR_INSET];
  }, [centroid]);

  // Ownership flag drives the accent rings. Corner zones short-circuit
  // before calling the predicate (no monopoly concept). When the zone
  // is a color group, we forward the predicate result verbatim — the
  // accent ring is the single visual surface (alongside the property
  // panel's `MONOPOLE` stamp) that depends on this flag.
  const ownsAll = useMemo(() => {
    if (!isColorGroupZone(zoneKey)) return false;
    if (activePlayerId === null || activePlayerId.length === 0) return false;
    return playerOwnsAllInGroup(
      { properties },
      activePlayerId,
      zoneKey as PropertyGroup,
    );
  }, [zoneKey, activePlayerId, properties]);

  // ---- End of unconditional hook block. The early return below is
  // safe because every hook above runs on every render path.
  if (tileIndices.length === 0) {
    return null;
  }

  const showAccentRings = ownsAll && activePlayerColor !== null;

  return (
    <group>
      {/* Per-zone accent point light — colour from palette.light, fixed
          intensity and falloff per Req 1.4. */}
      <pointLight
        position={[centroid.x, ZONE_LIGHT_Y, centroid.z]}
        color={palette.light}
        intensity={ZONE_LIGHT_INTENSITY}
        distance={ZONE_LIGHT_DISTANCE}
        decay={2}
      />

      {/* Single animated decor mesh per zone. ZoneDecor reads
          reducedMotion from `useMonopolyVisualSettings` itself, so the
          provider context already enforces Property 6 here. */}
      <ZoneDecor
        variant={palette.decor}
        palette={palette}
        position={decorPos}
      />

      {/* Accent rings — one per tile — only when the active player owns
          the entire color group AND we have a token color to drive the
          ring's emissive material. Corner zones never reach this branch
          because `ownsAll` is hard-`false` for them. */}
      {showAccentRings &&
        tileIndices.map((idx) => (
          <MonopolyAccentRing
            key={idx}
            tileIndex={idx}
            color={activePlayerColor as string}
            reducedMotion={reducedMotion}
          />
        ))}
    </group>
  );
}

export default BoardZone;
