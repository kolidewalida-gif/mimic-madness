/**
 * ZoneDecor.tsx — animated cartoon decor meshes for the 12 board zones.
 *
 * Each `<BoardZone>` mounts at least one `<ZoneDecor>` whose `variant` is
 * read directly from `ZONE_PALETTES[zoneKey].decor`. The 11 distinct decor
 * kinds (`tree` is shared between the yellow and green color groups, giving
 * 12 zones / 11 variants) are:
 *
 *   - `lamppost`       — brown   : tall post + glowing bulb (emissive pulse).
 *   - `fountain`       — lightblue : ring base + bobbing water droplet.
 *   - `neonsign`       — pink    : flat sign with `MeshBasicMaterial` blink.
 *   - `bench`          — orange  : two-leg bench with a slow x-rotation sway.
 *   - `minicar`        — red     : small cartoon car with a y-axis hop.
 *   - `tree`           — yellow / green : trunk + foliage sphere, slow rotate
 *                       + sway (same mesh, same rate for both zones).
 *   - `spotlight`      — darkblue: cone beam + base, slow y-rotate.
 *   - `go_arrow_neon`  — corner GO   : extruded arrow with emissive blink.
 *   - `jail_bars`      — corner JAIL : 4 vertical red bars (static
 *                       silhouette + subtle emissive flicker).
 *   - `parking_neon`   — corner FREE : "P" sign with neon emissive pulse.
 *   - `gtj_lights`     — corner GTJ  : 3 traffic-light spheres in
 *                       red / yellow / green that blink in turn.
 *
 * All idle animations are driven by `useFrame` with sin / cos drivers
 * scaled by a per-variant rate (Hz). The rate is returned by the pure
 * helper {@link decorRateUnder}, which yields exactly `0` when
 * `reducedMotion === true` — satisfying Property 6 ("Reduced motion zeroes
 * continuous animation rates", Req 12.1, 7.8).
 *
 * Negative invariants:
 *   - When `useMonopolyVisualSettings().reducedMotion` is true, every
 *     animator's `useFrame` body short-circuits **before** mutating any
 *     mesh transform / material uniform. The decor therefore stays at its
 *     base pose and no sin/cos drift is observable on screen.
 *   - The component performs no I/O, no Supabase reads, no audio. It is a
 *     pure rendering subtree consumed by `<BoardZone>`.
 *
 * Validates: Requirements 2.3, 2.6, 12.1
 */

import * as React from 'react';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

import type { ZonePalette } from '@/lib/monopolyZones';
import { useMonopolyVisualSettings } from './MonopolyVisualSettings';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Discriminated decor kind, mirroring `ZonePalette['decor']`. */
export type DecorVariant = ZonePalette['decor'];

/**
 * Public props for `<ZoneDecor>`.
 *
 * `position` is optional so unit tests / single-mount stories can render the
 * decor at the origin; `<BoardZone>` always supplies a meaningful tile-edge
 * position. The `palette` is forwarded so each variant can color itself
 * with its zone's accent / light colors instead of a hard-coded swatch.
 */
export interface ZoneDecorProps {
  variant: DecorVariant;
  position?: [number, number, number];
  palette: ZonePalette;
}

// ---------------------------------------------------------------------------
// Per-variant idle rate table (Hz)
// ---------------------------------------------------------------------------

/**
 * Canonical idle-animation rate (Hz) for every decor variant in
 * normal-motion mode. The rate is consumed inside `useFrame` as
 * `Math.sin(state.clock.elapsedTime * rate)` (or `* 2π * rate` for kinds
 * that prefer cycle-based phase math).
 *
 * Bands:
 *   - 0.4–0.8 Hz  → sway / hop / rotate (calm, ambient).
 *   - 0.5–1.5 Hz  → emissive pulse / blink (visible without being shouty).
 *
 * Exposed as a `Record<DecorVariant, number>` (rather than a closed table)
 * so the property test in task 4.4 can iterate every key and assert each
 * `decorRateUnder(variant, true) === 0`.
 */
