/**
 * PlayerToken — helper exports.
 *
 * This module currently contains the pure, deterministic helpers used to
 * place player tokens on a tile and to derive the colors of their visual
 * affordances (trail, halo, panel border, …).
 *
 * The `<PlayerToken>` React component (hop FSM, squash/stretch, trail,
 * settle, pass-go billboard) is added in task 9.2 and will live in this
 * same file. For now, the file is a pure module with zero React /
 * three.js / framer-motion runtime dependencies so the helpers can be
 * imported cheaply by the property test (task 9.3) and by any caller
 * that just needs the geometry/color contract.
 *
 * Validates Requirements 1.5, 5.3, 5.7.
 */

import { TOKEN_COLORS, type TokenType } from '@/lib/monopolyBoard';

/**
 * Deterministic 4×2 grid of in-tile token offsets, indexed by
 * `playerOrderIndex` (0..7). Same input → same output across all
 * clients, which satisfies Requirement 5.7 (stable rendering order).
 *
 * Layout (looking down at the tile):
 *
 *   z = -0.20   [0] [1] [2] [3]
 *   z = +0.20   [4] [5] [6] [7]
 *               x = -0.45 .. +0.45
 *
 * Pairwise 2D distance properties (verified by Property 7):
 *   - smallest pairwise distance: 0.30   (adjacent in x)
 *   - smallest cross-row distance: 0.40  (same column, different row)
 *   - smallest diagonal distance: 0.50   (sqrt(0.30² + 0.40²))
 * All pairs are therefore ≥ 0.25, satisfying Requirement 1.5.
 *
 * Exported as a `const` (instead of being inlined inside `tokenOffset`)
 * so the property test can iterate the 8 slots directly without
 * reaching into the function's closure.
 */
export const TOKEN_OFFSETS: ReadonlyArray<{ dx: number; dz: number }> = [
  { dx: -0.45, dz: -0.20 }, // 0
  { dx: -0.15, dz: -0.20 }, // 1
  { dx:  0.15, dz: -0.20 }, // 2
  { dx:  0.45, dz: -0.20 }, // 3
  { dx: -0.45, dz:  0.20 }, // 4
  { dx: -0.15, dz:  0.20 }, // 5
  { dx:  0.15, dz:  0.20 }, // 6
  { dx:  0.45, dz:  0.20 }, // 7
] as const;

/** Number of token slots per tile (matches the 8 token types). */
export const MAX_TOKEN_SLOTS = TOKEN_OFFSETS.length;

/**
 * Pure, deterministic offset for a token on its current tile, derived
 * from the player's index inside `monopoly_games.player_order`. Same
 * `playerOrderIndex` always yields the same `{dx, dz}` on every client.
 *
 * @param playerOrderIndex Position of the player in `player_order`,
 *   expected in the range [0, 8). Indexes outside that range raise a
 *   `RangeError` rather than silently aliasing — a player_order with
 *   more than 8 entries would already violate the game's 8-token limit.
 *
 * Validates Requirements 1.5, 5.7.
 */
export function tokenOffset(playerOrderIndex: number): { dx: number; dz: number } {
  if (
    !Number.isInteger(playerOrderIndex) ||
    playerOrderIndex < 0 ||
    playerOrderIndex >= MAX_TOKEN_SLOTS
  ) {
    throw new RangeError(
      `tokenOffset: playerOrderIndex must be an integer in [0, ${MAX_TOKEN_SLOTS}); got ${playerOrderIndex}`,
    );
  }
  // Return a fresh object so callers can safely mutate the result
  // (e.g. add a y component) without poisoning the shared TOKEN_OFFSETS.
  const slot = TOKEN_OFFSETS[playerOrderIndex];
  return { dx: slot.dx, dz: slot.dz };
}

/**
 * Default trail color used when a player carries an unrecognised
 * `token_type`. Matches `TOKEN_COLORS.car` (the canonical "first" token)
 * so the visual layer never renders a missing/black trail. This is a
 * defensive fallback — in well-formed game state every player's
 * `token_type` is one of the 8 documented `TokenType` values.
 */
export const DEFAULT_TOKEN_TRAIL_COLOR = '#FF4444';

/**
 * Player shape consumed by `tokenTrailColor`. Intentionally minimal so
 * the helper is decoupled from the full `MonopolyPlayer` Supabase row;
 * the 2D panels and the 3D token only need `token_type` to resolve a
 * color. Property tests can pass `{ token_type }` directly.
 */
export interface TokenTrailColorInput {
  token_type: string;
}

