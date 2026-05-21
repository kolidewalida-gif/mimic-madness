/**
 * Pure state-diff layer for MimicPoly.
 *
 * `deriveRenderEvents(prev, next)` is the **single** function that turns two
 * consecutive snapshots of the Supabase tables (`monopoly_games`,
 * `monopoly_players`, `monopoly_properties`) into an ordered list of
 * `RenderEvent`s consumed by the visual layer (`useMonopolyAnimationQueue`,
 * `<Board3D>` FX, audio, camera).
 *
 * Properties guaranteed by this module (validated by the property tests in
 * `__tests__/monopolyDiff.*.pbt.test.ts`):
 *
 *   - **Pure**: depends only on its arguments. No I/O, no `Date.now()`,
 *     no `Math.random()`, no React, no Supabase, no `console.*`.
 *   - **Idempotent on duplicates**: `deriveRenderEvents(s, s)` returns `[]`.
 *   - **Empty on cold start**: `deriveRenderEvents(null, s)` returns `[]`.
 *   - **Deterministic order**: the diff rules are applied in the order
 *     documented below (task 2.4 §"Apply diff rules"). Within each rule,
 *     iteration is stable: per-player rules iterate `next.game.player_order`,
 *     per-property rules iterate ascending `property_index`.
 *   - **Observer-independent**: output does not depend on any client-side
 *     identity. Bots and humans yield identical event streams.
 *
 * Only `BOARD_SPACES` is imported (for the `price` field on `PURCHASE`).
 * Snapshot interfaces are declared locally so this module stays decoupled
 * from `useMonopolyGame` and is unit-testable in isolation.
 *
 * @see Requirements 5.1, 5.6, 5.8, 6.1, 6.2, 6.3, 6.4, 6.6, 6.7, 6.8, 6.9,
 *      10.1, 10.3, 10.7, 10.8, 11.7, 13.2, 13.6
 */

import { BOARD_SPACES } from './monopolyBoard';

/* ------------------------------------------------------------------ */
/* RenderEvent kinds                                                  */
/* ------------------------------------------------------------------ */

/**
 * Ordered list of every `RenderEvent.kind`. Exposed as a readonly tuple so
 * tests, audio maps, and FX maps can iterate every kind with type safety.
 */
export const RENDER_EVENT_KINDS = [
  'DICE_ROLL',
  'TOKEN_HOP',
  'PASS_GO',
  'PURCHASE',
  'BUILDING_GROW',
  'MORTGAGE',
  'RENT_FLOW',
  'MONEY_DELTA',
  'CARD_DRAW',
  'JAILED',
  'UNJAILED',
  'BANKRUPT',
  'GAME_END',
] as const;

export type RenderEventKind = (typeof RENDER_EVENT_KINDS)[number];

/** Heuristic reason attached to a `MONEY_DELTA` event. */
export type MoneyDeltaReason =
  | 'collect'
  | 'pay'
  | 'tax'
  | 'go'
  | 'free_parking'
  | 'rent'
  | 'unknown';

/* ------------------------------------------------------------------ */
/* Snapshot interfaces (lightweight Supabase row shapes)              */
/* ------------------------------------------------------------------ */

/**
 * Lightweight shape of `public.monopoly_games` consumed by the diff layer.
 *
 * Declared locally on purpose: this module must NOT import the row types
 * from `src/hooks/useMonopolyGame.tsx` so that it stays pure, free of any
 * React or Supabase dependency, and trivially testable.
 */
export interface MonopolyGameSnapshot {
  current_player_index: number;
  player_order: string[];
  phase: string;
  free_parking_pot: number;
  is_finished: boolean;
  winner_id: string | null;
  last_dice_1: number | null;
  last_dice_2: number | null;
  doubles_count: number;
}

/** Lightweight shape of `public.monopoly_players`. */
export interface MonopolyPlayerSnapshot {
  player_id: string;
  position: number;
  money: number;
  is_bankrupt: boolean;
  in_jail: boolean;
}

/** Lightweight shape of `public.monopoly_properties`. */
export interface MonopolyPropertySnapshot {
  property_index: number;
  owner_id: string | null;
  houses: number;
  is_mortgaged: boolean;
}

