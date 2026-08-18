/**
 * Particle effect catalog for MimicPoly.
 *
 * Twelve named effects fire from the FX bus in response to `RenderEvent`s
 * derived from Supabase state diffs (purchase, rent, jail, bankruptcy,
 * pass-go, dice settle, etc.). This module is the single source of truth
 * for the visual shape of each effect: it owns
 *
 *   - the `FXKind` literal union (12 effects, listed below),
 *   - the `FXParams` payload accepted by every effect,
 *   - one pure `buildXxx(slot, params)` builder per effect that writes
 *     positions, velocities, ttls, and material parameters into a slot
 *     borrowed from the {@link ParticlePool},
 *   - and the `applyEffect(slot, kind, params)` switch dispatcher.
 *
 * Each builder is responsible for:
 *   1. Choosing how many particles to emit (clamped to
 *      `slot.ttls.length`, i.e. the pool's `particlesPerSystemCap`,
 *      Requirement 11.3).
 *   2. Writing absolute world-space positions into `slot.positions`,
 *      a per-particle direction-of-motion into `slot.velocities` (units
 *      per second; the FX layer integrates these in `useFrame`),
 *      and a time-to-live in seconds into `slot.ttls`.
 *   3. Configuring the slot's `THREE.PointsMaterial` (color, size,
 *      opacity, blending) so the look matches the effect.
 *   4. Setting `slot.points.geometry.setDrawRange(0, count)` so the
 *      unused tail of the buffers is never rendered, and flipping
 *      `attributes.position.needsUpdate = true` so the GPU sees the
 *      new vertex data on the next frame.
 *   5. Resetting `slot.points.position.set(0, 0, 0)` because positions
 *      written into the buffer are absolute (the slot transform must
 *      not double-offset them).
 *
 * Determinism. Effects do not call `Math.random()` directly; they use a
 * tiny LCG seeded from `params.origin` so two clients diffing the same
 * snapshot produce visually identical bursts (Property 1, Requirement
 * 10.3). The randomness is purely cosmetic — game state never depends
 * on it — but stable visuals across clients still matter for
 * spectators / replays.
 *
 * Removability. The pool's `release(slot)` already hides the mesh,
 * zeroes ttls, and resets the draw range to 0. No effect leaves
 * persistent state outside the slot's owned buffers / material, so a
 * single `release()` call fully tears the effect down (Requirement
 * 11.3, "removable in one release() call").
 *
 * RED_FLASH / COLOR_FLASH / STAMP. The first two are full-screen
 * overlays and STAMP is a single oversized sprite ("DOUBLE !",
 * "EN PRISON", "MONOPOLE"). They do not naturally fit the
 * many-particles model. Per the design, the visual presentation of
 * those three is owned by `<FXLayer>` (DOM overlay for the flashes,
 * `<InkStamp>` billboard for STAMP). The builders below still respect
 * the slot contract — they simply emit a small number of stationary
 * "marker" particles at the origin so the FX layer can read the slot's
 * tunables (`color`, `durationMs`) without a separate code path.
 *
 * Validates Requirements 4.2, 4.3, 5.4, 6.1, 6.2, 6.4, 6.5, 6.6, 6.7,
 * 6.8, 11.3.
 */

import * as THREE from 'three';

import type { ParticleSlot } from './ParticlePool';

// -----------------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------------

/**
 * The 12 named particle effect kinds. This is the canonical literal
 * union — `monopolyAudioMap.ts` (task 2.9) imports `FXKind` from here
 * rather than redeclaring it, so the audio→FX mapping cannot drift
 * out of sync with the catalog.
 */
export type FXKind =
  | 'COIN_BURST'    // upward gold spray on PASS_GO and PURCHASE
  | 'DUST_PUFF'     // grey settle puff on hop landings + building grow
  | 'SPARKLE'       // twinkle white/gold on doubles and stamp reveals
  | 'CONFETTI'      // multi-color falling squares on GAME_END
  | 'MONEY_STREAM'  // green stream from payer to receiver on RENT_FLOW
  | 'MONEY_RAIN'    // green particles falling on collect cards
  | 'COIN_LOSS'     // gold-then-fade puff on pay cards
  | 'SHOCKWAVE'     // expanding ring on dice settle
  | 'JAIL_BARS'     // vertical light columns when sent to jail
  | 'RED_FLASH'     // overlay marker — visualised by FXLayer DOM layer
  | 'COLOR_FLASH'   // overlay marker — visualised by FXLayer DOM layer
  | 'STAMP';        // large single-particle marker for InkStamp billboard

/** Cartesian 3-vector payload type. Matches `THREE.Vector3` shape but is
 * structurally typed so callers can pass plain objects without
 * constructing a `Vector3`. */
