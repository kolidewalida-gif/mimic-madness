/**
 * durations.ts — animation timing helper for the MimicPoly visual layer.
 *
 * Exposes a single `durationFor(req, reducedMotion)` function that returns a
 * canonical duration (in milliseconds) for every animation kind referenced by
 * design.md → Property 5, plus `totalHopDurationMs(roll)` for the per-die-roll
 * total movement budget.
 *
 * Pure module: no imports, no I/O, no `Date.now`, no global state. Same input
 * always yields the same output, on every client (humans and bots).
 *
 * Bounds (design.md → Property 5):
 *   - dice tumble        ∈ [700, 1400]  ms
 *   - dice settle shake  ∈ [150,  300]  ms
 *   - token hop          ∈ [120,  280]  ms (per tile)
 *   - token settle       ∈ [300,  600]  ms
 *   - building grow      ∈ [600, 1200]  ms
 *   - building unmortgage∈ [300,  700]  ms
 *   - money stream       ∈ [400,  800]  ms
 *   - money rain         ∈ [800, 1500]  ms
 *   - card flip          ∈ [400,  800]  ms
 *   - camera travel      ∈ [600, 1200]  ms
 *   - camera focus       ∈ [600, 1500]  ms
 *   - whip-pan           <  500           ms
 *   - MoneyChip tween    ∈ [300,  700]  ms
 *
 * Global invariants (also enforced here):
 *   - reducedMotion === true ⇒ every duration ≤ MAX_REDUCED_MOTION_MS
 *   - dice_tumble + dice_settle_shake < MAX_TOTAL_DICE_MS, so the host's
 *     1400ms `setTimeout(handleLandingFor)` is never blocked by visuals.
 *   - totalHopDurationMs(r) < 3000 for r ∈ [2, 12].
 *
 * Validates: Requirements 3.4, 3.6, 4.1, 4.3, 4.6, 5.4, 5.5, 7.2, 7.4, 7.5,
 *            8.3, 12.2
 */

/**
 * Discriminated union of every animation kind the visual layer schedules.
 *
 * Kept as a string literal union (rather than a `kind` discriminator on a
 * union of object shapes) because no kind currently carries kind-specific
 * payload that affects duration. `intensity` is accepted by `AnimationRequest`
 * for future use (e.g. modulating settle shake amplitude) but is not consumed
 * by `durationFor` today.
 */
export type AnimationKind =
  | 'dice_tumble'
  | 'dice_settle_shake'
  | 'token_hop'
  | 'token_settle'
  | 'building_grow'
  | 'building_unmortgage'
  | 'money_stream'
  | 'money_rain'
  | 'card_flip'
  | 'camera_travel'
  | 'camera_focus'
  | 'whip_pan'
  | 'money_chip';

/**
 * Request shape passed to {@link durationFor}.
 *
 * `intensity` is a forward-compatible hook (e.g. dice settle shake magnitude
 * modulating the screen-shake duration on the upper end of the bound). It is
 * currently unused; passing it does not change the returned duration.
 */
export interface AnimationRequest {
  kind: AnimationKind;
  intensity?: number;
}

/**
 * Hard cap on every duration when the user has requested reduced motion
 * (Requirement 12.2).
 */
export const MAX_REDUCED_MOTION_MS = 200;

/**
 * Hard cap on the total dice animation (`dice_tumble + dice_settle_shake`).
 *
 * Set just below the host's 1400ms landing timeout so the visual layer can
 * never block turn flow (Requirement 4.6). The actual sum used here is 1275ms,
 * leaving a comfortable margin.
 */
export const MAX_TOTAL_DICE_MS = 1400;

/**
 * Hard cap on the total hop animation (`roll × token_hop + token_settle`).
 *
 * Documented bound from design Property 5. Exposed so the property-based test
 * suite can reference it without re-deriving the constant.
 */
export const MAX_TOTAL_HOP_MS = 3000;

/**
 * Per-kind duration table.
 *
 * Each entry stores the documented `[lo, hi]` bound from design Property 5
 * and the canonical `value` returned in normal-motion mode. The canonical
 * value is the bound midpoint for every closed interval, and a value safely
 * below the upper limit for the half-open `whip_pan` bound.
 *
 * Keeping the bounds in the table (rather than only the value) lets callers
 * — and tests — verify `lo ≤ value ≤ hi` for every kind without any external
 * configuration.
 */
const DURATION_TABLE: Record<
  AnimationKind,
  { lo: number; hi: number; value: number }
