/**
 * ParticlePool — pre-allocated, bounded pool of `THREE.Points` systems.
 *
 * The MimicPoly visual layer schedules many short-lived particle effects
 * (coin bursts, dust puffs, sparkles, confetti, money streams, screen-shock
 * rings, jail bars, color flashes, etc.). Allocating fresh `THREE.Points` and
 * `BufferAttribute` instances per effect would spike GC pressure and cause
 * frame hitches during the most exciting moments of a turn — exactly when
 * the budget matters most.
 *
 * Instead, the pool pre-allocates a fixed number of slots at construction
 * time. Each slot owns one `THREE.Points` mesh, one `BufferGeometry` with
 * `position` and `velocity` attributes (length `3 * particlesPerSystemCap`),
 * one `Float32Array` of per-particle TTLs (length `particlesPerSystemCap`),
 * and one `THREE.PointsMaterial`. Effects acquire a slot, write their own
 * positions / velocities / ttls into the shared buffers, animate them via
 * `useFrame`, and release the slot when they finish.
 *
 * Contract:
 *   - `acquire()` returns the first free slot (marking it `inUse = true` and
 *     `points.visible = true`) or `null` if every slot is busy. It NEVER
 *     queues, NEVER throws, and NEVER allocates new geometry — exhaustion is
 *     a soft failure (the caller is expected to drop the request silently,
 *     per Requirement 11.3).
 *   - `release(slot)` clears `inUse`, hides the mesh, and zeroes the TTL
 *     buffer so a future `acquire()` returns a clean slot. Releasing a slot
 *     that is already free is a no-op.
 *   - The active count never exceeds `cap`, and per-slot particle count
 *     never exceeds `particlesPerSystemCap` (Requirement 11.3).
 *
 * The pool is intentionally framework-agnostic (no React, no @react-three
 * imports) so it can be unit-tested in plain Node without a renderer.
 *
 * Validates: Requirements 11.3, 11.7
 */

import * as THREE from 'three';

// -----------------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------------

/**
 * One pre-allocated particle system slot.
 *
 * Effects mutate `positions`, `velocities`, and `ttls` in place. The buffers
 * are sized `3 * particlesPerSystemCap` (positions/velocities) and
 * `particlesPerSystemCap` (ttls) once at construction time and never grow,
 * which is what makes the pool allocation-free at runtime.
 */
export interface ParticleSlot {
  /** Stable identifier for this slot, in `[0, cap)`. Useful for debugging. */
  id: number;
  /** Whether the slot is currently checked out via `acquire()`. */
  inUse: boolean;
  /** The reusable `THREE.Points` mesh attached to the scene graph. */
  points: THREE.Points;
  /** Position buffer view, length `3 * particlesPerSystemCap`. */
  positions: Float32Array;
  /** Velocity buffer view, length `3 * particlesPerSystemCap`. */
  velocities: Float32Array;
  /** Per-particle time-to-live (seconds), length `particlesPerSystemCap`. */
  ttls: Float32Array;
}

/**
 * Public pool API returned by {@link createParticlePool}.
 *
 * `cap` and `particlesPerSystemCap` are exposed so consumers can validate
 * effect parameters against the pool's actual configuration without holding
 * a separate copy of the config.
 */
export interface ParticlePool {
  /** Maximum number of simultaneously active slots. */
  readonly cap: number;
  /** Maximum particles per slot. */
  readonly particlesPerSystemCap: number;
  /**
   * The full list of pre-allocated slots, in id order. Exposed so callers
   * (typically `<FXLayer>`) can attach every `slot.points` mesh to the scene
   * graph once at mount and never have to add/remove children at runtime.
   */
  readonly slots: readonly ParticleSlot[];
  /**
   * Reserve a free slot. Returns `null` when all slots are currently in use.
   * Never queues, never throws, never allocates. The caller is expected to
   * drop the FX request silently on `null` (Req 11.3).
   */
  acquire(): ParticleSlot | null;
  /**
   * Return a slot to the pool, hiding its mesh and zeroing its TTL buffer.
   * Releasing a slot that is already free is a no-op.
   */
  release(slot: ParticleSlot): void;
  /** Number of slots currently checked out. Useful for instrumentation. */
  activeCount(): number;
  /**
   * Dispose every slot's geometry and material. Call when the pool is
   * unmounted (e.g. when the 3D Canvas is torn down) to free GPU resources.
   */
  dispose(): void;
}

/**
 * Construction options for {@link createParticlePool}.
 *
 * `cap` and `particlesPerSystemCap` default to the documented values from
 * Requirement 11.3 (8 simultaneous systems, 60 particles per system) so
 * callers that just want the canonical pool can call
 * `createParticlePool({})`-style; the tests explicitly pass smaller caps
 * to exercise exhaustion paths.
 */
export interface ParticlePoolOptions {
  cap?: number;
  particlesPerSystemCap?: number;
}

/** Default maximum simultaneous active particle systems (Req 11.3). */
export const DEFAULT_PARTICLE_SYSTEM_CAP = 8;

/** Default maximum particles per system (Req 11.3). */
export const DEFAULT_PARTICLES_PER_SYSTEM_CAP = 60;

// -----------------------------------------------------------------------------
// Implementation
// -----------------------------------------------------------------------------

/**
 * Build one fully-initialised slot with its own geometry, attributes, and
 * mesh. The slot starts free (`inUse = false`) and its mesh starts hidden
 * (`points.visible = false`) so attaching every slot to the scene graph at
 * mount time has no visual effect until `acquire()` flips the flag.
 */
