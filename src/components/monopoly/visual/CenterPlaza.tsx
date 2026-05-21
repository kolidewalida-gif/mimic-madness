/**
 * CenterPlaza.tsx
 *
 * Evolution of the existing `BoardCenter` (`src/components/monopoly/MonopolyBoard3D.tsx`)
 * into the cartoon-premium "MimicPoly plaza": a chamfered purple-velvet
 * platform sitting at the centre of the 22.5×22.5 board, ringed by an
 * animated water/energy ribbon and topped with the floating MIMICPOLY
 * logo (Requirement 2.4).
 *
 * Visual layers (top → bottom):
 *
 *   1. Floating MIMICPOLY logo (drei `<Float>` + `<Text>`, gold outlined
 *      in black, mimicking the existing BoardCenter look).
 *   2. Animated ribbon — a flat ring at y=0.07 driven by either:
 *        - a `ShaderMaterial` whose fragment shader UV-scrolls a stylised
 *          sine-noise pattern keyed off `uniforms.u_time` (default path,
 *          1 shader-program slot of the 12-program scene budget — Req 11.6);
 *        - a `MeshStandardMaterial` over a procedural `DataTexture` whose
 *          UV `offset.x` animates each frame (perf-tier `'low'` fallback —
 *          Req 11.2).
 *      Reduced motion freezes the animation by holding `u_time` (or
 *      `offset.x`) at its initial value of `0` (Req 12.1).
 *   3. Chamfered platform — `<RoundedBox>` 8.5 × 0.12 × 8.5 in the same
 *      `#1a0d2e` purple velvet as the existing `BoardCenter`, with the
 *      same subtle `#a855f7` emissive (Requirement 2.4 / 1.3 palette
 *      continuity).
 *
 * Performance and accessibility (Requirements 11.2, 11.6, 12.1):
 *   - `'low'` perf tier swaps the `ShaderMaterial` ribbon for a textured
 *     plane scrolling its `map.offset.x` — no custom shader program is
 *     compiled in that mode, so total scene shader count stays well below
 *     the 12-program budget (Req 11.6).
 *   - Reduced motion freezes both ribbon variants — no `u_time` ticking,
 *     no offset scrolling.
 *
 * Determinism (Req 11.7 / 10.7):
 *   - The component reads no Supabase row, performs no I/O, and never
 *     calls `Math.random()` or `Date.now()`. All animation timing is
 *     driven by `useFrame`'s `clock.elapsedTime`, so all clients (humans
 *     and bots) render the same plaza state.
 *
 * Validates: Requirements 2.4, 11.2, 11.6, 12.1
 */

import * as React from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, RoundedBox, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useMonopolyVisualSettings } from './MonopolyVisualSettings';

// ---------------------------------------------------------------------------
// Visual constants
// ---------------------------------------------------------------------------

/** Default outer radius of the energy ribbon ring (in board units). */
const DEFAULT_RIBBON_RADIUS = 2.4;

/** Inner radius offset relative to the outer radius for the ribbon ring. */
const RIBBON_THICKNESS = 0.2;

/** Ring tessellation; matches the existing BoardCenter inner glow. */
const RIBBON_SEGMENTS = 64;

/** Plaza platform footprint and corner radius — trimmed so tiles read clearer. */
const PLATFORM_SIZE: readonly [number, number, number] = [6.5, 0.12, 6.5];
const PLATFORM_RADIUS = 0.15;
const PLATFORM_SMOOTHNESS = 4;

/** Ribbon palette (teal → gold), kept in sync with the fragment shader. */
const RIBBON_COLOR_A: readonly [number, number, number] = [0.04, 0.78, 0.91];
const RIBBON_COLOR_B: readonly [number, number, number] = [0.99, 0.74, 0.14];

/**
 * Canonical UV scroll rate for the ribbon (matches the `u_time` multiplier
 * in the fragment shader). Exposed via {@link centerPlazaRibbonRate} so
 * Property 6's "reduced motion zeroes continuous animation rates" test can
 * read the rate without reaching into the shader source.
 */
const RIBBON_NORMAL_RATE = 0.6;

/** Procedural fallback texture resolution (small, mip-friendly). */
const FALLBACK_TEXTURE_SIZE = 64;

/** UV offset speed used by the perf-tier `'low'` textured-plane fallback. */
const FALLBACK_OFFSET_SPEED = 0.05;

// ---------------------------------------------------------------------------
// Pure rate helper (Property 6)
// ---------------------------------------------------------------------------

