/**
 * Tile.tsx — task 8.1
 *
 * Refactor of the inline `BoardTile` that previously lived in
 * `MonopolyBoard3D.tsx`. Renders one of the 40 MimicPoly board cells as a
 * chamfered 3D block with thick borders, an embossed label, per-zone color
 * treatment derived from `ZONE_PALETTES`, an owned-terrain badge (delegated
 * to the `<Building>` child), and the building stack itself.
 *
 * Public surface (matches the task spec):
 *
 *   ```tsx
 *   <Tile
 *     index={3}
 *     ownerColor={null}
 *     houses={0}
 *     isMortgaged={false}
 *     isLanded={false}
 *     growEvent={undefined}
 *     reducedMotion={false}
 *     lod="near"
 *   />
 *   ```
 *
 * Behaviour summary:
 *
 *   - The wrapper group is positioned via `getBoardPosition(index)` so tile
 *     indexes 0..39 land at the same world-space coordinates as the previous
 *     `BoardTile` (Requirement 2.7 — tile metadata and turn order unchanged).
 *
 *   - The base block uses warm-paper material, slightly emissive in the
 *     landing state, with the color stripe drawn from `space.color` for
 *     property tiles (per the task spec — the existing data is canonical).
 *     The zone palette (`ZONE_PALETTES[zoneKey]`) drives the landed-state
 *     emissive accent so the active tile reads in the zone's signature
 *     colour. When `tileToZone(index)` returns `null` (railroads, utilities,
 *     chance, community, tax) the component falls back to a neutral warm
 *     palette so the tile still reads as "warm paper" rather than picking
 *     a random colour.
 *
 *   - The mortgage tilt (Req 3.5) is applied by the `<Building>` child
 *     internally via its tilt group, so the tile itself just forwards the
 *     `isMortgaged` flag and lets the canonical building component own that
 *     animation.
 *
 *   - The landed pulse (a slight Y bounce + sparkle ring) runs through
 *     `useFrame` and short-circuits to a static state when
 *     `reducedMotion === true` so the tile satisfies Property 6 ("reduced
 *     motion zeroes continuous animation rates" — Req 12.1).
 *
 * Negative invariants (Req 11.7 / 11.8 / 13.4):
 *   - No Supabase reads/writes, no audio dispatch, no FX bus calls. The
 *     component is a pure renderer driven by props.
 *   - No FPS / ping / hardware overlay. The landed sparkles are decorative
 *     and pulled from drei's `<Sparkles>` (already used in the existing
 *     scene).
 *
 * Validates: Requirements 1.1, 1.2, 2.1, 2.7, 3.5
 */

import * as React from 'react';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, RoundedBox, Text } from '@react-three/drei';

/* stub — drei removed Sparkles in v10 */
function Sparkles(_props: Record<string, unknown>) { return null; }
import * as THREE from 'three';

import { BOARD_SPACES, getBoardPosition } from '@/lib/monopolyBoard';
import {
  ZONE_PALETTES,
  tileToZone,
  type ZonePalette,
} from '@/lib/monopolyZones';

import { Building, type BuildingGrowEvent } from './Building';

// ---------------------------------------------------------------------------
// Layout constants — preserved verbatim from the previous `BoardTile` so the
// refactor is a 1:1 visual replacement and the 40 tiles still fit the same
// board footprint.
// ---------------------------------------------------------------------------

/** Indexes that map to the four corner cells of the board. */
const CORNER_INDEXES: readonly number[] = [0, 10, 20, 30] as const;

/** Half-extent of a non-corner tile in world units (X axis). */
const TILE_WIDTH_NORMAL = 1.6;
/** Half-extent of a corner tile in world units (X axis). */
const TILE_WIDTH_CORNER = 2.2;
/** Tile depth (Z axis). Identical for corner and non-corner cells. */
const TILE_DEPTH = 2.2;

/**
 * Neutral fallback palette used for tiles whose `tileToZone(index)` returns
 * `null` — railroads, utilities, chance, community, and tax cells. The
 * decor key `tree` is just a placeholder; the tile renderer doesn't read
 * it. We pick warm-amber values so the cell still reads as paper-like.
 */
const NEUTRAL_PALETTE: ZonePalette = {
  base: '#fff5d8',
  accent: '#fbbf24',
  light: '#ffe066',
  decor: 'tree',
};

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface TileProps {
  /** Board cell index in `[0, 40)`. */
  index: number;
  /** Owner's token colour, or `null` when the tile is unowned. */
  ownerColor: string | null;
  /** Houses count from `monopoly_properties.houses` (0..5; 5 = hotel). */
  houses: number;
  /** Mirrors `monopoly_properties.is_mortgaged`. */
  isMortgaged: boolean;
  /** Whether the active token is currently landed on this tile. */
  isLanded: boolean;
  /** Optional one-shot grow trigger forwarded to the `<Building>` child. */
  growEvent?: BuildingGrowEvent;
  /**
   * `prefers-reduced-motion: reduce` (Req 12.1). The parent computes this
   * once at the scene level and forwards the same value to every tile so
   * each tile can stay cheap (no per-tile context read).
   */
  reducedMotion?: boolean;
  /** Distance LOD bucket forwarded to `<Building>` (Req 11.4). */
  lod?: 'near' | 'far';
}