export const DECOR_IDLE_RATES: Record<DecorVariant, number> = {
  lamppost: 0.6,
  fountain: 0.7,
  neonsign: 1.2,
  bench: 0.5,
  minicar: 0.8,
  tree: 0.4,
  spotlight: 0.45,
  go_arrow_neon: 1.0,
  jail_bars: 0.5,
  parking_neon: 0.9,
  gtj_lights: 0.8,
};

/**
 * Pure, deterministic idle-animation rate selector consumed by every
 * variant's `useFrame` driver.
 *
 * Returns:
 *   - `0` whenever `reducedMotion === true` (Property 6 — every
 *     continuous animator's rate must be exactly 0 under reduced motion).
 *   - `DECOR_IDLE_RATES[variant]` otherwise.
 *
 * Throws `RangeError` for an unknown variant so upstream wiring bugs
 * surface instead of silently animating at `undefined` Hz.
 *
 * Validates Requirement 12.1 / Property 6.
 */
export function decorRateUnder(
  variant: DecorVariant,
  reducedMotion: boolean,
): number {
  if (reducedMotion) return 0;
  const rate = DECOR_IDLE_RATES[variant];
  if (rate === undefined) {
    throw new RangeError(`decorRateUnder: unknown decor variant '${variant}'`);
  }
  return rate;
}

// ---------------------------------------------------------------------------
// Visual constants
// ---------------------------------------------------------------------------

/** Black "ink outline" colour reused by the existing scene aesthetic. */
const INK = '#0a0810';

/** Base emissive intensity used by every neon/glow variant. */
const NEON_BASE_INTENSITY = 0.6;
/** Peak emissive intensity at the top of the pulse. */
const NEON_PEAK_INTENSITY = 1.6;

// ---------------------------------------------------------------------------
// Variant: lamppost
// ---------------------------------------------------------------------------

