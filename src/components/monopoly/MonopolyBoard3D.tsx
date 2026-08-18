/**
 * MonopolyBoard3D.tsx — task 13.1 (with finishing-touches polish pass).
 *
 * Top-level 3D scene for MimicPoly. Composes the visual primitives under
 * `src/components/monopoly/visual/`:
 *
 *     <BoardBase>
 *     ├── <BoardZone> × 12         (8 color groups + 4 corners)
 *     ├── <Tile>      × 40         (each carries its own <Building>)
 *     ├── <CenterPlaza>
 *     ├── <NeonCorner> × 4         (GO / JAIL / FREE_PARKING / GO_TO_JAIL)
 *     ├── <PlayerToken> × N
 *     ├── <DiceSet>
 *     ├── <FXLayer>                (mounted via <FXLayerProvider>)
 *     └── <CinematicCamera>
 *
 * Polish pass over the original 13.1 refactor:
 *   - NeonCorner signs lifted to y = 1.1 and scaled 1.6× so they pop
 *     above the corner tiles instead of being hidden under them.
 *   - Logo / center plaza scaled down (CenterPlaza handles its own
 *     resizing in `CenterPlaza.tsx`) so peripheral tiles read clearly.
 *   - Brighter ambient + extra rim light so cartoon outlines pop on the
 *     dark green base.
 *
 * Validates: Requirements 1.1–1.6, 2.1–2.7, 11.1–11.8, 13.1, 13.5.
 */