/**
 * Resolves the trail / halo / panel-border color for a player from
 * their `token_type`. Returns `TOKEN_COLORS[token_type]` when the value
 * is one of the 8 known `TokenType`s, otherwise falls back to
 * `DEFAULT_TOKEN_TRAIL_COLOR`.
 *
 * The same function is used by:
 *   - the 3D `<PlayerToken>` ribbon trail (Req 5.3),
 *   - the `<MonopolyAccentRing>` zone glow when the player owns a
 *     full color group (Req 8.4),
 *   - the active-player spotlight border in `MonopolyPlayerPanel`
 *     (Req 1.5).
 *
 * Validates Requirements 1.5, 5.3.
 */
export function tokenTrailColor(player: TokenTrailColorInput): string {
  const known = TOKEN_COLORS[player.token_type as TokenType];
  return known ?? DEFAULT_TOKEN_TRAIL_COLOR;
}


// ===========================================================================
// <PlayerToken> React component (task 9.2)
// ===========================================================================
//
// State-diff-driven token visual. Consumes a single `hopEvent` (forwarded
// from the animation queue's `TOKEN_HOP` event for this player) and runs a
// per-tile spring tween chain from `from` to `to`, expanding the path via
// `computeHopPath`. The component never reads or writes Supabase — its
// only inputs are the props derived from a `MonopolyPlayer` row plus the
// last `TOKEN_HOP` event for this player (Req 5.6 / 10.7 / 13.6: bots
// animate identically because they only see state diffs).
//
// FSM phases (lives in a ref, no React state to avoid per-frame re-renders):
//   - `idle`        : token at its current tile, optional bounce when active
//   - `anticipate`  : 80ms vertical squash (0.85) before takeoff
//   - `jump`        : per-tile arc with squash/stretch curve
//                     (1.0 → 0.7 takeoff → 1.2 apex → 0.85 landing → 1.0)
//   - `land`        : settle pulse + DUST_PUFF on the final tile
//
// Reduced-motion: skips squash/stretch (vertical scale = 1.0), skips trail,
// snaps position to target, and bypasses the bounce/anticipate phases.
//
// Dependencies on existing helpers:
//   - `computeHopPath` from `@/lib/monopolyHopPath`
//   - `getBoardPosition` + `BOARD_SPACES` from `@/lib/monopolyBoard`
//   - `durationFor` from `./durations`
//   - `tokenOffset`, `tokenTrailColor` from this file
//   - `useFXBusOptional` from `./FXLayer` (optional — falls back to
//     console.debug when no provider is mounted)
//
// Validates Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 10.7.

import * as React from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { BOARD_SPACES, getBoardPosition } from '@/lib/monopolyBoard';
import { computeHopPath } from '@/lib/monopolyHopPath';
import { durationFor } from './durations';
import { useFXBusOptional } from './FXLayer';

// ---------------------------------------------------------------------------
// Public props
// ---------------------------------------------------------------------------

/**
 * Hop event forwarded from the animation queue. The `ts` field is used as
 * a freshness key — the component starts a new hop chain only when `ts`
 * changes from the previously-seen value, so React re-renders that forward
 * the same event object are idempotent (one Supabase update → one chain).
 */
export interface PlayerTokenHopEvent {
  /** Source tile index in `[0, 40)`. */
  from: number;
  /** Destination tile index in `[0, 40)`. */
  to: number;
  /**
   * `true` iff the hop crosses tile 0 (passes GO). The component renders
   * a "+200$" billboard above the token while the chain is in flight.
   */
  passedGo: boolean;
  /** Freshness key — typically the Supabase update timestamp. */
  ts: number;
}

/** Public props for the `<PlayerToken>` 3D component. */
export interface PlayerTokenProps {
  /** Stable player id (Supabase `monopoly_players.player_id`). */
  playerId: string;
  /** Display name shown above the token. */
  playerName: string;
  /** One of the 8 known token types; unknown values fall back to a sphere. */
  tokenType: string;
  /** Current Supabase `position` in `[0, 40)`. */
  position: number;
  /** Hide and short-circuit when bankrupt (matches existing visual contract). */
  isBankrupt: boolean;
  /** Renders the jail emoji overlay when in jail. */
  inJail: boolean;
  /** Index in `monopoly_games.player_order` (0..7) — drives `tokenOffset`. */
  playerOrderIndex: number;
  /** Whether this is the player whose turn is currently active. */
  isCurrentPlayer: boolean;
  /** Latest `TOKEN_HOP` event for this player, or `undefined` when none. */
  hopEvent?: PlayerTokenHopEvent;
  /**
   * Reduced-motion override. When `true`, the component skips squash/stretch,
   * skips the trail, and snaps to the destination instead of tweening
   * (Req 12.1 / 12.2). Defaults to `false` so call sites can opt-in.
   */
  reducedMotion?: boolean;
}