function createSlot(id: number, particlesPerSystemCap: number): ParticleSlot {
  // Pre-allocate every buffer at full capacity. We never resize.
  const positions = new Float32Array(3 * particlesPerSystemCap);
  const velocities = new Float32Array(3 * particlesPerSystemCap);
  const ttls = new Float32Array(particlesPerSystemCap);

  const geometry = new THREE.BufferGeometry();
  // BufferAttribute keeps a reference to the typed array; effects can update
  // `positions` in place each frame and flip `attribute.needsUpdate = true`
  // to push to the GPU without reallocation.
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
  // Start with an empty draw range so a freshly-constructed (and not yet
  // acquired) slot renders nothing even if its `points.visible` flag is
  // somehow flipped on. Effects override the draw range to match their
  // active particle count when they take ownership of the slot.
  geometry.setDrawRange(0, 0);

  const material = new THREE.PointsMaterial({
    size: 0.1,
    sizeAttenuation: true,
    transparent: true,
    depthWrite: false,
    vertexColors: false,
  });

  const points = new THREE.Points(geometry, material);
  // Identify the slot on the THREE side too (helps when inspecting the scene
  // graph in devtools).
  points.name = `mimicpoly-particle-slot-${id}`;
  points.visible = false;
  // Render order is set so particles draw on top of opaque world geometry;
  // individual effects may override this if they need a different layer.
  points.renderOrder = 1;
  // Skip frustum culling: positions are written every frame from world-space
  // values that THREE cannot pre-compute a bounding sphere for cheaply, and
  // mistaken culling would make particles disappear at the worst moment.
  points.frustumCulled = false;

  return {
    id,
    inUse: false,
    points,
    positions,
    velocities,
    ttls,
  };
}

/**
 * Create a new particle pool with the given caps.
 *
 * Throws `RangeError` for non-positive or non-integer caps. The pool would
 * be unusable in those cases and silent fallbacks would only mask
 * configuration bugs.
 *
 * Example (canonical caps from Req 11.3):
 *   const pool = createParticlePool({ cap: 8, particlesPerSystemCap: 60 });
 *
 * Example (low perf-tier overrides — Req 11.2):
 *   const pool = createParticlePool({ cap: 4, particlesPerSystemCap: 24 });
 */
export function createParticlePool(
  opts: ParticlePoolOptions = {},
): ParticlePool {
  const cap = opts.cap ?? DEFAULT_PARTICLE_SYSTEM_CAP;
  const particlesPerSystemCap =
    opts.particlesPerSystemCap ?? DEFAULT_PARTICLES_PER_SYSTEM_CAP;

  if (!Number.isInteger(cap) || cap <= 0) {
    throw new RangeError(
      `createParticlePool: cap must be a positive integer, got ${cap}`,
    );
  }
  if (
    !Number.isInteger(particlesPerSystemCap) ||
    particlesPerSystemCap <= 0
  ) {
    throw new RangeError(
      `createParticlePool: particlesPerSystemCap must be a positive integer, got ${particlesPerSystemCap}`,
    );
  }

  const slots: ParticleSlot[] = [];
  for (let i = 0; i < cap; i++) {
    slots.push(createSlot(i, particlesPerSystemCap));
  }

  // Track active count explicitly. Recomputing it from `slots.filter` on
  // every call would be O(n); a counter keeps `activeCount()` O(1).
  let active = 0;

  /**
   * Linear scan for the first free slot. With `cap` defaulting to 8, this is
   * cheaper than maintaining an auxiliary free-list and avoids the extra
   * per-slot `nextFree` field in the data model.
   */
  function findFreeSlot(): ParticleSlot | null {
    for (let i = 0; i < slots.length; i++) {
      if (!slots[i].inUse) return slots[i];
    }
    return null;
  }

  function acquire(): ParticleSlot | null {
    const slot = findFreeSlot();
    if (slot === null) {
      // Exhaustion is a soft failure: return null and let the caller drop
      // the FX request (Req 11.3 / 11.7). We deliberately do NOT log here —
      // the FX bus is the right place for the (debug-only) drop log.
      return null;
    }
    slot.inUse = true;
    slot.points.visible = true;
    active++;
    return slot;
  }

  function release(slot: ParticleSlot): void {
    // Defensive: tolerate releasing a slot that isn't ours, or releasing
    // twice. Both would indicate a bug in the calling effect, but the pool
    // must never corrupt its own counter.
    if (!slot.inUse) return;
    if (slots[slot.id] !== slot) return;

    slot.inUse = false;
    slot.points.visible = false;
    // Zero the TTL buffer so the slot is "clean" for the next consumer.
    // Position / velocity buffers are intentionally left untouched: every
    // effect overwrites them on `acquire()` before rendering its first
    // frame, and skipping the wipe avoids ~720 unnecessary writes per
    // release at the canonical cap.
    slot.ttls.fill(0);
    // Collapse the draw range so the empty slot draws nothing even if a
    // future bug toggles `points.visible` outside of `acquire()`.
    slot.points.geometry.setDrawRange(0, 0);
    active--;
  }

  function activeCount(): number {
    return active;
  }

  function dispose(): void {
    for (const slot of slots) {
      slot.inUse = false;
      slot.points.visible = false;
      slot.points.geometry.dispose();
      const mat = slot.points.material as THREE.Material | THREE.Material[];
      if (Array.isArray(mat)) {
        for (const m of mat) m.dispose();
      } else {
        mat.dispose();
      }
    }
    active = 0;
  }

  return {
    cap,
    particlesPerSystemCap,
    slots,
    acquire,
    release,
    activeCount,
    dispose,
  };
}