import { useMemo, useRef, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { RoundedBox, Text } from '@react-three/drei';
import * as THREE from 'three';

import {
  BOARD_SPACES,
  TOKEN_COLORS,
  getBoardPosition,
  type TokenType,
} from '@/lib/monopolyBoard';

import { BoardZone } from './visual/BoardZone';
import { Tile } from './visual/Tile';
import { CenterPlaza } from './visual/CenterPlaza';
import { NeonCorner } from './visual/NeonCorner';
import {
  PlayerToken,
  type PlayerTokenHopEvent,
} from './visual/PlayerToken';
import { DiceSet } from './visual/DiceSet';
import {
  CinematicCamera,
  type CameraVec3,
} from './visual/CinematicCamera';
import {
  MonopolyVisualSettingsProvider,
  useMonopolyVisualSettings,
} from './visual/MonopolyVisualSettings';
import { FXLayerProvider } from './visual/FXLayer';

import type { ZoneKey } from '@/lib/monopolyZones';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface MonopolyPlayer3D {
  player_id: string;
  player_name: string;
  token_type: string;
  position: number;
  money: number;
  is_bankrupt: boolean;
  in_jail: boolean;
}

export interface Property3D {
  property_index: number;
  owner_id: string | null;
  houses: number;
  is_mortgaged: boolean;
}

export interface MonopolyBoard3DProps {
  players: MonopolyPlayer3D[];
  properties: Property3D[];
  lastDice1: number | null;
  lastDice2: number | null;
  animatingTo: number | null;
  currentPlayerId: string;
  /** Per-player latest hop event keyed by player_id. */
  hopEvents?: Record<string, PlayerTokenHopEvent | undefined>;
  /** One-shot camera focus request. */
  focusTarget?: { position: CameraVec3; ts: number } | null;
  /** One-shot whip-pan request (e.g. on dice doubles). */
  whipPanTrigger?: { ts: number } | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** All 12 zones rendered into the scene. */
const ALL_ZONES: ReadonlyArray<ZoneKey> = [
  'brown',
  'lightblue',
  'pink',
  'orange',
  'red',
  'yellow',
  'green',
  'darkblue',
  'corner_go',
  'corner_jail',
  'corner_free',
  'corner_gtj',
];

/**
 * Corner placement metadata: index → kind + world position + scale.
 * `scale` lifts each neon sign to the visible 1.5× footprint so the
 * corner reads as a standout landmark instead of vanishing into the
 * ground plate. Y-coordinate raised to 1.1 so the sign hovers clearly
 * above the chamfered corner tile.
 */
const NEON_CORNERS = [
  { kind: 'go'           as const, tile: 0,  position: [ 10, 1.1,  10] as [number, number, number], scale: 1.55 },
  { kind: 'jail'         as const, tile: 10, position: [-10, 1.1,  10] as [number, number, number], scale: 1.55 },
  { kind: 'free_parking' as const, tile: 20, position: [-10, 1.1, -10] as [number, number, number], scale: 1.55 },
  { kind: 'go_to_jail'   as const, tile: 30, position: [ 10, 1.1, -10] as [number, number, number], scale: 1.55 },
];

// ---------------------------------------------------------------------------
// Inner Scene — must live inside <Canvas>
// ---------------------------------------------------------------------------

function Scene(props: MonopolyBoard3DProps) {
  const {
    players,
    properties,
    lastDice1,
    lastDice2,
    animatingTo,
    currentPlayerId,
    hopEvents,
    focusTarget,
    whipPanTrigger,
  } = props;

  const visual = useMonopolyVisualSettings();
  const reducedMotion = visual.reducedMotion;

  // --- Player color lookup ---------------------------------------------
  const playerColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    players.forEach((p) => {
      map[p.player_id] = TOKEN_COLORS[p.token_type as TokenType] ?? '#FF4444';
    });
    return map;
  }, [players]);

  // --- Active player & token color (for accent rings + camera follow) --
  const activePlayer = useMemo(
    () => players.find((p) => p.player_id === currentPlayerId) ?? null,
    [players, currentPlayerId],
  );
  const activePlayerColor = useMemo(() => {
    if (activePlayer === null) return null;
    return TOKEN_COLORS[activePlayer.token_type as TokenType] ?? '#FF4444';
  }, [activePlayer]);

  // --- Active token world position (for `<CinematicCamera>` follow) ----
  const activeTokenPosition = useMemo<CameraVec3 | null>(() => {
    if (activePlayer === null) return null;
    if (activePlayer.is_bankrupt) return null;
    const space = BOARD_SPACES[activePlayer.position];
    if (!space) return null;
    const p = getBoardPosition(activePlayer.position);
    return { x: p.x, y: 0.4, z: p.z };
  }, [activePlayer]);

  // --- Dice rolling window ---------------------------------------------
  const [diceRolling, setDiceRolling] = useState(false);
  const lastDiceRef = useRef<{ d1: number | null; d2: number | null }>({
    d1: null,
    d2: null,
  });
  useEffect(() => {
    if (
      lastDice1 != null &&
      lastDice2 != null &&
      (lastDice1 !== lastDiceRef.current.d1 ||
        lastDice2 !== lastDiceRef.current.d2)
    ) {
      setDiceRolling(true);
      lastDiceRef.current = { d1: lastDice1, d2: lastDice2 };
      const t = setTimeout(() => setDiceRolling(false), 1100);
      return () => clearTimeout(t);
    }
  }, [lastDice1, lastDice2]);

  return (
    <>
      {/* ===== Lighting (boosted for cartoon contrast) ===== */}
      <ambientLight intensity={0.7} />
      <hemisphereLight args={['#fff5d8', '#1a0d2e', 0.45]} />
      <directionalLight
        position={[10, 18, 10]}
        intensity={1.4}
        castShadow={visual.shadowMapSize > 0}
        shadow-mapSize={[
          visual.shadowMapSize || 512,
          visual.shadowMapSize || 512,
        ]}
      />
      <directionalLight position={[-8, 12, -6]} intensity={0.5} color="#a855f7" />
      {visual.enableSecondaryLights && (
        <>
          <pointLight position={[0, 9, 0]} intensity={1.0} color="#fbbf24" />
          <pointLight position={[8, 4, 8]} intensity={0.6} color="#06b6d4" />
          <pointLight position={[-8, 4, -8]} intensity={0.6} color="#ec4899" />
          {/* Rim light from below to make cartoon outlines pop. */}
          <pointLight position={[0, -3, 0]} intensity={0.4} color="#22c55e" />
        </>
      )}

      {/* ===== Board base — fat cartoon green ===== */}
      <RoundedBox
        args={[22.5, 0.4, 22.5]}
        radius={0.3}
        smoothness={4}
        position={[0, -0.25, 0]}
      >
        <meshStandardMaterial
          color="#3f6f33"
          metalness={0.05}
          roughness={0.85}
          emissive={new THREE.Color('#22c55e')}
          emissiveIntensity={0.05}
        />
      </RoundedBox>
      <RoundedBox
        args={[23, 0.15, 23]}
        radius={0.35}
        smoothness={4}
        position={[0, -0.5, 0]}
      >
        <meshBasicMaterial color="var(--ink-line)" />
      </RoundedBox>

      {/* ===== Zones ===== */}
      {ALL_ZONES.map((zoneKey) => (
        <BoardZone
          key={zoneKey}
          zoneKey={zoneKey}
          activePlayerId={currentPlayerId}
          activePlayerColor={activePlayerColor}
          properties={properties}
          reducedMotion={reducedMotion}
        />
      ))}

      {/* ===== Tiles (with their <Building> children) ===== */}
      {BOARD_SPACES.map((_, i) => {
        const prop = properties.find((p) => p.property_index === i);
        const ownerColor = prop?.owner_id ? playerColorMap[prop.owner_id] ?? null : null;
        return (
          <Tile
            key={i}
            index={i}
            ownerColor={ownerColor}
            houses={prop?.houses ?? 0}
            isMortgaged={prop?.is_mortgaged ?? false}
            isLanded={i === animatingTo}
            reducedMotion={reducedMotion}
            lod="near"
          />
        );
      })}

      {/* ===== Center plaza + tagline ===== */}
      <CenterPlaza />
      <Text
        position={[0, 0.13, 1.3]}
        fontSize={0.26}
        color="#a855f7"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.014}
        outlineColor="var(--ink-line)"
        fontWeight="bold"
        rotation={[-Math.PI / 2, 0, 0]}
      >
        Mimic Master Edition
      </Text>

      {/* ===== Neon corner signs — scaled up to be unmissable ===== */}
      {NEON_CORNERS.map((c) => (
        <group key={c.kind} position={c.position} scale={[c.scale, c.scale, c.scale]}>
          <NeonCorner kind={c.kind} position={[0, 0, 0]} />
        </group>
      ))}

      {/* ===== Player tokens ===== */}
      {players.map((player, i) => (
        <PlayerToken
          key={player.player_id}
          playerId={player.player_id}
          playerName={player.player_name}
          tokenType={player.token_type}
          position={player.position}
          isBankrupt={player.is_bankrupt}
          inJail={player.in_jail}
          playerOrderIndex={i}
          isCurrentPlayer={player.player_id === currentPlayerId}
          hopEvent={hopEvents?.[player.player_id]}
          reducedMotion={reducedMotion}
        />
      ))}

      {/* ===== Dice ===== */}
      <DiceSet
        d1={lastDice1}
        d2={lastDice2}
        rolling={diceRolling}
        reducedMotion={reducedMotion}
        position={[0, 1.4, 0]}
      />

      {/* ===== Cinematic camera ===== */}
      <CinematicCamera
        activeTokenPosition={activeTokenPosition}
        focusTarget={focusTarget ?? null}
        whipPanTrigger={whipPanTrigger ?? null}
        reducedMotion={reducedMotion}
      />

      {/* Atmospheric fog */}
      <fog attach="fog" args={['#0f0820', 28, 55]} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Public canvas wrapper
// ---------------------------------------------------------------------------

export function MonopolyBoard3DCanvas(props: MonopolyBoard3DProps) {
  return (
    <div
      className="relative w-full h-[560px] md:h-[620px] rounded-3xl overflow-hidden"
      style={{
        background:
          'linear-gradient(180deg, #1a0d2e 0%, #160a26 50%, #0a0510 100%)',
        border: '1px solid var(--ink-line)',
        boxShadow:
          'none',
      }}
    >
      {/* Corner badge */}
      <div
        className="absolute top-3 right-3 z-10 pointer-events-none px-2.5 py-1 rounded-lg"
        style={{
          background: 'linear-gradient(180deg, #a855f7, #7e22ce)',
          border: '1px solid var(--ink-line)',
          boxShadow: 'none',
          transform: 'rotate(4deg)',
        }}
      >
        <span
          className="text-xs font-black text-white uppercase tracking-wider"
          style={{
            fontFamily: "'Outfit', sans-serif",
            textShadow:
              'none',
          }}
        >
          🎲 3D BOARD
        </span>
      </div>

      <MonopolyVisualSettingsProvider>
        <Canvas
          camera={{ position: [0, 18, 19], fov: 48 }}
          shadows
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 2]}
        >
          {/* FXLayerProvider must live inside the Canvas because its
              integration loop relies on `useFrame`. */}
          <FXLayerProvider>
            <Scene {...props} />
          </FXLayerProvider>
        </Canvas>
      </MonopolyVisualSettingsProvider>
    </div>
  );
}
