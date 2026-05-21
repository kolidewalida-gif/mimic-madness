/**
 * Multi-channel registry for MimicPoly render events.
 *
 * Every state-changing `RenderEvent` is conveyed to the player through one
 * or more of the five perceivable UI channels:
 *
 *   - `text`   : human-readable text changes (dice readout, modal copy,
 *                MoneyChip count-up, end-screen ranking, BANKRUPT label,
 *                "+200$" billboard).
 *   - `color`  : accent flash, panel border tint, red flash, gray-out
 *                overlay, MoneyChip green/red tint.
 *   - `icon`   : a stamp / badge / mesh icon (dice face, MONOPOLE star,
 *                jail bars, hotel mesh, card art, money symbol).
 *   - `motion` : any tween / animation / particle effect.
 *   - `sound`  : any cue from `useInkSoundEffects` (`audioMap(kind)`).
 *
 * `channelsFor(event)` returns the channels triggered for the given event,
 * derived from the documented `audioMap`, `fxMap`, and 2D Ink UI surfaces
 * in `design.md`. The lookup is a static, per-kind table — the table is
 * the canonical record, deliberately decoupled from the audio / FX maps so
 * we don't tie three modules together at runtime when the design already
 * fixes the per-kind channel set.
 *
 * Pure module — no I/O, no `Date.now()` / `Math.random()`, no React, no
 * Supabase, no `console.*`. Only `RenderEvent` is imported.
 *
 * @see Requirement 12.6 (Property 14: ≥ 2 channels per critical event)
 */

import type { RenderEvent } from './monopolyDiff';

/* ------------------------------------------------------------------ */
/* Channel union and CHANNELS roster                                  */
/* ------------------------------------------------------------------ */

/**
 * The five perceivable UI channels MimicPoly uses to convey a state
 * change. Naming matches the requirement glossary (Req 12.6).
 */
export type Channel = 'text' | 'color' | 'icon' | 'motion' | 'sound';

/**
 * Canonical roster of every `Channel`, in canonical order. Tests iterate
 * over this constant when asserting that removing any single channel from
 * a critical event still leaves at least one perceivable channel.
 *
 * Frozen so callers cannot mutate the global table by accident.
 */
export const CHANNELS: ReadonlyArray<Channel> = Object.freeze([
  'text',
  'color',
  'icon',
  'motion',
  'sound',
] as const);

/** Local alias for `RenderEvent['kind']` (the task limits imports to `RenderEvent`). */
type RenderEventKind = RenderEvent['kind'];

/* ------------------------------------------------------------------ */
/* Per-kind channel table                                             */
/* ------------------------------------------------------------------ */

/**
 * Static channel set per `RenderEvent.kind`, derived from the documented
 * `audioMap`, `fxMap`, and 2D Ink UI surfaces in `design.md`.
 *
 * Per-kind rationale (matches task 2.11):
 *
 *   - `DICE_ROLL`     → text (dice readout) + icon (dice face) + motion
 *                       (tumble) + sound (boing/pop). No accent color
 *                       on the readout itself.
 *   - `TOKEN_HOP`     → motion (per-tile hop) + sound (low-volume pop).
 *                       No text / color / icon on the hop alone — the
 *                       landing tile keeps its own visuals.
 *   - `PASS_GO`       → text ("+200$" billboard) + color (gold accent) +
 *                       icon (GO arrow) + motion (coin burst) + sound
 *                       (fanfare).
 *   - `PURCHASE`      → text (panel update) + color (owner color) +
 *                       icon (ring stamp) + motion (glow pulse) +
 *                       sound (ding).
 *   - `BUILDING_GROW` → color (owner color) + motion (scale tween) +
 *                       sound (boing+ding). Houses are part of the
 *                       persistent scene, not a new icon at the moment
 *                       of growth.
 *   - `MORTGAGE`      → color (gray overlay) + icon (chain) + motion
 *                       (tilt) + sound (zap).
 *   - `RENT_FLOW`     → text (chip count tween) + color (red/green
 *                       flash) + motion (money stream) + sound
 *                       (swoosh).
 *   - `MONEY_DELTA`   → text (count-up) + color (green/red flash) +
 *                       motion (chip particle) + sound (ding/zap).
 *   - `CARD_DRAW`     → text (card body) + icon (card art) + motion
 *                       (flip) + sound (swoosh).
 *   - `JAILED`        → color (red flash) + icon (jail bars) + motion
 *                       (jail FX) + sound (zap).
 *   - `UNJAILED`      → color (clear) + motion + sound (release).
 *   - `BANKRUPT`      → text (panel label) + color (red flash) + icon
 *                       (skull / banner) + motion (shrink fade) +
 *                       sound (long zap).
 *   - `GAME_END`      → text (winner banner) + color (accent) + icon
 *                       (crown) + motion (confetti) + sound (fanfare).
 *
 * Invariants:
 *   - every kind maps to a non-empty array;
 *   - every event in the critical set
 *     `{DICE_ROLL, PURCHASE, CARD_DRAW, JAILED, BANKRUPT, GAME_END}` plus
 *     rent-flavored `MONEY_DELTA` maps to at least 2 channels (Req 12.6 /
 *     Property 14), so removing any single channel still leaves at least
 *     one perceivable channel.
 */