function Lamppost({ palette }: { palette: ZonePalette }): React.ReactElement {
  const { reducedMotion } = useMonopolyVisualSettings();
  const bulbRef = useRef<THREE.MeshStandardMaterial | null>(null);

  useFrame((state) => {
    const rate = decorRateUnder('lamppost', reducedMotion);
    if (rate === 0) return; // Property 6: no mutation under reduced motion.
    if (!bulbRef.current) return;
    const t = state.clock.elapsedTime * rate;
    bulbRef.current.emissiveIntensity =
      NEON_BASE_INTENSITY + (Math.sin(t * 2 * Math.PI) * 0.5 + 0.5) *
        (NEON_PEAK_INTENSITY - NEON_BASE_INTENSITY);
  });

  return (
    <group>
      {/* Post */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 0.8, 10]} />
        <meshStandardMaterial color={INK} roughness={0.85} />
      </mesh>
      {/* Glowing bulb */}
      <mesh position={[0, 0.85, 0]}>
        <sphereGeometry args={[0.12, 16, 12]} />
        <meshStandardMaterial
          ref={bulbRef}
          color={palette.light}
          emissive={new THREE.Color(palette.light)}
          emissiveIntensity={NEON_BASE_INTENSITY}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Variant: fountain
// ---------------------------------------------------------------------------

function Fountain({ palette }: { palette: ZonePalette }): React.ReactElement {
  const { reducedMotion } = useMonopolyVisualSettings();
  const dropRef = useRef<THREE.Group | null>(null);

  useFrame((state) => {
    const rate = decorRateUnder('fountain', reducedMotion);
    if (rate === 0) return;
    if (!dropRef.current) return;
    const t = state.clock.elapsedTime * rate;
    // Smooth bob between [0.18, 0.32] (centered at 0.25).
    dropRef.current.position.y = 0.25 + Math.sin(t * 2 * Math.PI) * 0.07;
  });

  return (
    <group>
      {/* Ring base (torus) */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <torusGeometry args={[0.22, 0.05, 10, 24]} />
        <meshStandardMaterial color={palette.accent} roughness={0.5} />
      </mesh>
      {/* Bobbing water droplet */}
      <group ref={dropRef} position={[0, 0.25, 0]}>
        <mesh>
          <sphereGeometry args={[0.08, 14, 10]} />
          <meshStandardMaterial
            color={palette.light}
            emissive={new THREE.Color(palette.light)}
            emissiveIntensity={0.4}
            roughness={0.2}
          />
        </mesh>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Variant: neonsign
// ---------------------------------------------------------------------------

function NeonSign({ palette }: { palette: ZonePalette }): React.ReactElement {
  const { reducedMotion } = useMonopolyVisualSettings();
  const matRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const baseColor = React.useMemo(() => new THREE.Color(palette.accent), [palette.accent]);
  const peakColor = React.useMemo(() => new THREE.Color(palette.light), [palette.light]);

  useFrame((state) => {
    const rate = decorRateUnder('neonsign', reducedMotion);
    if (rate === 0) return;
    if (!matRef.current) return;
    const t = state.clock.elapsedTime * rate;
    const k = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI); // 0..1
    matRef.current.color.copy(baseColor).lerp(peakColor, k);
  });

  return (
    <group position={[0, 0.35, 0]}>
      <mesh>
        <planeGeometry args={[0.7, 0.2]} />
        <meshBasicMaterial
          ref={matRef}
          color={palette.accent}
          toneMapped={false}
        />
      </mesh>
      {/* Mounting post */}
      <mesh position={[0, -0.25, 0]}>
        <boxGeometry args={[0.05, 0.4, 0.05]} />
        <meshStandardMaterial color={INK} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Variant: bench
// ---------------------------------------------------------------------------

function Bench({ palette }: { palette: ZonePalette }): React.ReactElement {
  const { reducedMotion } = useMonopolyVisualSettings();
  const groupRef = useRef<THREE.Group | null>(null);

  useFrame((state) => {
    const rate = decorRateUnder('bench', reducedMotion);
    if (rate === 0) return;
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime * rate;
    // Gentle ±3.5° x-axis sway.
    groupRef.current.rotation.x = Math.sin(t * 2 * Math.PI) * 0.06;
  });

  return (
    <group ref={groupRef}>
      {/* Seat (brown plank coloured from the zone palette base) */}
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[0.5, 0.04, 0.16]} />
        <meshStandardMaterial color={palette.base} roughness={0.7} />
      </mesh>
      {/* Two legs */}
      <mesh position={[-0.18, 0.08, 0]}>
        <boxGeometry args={[0.04, 0.16, 0.04]} />
        <meshStandardMaterial color={INK} />
      </mesh>
      <mesh position={[0.18, 0.08, 0]}>
        <boxGeometry args={[0.04, 0.16, 0.04]} />
        <meshStandardMaterial color={INK} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Variant: minicar
// ---------------------------------------------------------------------------

function MiniCar({ palette }: { palette: ZonePalette }): React.ReactElement {
  const { reducedMotion } = useMonopolyVisualSettings();
  const groupRef = useRef<THREE.Group | null>(null);

  useFrame((state) => {
    const rate = decorRateUnder('minicar', reducedMotion);
    if (rate === 0) return;
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime * rate;
    // Hop: y-bounce in [0.10, 0.18]. Use abs(sin) to keep the car above
    // the ground plane every cycle.
    groupRef.current.position.y = 0.10 + Math.abs(Math.sin(t * 2 * Math.PI)) * 0.08;
  });

  return (
    <group ref={groupRef} position={[0, 0.10, 0]}>
      {/* Body */}
      <mesh>
        <boxGeometry args={[0.34, 0.12, 0.18]} />
        <meshStandardMaterial color={palette.accent} roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Cabin */}
      <mesh position={[0.02, 0.1, 0]}>
        <boxGeometry args={[0.18, 0.1, 0.16]} />
        <meshStandardMaterial color={palette.light} roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Wheels (4) */}
      {[
        [-0.11, -0.07, 0.09],
        [0.11, -0.07, 0.09],
        [-0.11, -0.07, -0.09],
        [0.11, -0.07, -0.09],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.04, 12]} />
          <meshStandardMaterial color={INK} />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Variant: tree
// ---------------------------------------------------------------------------

function Tree({ palette }: { palette: ZonePalette }): React.ReactElement {
  const { reducedMotion } = useMonopolyVisualSettings();
  const foliageRef = useRef<THREE.Group | null>(null);

  useFrame((state) => {
    const rate = decorRateUnder('tree', reducedMotion);
    if (rate === 0) return;
    if (!foliageRef.current) return;
    const t = state.clock.elapsedTime * rate;
    // Slow y-axis rotation + tiny x-axis sway.
    foliageRef.current.rotation.y = t * 2 * Math.PI * 0.15;
    foliageRef.current.rotation.x = Math.sin(t * 2 * Math.PI) * 0.04;
  });

  return (
    <group>
      {/* Trunk */}
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 0.36, 10]} />
        <meshStandardMaterial color="#7c4a1e" roughness={0.85} />
      </mesh>
      {/* Foliage */}
      <group ref={foliageRef} position={[0, 0.5, 0]}>
        <mesh>
          <sphereGeometry args={[0.22, 14, 12]} />
          <meshStandardMaterial
            color={palette.accent}
            emissive={new THREE.Color(palette.light)}
            emissiveIntensity={0.18}
            roughness={0.7}
          />
        </mesh>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Variant: spotlight
// ---------------------------------------------------------------------------

function Spotlight({ palette }: { palette: ZonePalette }): React.ReactElement {
  const { reducedMotion } = useMonopolyVisualSettings();
  const groupRef = useRef<THREE.Group | null>(null);

  useFrame((state) => {
    const rate = decorRateUnder('spotlight', reducedMotion);
    if (rate === 0) return;
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime * rate;
    // Slow y-axis rotation (full revolutions every ~2.2s at rate 0.45 Hz).
    groupRef.current.rotation.y = t * 2 * Math.PI;
  });

  return (
    <group ref={groupRef}>
      {/* Base */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.1, 12]} />
        <meshStandardMaterial color={INK} roughness={0.7} />
      </mesh>
      {/* Beam (cone tip pointing up-forward) */}
      <mesh position={[0, 0.35, 0.18]} rotation={[Math.PI / 2.5, 0, 0]}>
        <coneGeometry args={[0.18, 0.5, 16, 1, true]} />
        <meshBasicMaterial
          color={palette.light}
          transparent
          opacity={0.45}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Variant: go_arrow_neon
// ---------------------------------------------------------------------------

function GoArrowNeon({ palette }: { palette: ZonePalette }): React.ReactElement {
  const { reducedMotion } = useMonopolyVisualSettings();
  const matRef = useRef<THREE.MeshBasicMaterial | null>(null);

  useFrame((state) => {
    const rate = decorRateUnder('go_arrow_neon', reducedMotion);
    if (rate === 0) return;
    if (!matRef.current) return;
    const t = state.clock.elapsedTime * rate;
    // Square-wave-ish blink via |sin|, kept inside [0.5, 1] so it never
    // disappears (Req 12.5 — no full-screen flashing > 50% > 3 Hz; here we
    // stay at 1 Hz peak with non-zero floor).
    const k = 0.5 + 0.5 * Math.abs(Math.sin(t * Math.PI));
    matRef.current.opacity = k;
  });

  return (
    <group position={[0, 0.3, 0]}>
      {/* Arrow shaft */}
      <mesh>
        <boxGeometry args={[0.5, 0.12, 0.04]} />
        <meshBasicMaterial
          ref={matRef}
          color={palette.light}
          toneMapped={false}
          transparent
          opacity={1}
        />
      </mesh>
      {/* Arrow head (triangle prism via thin cone laid on its side) */}
      <mesh position={[0.32, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.14, 0.2, 3]} />
        <meshBasicMaterial color={palette.light} toneMapped={false} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Variant: jail_bars
// ---------------------------------------------------------------------------

function JailBars({ palette }: { palette: ZonePalette }): React.ReactElement {
  const { reducedMotion } = useMonopolyVisualSettings();
  const groupRef = useRef<THREE.Group | null>(null);

  useFrame((state) => {
    const rate = decorRateUnder('jail_bars', reducedMotion);
    if (rate === 0) return;
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime * rate;
    // Subtle vertical scale flicker (1.0 ± 0.04).
    const s = 1 + Math.sin(t * 2 * Math.PI) * 0.04;
    groupRef.current.scale.y = s;
  });

  // Four bars at x = -0.18, -0.06, 0.06, 0.18.
  const xs = [-0.18, -0.06, 0.06, 0.18];
  return (
    <group ref={groupRef} position={[0, 0.3, 0]}>
      {xs.map((x, i) => (
        <mesh key={i} position={[x, 0, 0]}>
          <boxGeometry args={[0.04, 0.55, 0.04]} />
          <meshStandardMaterial
            color={palette.accent}
            emissive={new THREE.Color(palette.accent)}
            emissiveIntensity={0.35}
            roughness={0.5}
          />
        </mesh>
      ))}
      {/* Cross-piece on top */}
      <mesh position={[0, 0.28, 0]}>
        <boxGeometry args={[0.5, 0.04, 0.04]} />
        <meshStandardMaterial color={palette.accent} roughness={0.5} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Variant: parking_neon
// ---------------------------------------------------------------------------

function ParkingNeon({ palette }: { palette: ZonePalette }): React.ReactElement {
  const { reducedMotion } = useMonopolyVisualSettings();
  const matRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const baseColor = React.useMemo(() => new THREE.Color(palette.accent), [palette.accent]);
  const peakColor = React.useMemo(() => new THREE.Color(palette.light), [palette.light]);

  useFrame((state) => {
    const rate = decorRateUnder('parking_neon', reducedMotion);
    if (rate === 0) return;
    if (!matRef.current) return;
    const t = state.clock.elapsedTime * rate;
    const k = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI);
    matRef.current.color.copy(baseColor).lerp(peakColor, k);
  });

  return (
    <group position={[0, 0.4, 0]}>
      {/* Backplate */}
      <mesh>
        <planeGeometry args={[0.4, 0.4]} />
        <meshBasicMaterial
          ref={matRef}
          color={palette.accent}
          toneMapped={false}
        />
      </mesh>
      {/* "P" letter */}
      <Text
        position={[0, 0, 0.01]}
        fontSize={0.3}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.01}
        outlineColor={INK}
      >
        P
      </Text>
      {/* Mounting post */}
      <mesh position={[0, -0.4, 0]}>
        <boxGeometry args={[0.05, 0.4, 0.05]} />
        <meshStandardMaterial color={INK} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Variant: gtj_lights (Go-To-Jail traffic-light triplet)
// ---------------------------------------------------------------------------

function GtjLights({ palette }: { palette: ZonePalette }): React.ReactElement {
  const { reducedMotion } = useMonopolyVisualSettings();
  const redRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const yellowRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const greenRef = useRef<THREE.MeshStandardMaterial | null>(null);

  useFrame((state) => {
    const rate = decorRateUnder('gtj_lights', reducedMotion);
    if (rate === 0) return;
    const t = state.clock.elapsedTime * rate;
    // Phase rotates between the three lights every cycle. We assign a
    // continuous brightness curve to each, offset by 1/3 of a cycle so
    // exactly one light is at peak at any given time.
    const phase = t % 1; // [0, 1)
    const cur = (slot: number): number => {
      const d = Math.min(
        Math.abs(phase - slot),
        Math.abs(phase - slot - 1),
        Math.abs(phase - slot + 1),
      );
      return Math.max(0, 1 - d * 3); // peak when d == 0, 0 when d >= 1/3.
    };
    if (redRef.current)    redRef.current.emissiveIntensity    = 0.2 + 1.2 * cur(0);
    if (yellowRef.current) yellowRef.current.emissiveIntensity = 0.2 + 1.2 * cur(1 / 3);
    if (greenRef.current)  greenRef.current.emissiveIntensity  = 0.2 + 1.2 * cur(2 / 3);
  });

  // Vertical stack: red on top, yellow middle, green bottom.
  return (
    <group position={[0, 0.4, 0]}>
      {/* Black housing */}
      <mesh>
        <boxGeometry args={[0.18, 0.55, 0.1]} />
        <meshStandardMaterial color={INK} roughness={0.8} />
      </mesh>
      {/* Red */}
      <mesh position={[0, 0.18, 0.06]}>
        <sphereGeometry args={[0.06, 12, 10]} />
        <meshStandardMaterial
          ref={redRef}
          color="#ef4444"
          emissive={new THREE.Color('#ef4444')}
          emissiveIntensity={0.2}
        />
      </mesh>
      {/* Yellow */}
      <mesh position={[0, 0, 0.06]}>
        <sphereGeometry args={[0.06, 12, 10]} />
        <meshStandardMaterial
          ref={yellowRef}
          color="#fbbf24"
          emissive={new THREE.Color('#fbbf24')}
          emissiveIntensity={0.2}
        />
      </mesh>
      {/* Green */}
      <mesh position={[0, -0.18, 0.06]}>
        <sphereGeometry args={[0.06, 12, 10]} />
        <meshStandardMaterial
          ref={greenRef}
          color="#22c55e"
          emissive={new THREE.Color('#22c55e')}
          emissiveIntensity={0.2}
        />
      </mesh>
      {/* Mounting post */}
      <mesh position={[0, -0.5, 0]}>
        <boxGeometry args={[0.05, 0.4, 0.05]} />
        <meshStandardMaterial color={INK} />
      </mesh>
      {/* Accent ring referencing the zone palette so the corner reads as
          "go to jail" coloured rather than pure black. */}
      <mesh position={[0, 0, -0.06]}>
        <planeGeometry args={[0.22, 0.6]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={0.18} toneMapped={false} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// <ZoneDecor> dispatcher
// ---------------------------------------------------------------------------

/**
 * Renders the cartoon decor mesh for a single zone.
 *
 * The component is a pure dispatcher that selects one of the 11 variant
 * sub-components based on `variant`. Each sub-component owns its own
 * `useFrame` driver, gated by {@link decorRateUnder} so reduced-motion
 * mode short-circuits before any transform / material mutation
 * (Property 6, Req 12.1).
 *
 * Throws `Error` for an unknown variant — with a TS-narrowed exhaustive
 * switch this only triggers if the `ZonePalette['decor']` union grows
 * without a matching branch being added here.
 */
export function ZoneDecor(props: ZoneDecorProps): React.ReactElement {
  const { variant, position = [0, 0, 0], palette } = props;

  let inner: React.ReactElement;
  switch (variant) {
    case 'lamppost':
      inner = <Lamppost palette={palette} />;
      break;
    case 'fountain':
      inner = <Fountain palette={palette} />;
      break;
    case 'neonsign':
      inner = <NeonSign palette={palette} />;
      break;
    case 'bench':
      inner = <Bench palette={palette} />;
      break;
    case 'minicar':
      inner = <MiniCar palette={palette} />;
      break;
    case 'tree':
      inner = <Tree palette={palette} />;
      break;
    case 'spotlight':
      inner = <Spotlight palette={palette} />;
      break;
    case 'go_arrow_neon':
      inner = <GoArrowNeon palette={palette} />;
      break;
    case 'jail_bars':
      inner = <JailBars palette={palette} />;
      break;
    case 'parking_neon':
      inner = <ParkingNeon palette={palette} />;
      break;
    case 'gtj_lights':
      inner = <GtjLights palette={palette} />;
      break;
    default: {
      // Exhaustiveness guard — flagged at compile time if a new variant is
      // added to ZonePalette['decor'] without a matching branch here.
      const _exhaustive: never = variant;
      throw new Error(`ZoneDecor: unknown variant '${String(_exhaustive)}'`);
    }
  }

  return <group position={position}>{inner}</group>;
}

export default ZoneDecor;