/**
 * Continuous animation rate for the centre-plaza energy ribbon.
 *
 * Returns `0` under reduced motion (the ribbon shader / texture offset is
 * frozen at its initial value, satisfying Property 6 and Requirement 12.1)
 * and the canonical `0.6` rate otherwise — the same multiplier applied to
 * `u_time` inside the fragment shader.
 *
 * Exported so the property-based test for Property 6 can enumerate every
 * continuous animator without rendering the component.
 */
export function centerPlazaRibbonRate(reducedMotion: boolean): number {
  return reducedMotion ? 0 : RIBBON_NORMAL_RATE;
}

// ---------------------------------------------------------------------------
// Shader source (default path)
// ---------------------------------------------------------------------------

/**
 * Pass-through vertex shader: forwards `uv` and projects the position with
 * the standard model-view-projection chain. No custom transforms — the
 * ring geometry already places the ribbon in the world.
 */
const RIBBON_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Stylised sine-noise UV scroll. The pattern at any pixel is the product
 * of two phase-shifted sine waves whose phase is `u_time`-driven, giving a
 * cheap "energy ribbon" feel without any noise texture sampling.
 *
 * The colour mix interpolates between teal (`#0bc7e8`) and gold (`#fcbd24`)
 * based on `n * 0.5 + 0.5` (so the `[-1, 1]` range of the sine product is
 * remapped into `[0, 1]`).
 */
const RIBBON_FRAGMENT_SHADER = /* glsl */ `
  precision mediump float;

  uniform float u_time;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv * 4.0;
    float n = sin(uv.x * 6.28 + u_time * 0.6) * cos(uv.y * 6.28 + u_time * 0.4);
    vec4 colorA = vec4(0.04, 0.78, 0.91, 1.0);
    vec4 colorB = vec4(0.99, 0.74, 0.14, 1.0);
    gl_FragColor = mix(colorA, colorB, n * 0.5 + 0.5);
  }
`;

// ---------------------------------------------------------------------------
// Procedural fallback texture (perf-tier 'low')
// ---------------------------------------------------------------------------

/**
 * Build a small RGBA `DataTexture` whose pattern matches the shader's
 * sine-noise look at `u_time = 0`. Animating `texture.offset.x` then gives
 * the same "scrolling energy" impression at zero shader-compile cost.
 *
 * The texture is created once per component mount via `useMemo` and
 * disposed when the component unmounts. `RepeatWrapping` on both axes
 * guarantees the offset can wrap around without seams.
 */