export interface FXVec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Payload passed to {@link applyEffect} (and to every builder). All
 * fields except `origin` are optional; sensible defaults are picked per
 * effect when omitted.
 *
 * - `origin` : world-space anchor for the effect (tile center, token
 *   position, screen center for overlays, …).
 * - `color`  : optional accent color (e.g. owner color for a PURCHASE
 *   coin-burst). Falls back to the effect-specific default palette
 *   anchor (gold for coins, grey for dust, white for sparkle, …).
 * - `target` : optional second anchor for streams (MONEY_STREAM uses
 *   `origin → target` to draw the trajectory).
 * - `durationMs` : override the effect's default lifetime. Stored on
 *   the slot's userData so `<FXLayer>` knows when to release.
 * - `particleCount` : override the effect's default particle count;
 *   always clamped to `slot.ttls.length`.
 */
export interface FXParams {
  origin: FXVec3;
  color?: string;
  target?: FXVec3;
  durationMs?: number;
  particleCount?: number;
}

// -----------------------------------------------------------------------------
// Defaults & palette anchors
// -----------------------------------------------------------------------------

/**
 * Default lifetime per effect (milliseconds). These values are also the
 * source of truth for {@link applyEffect}'s slot-level lifetime tag —
 * they govern how long `<FXLayer>` keeps the slot before calling
 * `release()`. The numbers are aligned with the design's Requirement 4
 * (dice tumble window) and Requirement 6 (purchase / rent / card /
 * jail / bankruptcy / game-end FX windows).
 */
const DEFAULT_DURATION_MS: Record<FXKind, number> = {
  COIN_BURST: 900,
  DUST_PUFF: 500,
  SPARKLE: 600,
  CONFETTI: 2500,
  MONEY_STREAM: 800, // upper bound of [500, 1000] from Req 6.2
  MONEY_RAIN: 1500,  // mid-band of [1000, 2000] from Req 6.4
  COIN_LOSS: 700,
  SHOCKWAVE: 250,    // upper bound of [150, 300] from Req 4.3
  JAIL_BARS: 800,
  RED_FLASH: 250,
  COLOR_FLASH: 250,
  STAMP: 900,
};

/**
 * Default particle counts per effect. All are well below the canonical
 * `particlesPerSystemCap = 60` (Requirement 11.3); each builder also
 * clamps against `slot.ttls.length` so a smaller pool (e.g. low-tier
 * with `particlesPerSystemCap = 24`) still produces a valid burst.
 */
const DEFAULT_PARTICLE_COUNT: Record<FXKind, number> = {
  COIN_BURST: 24,
  DUST_PUFF: 14,
  SPARKLE: 18,
  CONFETTI: 60,
  MONEY_STREAM: 18,
  MONEY_RAIN: 36,
  COIN_LOSS: 12,
  SHOCKWAVE: 32,
  JAIL_BARS: 30,
  RED_FLASH: 1,
  COLOR_FLASH: 1,
  STAMP: 1,
};

/**
 * Per-effect default accent color. Pulled from the Ink-mode graffiti
 * palette anchors documented in Requirement 1.3 so the FX layer stays
 * visually consistent with the rest of the app. Callers may override
 * via `params.color` (e.g. owner color on PURCHASE).
 */
const DEFAULT_COLOR: Record<FXKind, string> = {
  COIN_BURST: '#fbbf24',   // amber / coin gold
  DUST_PUFF: '#cbd5e1',    // soft grey
  SPARKLE: '#ffffff',      // crisp white twinkle
  CONFETTI: '#ec4899',     // pink — overridden per-particle below
  MONEY_STREAM: '#22c55e', // green money
  MONEY_RAIN: '#22c55e',
  COIN_LOSS: '#fbbf24',    // gold that fades to red — see opacity ramp
  SHOCKWAVE: '#ffffff',
  JAIL_BARS: '#ef4444',    // jail red
  RED_FLASH: '#ef4444',
  COLOR_FLASH: 'var(--ink-accent)',  // generic purple fallback (token color overrides)
  STAMP: '#fbbf24',
};

/** Confetti color cycle — matches Req 1.3 palette anchors. */
const CONFETTI_COLORS = [
  'var(--ink-accent)', // purple
  '#ec4899', // pink
  'var(--ink-text-dim)', // cyan
  '#fbbf24', // amber
  '#22c55e', // green
  '#ef4444', // red
] as const;

// -----------------------------------------------------------------------------
// Deterministic RNG (LCG seeded from origin)
// -----------------------------------------------------------------------------

/**
 * Tiny linear congruential generator. The constants are the
 * "Numerical Recipes" pair (modulus 2³², multiplier 1664525, increment
 * 1013904223), which give a usable visual-quality stream without
 * pulling in a new dependency.
 *
 * Returns a function producing values in `[0, 1)`.
 */
function makeRng(seed: number): () => number {
  // Coerce seed to a non-negative 32-bit integer so the stream is
  // identical regardless of the caller's seed sign.
  let state = (seed >>> 0) || 1;
  return function next(): number {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    // Divide by 2^32 to map into [0, 1).
    return state / 4294967296;
  };
}

