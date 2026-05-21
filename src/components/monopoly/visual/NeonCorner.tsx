/**
 * NeonCorner.tsx — task 8.4
 *
 * Renders one of the four MimicPoly corner-tile neon signs (GO, JAIL,
 * FREE_PARKING, GO_TO_JAIL). Each sign is a small group of unlit
 * `MeshBasicMaterial` meshes (so they always punch through tone-mapping
 * and read as "neon" regardless of the scene's lighting) plus a
 * co-located `<pointLight>` whose intensity oscillates on a
 * deterministic 1.5–2.5s loop via `useFrame`.
 *
 * Public exports:
 *   - {@link NeonCornerKind}     — the 4 corner-sign kinds.
 *   - {@link NeonCornerProps}    — component prop shape.
 *   - {@link NeonCorner}         — React component.
 *   - {@link neonCornerPeriodMs} — pure helper used by Property 6 tests:
 *                                  returns the per-kind period in ms, or
 *                                  `0` when reduced-motion is active.
 *
 * Why the emissive pulse lives on a `<pointLight>` (and on the wireframe
 * halo opacity), not on the material itself:
 *
 *   `MeshBasicMaterial` is unlit and has no `emissive` channel, so we
 *   cannot literally "oscillate emissive intensity" on the neon mesh.
 *   The visual equivalent is a pulsing point light bathing the board
 *   underneath the sign (which is the actual cartoon-premium effect we
 *   want — a real-world neon sign also lights its surroundings, not
 *   only itself), combined with a wireframe halo whose opacity tracks
 *   the same sine wave so the emissive feel is preserved when the camera
 *   zooms past the lit plate. Both signals share one `useFrame` body so
 *   the rate-limiting that satisfies Property 6 (reduced-motion zeroes
 *   continuous animators) is enforced in exactly one place.
 *
 * Determinism (Req 11.7 / 10.7):
 *
 *   The component never reads wall-clock time, never calls `Math.random`,
 *   and never writes Supabase. Period is fully determined by `kind`, and
 *   the oscillation phase is anchored to `state.clock.elapsedTime` so two
 *   clients started at the same time render the exact same brightness.
 *   The four corners use distinct periods (1.5s / 2.0s / 2.5s / 1.8s) so
 *   they pulse out of phase — same on every client, by design.
 *
 * Validates: Requirements 2.5, 12.1
 */

import * as React from 'react';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useMonopolyVisualSettings } from './MonopolyVisualSettings';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Discriminated string union of the four neon-corner sign kinds, mirroring
 * the corner tiles at indexes 0 (GO), 10 (JAIL), 20 (FREE_PARKING), and
 * 30 (GO_TO_JAIL) on the MimicPoly board.
 */
export type NeonCornerKind = 'go' | 'jail' | 'free_parking' | 'go_to_jail';

/**
 * Public component props.
 *
 * `position` is forwarded verbatim to the wrapping `<group>` so the
 * caller (the future `MonopolyBoard3DCanvas` refactor in task 13.1)
 * places the sign in board space without this component having to know
 * which corner index it represents.
 */
export interface NeonCornerProps {
  /** Which corner sign to render. */
  kind: NeonCornerKind;
  /** World-space position passed straight to the wrapping group. */
  position: [number, number, number];
}

// ---------------------------------------------------------------------------
// Per-kind palette + period table
// ---------------------------------------------------------------------------

/**
 * Per-kind visual + timing spec.
 *
 * Periods are picked deterministically inside the documented `[1.5, 2.5]`
 * second band (design "Components" §`<NeonCorner>`) so the four corners
 * pulse out of phase: 1.5s, 2.0s, 2.5s, 1.8s. Same on every client.
 *
 * Colors mirror `corner_*` entries in `ZONE_PALETTES` (see
 * `src/lib/monopolyZones.ts`) so the board's per-zone accent and the
 * corner sign always agree on the dominant hue.
 */
interface NeonCornerSpec {
  color: string;
  /** Pulse period in seconds; must lie in `[1.5, 2.5]`. */
  periodSec: number;
  /** Short label embossed in the centre of the sign. */
  label: string;
}

const NEON_CORNER_PALETTE: Readonly<Record<NeonCornerKind, NeonCornerSpec>> = {
  go:           { color: '#fbbf24', periodSec: 1.5, label: 'GO' },
  jail:         { color: '#ef4444', periodSec: 2.0, label: 'JAIL' },
  free_parking: { color: '#06b6d4', periodSec: 2.5, label: 'P' },
  go_to_jail:   { color: '#a855f7', periodSec: 1.8, label: 'COP' },
};

// ---------------------------------------------------------------------------
// Light intensity envelope
// ---------------------------------------------------------------------------

/**
 * Steady-state intensity used both as the reduced-motion target and as
 * the centre of the sine-wave oscillation in normal-motion mode.
 *
 * Picked to read clearly against the dark green board base while not
 * over-saturating neighbouring tiles.
 */
const BASE_LIGHT_INTENSITY = 1.4;

