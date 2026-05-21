// Pure module: maps board tiles to visual "zones" and exposes per-zone palettes.
//
// A zone is one of the 8 Monopoly color groups (brown / lightblue / pink / orange /
// red / yellow / green / darkblue) or one of the 4 corners (GO / JAIL / FREE_PARKING /
// GO_TO_JAIL). Railroads, utilities, chance, community, and tax tiles do not have
// their own palette and return `null` from `tileToZone`.
//
// This module is pure: no side effects, no imports beyond `BOARD_SPACES` and
// `PropertyGroup` from `./monopolyBoard`.

import { BOARD_SPACES, type PropertyGroup } from './monopolyBoard';

/** Discriminated union of every zone that has a dedicated palette. */
export type ZoneKey =
  | 'brown'
  | 'lightblue'
  | 'pink'
  | 'orange'
  | 'red'
  | 'yellow'
  | 'green'
  | 'darkblue'
  | 'corner_go'
  | 'corner_jail'
  | 'corner_free'
  | 'corner_gtj';

/** Visual palette + decor variant for a single zone. */
export interface ZonePalette {
  base: string;
  accent: string;
  light: string;
  decor:
    | 'lamppost'
    | 'fountain'
    | 'neonsign'
    | 'bench'
    | 'minicar'
    | 'tree'
    | 'spotlight'
    | 'go_arrow_neon'
    | 'jail_bars'
    | 'parking_neon'
    | 'gtj_lights';
}

/**
 * Per-zone color + decor map. 8 property groups + 4 corners = 12 entries.
 * Mirrors the table documented in design.md §"`<BoardZone>` (new)".
 */
export const ZONE_PALETTES: Record<ZoneKey, ZonePalette> = {
  brown:     { base: '#8B4513', accent: '#fbbf24', light: '#ffaa44', decor: 'lamppost' },
  lightblue: { base: '#87CEEB', accent: '#06b6d4', light: '#88e1ff', decor: 'fountain' },
  pink:      { base: '#FF69B4', accent: '#ec4899', light: '#ffb3da', decor: 'neonsign' },
  orange:    { base: '#FFA500', accent: '#fb923c', light: '#ffc977', decor: 'bench' },
  red:       { base: '#FF0000', accent: '#ef4444', light: '#ff6b6b', decor: 'minicar' },
  yellow:    { base: '#FFD700', accent: '#fbbf24', light: '#ffe066', decor: 'tree' },
  green:     { base: '#228B22', accent: '#22c55e', light: '#7be07b', decor: 'tree' },
  darkblue:  { base: '#00008B', accent: '#a855f7', light: '#9999ff', decor: 'spotlight' },
  corner_go:   { base: '#fbbf24', accent: '#fbbf24', light: '#ffeaa0', decor: 'go_arrow_neon' },
  corner_jail: { base: '#ef4444', accent: '#ef4444', light: '#ff8888', decor: 'jail_bars' },
  corner_free: { base: '#06b6d4', accent: '#06b6d4', light: '#88e1ff', decor: 'parking_neon' },
  corner_gtj:  { base: '#a855f7', accent: '#a855f7', light: '#caa3ff', decor: 'gtj_lights' },
};

/**
 * Ordered list of all 12 zone keys (8 color groups + 4 corners).
 * Useful for tests that iterate over every zone.
 */
export const ZONE_KEYS: readonly ZoneKey[] = [
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
] as const;

// Property-group string -> ZoneKey mapping. Railroads and utilities are
// intentionally absent: they belong to the closest color zone visually but
// do not get their own palette in the design.
const GROUP_TO_ZONE: Partial<Record<PropertyGroup, ZoneKey>> = {
  brown: 'brown',
  lightblue: 'lightblue',
  pink: 'pink',
  orange: 'orange',
  red: 'red',
  yellow: 'yellow',
  green: 'green',
  darkblue: 'darkblue',
};

// Corner tile index -> corner ZoneKey (GO / JAIL / FREE_PARKING / GO_TO_JAIL).
const CORNER_ZONES: Record<number, ZoneKey> = {
  0: 'corner_go',
  10: 'corner_jail',
  20: 'corner_free',
  30: 'corner_gtj',
};

/**
 * Resolve the zone a tile belongs to.
 *
 * - Corner indices 0 / 10 / 20 / 30 always map to their corner zone.
 * - Property tiles map by their `group` field on `BOARD_SPACES[i]`.
 * - Railroads, utilities, chance, community, and tax tiles return `null`
 *   (no dedicated palette in the design).
 * - Out-of-range indices return `null`.
 */
export function tileToZone(tileIndex: number): ZoneKey | null {
  const corner = CORNER_ZONES[tileIndex];
  if (corner) return corner;

  const space = BOARD_SPACES[tileIndex];
  if (!space || !space.group) return null;

  return GROUP_TO_ZONE[space.group] ?? null;
}
