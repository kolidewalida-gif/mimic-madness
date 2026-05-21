/**
 * Convergence helpers for missed-update interpolation.
 *
 * When a remote client misses one or more state updates due to a transient
 * network issue, the visual layer needs to converge to the correct snapshot
 * within a bounded time. Small deltas tween smoothly; large deltas (out of
 * safe interpolation range) hard-snap to the canonical state.
 *
 * All functions in this module are pure: same inputs always yield the same
 * output, no I/O, no `Date.now()`, no global state reads.
 *
 * Validates: Requirements 10.4, 10.5
 */

/**
 * Default tile budget (in board squares) for position interpolation.
 *
 * Equal to one full die roll worth of movement (2..12). Position deltas
 * larger than this are considered "out of safe interpolation range" and
 * hard-snap rather than tween.
 */
export const DEFAULT_TILE_BUDGET = 12;

/**
 * Default money budget (in dollars) for money chip interpolation.
 *
 * Money deltas larger than this hard-snap to the canonical value rather
 * than running a count-up/count-down tween.
 */
export const DEFAULT_MONEY_BUDGET = 1500;

/**
 * Modular forward distance from `prev` to `next` over a circular board of
 * size `modulus`. Always returns a non-negative integer in `[0, modulus)`.
 *
 * Examples:
 *   forwardDistance(0, 5)        // 5
 *   forwardDistance(38, 2)       // 4   (passes GO at index 0)
 *   forwardDistance(7, 7)        // 0
 *   forwardDistance(5, 0)        // 35
 *
 * Pure function: no side effects, no I/O.
 *
 * @param prev    Previous position (any integer).
 * @param next    Next position (any integer).
 * @param modulus Board length. Defaults to 40 (Monopoly board).
 * @returns Forward distance in `[0, modulus)`.
 */
export function forwardDistance(
  prev: number,
  next: number,
  modulus: number = 40,
): number {
  // Normalise via double mod so negative inputs still produce a value in [0, modulus).
  const raw = ((next - prev) % modulus + modulus) % modulus;
  return raw;
}

/**
 * Convergence duration (in milliseconds) for tile-position interpolation.
 *
 * Behaviour:
 *   |deltaTiles| > budgetTiles  -> 0   (hard snap, out of safe range)
 *   deltaTiles === 0            -> 0   (nothing to animate)
 *   otherwise                   -> value in (0, 2000] proportional to |deltaTiles|
 *
 * The proportional formula is `clamp(|d| * 200, 120, 2000)` so every non-zero
 * in-budget delta produces a strictly positive duration capped at 2000ms,
 * satisfying Requirement 10.5 (converge within 2 seconds).
 *
 * Pure function: no side effects, no I/O.
 *
 * @param deltaTiles   Signed difference in tile indices (typically already a
 *                     forward distance, but sign is ignored).
 * @param budgetTiles  Maximum |delta| considered safe to interpolate.
 * @returns Duration in milliseconds, in `{0} ∪ (0, 2000]`.
 */
export function convergenceDuration(
  deltaTiles: number,
  budgetTiles: number,
): number {
  const abs = Math.abs(deltaTiles);
  if (abs === 0) return 0;
  if (abs > budgetTiles) return 0;
  return Math.min(2000, Math.max(120, abs * 200));
}

/**
 * Convergence duration (in milliseconds) for money-chip interpolation.
 *
 * Behaviour:
 *   |deltaMoney| > budget  -> 0   (hard snap, out of safe range)
 *   deltaMoney === 0       -> 0   (nothing to animate)
 *   otherwise              -> value in [300, 700] proportional to |deltaMoney|
 *
 * Mirrors `convergenceDuration` for tile positions but uses the documented
 * money-chip tween bounds (300..700ms) from design Property 5.
 *
 * Pure function: no side effects, no I/O.
 *
 * @param deltaMoney  Signed money difference in dollars.
 * @param budget      Maximum |delta| considered safe to interpolate.
 * @returns Duration in milliseconds, in `{0} ∪ [300, 700]`.
 */
export function moneyConvergenceDuration(
  deltaMoney: number,
  budget: number,
): number {
  const abs = Math.abs(deltaMoney);
  if (abs === 0) return 0;
  if (abs > budget) return 0;
  return Math.min(700, Math.max(300, 300 + abs / 2));
}