/**
 * Half-amplitude of the intensity oscillation. The light sweeps the
 * range `[BASE - AMP, BASE + AMP]` over each period, i.e. 0.8 → 2.0
 * with the values picked here. Kept conservative (no full-bright
 * flashes) so we stay well under the Req 12.5 3 Hz flash cap even at
 * the fastest period (1.5 s ≈ 0.67 Hz).
 */
const LIGHT_INTENSITY_AMPLITUDE = 0.6;

/** Pulse-driven halo opacity floor (visible even at the trough). */
const HALO_OPACITY_FLOOR = 0.45;

/** Pulse-driven halo opacity peak. */
const HALO_OPACITY_PEAK = 0.85;

// ---------------------------------------------------------------------------
// Pure helper exported for property tests
// ---------------------------------------------------------------------------

/**
 * Pure helper: returns the oscillation period in milliseconds for the
 * given corner kind, or `0` when the user has opted into reduced motion.
 *
 * Used by the reduced-motion property test (Property 6) to assert that
 * every continuous animator in the visual layer collapses to a zero rate
 * under `prefers-reduced-motion: reduce`. This function is the single
 * source of truth for the corner-sign side of that invariant — the
 * component's `useFrame` body short-circuits on the same predicate, so
 * there is no way to drift the two paths.
 *
 * Throws `Error` for an unknown `kind`. The discriminated union prevents
 * this at compile time, but the runtime check protects against any
 * future widening of `NeonCornerKind` without a corresponding palette
 * update.
 *
 * Validates Requirements 2.5, 12.1.
 */
export function neonCornerPeriodMs(
  kind: NeonCornerKind,
  reducedMotion: boolean,
): number {
  const spec = NEON_CORNER_PALETTE[kind];
  if (spec === undefined) {
    throw new Error(`neonCornerPeriodMs: unknown kind '${kind}'`);
  }
  if (reducedMotion) return 0;
  return Math.round(spec.periodSec * 1000);
}

// ---------------------------------------------------------------------------
// Per-kind neon shape (internal — not exported)
// ---------------------------------------------------------------------------

interface NeonShapeProps {
  kind: NeonCornerKind;
  color: string;
}

/**
 * Stylised "neon tube" geometry per corner kind. Every shape uses
 * `MeshBasicMaterial` with `toneMapped: false` so the neon punches
 * through the renderer's tone-mapping (which would otherwise wash out
 * saturated colours under the scene's HDR lighting).
 *
 * Geometry size budget: each shape stays inside a roughly `1.4 × 0.6 × 1.4`
 * world-space box centred at the wrapper's origin so the consumer can
 * place the sign at any corner without clipping into adjacent tiles.
 */