/**
 * Hash an FX origin into a 32-bit integer seed. We multiply each axis
 * by a different prime so that swapping x and z produces a different
 * stream (mirrors of the same effect should not look identical).
 */
function hashOrigin(o: FXVec3): number {
  // Use Math.imul to keep the running value in 32-bit signed-integer
  // arithmetic, which is what the LCG expects.
  // eslint-disable-next-line @typescript-eslint/no-bitwise
  let h = Math.imul(Math.round(o.x * 1000) | 0, 2654435761);
  // eslint-disable-next-line @typescript-eslint/no-bitwise
  h = (h ^ Math.imul(Math.round(o.y * 1000) | 0, 40503)) >>> 0;
  // eslint-disable-next-line @typescript-eslint/no-bitwise
  h = (h ^ Math.imul(Math.round(o.z * 1000) | 0, 2246822519)) >>> 0;
  return h;
}

// -----------------------------------------------------------------------------
// Slot helpers
// -----------------------------------------------------------------------------

/**
 * Internal helper that
 *   - clamps `count` to the slot's capacity,
 *   - resets the slot's transform to the world origin (effects use
 *     absolute positions inside the buffer),
 *   - clears any leftover particle data beyond the active count so a
 *     stale tail can never leak through `setDrawRange`,
 *   - returns the active count.
 */
function prepareSlot(slot: ParticleSlot, count: number): number {
  const cap = slot.ttls.length;
  const active = Math.max(0, Math.min(cap, Math.floor(count)));

  // Effects write world-space positions; make sure the slot's group
  // transform isn't double-applied.
  slot.points.position.set(0, 0, 0);
  slot.points.rotation.set(0, 0, 0);
  slot.points.scale.set(1, 1, 1);

  // Zero any tail beyond the active range so a previously-rendered
  // particle from a longer effect cannot reappear if a future effect
  // only fills part of the buffer.
  for (let i = active; i < cap; i++) {
    slot.ttls[i] = 0;
    slot.positions[i * 3 + 0] = 0;
    slot.positions[i * 3 + 1] = 0;
    slot.positions[i * 3 + 2] = 0;
    slot.velocities[i * 3 + 0] = 0;
    slot.velocities[i * 3 + 1] = 0;
    slot.velocities[i * 3 + 2] = 0;
  }

  return active;
}

/**
 * Internal helper that flushes geometry attribute updates and sets the
 * draw range to the active particle count. Called once at the end of
 * every builder; consolidates the boilerplate in one place.
 */
function commitSlot(slot: ParticleSlot, count: number): void {
  const geom = slot.points.geometry;
  geom.setDrawRange(0, count);
  const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;
  posAttr.needsUpdate = true;
  const velAttr = geom.getAttribute('velocity') as THREE.BufferAttribute | undefined;
  if (velAttr) velAttr.needsUpdate = true;
}

/**
 * Returns the slot's `THREE.PointsMaterial`, narrowing the union return
 * type of `points.material`. All slots in `ParticlePool` are
 * constructed with a single `PointsMaterial`, so the array branch never
 * fires in practice — we still guard against it to keep the type safe.
 */
function materialOf(slot: ParticleSlot): THREE.PointsMaterial {
  const m = slot.points.material;
  return Array.isArray(m) ? (m[0] as THREE.PointsMaterial) : (m as THREE.PointsMaterial);
}

/**
 * Tags the slot with the effect kind and lifetime. The FX layer reads
 * `slot.points.userData` each frame to know when to advance velocities
 * and when to call `release()`.
 */
function tagSlot(slot: ParticleSlot, kind: FXKind, durationMs: number): void {
  slot.points.userData.fxKind = kind;
  slot.points.userData.fxDurationMs = durationMs;
  slot.points.userData.fxStartedAt =
    typeof performance !== 'undefined' ? performance.now() : Date.now();
}

// -----------------------------------------------------------------------------
// Builders
// -----------------------------------------------------------------------------

/**
 * COIN_BURST — gold particles ejected upward in a hemispherical spray
 * with light gravity. Used for PURCHASE confirmation, PASS_GO bonus,
 * and money-collect events (Req 6.1, 5.8).
 */