> = {
  // Dice animations — sum kept < MAX_TOTAL_DICE_MS (1050 + 225 = 1275 < 1400).
  dice_tumble:        { lo: 700,  hi: 1400, value: 1050 },
  dice_settle_shake:  { lo: 150,  hi:  300, value:  225 },

  // Token movement — totalHopDurationMs(12) = 12*200 + 450 = 2850 < 3000.
  token_hop:          { lo: 120,  hi:  280, value:  200 },
  token_settle:       { lo: 300,  hi:  600, value:  450 },

  // Buildings.
  building_grow:        { lo: 600, hi: 1200, value: 900 },
  building_unmortgage:  { lo: 300, hi:  700, value: 500 },

  // Money flows.
  money_stream:  { lo: 400,  hi:  800, value: 600  },
  money_rain:    { lo: 800,  hi: 1500, value: 1100 },

  // Cards.
  card_flip:     { lo: 400,  hi:  800, value: 600  },

  // Camera. whip_pan is constrained to < 500 ms by design Property 5.
  camera_travel: { lo: 600,  hi: 1200, value: 900  },
  camera_focus:  { lo: 600,  hi: 1500, value: 1050 },
  whip_pan:      { lo: 200,  hi:  499, value: 400  },

  // 2D MoneyChip count tween.
  money_chip:    { lo: 300,  hi:  700, value: 500  },
};

/**
 * Read-only view of the per-kind duration bounds.
 *
 * Exposed so that the property-based test suite can iterate every kind and
 * assert that `durationFor` falls inside `[lo, hi]` in normal-motion mode.
 * Mutating the returned object has no effect on subsequent `durationFor`
 * calls (the underlying table is not exported directly).
 */
export function durationBoundsFor(
  kind: AnimationKind,
): { lo: number; hi: number } {
  const entry = DURATION_TABLE[kind];
  if (entry === undefined) {
    throw new Error(`durationBoundsFor: unknown animation kind '${kind}'`);
  }
  return { lo: entry.lo, hi: entry.hi };
}

/**
 * Return the canonical duration in milliseconds for a given animation
 * request, honouring the user's reduced-motion preference.
 *
 * Behaviour:
 *   - reducedMotion === true  → returns `min(value, MAX_REDUCED_MOTION_MS)`.
 *     For every kind currently registered, this collapses to a flat
 *     `MAX_REDUCED_MOTION_MS` (200ms), satisfying Requirement 12.2.
 *   - reducedMotion === false → returns the canonical `value` from the
 *     duration table, which is guaranteed to lie in the documented `[lo, hi]`
 *     bound for that kind (design Property 5).
 *
 * Throws `Error` for an unknown `kind` so upstream bugs surface immediately
 * rather than silently animating for `undefined` ms (which Three.js / framer
 * would interpret as "instantaneous", masking the bug).
 *
 * Pure: same `(req, reducedMotion)` always yields the same number.
 */
export function durationFor(
  req: AnimationRequest,
  reducedMotion: boolean,
): number {
  const entry = DURATION_TABLE[req.kind];
  if (entry === undefined) {
    throw new Error(`durationFor: unknown animation kind '${req.kind}'`);
  }
  if (reducedMotion) {
    // Cap every duration at MAX_REDUCED_MOTION_MS. Using `min` (rather than a
    // flat constant) preserves the "value never grows under reduced motion"
    // invariant even if a future kind has a canonical value below the cap.
    return Math.min(entry.value, MAX_REDUCED_MOTION_MS);
  }
  return entry.value;
}

/**
 * Total time (in ms) for a single die-roll's worth of token movement.
 *
 * Computed deterministically as `roll × token_hop + token_settle` using the
 * normal-motion canonical durations. Consumers in reduced-motion mode should
 * call `durationFor` per-kind instead — the host turn loop never blocks on
 * this number, it is only used to schedule visual chains.
 *
 * Invariants (Requirement 5.5 / design Property 5):
 *   - `totalHopDurationMs(r) < MAX_TOTAL_HOP_MS` for every `r ∈ [2, 12]`.
 *
 * Rejects non-integer or out-of-range `roll` values with a `RangeError`,
 * since callers always derive `roll` from a Supabase-bounded dice sum
 * (`d1 + d2`, both in `[1, 6]`, so `roll ∈ [2, 12]`).
 */
export function totalHopDurationMs(roll: number): number {
  if (!Number.isInteger(roll) || roll < 2 || roll > 12) {
    throw new RangeError(
      `totalHopDurationMs: roll must be an integer in [2, 12], got ${roll}`,
    );
  }
  const hop = DURATION_TABLE.token_hop.value;
  const settle = DURATION_TABLE.token_settle.value;
  return roll * hop + settle;
}