const CHANNEL_TABLE: Readonly<Record<RenderEventKind, ReadonlyArray<Channel>>> =
  {
    DICE_ROLL:     ['text', 'icon', 'motion', 'sound'],
    TOKEN_HOP:     ['motion', 'sound'],
    PASS_GO:       ['text', 'color', 'icon', 'motion', 'sound'],
    PURCHASE:      ['text', 'color', 'icon', 'motion', 'sound'],
    BUILDING_GROW: ['color', 'motion', 'sound'],
    MORTGAGE:      ['color', 'icon', 'motion', 'sound'],
    RENT_FLOW:     ['text', 'color', 'motion', 'sound'],
    MONEY_DELTA:   ['text', 'color', 'motion', 'sound'],
    CARD_DRAW:     ['text', 'icon', 'motion', 'sound'],
    JAILED:        ['color', 'icon', 'motion', 'sound'],
    UNJAILED:      ['color', 'motion', 'sound'],
    BANKRUPT:      ['text', 'color', 'icon', 'motion', 'sound'],
    GAME_END:      ['text', 'color', 'icon', 'motion', 'sound'],
  };

/* ------------------------------------------------------------------ */
/* channelsFor                                                        */
/* ------------------------------------------------------------------ */

/**
 * Return the perceivable UI channels triggered by `event`.
 *
 * The lookup is purely a function of `event.kind`; the rest of the event
 * payload is ignored at this layer (downstream consumers — `MoneyChip`,
 * `MonopolyPropertyPanel`, `<FXLayer>` — branch on the payload to choose
 * the actual visual / acoustic content). Channels are returned in
 * canonical order (`['text', 'color', 'icon', 'motion', 'sound']`) so
 * equality between any two `channelsFor(event)` calls is stable and
 * structural comparisons in tests are deterministic.
 *
 * Pure: depends only on its argument; safe in `useMemo`, selectors, and
 * render bodies.
 *
 * @example
 *   channelsFor({ kind: 'DICE_ROLL', d1: 3, d2: 4, doubles: false })
 *   // => ['text', 'icon', 'motion', 'sound']
 *
 *   channelsFor({ kind: 'TOKEN_HOP', playerId: 'a',
 *                 from: 0, to: 5, passedGo: false })
 *   // => ['motion', 'sound']
 */
export function channelsFor(event: RenderEvent): readonly Channel[] {
  return CHANNEL_TABLE[event.kind];
}

/* ------------------------------------------------------------------ */
/* channelsRemoving                                                   */
/* ------------------------------------------------------------------ */

/**
 * Return `channelsFor(event)` with the `dropped` channel removed.
 *
 * Used by the property test for Req 12.6 / Property 14, which asserts
 * that for every critical event and every single channel `c`, the event
 * is still conveyed by at least one remaining channel after removing
 * `c`. The result preserves canonical order.
 *
 * If `dropped` is not in `channelsFor(event)`, the original list is
 * returned unchanged (a fresh array — callers may mutate without
 * corrupting the table).
 *
 * @example
 *   channelsRemoving(
 *     { kind: 'DICE_ROLL', d1: 3, d2: 4, doubles: false },
 *     'sound',
 *   )
 *   // => ['text', 'icon', 'motion']
 */
export function channelsRemoving(
  event: RenderEvent,
  dropped: Channel,
): readonly Channel[] {
  return channelsFor(event).filter((c) => c !== dropped);
}