/** A full board snapshot at a single instant. */
export interface Snapshot {
  game: MonopolyGameSnapshot;
  players: MonopolyPlayerSnapshot[];
  properties: MonopolyPropertySnapshot[];
}

/* ------------------------------------------------------------------ */
/* RenderEvent discriminated union                                    */
/* ------------------------------------------------------------------ */

export type RenderEvent =
  | { kind: 'DICE_ROLL'; d1: number; d2: number; doubles: boolean }
  | {
      kind: 'TOKEN_HOP';
      playerId: string;
      from: number;
      to: number;
      passedGo: boolean;
    }
  | { kind: 'PASS_GO'; playerId: string; tile: number }
  | { kind: 'PURCHASE'; playerId: string; tile: number; price: number }
  | {
      kind: 'BUILDING_GROW';
      tile: number;
      oldHouses: number;
      newHouses: number;
    }
  | { kind: 'MORTGAGE'; tile: number; mortgaged: boolean }
  | { kind: 'RENT_FLOW'; from: string; to: string; amount: number }
  | {
      kind: 'MONEY_DELTA';
      playerId: string;
      delta: number;
      reason: MoneyDeltaReason;
    }
  | { kind: 'CARD_DRAW'; playerId: string; cardId: string }
  | { kind: 'JAILED'; playerId: string }
  | { kind: 'UNJAILED'; playerId: string }
  | { kind: 'BANKRUPT'; playerId: string }
  | { kind: 'GAME_END'; winnerId: string };

/* ------------------------------------------------------------------ */
/* Internal helpers                                                   */
/* ------------------------------------------------------------------ */

/**
 * Build a stable lookup keyed by `player_id`. Iteration order of the result
 * is undefined; consumers must iterate `game.player_order` for determinism.
 */
function indexPlayers(
  players: ReadonlyArray<MonopolyPlayerSnapshot>,
): Map<string, MonopolyPlayerSnapshot> {
  const m = new Map<string, MonopolyPlayerSnapshot>();
  for (const p of players) {
    m.set(p.player_id, p);
  }
  return m;
}

/**
 * Build a stable lookup keyed by `property_index`. Iteration order of the
 * result is undefined; consumers must iterate ascending `property_index`
 * for determinism.
 */
function indexProperties(
  properties: ReadonlyArray<MonopolyPropertySnapshot>,
): Map<number, MonopolyPropertySnapshot> {
  const m = new Map<number, MonopolyPropertySnapshot>();
  for (const p of properties) {
    m.set(p.property_index, p);
  }
  return m;
}

/**
 * Heuristic reason for a non-paired money delta.
 *
 * - `+200` after the player passed GO this same diff -> `'go'`
 * - any positive delta -> `'collect'`
 * - any negative delta -> `'pay'`
 * - zero delta -> `'unknown'` (caller filters these out)
 */
function moneyDeltaReason(
  delta: number,
  prevPosition: number,
  nextPosition: number,
): MoneyDeltaReason {
  if (delta === 0) return 'unknown';
  if (delta === 200 && nextPosition < prevPosition) return 'go';
  if (delta > 0) return 'collect';
  return 'pay';
}

/* ------------------------------------------------------------------ */
/* deriveRenderEvents                                                 */
/* ------------------------------------------------------------------ */

/**
 * Diff two consecutive `Snapshot`s and return the ordered list of
 * `RenderEvent`s the visual layer should consume.
 *
 * Rules are applied in the documented deterministic order:
 *
 *   1. `DICE_ROLL` if `(last_dice_1, last_dice_2)` changed.
 *   2. For each player whose `position` changed (iterating
 *      `next.game.player_order`): emit `TOKEN_HOP{passedGo}`, then
 *      immediately `PASS_GO` if `passedGo`.
 *   3. `JAILED` / `UNJAILED` for each player whose `in_jail` flipped.
 *   4. `BANKRUPT` for each player whose `is_bankrupt` flipped `false -> true`.
 *   5. `PURCHASE` for each property whose `owner_id` went `null -> X`
 *      (iterating ascending `property_index`).
 *   6. `BUILDING_GROW` for each property whose `houses` increased.
 *   7. `MORTGAGE` for each property whose `is_mortgaged` flipped.
 *   8. `RENT_FLOW` + paired `MONEY_DELTA{reason: 'rent'}` if exactly one
 *      player lost `X > 0` and exactly one other gained the same `X`.
 *      Otherwise emit one `MONEY_DELTA` per non-zero diff with a heuristic
 *      reason.
 *   9. `CARD_DRAW` if `phase` transitioned to `'card'`.
 *  10. `GAME_END` if `is_finished` transitioned `false -> true`.
 *
 * @param prev Previous snapshot, or `null` on cold start (returns `[]`).
 * @param next Current snapshot.
 * @returns Ordered, deterministic list of render events.
 */