export function buildCoinBurst(slot: ParticleSlot, params: FXParams): void {
  const kind: FXKind = 'COIN_BURST';
  const count = prepareSlot(
    slot,
    params.particleCount ?? DEFAULT_PARTICLE_COUNT[kind],
  );
  const rng = makeRng(hashOrigin(params.origin));
  const { x: ox, y: oy, z: oz } = params.origin;

  for (let i = 0; i < count; i++) {
    // Random direction inside the upper hemisphere.
    const angle = rng() * Math.PI * 2;
    const radial = 0.4 + rng() * 0.8; // 0.4..1.2 units/sec horizontal
    const upward = 1.5 + rng() * 1.5; // 1.5..3.0 units/sec vertical

    // Slight initial radial offset so the burst doesn't start as a
    // single point — gives the eye a "puff" rather than a "line".
    const startR = rng() * 0.05;
    slot.positions[i * 3 + 0] = ox + Math.cos(angle) * startR;
    slot.positions[i * 3 + 1] = oy + 0.05;
    slot.positions[i * 3 + 2] = oz + Math.sin(angle) * startR;

    slot.velocities[i * 3 + 0] = Math.cos(angle) * radial;
    slot.velocities[i * 3 + 1] = upward;
    slot.velocities[i * 3 + 2] = Math.sin(angle) * radial;

    slot.ttls[i] = 0.6 + rng() * 0.4; // 0.6..1.0s
  }

  const mat = materialOf(slot);
  mat.color.set(params.color ?? DEFAULT_COLOR[kind]);
  mat.size = 0.18;
  mat.opacity = 1.0;
  mat.transparent = true;
  mat.blending = THREE.AdditiveBlending;
  mat.depthWrite = false;
  mat.needsUpdate = true;

  tagSlot(slot, kind, params.durationMs ?? DEFAULT_DURATION_MS[kind]);
  commitSlot(slot, count);
}

/**
 * DUST_PUFF — small grey particles drifting outward and fading. Fires
 * on hop settle (Req 5.4) and on building grow contact (Req 3.4).
 */
export function buildDustPuff(slot: ParticleSlot, params: FXParams): void {
  const kind: FXKind = 'DUST_PUFF';
  const count = prepareSlot(
    slot,
    params.particleCount ?? DEFAULT_PARTICLE_COUNT[kind],
  );
  const rng = makeRng(hashOrigin(params.origin));
  const { x: ox, y: oy, z: oz } = params.origin;

  for (let i = 0; i < count; i++) {
    const angle = rng() * Math.PI * 2;
    const radial = 0.3 + rng() * 0.4;
    const upward = 0.2 + rng() * 0.4;

    slot.positions[i * 3 + 0] = ox;
    slot.positions[i * 3 + 1] = oy;
    slot.positions[i * 3 + 2] = oz;

    slot.velocities[i * 3 + 0] = Math.cos(angle) * radial;
    slot.velocities[i * 3 + 1] = upward;
    slot.velocities[i * 3 + 2] = Math.sin(angle) * radial;

    slot.ttls[i] = 0.3 + rng() * 0.2;
  }

  const mat = materialOf(slot);
  mat.color.set(params.color ?? DEFAULT_COLOR[kind]);
  mat.size = 0.22;
  mat.opacity = 0.7;
  mat.transparent = true;
  mat.blending = THREE.NormalBlending;
  mat.depthWrite = false;
  mat.needsUpdate = true;

  tagSlot(slot, kind, params.durationMs ?? DEFAULT_DURATION_MS[kind]);
  commitSlot(slot, count);
}

/**
 * SPARKLE — small twinkling particles that hover in a tight cluster
 * around the origin. Used for the doubles celebration burst (Req 4.4)
 * and the MONOPOLE / EN PRISON stamp reveal flourishes.
 */
export function buildSparkle(slot: ParticleSlot, params: FXParams): void {
  const kind: FXKind = 'SPARKLE';
  const count = prepareSlot(
    slot,
    params.particleCount ?? DEFAULT_PARTICLE_COUNT[kind],
  );
  const rng = makeRng(hashOrigin(params.origin));
  const { x: ox, y: oy, z: oz } = params.origin;

  for (let i = 0; i < count; i++) {
    // Cluster within a small jitter sphere so sparkles read as a
    // local twinkle instead of a moving spray.
    const jx = (rng() - 0.5) * 0.6;
    const jy = (rng() - 0.5) * 0.4 + 0.2;
    const jz = (rng() - 0.5) * 0.6;

    slot.positions[i * 3 + 0] = ox + jx;
    slot.positions[i * 3 + 1] = oy + jy;
    slot.positions[i * 3 + 2] = oz + jz;

    // Very slow drift; the visual interest comes from twinkle (alpha
    // modulation handled by FXLayer reading ttl), not motion.
    slot.velocities[i * 3 + 0] = (rng() - 0.5) * 0.2;
    slot.velocities[i * 3 + 1] = 0.1 + rng() * 0.2;
    slot.velocities[i * 3 + 2] = (rng() - 0.5) * 0.2;

    slot.ttls[i] = 0.4 + rng() * 0.4;
  }

  const mat = materialOf(slot);
  mat.color.set(params.color ?? DEFAULT_COLOR[kind]);
  mat.size = 0.14;
  mat.opacity = 1.0;
  mat.transparent = true;
  mat.blending = THREE.AdditiveBlending;
  mat.depthWrite = false;
  mat.needsUpdate = true;

  tagSlot(slot, kind, params.durationMs ?? DEFAULT_DURATION_MS[kind]);
  commitSlot(slot, count);
}