// ---------------------------------------------------------------------------
// Internal FSM types and constants
// ---------------------------------------------------------------------------

type TokenPhase = 'idle' | 'anticipate' | 'jump' | 'land';

interface FsmState {
  phase: TokenPhase;
  /** Hop tiles still to visit (index 0 is the next tile). */
  path: number[];
  /** Cursor in `path`. */
  tileCursor: number;
  /** `clock.elapsedTime` at which the current phase started. */
  phaseStartElapsed: number;
  /** Source position for the current jump segment, in world space. */
  fromPos: { x: number; z: number };
  /** Destination position for the current jump segment, in world space. */
  toPos: { x: number; z: number };
  /** Whether the chain crosses tile 0 (drives the +200$ billboard). */
  passedGo: boolean;
  /** `clock.elapsedTime` of the chain start, for the billboard fade-out. */
  chainStartElapsed: number | null;
  /** Last hopEvent.ts processed; used to dedupe repeated event references. */
  lastHopTs: number | null;
}

/** Anticipate phase duration (Req 5.2 — small pre-takeoff squash). */
const ANTICIPATE_MS = 80;

/** Pass-Go billboard visibility window (Req 5.8). */
const PASS_GO_BILLBOARD_MS = 1500;

/** Apex height of each jump arc in world units. */
const HOP_APEX_Y = 0.55;

/** Resting Y for the token (matches the legacy `<PlayerToken>` baseY). */
const TOKEN_BASE_Y = 0.4;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Squash-and-stretch vertical scale curve over a single hop, t ∈ [0, 1].
 *
 * Keypoints (Req 5.2):
 *   t = 0.00 → 1.0   (rest)
 *   t = 0.15 → 0.7   (takeoff squash)
 *   t = 0.50 → 1.2   (apex stretch)
 *   t = 0.85 → 0.85  (landing squash)
 *   t = 1.00 → 1.0   (rest)
 *
 * Implemented as piecewise linear interpolation between the keypoints —
 * cheap, deterministic, and visually indistinguishable from a smoother
 * curve at the per-hop durations we use (120–280 ms).
 */
function squashStretchScaleY(t: number): number {
  const tt = Math.max(0, Math.min(1, t));
  if (tt < 0.15) return 1.0 + (0.7 - 1.0) * (tt / 0.15);
  if (tt < 0.5)  return 0.7 + (1.2 - 0.7) * ((tt - 0.15) / (0.5 - 0.15));
  if (tt < 0.85) return 1.2 + (0.85 - 1.2) * ((tt - 0.5) / (0.85 - 0.5));
  return 0.85 + (1.0 - 0.85) * ((tt - 0.85) / (1.0 - 0.85));
}

/** Resolve the world-space token slot for a given tile index + offset slot. */
function tileWorldSlot(tile: number, offset: { dx: number; dz: number }): { x: number; z: number } {
  const p = getBoardPosition(tile);
  return { x: p.x + offset.dx, z: p.z + offset.dz };
}

// ---------------------------------------------------------------------------
// Token mesh — geometry-identical reuse of MonopolyBoard3D's shapes
// ---------------------------------------------------------------------------

/**
 * Render the static token geometry for a given `tokenType`. The mesh tree
 * matches `MonopolyBoard3D.tsx`'s legacy `<PlayerToken>` shape-for-shape
 * so visual continuity is preserved across the refactor (Req 13.1).
 */