export function deriveRenderEvents(
  prev: Snapshot | null,
  next: Snapshot,
): RenderEvent[] {
  // Cold start / late join: visual state seeds from `next` only, no replay.
  if (prev === null) return [];

  const events: RenderEvent[] = [];

  const prevPlayers = indexPlayers(prev.players);
  const nextPlayers = indexPlayers(next.players);
  const prevProps = indexProperties(prev.properties);
  const nextProps = indexProperties(next.properties);

  // The order in which we iterate players for player-keyed rules. Using
  // `next.game.player_order` keeps output stable across reorderings of the
  // raw `players` array (which Supabase gives no guaranteed order).
  const playerOrder = next.game.player_order;

  /* ------------------------------------------------------------ */
  /* Rule 1 — DICE_ROLL                                           */
  /* ------------------------------------------------------------ */
  const prevD1 = prev.game.last_dice_1;
  const prevD2 = prev.game.last_dice_2;
  const nextD1 = next.game.last_dice_1;
  const nextD2 = next.game.last_dice_2;
  const diceChanged =
    (prevD1 !== nextD1 || prevD2 !== nextD2) &&
    nextD1 !== null &&
    nextD2 !== null;
  if (diceChanged) {
    events.push({
      kind: 'DICE_ROLL',
      d1: nextD1 as number,
      d2: nextD2 as number,
      doubles: nextD1 === nextD2,
    });
  }

  /* ------------------------------------------------------------ */
  /* Rule 2 — TOKEN_HOP + PASS_GO (per player, in player_order)   */
  /* ------------------------------------------------------------ */
  for (const playerId of playerOrder) {
    const before = prevPlayers.get(playerId);
    const after = nextPlayers.get(playerId);
    if (!before || !after) continue;
    if (before.position === after.position) continue;

    const passedGo = after.position < before.position;
    events.push({
      kind: 'TOKEN_HOP',
      playerId,
      from: before.position,
      to: after.position,
      passedGo,
    });
    if (passedGo) {
      events.push({ kind: 'PASS_GO', playerId, tile: after.position });
    }
  }

  /* ------------------------------------------------------------ */
  /* Rule 3 — JAILED / UNJAILED                                   */
  /* ------------------------------------------------------------ */
  for (const playerId of playerOrder) {
    const before = prevPlayers.get(playerId);
    const after = nextPlayers.get(playerId);
    if (!before || !after) continue;
    if (before.in_jail === after.in_jail) continue;

    if (after.in_jail) {
      events.push({ kind: 'JAILED', playerId });
    } else {
      events.push({ kind: 'UNJAILED', playerId });
    }
  }

  /* ------------------------------------------------------------ */
  /* Rule 4 — BANKRUPT                                            */
  /* ------------------------------------------------------------ */
  for (const playerId of playerOrder) {
    const before = prevPlayers.get(playerId);
    const after = nextPlayers.get(playerId);
    if (!before || !after) continue;
    if (!before.is_bankrupt && after.is_bankrupt) {
      events.push({ kind: 'BANKRUPT', playerId });
    }
  }

  /* ------------------------------------------------------------ */
  /* Rule 5 — PURCHASE (ascending property_index)                 */
  /* ------------------------------------------------------------ */
  const propIndexes = Array.from(
    new Set([
      ...Array.from(prevProps.keys()),
      ...Array.from(nextProps.keys()),
    ]),
  ).sort((a, b) => a - b);

  for (const tile of propIndexes) {
    const before = prevProps.get(tile);
    const after = nextProps.get(tile);
    if (!before || !after) continue;
    if (before.owner_id === null && after.owner_id !== null) {
      const space = BOARD_SPACES[tile];
      events.push({
        kind: 'PURCHASE',
        playerId: after.owner_id,
        tile,
        price: space?.price ?? 0,
      });
    }
  }

  /* ------------------------------------------------------------ */
  /* Rule 6 — BUILDING_GROW (ascending property_index)            */
  /* ------------------------------------------------------------ */
  for (const tile of propIndexes) {
    const before = prevProps.get(tile);
    const after = nextProps.get(tile);
    if (!before || !after) continue;
    if (after.houses > before.houses) {
      events.push({
        kind: 'BUILDING_GROW',
        tile,
        oldHouses: before.houses,
        newHouses: after.houses,
      });
    }
  }

  /* ------------------------------------------------------------ */
  /* Rule 7 — MORTGAGE (ascending property_index)                 */
  /* ------------------------------------------------------------ */
  for (const tile of propIndexes) {
    const before = prevProps.get(tile);
    const after = nextProps.get(tile);
    if (!before || !after) continue;
    if (before.is_mortgaged !== after.is_mortgaged) {
      events.push({
        kind: 'MORTGAGE',
        tile,
        mortgaged: after.is_mortgaged,
      });
    }
  }

  /* ------------------------------------------------------------ */
  /* Rule 8 — RENT_FLOW + MONEY_DELTA                             */
  /* ------------------------------------------------------------ */
  // Compute money diff per player (in player_order for stable iteration).
  type MoneyDiff = { playerId: string; delta: number };
  const diffs: MoneyDiff[] = [];
  for (const playerId of playerOrder) {
    const before = prevPlayers.get(playerId);
    const after = nextPlayers.get(playerId);
    if (!before || !after) continue;
    const delta = after.money - before.money;
    if (delta !== 0) {
      diffs.push({ playerId, delta });
    }
  }

  // RENT_FLOW: exactly one loser of X>0 and exactly one gainer of the same X.
  let rentEmitted = false;
  if (diffs.length === 2) {
    const negatives = diffs.filter((d) => d.delta < 0);
    const positives = diffs.filter((d) => d.delta > 0);
    if (negatives.length === 1 && positives.length === 1) {
      const loser = negatives[0];
      const gainer = positives[0];
      const amount = -loser.delta; // X > 0
      if (amount > 0 && gainer.delta === amount) {
        events.push({
          kind: 'RENT_FLOW',
          from: loser.playerId,
          to: gainer.playerId,
          amount,
        });
        events.push({
          kind: 'MONEY_DELTA',
          playerId: loser.playerId,
          delta: loser.delta,
          reason: 'rent',
        });
        events.push({
          kind: 'MONEY_DELTA',
          playerId: gainer.playerId,
          delta: gainer.delta,
          reason: 'rent',
        });
        rentEmitted = true;
      }
    }
  }

  // Generic MONEY_DELTA otherwise — one event per non-zero diff, in player_order.
  if (!rentEmitted) {
    for (const { playerId, delta } of diffs) {
      const before = prevPlayers.get(playerId);
      const after = nextPlayers.get(playerId);
      // Both are guaranteed to exist (we only built diffs from pairs that
      // appeared on both sides), but the type system doesn't know that.
      const prevPos = before?.position ?? 0;
      const nextPos = after?.position ?? prevPos;
      events.push({
        kind: 'MONEY_DELTA',
        playerId,
        delta,
        reason: moneyDeltaReason(delta, prevPos, nextPos),
      });
    }
  }

  /* ------------------------------------------------------------ */
  /* Rule 9 — CARD_DRAW                                           */
  /* ------------------------------------------------------------ */
  if (prev.game.phase !== 'card' && next.game.phase === 'card') {
    const idx = next.game.current_player_index;
    const activeId =
      idx >= 0 && idx < next.game.player_order.length
        ? next.game.player_order[idx]
        : null;
    if (activeId) {
      events.push({ kind: 'CARD_DRAW', playerId: activeId, cardId: '' });
    }
  }

  /* ------------------------------------------------------------ */
  /* Rule 10 — GAME_END                                           */
  /* ------------------------------------------------------------ */
  if (!prev.game.is_finished && next.game.is_finished) {
    events.push({
      kind: 'GAME_END',
      winnerId: next.game.winner_id ?? '',
    });
  }

  return events;
}