/**
 * CONFETTI — multi-color squares falling from above the camera with a
 * gentle horizontal drift. Spawned on GAME_END (Req 6.8). Per-particle
 * color is encoded by cycling the palette into the velocity buffer's
 * unused fourth slot is not possible (vec3), so we approximate by
 * letting `<FXLayer>` paint per-particle colors via a separate color
 * attribute when the slot's material has `vertexColors = true`. To keep
 * this builder pool-compatible (the pool ships only position/velocity
 * attributes), we instead emit a uniform color and rely on FXLayer to
 * spawn multiple `CONFETTI` slots with different palette entries when
 * variety is needed. The single-slot version is still pleasing because
 * confetti motion (rotation / gravity) carries the visual weight.
 */
export function buildConfetti(slot: ParticleSlot, params: FXParams): void {
  const kind: FXKind = 'CONFETTI';
  const count = prepareSlot(
    slot,
    params.particleCount ?? DEFAULT_PARTICLE_COUNT[kind],
  );
  const rng = makeRng(hashOrigin(params.origin));
  const { x: ox, y: oy, z: oz } = params.origin;

  for (let i = 0; i < count; i++) {
    // Spawn in a wide horizontal slab above the origin (camera-facing
    // FXLayer rotates the slot to camera space if needed).
    const sx = (rng() - 0.5) * 8;
    const sy = oy + 4 + rng() * 2;
    const sz = (rng() - 0.5) * 8;

    slot.positions[i * 3 + 0] = ox + sx;
    slot.positions[i * 3 + 1] = sy;
    slot.positions[i * 3 + 2] = oz + sz;

    // Mostly downward, gentle horizontal flutter.
    slot.velocities[i * 3 + 0] = (rng() - 0.5) * 0.6;
    slot.velocities[i * 3 + 1] = -1.0 - rng() * 0.8;
    slot.velocities[i * 3 + 2] = (rng() - 0.5) * 0.6;

    slot.ttls[i] = 1.8 + rng() * 0.7; // long-lived
  }

  const mat = materialOf(slot);
  // Pick a palette color from the cycle, deterministically by origin.
  // Callers wanting full multi-color confetti should call
  // `applyEffect` multiple times with different `params.color`.
  const paletteIndex =
    Math.floor(rng() * CONFETTI_COLORS.length) % CONFETTI_COLORS.length;
  mat.color.set(params.color ?? CONFETTI_COLORS[paletteIndex]);
  mat.size = 0.22;
  mat.opacity = 1.0;
  mat.transparent = true;
  mat.blending = THREE.NormalBlending;
  mat.depthWrite = false;
  mat.needsUpdate = true;

  tagSlot(slot, kind, params.durationMs ?? DEFAULT_DURATION_MS[kind]);
  commitSlot(slot, count);
}

/**
 * MONEY_STREAM — green particles flying from `origin` (payer) toward
 * `target` (receiver) along a slightly arched path. Used for RENT_FLOW
 * (Req 6.2). When `target` is omitted the stream defaults to a short
 * upward drift from the origin so the effect is always renderable.
 */
export function buildMoneyStream(slot: ParticleSlot, params: FXParams): void {
  const kind: FXKind = 'MONEY_STREAM';
  const count = prepareSlot(
    slot,
    params.particleCount ?? DEFAULT_PARTICLE_COUNT[kind],
  );
  const rng = makeRng(hashOrigin(params.origin));
  const { x: ox, y: oy, z: oz } = params.origin;
  // Default target is 1 unit up so the stream still reads when the
  // receiver hasn't been resolved yet (e.g. tax payments).
  const tx = params.target?.x ?? ox;
  const ty = params.target?.y ?? oy + 1;
  const tz = params.target?.z ?? oz;

  // Stream length and direction — used to compute per-particle
  // velocities so the cloud reaches the target within its TTL.
  const dx = tx - ox;
  const dy = ty - oy;
  const dz = tz - oz;
  const dist = Math.max(0.001, Math.sqrt(dx * dx + dy * dy + dz * dz));
  const ttlSeconds = (params.durationMs ?? DEFAULT_DURATION_MS[kind]) / 1000;
  // Aim for arrival around 80% of the TTL so the trail "lands" with a
  // tiny tail still visible in flight.
  const speed = dist / Math.max(0.1, ttlSeconds * 0.8);
  const ndx = dx / dist;
  const ndy = dy / dist;
  const ndz = dz / dist;

  for (let i = 0; i < count; i++) {
    // Spread the particles along the first 25% of the trajectory so
    // the cloud reads as a continuous stream rather than a single shot.
    const spawn = rng() * 0.25;
    const jitter = 0.12;

    slot.positions[i * 3 + 0] = ox + dx * spawn + (rng() - 0.5) * jitter;
    slot.positions[i * 3 + 1] = oy + dy * spawn + (rng() - 0.5) * jitter;
    slot.positions[i * 3 + 2] = oz + dz * spawn + (rng() - 0.5) * jitter;

    // Add a small upward arc bias so the stream curves like a
    // cartoon money trail.
    slot.velocities[i * 3 + 0] = ndx * speed;
    slot.velocities[i * 3 + 1] = ndy * speed + 0.4;
    slot.velocities[i * 3 + 2] = ndz * speed;

    slot.ttls[i] = ttlSeconds * (0.7 + rng() * 0.3);
  }

  const mat = materialOf(slot);
  mat.color.set(params.color ?? DEFAULT_COLOR[kind]);
  mat.size = 0.16;
  mat.opacity = 1.0;
  mat.transparent = true;
  mat.blending = THREE.AdditiveBlending;
  mat.depthWrite = false;
  mat.needsUpdate = true;

  tagSlot(slot, kind, params.durationMs ?? DEFAULT_DURATION_MS[kind]);
  commitSlot(slot, count);
}