function NeonShape({ kind, color }: NeonShapeProps): React.ReactElement {
  switch (kind) {
    case 'go':
      // Chevron arrow (forward-direction nudge for the "GO!" tile).
      return (
        <group>
          {/* Arrow body */}
          <mesh position={[-0.15, 0.05, 0]}>
            <boxGeometry args={[0.7, 0.18, 0.18]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
          {/* Arrowhead — two diagonal bars forming the tip. */}
          <mesh position={[0.3, 0.05, 0.18]} rotation={[0, 0, -Math.PI / 4]}>
            <boxGeometry args={[0.4, 0.18, 0.18]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
          <mesh position={[0.3, 0.05, -0.18]} rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.4, 0.18, 0.18]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
        </group>
      );

    case 'jail':
      // Three vertical bars + a base rail (the tile is "JAIL", not
      // "GO TO JAIL", so the cell already exists — these bars are the
      // visible front of it).
      return (
        <group>
          {[-0.3, 0, 0.3].map((x, i) => (
            <mesh key={i} position={[x, 0.2, 0]}>
              <boxGeometry args={[0.1, 0.6, 0.1]} />
              <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
          ))}
          {/* Top rail joining the bars. */}
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[0.85, 0.08, 0.1]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
          {/* Bottom rail. */}
          <mesh position={[0, -0.05, 0]}>
            <boxGeometry args={[0.85, 0.08, 0.1]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
        </group>
      );

    case 'free_parking':
      // Flat parking plate; the "P" itself is rendered by the shared
      // `<Text>` label below.
      return (
        <group>
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[0.9, 0.1, 0.9]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
          {/* Inner darker square so the "P" reads against a contrast
              backdrop without requiring a second material. */}
          <mesh position={[0, 0.11, 0]}>
            <boxGeometry args={[0.7, 0.02, 0.7]} />
            <meshBasicMaterial color="#0a0810" toneMapped={false} />
          </mesh>
        </group>
      );

    case 'go_to_jail':
      // Police-badge silhouette: a pentagonal star on a circular plate.
      return (
        <group>
          {/* Circular plate (low-poly cylinder lying flat). */}
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.5, 0.5, 0.1, 24]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
          {/* Five-pointed star approximated as five thin boxes radiating
              from the centre. Cheap enough to keep both the LOD-near and
              LOD-far variants identical. */}
          {[0, 1, 2, 3, 4].map((i) => {
            const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
            return (
              <mesh
                key={i}
                position={[Math.cos(angle) * 0.18, 0.12, Math.sin(angle) * 0.18]}
                rotation={[0, -angle, 0]}
              >
                <boxGeometry args={[0.36, 0.06, 0.1]} />
                <meshBasicMaterial color="#ffffff" toneMapped={false} />
              </mesh>
            );
          })}
        </group>
      );

    default: {
      // Exhaustiveness guard — `_exhaustive` will be `never` when the
      // switch covers every member of `NeonCornerKind`. If a new kind is
      // added without updating this switch, TypeScript fails the build.
      const _exhaustive: never = kind;
      void _exhaustive;
      return <group />;
    }
  }
}

// ---------------------------------------------------------------------------
// <NeonCorner> public component
// ---------------------------------------------------------------------------

/**
 * `<NeonCorner>` — animated neon sign for a corner tile.
 *
 * Render layout, top-down:
 *
 *   group(position)
 *   ├── <NeonShape>           // unlit MeshBasicMaterial(toneMapped:false)
 *   ├── <mesh ref={haloRef}>  // wireframe halo, opacity oscillates
 *   ├── <pointLight ref={lightRef} />
 *   └── <Text>                // embossed kind label
 *
 * Animation (normal-motion):
 *   - `intensity = BASE + sin(2π · t / period) · AMP`
 *   - `haloOpacity = lerp(FLOOR, PEAK, (sin + 1) / 2)`
 *
 * Reduced-motion (Req 12.1, Property 6):
 *   - The `useFrame` body short-circuits before touching either ref, so
 *     intensity and halo opacity stay at their initial steady-state
 *     values forever.
 */
export function NeonCorner(props: NeonCornerProps): React.ReactElement {
  const { kind, position } = props;
  const spec = NEON_CORNER_PALETTE[kind];
  // The PALETTE is keyed on the union, but a defensive guard matches the
  // helper above and surfaces unknown kinds at the same point in the code.
  if (spec === undefined) {
    throw new Error(`<NeonCorner>: unknown kind '${kind}'`);
  }

  const { reducedMotion } = useMonopolyVisualSettings();

  const lightRef = useRef<THREE.PointLight | null>(null);
  const haloRef = useRef<THREE.Mesh | null>(null);

  useFrame((state) => {
    // Property 6: reduced-motion zeroes every continuous animator. We
    // never touch the refs in this branch, so the initial steady-state
    // values (BASE_LIGHT_INTENSITY / HALO_OPACITY_PEAK average) persist
    // unmodified for the lifetime of the component.
    if (reducedMotion) return;

    const omega = (2 * Math.PI) / spec.periodSec;
    const sin = Math.sin(state.clock.elapsedTime * omega);

    if (lightRef.current !== null) {
      lightRef.current.intensity =
        BASE_LIGHT_INTENSITY + sin * LIGHT_INTENSITY_AMPLITUDE;
    }

    if (haloRef.current !== null) {
      // Map sin ∈ [-1, 1] to a [FLOOR, PEAK] envelope so the halo never
      // disappears (would read as a glitch) and never fully saturates.
      const norm = (sin + 1) / 2;
      const opacity =
        HALO_OPACITY_FLOOR + (HALO_OPACITY_PEAK - HALO_OPACITY_FLOOR) * norm;
      const mat = haloRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = opacity;
    }
  });

  // Steady-state halo opacity used for the initial render (and the
  // reduced-motion path). Picked at the midpoint of the envelope so the
  // sign reads identically whether the user has reduced motion enabled
  // or the camera frame happens to land on the sine zero-crossing.
  const initialHaloOpacity = (HALO_OPACITY_FLOOR + HALO_OPACITY_PEAK) / 2;

  return (
    <group position={position}>
      <NeonShape kind={kind} color={spec.color} />

      {/* Wireframe halo: an oversized box outline rendered with a
          transparent MeshBasicMaterial so the "edge glow" feel is
          preserved without competing with the neon shape itself. */}
      <mesh ref={haloRef}>
        <boxGeometry args={[1.6, 0.7, 1.6]} />
        <meshBasicMaterial
          color={spec.color}
          wireframe
          transparent
          opacity={initialHaloOpacity}
          toneMapped={false}
        />
      </mesh>

      {/* Pulsing point light. `decay = 2` matches three.js's physically
          accurate falloff so the light stays anchored to the corner
          rather than washing across the whole board. */}
      <pointLight
        ref={lightRef}
        color={spec.color}
        intensity={BASE_LIGHT_INTENSITY}
        distance={4}
        decay={2}
      />

      {/* Embossed neon label. Drei's `<Text>` is already used by
          `<Building>` so the SDF font is shared (no extra cost). */}
      <Text
        position={[0, 0.7, 0]}
        fontSize={0.32}
        color={spec.color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.025}
        outlineColor="#0a0810"
        fontWeight="bold"
      >
        {spec.label}
      </Text>
    </group>
  );
}