function TokenMesh({ tokenType, color }: { tokenType: string; color: string }): JSX.Element {
  if (tokenType === 'car') {
    return (
      <group>
        <RoundedBox args={[0.4, 0.18, 0.22]} radius={0.04} smoothness={3}>
          <meshStandardMaterial
            color={color}
            metalness={0.6}
            roughness={0.25}
            emissive={new THREE.Color(color)}
            emissiveIntensity={0.15}
          />
        </RoundedBox>
        <RoundedBox
          args={[0.22, 0.13, 0.2]}
          radius={0.04}
          smoothness={3}
          position={[0.05, 0.13, 0]}
        >
          <meshStandardMaterial color={color} metalness={0.6} roughness={0.25} />
        </RoundedBox>
        {[
          [-0.13, -0.1, 0.11],
          [0.13, -0.1, 0.11],
          [-0.13, -0.1, -0.11],
          [0.13, -0.1, -0.11],
        ].map(([x, y, z], i) => (
          <mesh key={i} position={[x, y, z]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.04, 12]} />
            <meshStandardMaterial color="var(--ink-line)" />
          </mesh>
        ))}
      </group>
    );
  }
  if (tokenType === 'hat') {
    return (
      <group>
        <mesh>
          <cylinderGeometry args={[0.22, 0.22, 0.05, 18]} />
          <meshStandardMaterial color={color} metalness={0.55} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.16, 0]}>
          <cylinderGeometry args={[0.13, 0.15, 0.27, 18]} />
          <meshStandardMaterial color={color} metalness={0.55} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.155, 0.155, 0.04, 18]} />
          <meshStandardMaterial color="var(--ink-line)" />
        </mesh>
      </group>
    );
  }
  if (tokenType === 'shoe') {
    return (
      <group>
        <RoundedBox args={[0.34, 0.18, 0.18]} radius={0.06} smoothness={3}>
          <meshStandardMaterial color={color} metalness={0.5} roughness={0.35} />
        </RoundedBox>
        <RoundedBox
          args={[0.18, 0.16, 0.16]}
          radius={0.05}
          smoothness={3}
          position={[0.1, 0.15, 0]}
        >
          <meshStandardMaterial color={color} metalness={0.5} roughness={0.35} />
        </RoundedBox>
      </group>
    );
  }
  if (tokenType === 'dog') {
    return (
      <group>
        <mesh><sphereGeometry args={[0.13, 18, 18]} />
          <meshStandardMaterial color={color} metalness={0.4} roughness={0.4} />
        </mesh>
        <mesh position={[0.16, 0.05, 0]}><sphereGeometry args={[0.1, 18, 18]} />
          <meshStandardMaterial color={color} metalness={0.4} roughness={0.4} />
        </mesh>
        <mesh position={[-0.13, 0.08, 0]} rotation={[0, 0, Math.PI / 4]}>
          <cylinderGeometry args={[0.025, 0.025, 0.18, 8]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <mesh position={[0.18, 0.16, 0.07]}><sphereGeometry args={[0.04, 12, 12]} />
          <meshStandardMaterial color="var(--ink-line)" />
        </mesh>
        <mesh position={[0.18, 0.16, -0.07]}><sphereGeometry args={[0.04, 12, 12]} />
          <meshStandardMaterial color="var(--ink-line)" />
        </mesh>
      </group>
    );
  }
  if (tokenType === 'ship') {
    return (
      <group>
        <RoundedBox args={[0.4, 0.13, 0.18]} radius={0.04} smoothness={3}>
          <meshStandardMaterial color={color} metalness={0.5} roughness={0.4} />
        </RoundedBox>
        <mesh position={[0, 0.18, 0]}>
          <boxGeometry args={[0.04, 0.32, 0.04]} />
          <meshStandardMaterial color="var(--ink-line)" />
        </mesh>
        <mesh position={[0.05, 0.2, 0]}>
          <boxGeometry args={[0.18, 0.18, 0.005]} />
          <meshStandardMaterial color="#fff" />
        </mesh>
      </group>
    );
  }
  if (tokenType === 'cannon') {
    return (
      <group>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.07, 0.09, 0.32, 16]} />
          <meshStandardMaterial color={color} metalness={0.7} roughness={0.25} />
        </mesh>
        <mesh position={[0, -0.1, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.04, 14]} />
          <meshStandardMaterial color="var(--ink-line)" />
        </mesh>
        <mesh position={[0, -0.1, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.04, 14]} />
          <meshStandardMaterial color="var(--ink-line)" />
        </mesh>
      </group>
    );
  }
  if (tokenType === 'iron') {
    return (
      <group>
        <RoundedBox args={[0.32, 0.16, 0.22]} radius={0.05} smoothness={3}>
          <meshStandardMaterial color={color} metalness={0.7} roughness={0.25} />
        </RoundedBox>
        <mesh position={[0, 0.13, 0]}>
          <torusGeometry args={[0.08, 0.025, 10, 18]} />
          <meshStandardMaterial color="var(--ink-line)" />
        </mesh>
      </group>
    );
  }
  if (tokenType === 'thimble') {
    return (
      <group>
        <mesh>
          <cylinderGeometry args={[0.13, 0.1, 0.22, 18]} />
          <meshStandardMaterial color={color} metalness={0.65} roughness={0.3} />
        </mesh>
      </group>
    );
  }
  // Unknown — fall back to a sphere using the resolved color.
  return (
    <mesh><sphereGeometry args={[0.16, 18, 18]} />
      <meshStandardMaterial
        color={color}
        metalness={0.6}
        roughness={0.25}
        emissive={new THREE.Color(color)}
        emissiveIntensity={0.2}
      />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// <TokenTrail> — a short ribbon of fading quads behind the token
// ---------------------------------------------------------------------------

/** Number of quads in the ribbon trail. */
const TRAIL_SEGMENTS = 4;

/**
 * Short ribbon trail rendered behind the token while a hop chain is in
 * flight. Each segment fades in opacity from head (closest to token) to
 * tail (oldest sample), painted in `tokenTrailColor(player)` (Req 5.3).
 *
 * Implementation: a lightweight ref-driven sample buffer of the last
 * `TRAIL_SEGMENTS` token positions, refreshed every frame from the
 * caller via `setSample`. Hidden when `visible === false`.
 */
function TokenTrail({
  color,
  samples,
  visible,
}: {
  color: string;
  samples: ReadonlyArray<{ x: number; y: number; z: number }>;
  visible: boolean;
}): JSX.Element | null {
  if (!visible) return null;
  return (
    <group>
      {samples.map((s, i) => {
        // Head (i = samples.length - 1) is fully opaque; tail fades to ~0.05.
        const t = samples.length <= 1 ? 1 : i / (samples.length - 1);
        const opacity = 0.05 + 0.55 * t;
        const scale = 0.16 + 0.06 * t;
        return (
          <mesh key={i} position={[s.x, s.y, s.z]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[scale, 12]} />
            <meshBasicMaterial color={color} transparent opacity={opacity} />
          </mesh>
        );
      })}
    </group>
  );
}

// ---------------------------------------------------------------------------
// <PlayerToken> — main exported component
// ---------------------------------------------------------------------------

/**
 * State-diff-driven 3D player token. See module docstring at the top of
 * the FSM section for the full contract.
 *
 * Rendering rules:
 *   - Returns `null` when `isBankrupt` (matches the legacy contract).
 *   - When no `hopEvent` is in flight, the token sits at
 *     `getBoardPosition(position) + tokenOffset(playerOrderIndex)`. The
 *     active player gets a small sin-wave Y bounce.
 *   - When a fresh `hopEvent.ts` arrives, the FSM expands the path via
 *     `computeHopPath(from, to)` and tweens through each tile in turn.
 *   - On the final tile, the FSM enters the `land` phase, dispatches a
 *     one-shot `DUST_PUFF` and pulses a colored point light for the
 *     `token_settle` duration (300–600 ms) (Req 5.4).
 *   - When the event's `passedGo` is true, the +200$ billboard is shown
 *     above the token for `PASS_GO_BILLBOARD_MS` (1500 ms) and a
 *     `COIN_BURST` is dispatched on the chain start (Req 5.8).
 */
export function PlayerToken(props: PlayerTokenProps): JSX.Element | null {
  const {
    playerId,
    playerName,
    tokenType,
    position,
    isBankrupt,
    inJail,
    playerOrderIndex,
    isCurrentPlayer,
    hopEvent,
    reducedMotion = false,
  } = props;

  // --- Refs -----------------------------------------------------------------
  const groupRef = React.useRef<THREE.Group | null>(null);
  const fsmRef = React.useRef<FsmState>({
    phase: 'idle',
    path: [],
    tileCursor: 0,
    phaseStartElapsed: 0,
    fromPos: { x: 0, z: 0 },
    toPos: { x: 0, z: 0 },
    passedGo: false,
    chainStartElapsed: null,
    lastHopTs: null,
  });
  const trailSamplesRef = React.useRef<Array<{ x: number; y: number; z: number }>>([]);

  // Optional FX bus — gracefully no-ops when no provider is mounted.
  const fxBus = useFXBusOptional();

  // --- Derived values -------------------------------------------------------
  const offset = React.useMemo(() => tokenOffset(playerOrderIndex), [playerOrderIndex]);
  const trailColor = React.useMemo(
    () => tokenTrailColor({ token_type: tokenType }),
    [tokenType],
  );
  const tokenColor = trailColor; // same source of truth (Req 5.3)

  // Force re-render when chain ends so JSX-level overlays (billboard, glow
  // pointLight) reflect the latest state. We keep the per-frame motion in
  // refs to avoid React reconciliation cost in the hot path.
  const [renderTick, setRenderTick] = React.useState(0);
  const bumpRender = React.useCallback(() => {
    setRenderTick((n) => (n + 1) & 0xffff);
  }, []);

  // --- Hop event ingestion --------------------------------------------------
  React.useEffect(() => {
    if (!hopEvent) return;
    if (hopEvent.ts === fsmRef.current.lastHopTs) return;

    // Validate event tile indexes defensively. Out-of-range values mean
    // the upstream queue is out of contract; we ignore the event rather
    // than crash the canvas.
    const { from, to, passedGo, ts } = hopEvent;
    if (
      !Number.isInteger(from) || from < 0 || from >= BOARD_SPACES.length ||
      !Number.isInteger(to)   || to   < 0 || to   >= BOARD_SPACES.length
    ) {
      // eslint-disable-next-line no-console
      console.debug('[PlayerToken] ignored malformed hopEvent', hopEvent);
      fsmRef.current.lastHopTs = ts;
      return;
    }

    const path = computeHopPath(from, to);
    if (path.length === 0) {
      // Same-tile hop — nothing to animate. Mark the event consumed.
      fsmRef.current.lastHopTs = ts;
      return;
    }

    fsmRef.current.lastHopTs = ts;
    fsmRef.current.path = path;
    fsmRef.current.tileCursor = 0;
    fsmRef.current.passedGo = passedGo;
    fsmRef.current.chainStartElapsed = null;

    // Reduced-motion: snap directly to destination, skip phases entirely.
    if (reducedMotion) {
      const dest = tileWorldSlot(to, offset);
      fsmRef.current.fromPos = dest;
      fsmRef.current.toPos = dest;
      fsmRef.current.phase = 'idle';
      fsmRef.current.path = [];
      if (groupRef.current) {
        groupRef.current.position.set(dest.x, TOKEN_BASE_Y, dest.z);
        groupRef.current.scale.set(1, 1, 1);
      }
      bumpRender();
      return;
    }

    // Pass-Go side effects: dispatch COIN_BURST on chain start (Req 5.8).
    // The +200$ billboard is rendered as long as the chain is in flight.
    if (passedGo) {
      const origin = tileWorldSlot(from, offset);
      if (fxBus) {
        fxBus.play({
          kind: 'COIN_BURST',
          origin: { x: origin.x, y: TOKEN_BASE_Y + 0.4, z: origin.z },
          color: trailColor,
        });
      } else {
        // eslint-disable-next-line no-console
        console.debug('[PlayerToken] PASS_GO COIN_BURST', { playerId });
      }
    }

    // Enter the anticipate phase. The actual elapsed-time anchor is
    // captured on the next useFrame tick so animation timing is clock-
    // driven (matches `<Building>`).
    fsmRef.current.phase = 'anticipate';
    fsmRef.current.phaseStartElapsed = -1; // sentinel for "unset"
    fsmRef.current.fromPos = tileWorldSlot(from, offset);
    fsmRef.current.toPos = tileWorldSlot(path[0], offset);
    bumpRender();
  }, [hopEvent, offset, reducedMotion, fxBus, playerId, trailColor, bumpRender]);

  // Re-anchor the token when `position` changes outside of a hop chain
  // (e.g. teleport to jail, late-joiner snapshot seed). The FSM's
  // dedupe-by-ts guarantees this only fires for direct position writes.
  React.useEffect(() => {
    if (fsmRef.current.phase !== 'idle') return;
    if (!groupRef.current) return;
    const slot = tileWorldSlot(position, offset);
    groupRef.current.position.set(slot.x, TOKEN_BASE_Y, slot.z);
  }, [position, offset]);

  // --- Per-frame animation --------------------------------------------------
  useFrame((state) => {
    const grp = groupRef.current;
    if (!grp) return;
    const now = state.clock.elapsedTime;
    const fsm = fsmRef.current;

    // Initialize the chain-start anchor on the first tick after ingestion.
    if (fsm.chainStartElapsed === null && fsm.phase !== 'idle') {
      fsm.chainStartElapsed = now;
    }
    if (fsm.phaseStartElapsed === -1) {
      fsm.phaseStartElapsed = now;
    }

    // ---- Phase: idle -----------------------------------------------------
    if (fsm.phase === 'idle') {
      const slot = tileWorldSlot(position, offset);
      // Lerp position toward the rest slot so any external position write
      // settles smoothly rather than snapping mid-frame.
      grp.position.x = THREE.MathUtils.lerp(grp.position.x, slot.x, 0.12);
      grp.position.z = THREE.MathUtils.lerp(grp.position.z, slot.z, 0.12);
      // Active-player bounce; reduced-motion stays flat.
      const targetY =
        !reducedMotion && isCurrentPlayer
          ? TOKEN_BASE_Y + Math.abs(Math.sin(now * 4)) * 0.18
          : TOKEN_BASE_Y;
      grp.position.y = THREE.MathUtils.lerp(grp.position.y, targetY, 0.18);
      grp.scale.set(1, 1, 1);
      // Hide trail when not moving.
      trailSamplesRef.current = [];
      return;
    }

    // ---- Phase: anticipate ----------------------------------------------
    if (fsm.phase === 'anticipate') {
      const elapsedMs = (now - fsm.phaseStartElapsed) * 1000;
      const t = Math.min(1, elapsedMs / ANTICIPATE_MS);
      // Vertical squash to 0.85 then back up at the very end.
      const sy = 1.0 + (0.85 - 1.0) * t;
      grp.scale.set(1, sy, 1);
      grp.position.set(fsm.fromPos.x, TOKEN_BASE_Y, fsm.fromPos.z);
      if (elapsedMs >= ANTICIPATE_MS) {
        fsm.phase = 'jump';
        fsm.phaseStartElapsed = now;
      }
      return;
    }

    // ---- Phase: jump (per-tile arc with squash/stretch) -----------------
    if (fsm.phase === 'jump') {
      const hopMs = durationFor({ kind: 'token_hop' }, reducedMotion);
      const elapsedMs = (now - fsm.phaseStartElapsed) * 1000;
      const t = Math.min(1, elapsedMs / hopMs);

      // Position lerp + parabolic Y arc.
      const px = fsm.fromPos.x + (fsm.toPos.x - fsm.fromPos.x) * t;
      const pz = fsm.fromPos.z + (fsm.toPos.z - fsm.fromPos.z) * t;
      const arc = 4 * t * (1 - t); // 0 at endpoints, 1 at midpoint
      const py = TOKEN_BASE_Y + arc * HOP_APEX_Y;
      grp.position.set(px, py, pz);

      // Squash/stretch curve on Y; X / Z stay at 1 to keep the silhouette
      // recognisable.
      const sy = squashStretchScaleY(t);
      grp.scale.set(1, sy, 1);

      // Trail: capture the head sample. We keep at most TRAIL_SEGMENTS
      // samples and shift older ones toward the tail.
      const head = { x: px, y: py - 0.32, z: pz };
      const samples = trailSamplesRef.current;
      samples.push(head);
      if (samples.length > TRAIL_SEGMENTS) samples.splice(0, samples.length - TRAIL_SEGMENTS);

      if (t >= 1) {
        // Advance to the next tile in the path.
        fsm.tileCursor += 1;
        if (fsm.tileCursor >= fsm.path.length) {
          // Final tile reached — enter the land phase.
          fsm.phase = 'land';
          fsm.phaseStartElapsed = now;
          fsm.fromPos = fsm.toPos;
        } else {
          // Chain to the next hop.
          fsm.phase = 'jump';
          fsm.phaseStartElapsed = now;
          fsm.fromPos = fsm.toPos;
          fsm.toPos = tileWorldSlot(fsm.path[fsm.tileCursor], offset);
        }
      }
      return;
    }

    // ---- Phase: land (settle pulse + DUST_PUFF) -------------------------
    if (fsm.phase === 'land') {
      const settleMs = durationFor({ kind: 'token_settle' }, reducedMotion);
      const elapsedMs = (now - fsm.phaseStartElapsed) * 1000;
      const t = Math.min(1, elapsedMs / settleMs);

      // Stay anchored at the destination, scale eases back to 1.
      grp.position.set(fsm.toPos.x, TOKEN_BASE_Y, fsm.toPos.z);
      // Slight bounce-back so the settle reads visually.
      const sy = 0.85 + (1.0 - 0.85) * Math.min(1, t * 1.6);
      grp.scale.set(1, sy, 1);

      // Dispatch DUST_PUFF once on phase entry (t very small on first tick).
      // We use phaseStartElapsed === now to detect the first frame: the
      // FSM only enters `land` from the jump phase setting both fields.
      if (elapsedMs < 16 && t < 0.05) {
        const origin = { x: fsm.toPos.x, y: 0.05, z: fsm.toPos.z };
        if (fxBus) {
          fxBus.play({ kind: 'DUST_PUFF', origin, color: trailColor });
        } else {
          // eslint-disable-next-line no-console
          console.debug('[PlayerToken] settle DUST_PUFF', { playerId });
        }
      }

      // Fade trail out.
      const samples = trailSamplesRef.current;
      if (samples.length > 0 && t > 0.5) {
        // Drop one sample per ~1/4 of the remaining settle window.
        const targetLen = Math.max(0, Math.floor(TRAIL_SEGMENTS * (1 - t)));
        if (samples.length > targetLen) samples.splice(0, samples.length - targetLen);
      }

      if (t >= 1) {
        // Chain complete — return to idle. Clear trail and request a
        // re-render so JSX-level overlays (billboard, glow pulse) update.
        fsm.phase = 'idle';
        fsm.path = [];
        fsm.tileCursor = 0;
        fsm.passedGo = false;
        fsm.chainStartElapsed = null;
        trailSamplesRef.current = [];
        bumpRender();
      }
      return;
    }
  });

  // ---- Render --------------------------------------------------------------
  if (isBankrupt) return null;

  // Initial position: keep the SSR / first-paint placement aligned with
  // the resting slot so the first useFrame tick doesn't see a (0,0) → slot
  // jump. The useFrame loop overrides this on every subsequent frame.
  const restSlot = tileWorldSlot(position, offset);

  // Pass-Go billboard visibility: chain-driven. When `chainStartElapsed`
  // is non-null and we are still inside the visibility window, the +200$
  // text floats above the token. Re-renders are bumped on chain end so
  // the billboard disappears cleanly.
  const fsm = fsmRef.current;
  const showPassGoBillboard = fsm.passedGo && fsm.phase !== 'idle';

  // Glow pulse during the land phase (Req 5.4). Rendered as a colored
  // point light; intensity is constant for the settle window (FSM owns
  // the lifetime via phase transitions).
  const isSettling = fsm.phase === 'land';

  // Trail rendering — only while a hop chain is in flight, never under
  // reduced motion.
  const trailVisible = !reducedMotion && fsm.phase !== 'idle';

  return (
    <>
      <group ref={groupRef} position={[restSlot.x, TOKEN_BASE_Y, restSlot.z]}>
        {/* Shadow disc on ground */}
        <mesh position={[0, -0.32, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.22, 18]} />
          <meshBasicMaterial color="var(--ink-line)" transparent opacity={0.35} />
        </mesh>

        <TokenMesh tokenType={tokenType} color={tokenColor} />

        {/* Name label */}
        <Text
          position={[0, 0.45, 0]}
          fontSize={0.16}
          color={tokenColor}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.025}
          outlineColor="var(--ink-line)"
          fontWeight="bold"
        >
          {playerName.length > 10 ? playerName.substring(0, 9) + '…' : playerName}
        </Text>

        {/* Active-player highlight (Req 8.2 affordance for the 3D scene). */}
        {isCurrentPlayer && !isSettling && (
          <pointLight color={tokenColor} intensity={2.0} distance={2.2} />
        )}

        {/* Settle glow pulse (Req 5.4). */}
        {isSettling && (
          <pointLight color={tokenColor} intensity={3.5} distance={2.6} />
        )}

        {/* Pass-Go +200$ billboard (Req 5.8). */}
        {showPassGoBillboard && (
          <Text
            position={[0, 0.95, 0]}
            fontSize={0.28}
            color="#fbbf24"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.04}
            outlineColor="var(--ink-line)"
            fontWeight="bold"
          >
            +200$
          </Text>
        )}

        {/* Jail bars overlay */}
        {inJail && (
          <group position={[0, 0.2, 0]}>
            <Text fontSize={0.25} anchorX="center" anchorY="middle">
              🔒
            </Text>
          </group>
        )}

        {/* Subtle render-tick anchor — keeps `renderTick` referenced so   */}
        {/* React fast-refresh / linter doesn't flag it as unused.         */}
        <group userData={{ tick: renderTick, playerId }} />
      </group>

      {/* Ribbon trail — rendered as a *sibling* of the moving token group
          so each segment stays anchored to the world position where it
          was emitted (Req 5.3). Samples are captured in world space by
          the useFrame loop. Hidden under reduced-motion or when idle. */}
      {trailVisible && trailSamplesRef.current.length > 0 && (
        <TokenTrail color={trailColor} samples={trailSamplesRef.current} visible />
      )}
    </>
  );
}