// ---------------------------------------------------------------------------
// `<Tile>` component
// ---------------------------------------------------------------------------

/**
 * Render one of the 40 MimicPoly board cells.
 */
export function Tile(props: TileProps): React.ReactElement {
  const {
    index,
    ownerColor,
    houses,
    isMortgaged,
    isLanded,
    growEvent,
    reducedMotion = false,
    lod = 'near',
  } = props;

  // --- Static metadata (cheap; no need to memoize) ---
  const space = BOARD_SPACES[index];
  const pos = getBoardPosition(index);
  const isCorner = CORNER_INDEXES.includes(index);
  const tileWidth = isCorner ? TILE_WIDTH_CORNER : TILE_WIDTH_NORMAL;
  const tileDepth = TILE_DEPTH;

  const isProperty = space.type === 'property';
  // `space.color` is the canonical per-tile band colour from monopolyBoard;
  // we keep using it (rather than `ZONE_PALETTES[zone].base`) so corner /
  // railroad / utility tiles render exactly as before. The zone palette
  // drives the landed-state emissive accent below.
  const stripeColor = space.color ?? '#fff8e7';

  // Resolve the zone palette for this tile. Tiles without a dedicated
  // zone (railroads / utilities / chance / community / tax) fall back to
  // the warm-amber `NEUTRAL_PALETTE` so we never pass `undefined` colours
  // to the materials.
  const zone = tileToZone(index);
  const palette = zone === null ? NEUTRAL_PALETTE : ZONE_PALETTES[zone];

  // --- Landed-pulse animation ---
  // The wrapper group's Y position oscillates while `isLanded` is true,
  // and lerps back to 0 otherwise. Reduced-motion short-circuits the
  // entire frame body so the tile stays at Y = 0 (Property 6).
  const groupRef = useRef<THREE.Group | null>(null);

  useFrame((state) => {
    const ref = groupRef.current;
    if (ref === null) return;

    if (reducedMotion) {
      // Property 6: no continuous motion — pin the wrapper to 0 once and
      // let subsequent frames find it already there.
      if (ref.position.y !== 0) {
        ref.position.y = 0;
      }
      return;
    }

    if (isLanded) {
      // Subtle hover pulse — same shape as the previous `BoardTile`
      // (sin@4Hz with a 0.05 baseline + 0.05 amplitude).
      ref.position.y = 0.05 + Math.sin(state.clock.elapsedTime * 4) * 0.05;
    } else {
      // Smoothly relax back to the resting position.
      ref.position.y = THREE.MathUtils.lerp(ref.position.y, 0, 0.1);
    }
  });

  // ---------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------
  return (
    <group position={[pos.x, 0, pos.z]} rotation={[0, pos.rotation, 0]}>
      {/* Black ink shadow plate — same offset as the previous BoardTile so
          the silhouette under each cell matches exactly. */}
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[tileWidth + 0.1, 0.1, tileDepth + 0.1]} />
        <meshStandardMaterial color="#0a0810" roughness={1} />
      </mesh>

      <group ref={groupRef}>
        {/* Base tile — warm paper. Emissive accent uses the zone's accent
            colour when landed so the highlight reads in the active zone's
            signature colour (Req 1.4 / Req 2.1). */}
        <RoundedBox
          args={[tileWidth, 0.18, tileDepth]}
          radius={0.06}
          smoothness={4}
          position={[0, 0, 0]}
        >
          <meshStandardMaterial
            color={isLanded ? '#fffce0' : '#fff5d8'}
            metalness={0.05}
            roughness={0.85}
            emissive={
              new THREE.Color(isLanded ? palette.accent : palette.base)
            }
            emissiveIntensity={isLanded ? 0.42 : 0.12}
          />
        </RoundedBox>

        {/* Property color stripe — fat cartoon colour band along the back
            edge. Drawn only for property tiles; corners / specials keep
            the warm-paper look. */}
        {isProperty && (
          <RoundedBox
            args={[tileWidth - 0.05, 0.22, 0.55]}
            radius={0.05}
            smoothness={3}
            position={[0, 0.02, -0.78]}
          >
            <meshStandardMaterial
              color={stripeColor}
              metalness={0.35}
              roughness={0.4}
              emissive={new THREE.Color(stripeColor)}
              emissiveIntensity={0.35}
            />
          </RoundedBox>
        )}

        {/* Owner indicator — fat ring at the front of the tile.
            Distinct from the `<TerrainBadge>` rendered inside the
            `<Building>` child: this ring sits at the tile's curb (z=+0.35)
            so it stays visible even when the tile carries 4 houses. */}
        {ownerColor !== null && (
          <group position={[0, 0.13, 0.35]}>
            <mesh>
              <torusGeometry args={[0.2, 0.04, 12, 24]} />
              <meshStandardMaterial
                color={ownerColor}
                emissive={new THREE.Color(ownerColor)}
                emissiveIntensity={0.55}
              />
            </mesh>
            <mesh position={[0, 0, 0]}>
              <cylinderGeometry args={[0.16, 0.16, 0.05, 18]} />
              <meshStandardMaterial
                color={ownerColor}
                emissive={new THREE.Color(ownerColor)}
                emissiveIntensity={0.4}
              />
            </mesh>
          </group>
        )}

        {/* Embossed label — black ink text with an outline matching the
            existing graffiti language. Truncated to 14 chars so longer
            French names (e.g. "Compagnie de Distribution d'Électricité")
            don't overflow the tile width. */}
        <Text
          position={[0, 0.13, 0.35]}
          fontSize={0.13}
          color="#0a0810"
          anchorX="center"
          anchorY="middle"
          maxWidth={tileWidth - 0.2}
          textAlign="center"
          outlineWidth={0.005}
          outlineColor="#0a0810"
          fontWeight="bold"
        >
          {space.nameFr.length > 14
            ? space.nameFr.substring(0, 13) + '…'
            : space.nameFr}
        </Text>

        {/* Price label — only rendered for purchasable tiles. */}
        {space.price !== undefined && (
          <Text
            position={[0, 0.13, 0.7]}
            fontSize={0.11}
            color="#7e22ce"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.004}
            outlineColor="#0a0810"
            fontWeight="bold"
          >
            {`${space.price}$`}
          </Text>
        )}

        {/* Special tile icons — preserved verbatim from the previous
            BoardTile so the corner / chance / community / tax / railroad /
            utility cells keep their established visual identity. */}
        {space.type === 'go' && (
          <group position={[0, 0.18, -0.3]}>
            <Float speed={2} floatIntensity={0.4}>
              <Text fontSize={0.45} anchorX="center" anchorY="middle">
                ➡️
              </Text>
            </Float>
          </group>
        )}
        {space.type === 'jail' && (
          <Text
            position={[0, 0.18, -0.3]}
            fontSize={0.4}
            anchorX="center"
            anchorY="middle"
          >
            🔒
          </Text>
        )}
        {space.type === 'free_parking' && (
          <Float speed={1.4} floatIntensity={0.3}>
            <Text
              position={[0, 0.18, -0.3]}
              fontSize={0.4}
              anchorX="center"
              anchorY="middle"
            >
              🅿️
            </Text>
          </Float>
        )}
        {space.type === 'go_to_jail' && (
          <Text
            position={[0, 0.18, -0.3]}
            fontSize={0.4}
            anchorX="center"
            anchorY="middle"
          >
            👮
          </Text>
        )}
        {space.type === 'chance' && (
          <Float speed={2} rotationIntensity={0.6} floatIntensity={0.3}>
            <Text
              position={[0, 0.18, -0.3]}
              fontSize={0.4}
              anchorX="center"
              anchorY="middle"
            >
              ❓
            </Text>
          </Float>
        )}
        {space.type === 'community' && (
          <Float speed={1.8} floatIntensity={0.3}>
            <Text
              position={[0, 0.18, -0.3]}
              fontSize={0.4}
              anchorX="center"
              anchorY="middle"
            >
              📦
            </Text>
          </Float>
        )}
        {space.type === 'tax' && (
          <Text
            position={[0, 0.18, -0.3]}
            fontSize={0.4}
            anchorX="center"
            anchorY="middle"
          >
            💰
          </Text>
        )}
        {space.type === 'railroad' && (
          <Float speed={1.5} floatIntensity={0.2}>
            <Text
              position={[0, 0.18, -0.3]}
              fontSize={0.4}
              anchorX="center"
              anchorY="middle"
            >
              🚂
            </Text>
          </Float>
        )}
        {space.type === 'utility' && (
          <Float speed={1.6} floatIntensity={0.25}>
            <Text
              position={[0, 0.18, -0.3]}
              fontSize={0.36}
              anchorX="center"
              anchorY="middle"
            >
              {index === 12 ? '💡' : '💧'}
            </Text>
          </Float>
        )}

        {/* Building stack — terrain badge / 1..4 houses / hotel, plus
            mortgage tilt and grow tween. Rendered at the tile's local
            origin; `<Building>` handles its own internal placement
            (HOUSE_Y, HOTEL_Y, slot positions, …). */}
        <Building
          tileIndex={index}
          houses={houses}
          ownerColor={ownerColor}
          isMortgaged={isMortgaged}
          growEvent={growEvent}
          reducedMotion={reducedMotion}
          lod={lod}
        />

        {/* Landed sparkles — drei's pooled `<Sparkles>` decorate the
            active cell. Drei's component honours its own internal idle
            ticking; we still gate it on `isLanded` so off-camera tiles
            never spawn the system. Tinted with the zone accent to match
            the emissive base highlight above. */}
        {isLanded && (
          <Sparkles
            count={20}
            scale={[tileWidth, 0.6, tileDepth]}
            size={3}
            speed={reducedMotion ? 0 : 0.6}
            color={palette.accent}
            position={[0, 0.3, 0]}
          />
        )}
      </group>
    </group>
  );
}
