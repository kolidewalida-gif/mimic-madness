/**
 * Ownership predicate for MimicPoly color-group monopolies.
 *
 * Pure module — no I/O, no Date.now / Math.random, no React, no Supabase.
 *
 * This file exposes the **single** ownership predicate consumed by:
 *   - the property-panel `MONOPOLE` star stamp
 *     (`src/components/monopoly/MonopolyPropertyPanel.tsx`)
 *   - the 3D `<MonopolyAccentRing>` glow inside `<BoardZone>`
 *     (`src/components/monopoly/visual/BoardZone.tsx`)
 *
 * Both surfaces must derive the "this player owns the whole color group"
 * flag from the same predicate so they can never disagree visually. The
 * accent color used in both places equals
 * `TOKEN_COLORS[player.token_type]` (see `monopolyBoard.ts`).
 *
 * @see Requirement 3.7, 8.4 (Property 9)
 */

import {
  BOARD_SPACES,
  type BoardSpace,
  type PropertyGroup,
} from './monopolyBoard';

/**
 * Minimal shape of a property row consumed by `playerOwnsAllInGroup`.
 *
 * Typed loosely on purpose so this module does not depend on the full
 * `MonopolyProperty` / `MonopolyGame` types from the game-state layer:
 * any caller (Supabase row, mock state in tests, derived snapshot) can
 * pass an array of objects carrying just `property_index` and `owner_id`.
 */
export interface OwnedPropertyLike {
  property_index: number;
  owner_id: string | null;
}

/**
 * Loose state shape required by `playerOwnsAllInGroup`. Only the
 * `properties` array is read.
 */
export interface OwnershipState {
  properties: ReadonlyArray<OwnedPropertyLike>;
}

/**
 * Return every `BoardSpace` belonging to the given color / type group,
 * in board order.
 *
 * This is a thin re-export of the same helper from `monopolyBoard.ts`
 * so consumers needing the ownership predicate can pull both names from
 * a single module. Re-exported (not duplicated) to keep `BOARD_SPACES`
 * as the single source of truth for board geometry.
 *
 * @example
 * getPropertiesInGroup('brown').map(s => s.index); // [1, 3]
 * getPropertiesInGroup('darkblue').map(s => s.index); // [37, 39]
 */
export function getPropertiesInGroup(group: PropertyGroup): BoardSpace[] {
  return BOARD_SPACES.filter((s) => s.group === group);
}

/**
 * Return `true` iff `playerId` owns **every** tile in `group`.
 *
 * Definition (Property 9):
 *   playerOwnsAllInGroup(state, playerId, group) === true
 *     iff for every space S in getPropertiesInGroup(group),
 *         there exists a row R in state.properties with
 *         R.property_index === S.index and R.owner_id === playerId.
 *
 * Edge cases:
 * - If `getPropertiesInGroup(group)` is empty (no such group on the
 *   board), the predicate returns `false`. An empty group cannot
 *   constitute a monopoly and must not light up the `MONOPOLE` stamp
 *   nor the accent ring.
 * - If `playerId` is `null` / empty string, the predicate returns
 *   `false` (an unowned tile carries `owner_id === null`, which would
 *   spuriously match `null === null`).
 * - Mortgage status is intentionally ignored here: ownership of the
 *   group is what gates the visual stamp / ring; rent doubling rules
 *   that depend on mortgage status live in `calculateRent`.
 *
 * Pure: depends only on its arguments; safe to call inside `useMemo`,
 * selectors, and render bodies.
 */
export function playerOwnsAllInGroup(
  state: OwnershipState,
  playerId: string,
  group: PropertyGroup,
): boolean {
  if (!playerId) return false;

  const groupSpaces = getPropertiesInGroup(group);
  if (groupSpaces.length === 0) return false;

  for (const space of groupSpaces) {
    const row = state.properties.find(
      (p) => p.property_index === space.index,
    );
    if (!row || row.owner_id !== playerId) {
      return false;
    }
  }
  return true;
}
