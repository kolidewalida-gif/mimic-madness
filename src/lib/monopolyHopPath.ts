/**
 * Mod-40 forward path helper for MimicPoly token hops.
 *
 * Pure module — no imports, no I/O, no Date.now / Math.random.
 *
 * Used by `<PlayerToken>` to expand a single Supabase position update
 * (`from` -> `to`) into the ordered list of intermediate tiles a token
 * must hop through, going forward around the board with wrap-around at
 * tile index 0 (passing GO).
 *
 * @see Requirement 5.1, 5.5, 5.8
 */

/**
 * Number of tiles on the MimicPoly board. The board is a cycle of length
 * `BOARD_SIZE`, so all hop math is taken modulo this value.
 */
export const BOARD_SIZE = 40;

function assertTileIndex(name: string, value: number): void {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < 0 ||
    value >= BOARD_SIZE
  ) {
    throw new RangeError(
      `computeHopPath: \`${name}\` must be an integer in [0, ${BOARD_SIZE}), got ${String(value)}`,
    );
  }
}

/**
 * Compute the ordered list of intermediate tiles a token must hop through
 * to travel forward from `from` to `to` on a `BOARD_SIZE`-tile cyclic board.
 *
 * Guarantees (verified by Property 3):
 * - `result.length === (to - from + BOARD_SIZE) % BOARD_SIZE`
 * - every value is in `[0, BOARD_SIZE)`
 * - strictly increasing modulo `BOARD_SIZE` (each next entry equals
 *   `(prev + 1) % BOARD_SIZE`)
 * - if `result.length > 0`, the last entry is `to`
 * - if `from === to`, returns an empty array (no hop)
 *
 * Examples:
 * - `computeHopPath(0, 5)`  -> `[1, 2, 3, 4, 5]`
 * - `computeHopPath(38, 2)` -> `[39, 0, 1, 2]` (passes GO)
 * - `computeHopPath(7, 7)`  -> `[]`
 *
 * @throws RangeError if `from` or `to` is not an integer in `[0, BOARD_SIZE)`.
 */
export function computeHopPath(from: number, to: number): number[] {
  assertTileIndex('from', from);
  assertTileIndex('to', to);

  const length = (to - from + BOARD_SIZE) % BOARD_SIZE;
  if (length === 0) return [];

  const path: number[] = new Array(length);
  for (let i = 0; i < length; i++) {
    path[i] = (from + 1 + i) % BOARD_SIZE;
  }
  return path;
}