/**
 * MONEY_RAIN — green particles falling from above the active player
 * for the "collect" card effect (Req 6.4).
 */
export function buildMoneyRain(slot: ParticleSlot, params: FXParams): void {
  const kind: FXKind = 'MONEY_RAIN';
  const count = prepareSlot(
    slot,
    params.particleCount ?? DEFAULT_PARTICLE_COUNT[kind],
  );
  const rng = makeRng(hashOrigin(params.origin));
  const { x: ox, y: oy, z: oz } = params.origin;

  for (let i = 0; i < count; i++) {
    const sx = (rng() - 0.5) * 2.5;
    const sy = 4 + rng() * 2; // start well above the token
    const sz = (rng() - 0.5) * 2.5;

    slot.positions[i * 3 + 0] = ox + sx;
    slot.positions[i * 3 + 1] = oy + sy;
    slot.positions[i * 3 + 2] = oz + sz;

    slot.velocities[i * 3 + 0] = (rng() - 0.5) * 0.3;
    slot.velocities[i * 3 + 1] = -2.0 - rng() * 1.0;
    slot.velocities[i * 3 + 2] = (rng() - 0.5) * 0.3;

    slot.ttls[i] = 1.0 + rng() * 0.5;
  }

  const mat = materialOf(slot);
  mat.color.set(params.color ?? DEFAULT_COLOR[kind]);
  mat.size = 0.18;
  mat.opacity = 1.0;
  mat.transparent = true;
  mat.blending = THREE.AdditiveBlending;
  mat.depthWrite = false;
  mat.needsUpdate = true;

  tagSlot(slot, kind, params.durationMs ?? DEFAULT_DURATION_MS[kind]);
  commitSlot(slot, count);
}

/**
 * COIN_LOSS — short downward gold puff that fades to red, fired on
 * pay / repairs cards (Req 6.5). The color/red blend is approximated
 * by emitting gold particles with an additive blend; FXLayer can layer
 * a `RED_FLASH` on top for the negative connotation.
 */
export function buildCoinLoss(slot: ParticleSlot, params: FXParams): void {
  const kind: FXKind = 'COIN_LOSS';
  const count = prepareSlot(
    slot,
    params.particleCount ?? DEFAULT_PARTICLE_COUNT[kind],
  );
  const rng = makeRng(hashOrigin(params.origin));
  const { x: ox, y: oy, z: oz } = params.origin;

  for (let i = 0; i < count; i++) {
    const angle = rng() * Math.PI * 2;
    const radial = 0.2 + rng() * 0.3;

    slot.positions[i * 3 + 0] = ox;
    slot.positions[i * 3 + 1] = oy + 0.4;
    slot.positions[i * 3 + 2] = oz;

    slot.velocities[i * 3 + 0] = Math.cos(angle) * radial;
    slot.velocities[i * 3 + 1] = -1.2 - rng() * 0.5; // falls down
    slot.velocities[i * 3 + 2] = Math.sin(angle) * radial;

    slot.ttls[i] = 0.4 + rng() * 0.3;
  }

  const mat = materialOf(slot);
  mat.color.set(params.color ?? DEFAULT_COLOR[kind]);
  mat.size = 0.16;
  mat.opacity = 0.9;
  mat.transparent = true;
  mat.blending = THREE.AdditiveBlending;
  mat.depthWrite = false;
  mat.needsUpdate = true;

  tagSlot(slot, kind, params.durationMs ?? DEFAULT_DURATION_MS[kind]);
  commitSlot(slot, count);
}

/**
 * SHOCKWAVE — expanding ring of particles in the XZ plane, fired on
 * dice settle (Req 4.3). Particles start at the origin and fly
 * outward; FXLayer's shake hook adds the screen offset.
 */