function createRibbonFallbackTexture(): THREE.DataTexture {
  const size = FALLBACK_TEXTURE_SIZE;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * 4.0;
      const v = (y / size) * 4.0;
      const n =
        Math.sin(u * 6.28) * Math.cos(v * 6.28); // matches u_time = 0
      const t = n * 0.5 + 0.5;
      const r = RIBBON_COLOR_A[0] * (1 - t) + RIBBON_COLOR_B[0] * t;
      const g = RIBBON_COLOR_A[1] * (1 - t) + RIBBON_COLOR_B[1] * t;
      const b = RIBBON_COLOR_A[2] * (1 - t) + RIBBON_COLOR_B[2] * t;
      const idx = (y * size + x) * 4;
      data[idx + 0] = Math.round(r * 255);
      data[idx + 1] = Math.round(g * 255);
      data[idx + 2] = Math.round(b * 255);
      data[idx + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

// ---------------------------------------------------------------------------
// Ribbon variants
// ---------------------------------------------------------------------------

interface RibbonProps {
  innerRadius: number;
  outerRadius: number;
  reducedMotion: boolean;
}

/**
 * Default ribbon: a flat ring driven by a custom `ShaderMaterial`. One
 * shader program slot of the 12-program scene budget (Req 11.6).
 */
function ShaderRibbon({
  innerRadius,
  outerRadius,
  reducedMotion,
}: RibbonProps): React.ReactElement {
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  // Stable uniforms object — created once per mount so re-renders don't
  // allocate a new uniforms map (which would force a shader recompile).
  const uniforms = useMemo(() => ({ u_time: { value: 0 } }), []);

  useFrame((state) => {
    if (!materialRef.current) return;
    if (reducedMotion) {
      // Freeze at the initial state. We assign explicitly rather than
      // skipping the write so a flip from "motion → reduced-motion" snaps
      // back to the canonical frozen frame.
      materialRef.current.uniforms.u_time.value = 0;
      return;
    }
    materialRef.current.uniforms.u_time.value = state.clock.elapsedTime;
  });

  return (
    <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[innerRadius, outerRadius, RIBBON_SEGMENTS]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={RIBBON_VERTEX_SHADER}
        fragmentShader={RIBBON_FRAGMENT_SHADER}
        transparent={false}
        toneMapped={false}
      />
    </mesh>
  );
}

/**
 * Perf-tier `'low'` ribbon: a flat ring with a procedural `DataTexture`
 * whose UV `offset.x` animates each frame. No custom shader program is
 * compiled, keeping the scene's program count low on weaker hardware
 * (Req 11.2).
 */
function TexturedRibbon({
  innerRadius,
  outerRadius,
  reducedMotion,
}: RibbonProps): React.ReactElement {
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const texture = useMemo(() => createRibbonFallbackTexture(), []);

  // Dispose the GPU-side resources when the fallback unmounts (or when
  // perf tier flips back up and the parent swaps to the shader path).
  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  useFrame((state) => {
    if (!materialRef.current?.map) return;
    if (reducedMotion) {
      materialRef.current.map.offset.x = 0;
      return;
    }
    materialRef.current.map.offset.x =
      state.clock.elapsedTime * FALLBACK_OFFSET_SPEED;
  });

  return (
    <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[innerRadius, outerRadius, RIBBON_SEGMENTS]} />
      <meshStandardMaterial
        ref={materialRef}
        map={texture}
        emissive={new THREE.Color('#fbbf24')}
        emissiveIntensity={0.35}
        roughness={0.55}
        metalness={0.1}
        transparent
        opacity={0.85}
      />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// <CenterPlaza>
// ---------------------------------------------------------------------------

export interface CenterPlazaProps {
  /**
   * Outer radius of the energy ribbon ring, in board units. Defaults to
   * `3.0` to match the existing `BoardCenter` inner glow ring footprint
   * so the visual swap is drop-in.
   */
  radius?: number;
}

/**
 * Centre plaza of the MimicPoly board.
 *
 * Renders the chamfered purple-velvet platform, the animated water /
 * energy ribbon (shader by default, textured plane on `'low'` perf tier,
 * frozen under reduced motion), and the floating MIMICPOLY logo + tagline
 * exactly as the existing `BoardCenter` does.
 *
 * No props beyond an optional `radius` — the plaza is a pure visual
 * subtree driven only by `useMonopolyVisualSettings()`.
 */
export function CenterPlaza(props: CenterPlazaProps = {}): React.ReactElement {
  const { radius = DEFAULT_RIBBON_RADIUS } = props;

  const settings = useMonopolyVisualSettings();
  const { reducedMotion, perfTier } = settings;

  const innerRadius = Math.max(0, radius - RIBBON_THICKNESS);
  const outerRadius = radius;

  // Shader path is the default; `'low'` perf tier swaps to the textured
  // fallback (Req 11.2 / 11.6). We resolve the variant once per render
  // rather than mounting both and toggling visibility, so only one
  // material — and at most one shader program — exists at a time.
  const useFallback = perfTier === 'low';

  return (
    <group position={[0, 0.05, 0]}>
      {/* Centre platform — purple velvet, mirrors the existing BoardCenter. */}
      <RoundedBox
        args={[...PLATFORM_SIZE] as [number, number, number]}
        radius={PLATFORM_RADIUS}
        smoothness={PLATFORM_SMOOTHNESS}
        position={[0, 0, 0]}
      >
        <meshStandardMaterial
          color="#1a0d2e"
          metalness={0.1}
          roughness={0.85}
          emissive={new THREE.Color('#a855f7')}
          emissiveIntensity={0.08}
        />
      </RoundedBox>

      {/* Animated water / energy ribbon. */}
      {useFallback ? (
        <TexturedRibbon
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          reducedMotion={reducedMotion}
        />
      ) : (
        <ShaderRibbon
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          reducedMotion={reducedMotion}
        />
      )}

      {/* MIMICPOLY title — gold outlined in black, gently floating. */}
      <Float
        speed={reducedMotion ? 0 : 1.2}
        floatIntensity={reducedMotion ? 0 : 0.2}
        rotationIntensity={reducedMotion ? 0 : 0.05}
      >
        <Text
          position={[0, 0.6, 0]}
          fontSize={0.85}
          color="#fbbf24"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.05}
          outlineColor="#0a0810"
          fontWeight="bold"
          rotation={[-Math.PI / 2, 0, 0]}
        >
          MIMICPOLY
        </Text>
      </Float>

      {/* Sub-title tag — preserved from BoardCenter for visual continuity. */}
      <Text
        position={[0, 0.13, 1.5]}
        fontSize={0.32}
        color="#a855f7"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.018}
        outlineColor="#0a0810"
        fontWeight="bold"
      >
        Mimic Master Edition
      </Text>
    </group>
  );
}