export function buildShockwave(slot: ParticleSlot, params: FXParams): void {
  const kind: FXKind = 'SHOCKWAVE';
  const count = prepareSlot(
    slot,
    params.particleCount ?? DEFAULT_PARTICLE_COUNT[kind],
  );
  const { x: ox, y: oy, z: oz } = params.origin;

  // Distribute evenly around the circle — no jitter, so the ring reads
  // as a clean shockwave rather than a fuzzy burst.
  for (let i = 0; i < count; i++) {
    const angle = (i / Math.max(1, count)) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    slot.positions[i * 3 + 0] = ox;
    slot.positions[i * 3 + 1] = oy + 0.05;
    slot.positions[i * 3 + 2] = oz;

    // Outward radial speed — 4 units/sec gives a satisfying snap at
    // 250ms (~1 unit), large enough to clear the dice but contained
    // within the tile.
    slot.velocities[i * 3 + 0] = cos * 4.0;
    slot.velocities[i * 3 + 1] = 0;
    slot.velocities[i * 3 + 2] = sin * 4.0;

    slot.ttls[i] = 0.25;
  }

  const mat = materialOf(slot);
  mat.color.set(params.color ?? DEFAULT_COLOR[kind]);
  mat.size = 0.2;
  mat.opacity = 0.9;
  mat.transparent = true;
  mat.blending = THREE.AdditiveBlending;
  mat.depthWrite = false;
  mat.needsUpdate = true;

  tagSlot(slot, kind, params.durationMs ?? DEFAULT_DURATION_MS[kind]);
  commitSlot(slot, count);
}

/**
 * JAIL_BARS — vertical columns of red particles around the jailed
 * player's token (Req 6.6). Particles are arranged into N stacks
 * (default 5) so the visual reads as the silhouette of bars even at
 * low particle counts.
 */
export function buildJailBars(slot: ParticleSlot, params: FXParams): void {
  const kind: FXKind = 'JAIL_BARS';
  const count = prepareSlot(
    slot,
    params.particleCount ?? DEFAULT_PARTICLE_COUNT[kind],
  );
  const rng = makeRng(hashOrigin(params.origin));
  const { x: ox, y: oy, z: oz } = params.origin;

  const barCount = Math.min(6, Math.max(3, Math.ceil(count / 5)));
  const radius = 0.5;

  for (let i = 0; i < count; i++) {
    const bar = i % barCount;
    const angle = (bar / barCount) * Math.PI * 2;
    const heightSlot = Math.floor(i / barCount);
    const heightMax = Math.max(1, Math.ceil(count / barCount));
    const t = heightSlot / heightMax; // 0..1 up the bar

    slot.positions[i * 3 + 0] = ox + Math.cos(angle) * radius;
    slot.positions[i * 3 + 1] = oy + 0.1 + t * 1.6; // 0.1 .. 1.7 high
    slot.positions[i * 3 + 2] = oz + Math.sin(angle) * radius;

    // Bars stay (mostly) put; tiny vertical shimmer for life.
    slot.velocities[i * 3 + 0] = 0;
    slot.velocities[i * 3 + 1] = (rng() - 0.5) * 0.2;
    slot.velocities[i * 3 + 2] = 0;

    slot.ttls[i] = 0.7 + rng() * 0.2;
  }

  const mat = materialOf(slot);
  mat.color.set(params.color ?? DEFAULT_COLOR[kind]);
  mat.size = 0.22;
  mat.opacity = 0.95;
  mat.transparent = true;
  mat.blending = THREE.AdditiveBlending;
  mat.depthWrite = false;
  mat.needsUpdate = true;

  tagSlot(slot, kind, params.durationMs ?? DEFAULT_DURATION_MS[kind]);
  commitSlot(slot, count);
}

/**
 * RED_FLASH — overlay marker. The actual full-screen red wash is
 * rendered by `<FXLayer>` as a DOM/CSS overlay (cheaper and avoids the
 * photosensitivity-cap on full-screen WebGL flashes, Req 12.5). The
 * builder writes one stationary particle so the slot still has a valid
 * draw range and the FX layer can read `slot.points.userData` to
 * trigger the overlay. Stays releasable in one `release()` call.
 */
export function buildRedFlash(slot: ParticleSlot, params: FXParams): void {
  buildOverlayMarker(slot, 'RED_FLASH', params);
}

/**
 * COLOR_FLASH — overlay marker. Same model as RED_FLASH but the FX
 * layer reads `params.color` (typically the active player's token
 * color) to tint the overlay. Used on PURCHASE confirmations
 * (Req 6.1).
 */
export function buildColorFlash(slot: ParticleSlot, params: FXParams): void {
  buildOverlayMarker(slot, 'COLOR_FLASH', params);
}

/**
 * STAMP — single oversized "marker" particle whose position is the
 * intended billboard anchor. `<FXLayer>` uses the slot's userData to
 * mount a 2D `<InkStamp>` (e.g. "DOUBLE !", "EN PRISON", "MONOPOLE").
 * The particle itself is rendered transparent so it never visually
 * competes with the stamp.
 */
export function buildStamp(slot: ParticleSlot, params: FXParams): void {
  buildOverlayMarker(slot, 'STAMP', params);
}

/**
 * Shared implementation for the three "marker-style" effects above.
 * Writes a single stationary particle at the origin, with a long-ish
 * TTL so the FX layer has a natural lifetime to drive its overlay.
 * Material opacity is dialled down to 0 for STAMP (the InkStamp does
 * the visual work) and to 0.0 for the flashes too, since the actual
 * flash is a DOM overlay; this keeps the in-scene contribution at
 * zero while preserving the slot contract.
 */
function buildOverlayMarker(
  slot: ParticleSlot,
  kind: 'RED_FLASH' | 'COLOR_FLASH' | 'STAMP',
  params: FXParams,
): void {
  const count = prepareSlot(
    slot,
    params.particleCount ?? DEFAULT_PARTICLE_COUNT[kind],
  );
  const { x: ox, y: oy, z: oz } = params.origin;

  // Always at least one particle so `setDrawRange(0, count)` is sane;
  // `prepareSlot` already clamps to capacity, so `count` may be 0 only
  // when the slot has zero capacity (degenerate pool).
  for (let i = 0; i < count; i++) {
    slot.positions[i * 3 + 0] = ox;
    slot.positions[i * 3 + 1] = oy;
    slot.positions[i * 3 + 2] = oz;

    slot.velocities[i * 3 + 0] = 0;
    slot.velocities[i * 3 + 1] = 0;
    slot.velocities[i * 3 + 2] = 0;

    // TTL = duration so the slot's lifetime is fully driven by
    // `tagSlot`'s `fxDurationMs` rather than per-particle TTL.
    slot.ttls[i] = (params.durationMs ?? DEFAULT_DURATION_MS[kind]) / 1000;
  }

  const mat = materialOf(slot);
  mat.color.set(params.color ?? DEFAULT_COLOR[kind]);
  mat.size = 0.01;
  // Marker particle is invisible: the visual is owned by the FXLayer
  // overlay (DOM flash, InkStamp). Alpha 0 keeps the slot a no-op in
  // the WebGL render and avoids the >50% screen luminance cap from
  // Req 12.5 since the actual flash is a CSS overlay.
  mat.opacity = 0.0;
  mat.transparent = true;
  mat.blending = THREE.NormalBlending;
  mat.depthWrite = false;
  mat.needsUpdate = true;

  tagSlot(slot, kind, params.durationMs ?? DEFAULT_DURATION_MS[kind]);
  commitSlot(slot, count);
}

// -----------------------------------------------------------------------------
// Dispatcher
// -----------------------------------------------------------------------------

/**
 * Apply an effect to a slot. Single switch so consumers (FXBus,
 * `<FXLayer>`) only need one entry point. Throws on an unknown kind so
 * a forgotten effect is caught at the type-check level (TS exhaustive
 * `never`) and at runtime.
 */
export function applyEffect(
  slot: ParticleSlot,
  kind: FXKind,
  params: FXParams,
): void {
  switch (kind) {
    case 'COIN_BURST':
      return buildCoinBurst(slot, params);
    case 'DUST_PUFF':
      return buildDustPuff(slot, params);
    case 'SPARKLE':
      return buildSparkle(slot, params);
    case 'CONFETTI':
      return buildConfetti(slot, params);
    case 'MONEY_STREAM':
      return buildMoneyStream(slot, params);
    case 'MONEY_RAIN':
      return buildMoneyRain(slot, params);
    case 'COIN_LOSS':
      return buildCoinLoss(slot, params);
    case 'SHOCKWAVE':
      return buildShockwave(slot, params);
    case 'JAIL_BARS':
      return buildJailBars(slot, params);
    case 'RED_FLASH':
      return buildRedFlash(slot, params);
    case 'COLOR_FLASH':
      return buildColorFlash(slot, params);
    case 'STAMP':
      return buildStamp(slot, params);
    default: {
      // Exhaustiveness check — any new FXKind missing here will fail
      // type-check at compile time.
      const _exhaustive: never = kind;
      throw new Error(`applyEffect: unknown FXKind ${String(_exhaustive)}`);
    }
  }
}

/**
 * Read-only view of the per-effect default lifetime table, exported
 * for callers (e.g. `useFXBus`) that want to schedule a slot release
 * without re-entering the catalog. Matches the tags written by
 * {@link applyEffect} via `tagSlot`.
 */
export const FX_DEFAULT_DURATION_MS: Readonly<Record<FXKind, number>> =
  DEFAULT_DURATION_MS;

/**
 * Read-only view of the per-effect default particle counts, useful for
 * sanity tests (Property 10 / Req 11.3 — "respects per-system cap").
 */
export const FX_DEFAULT_PARTICLE_COUNT: Readonly<Record<FXKind, number>> =
  DEFAULT_PARTICLE_COUNT;
