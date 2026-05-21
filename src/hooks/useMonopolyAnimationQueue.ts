/**
 * useMonopolyAnimationQueue — task 14.1
 *
 * Single observer of MimicPoly state diffs. Reads `(game, players,
 * properties)` rebroadcasts from `useMonopolyGame`, calls the pure
 * `deriveRenderEvents(prev, next)` diff layer on every change, and exposes
 * the resulting event stream through a small ring-buffer + cursor API.
 *
 * Design contract (from `.kiro/specs/mimicpoly-cartoon-premium/tasks.md`
 * task 14.1):
 *
 *   - Pure observer. **No Supabase reads/writes**, **no audio engine**,
 *     **no `Date.now`** in the diff path. Only the pure
 *     `deriveRenderEvents` does the work.
 *
 *   - Late joiners must NOT replay history: on cold start the cursor is
 *     seeded to `next` only. Visual state seeds from the snapshot itself
 *     (handled by the consumers — `<PlayerToken>` reads the player row,
 *     `<Tile>` reads the property row).
 *
 *   - Ring buffer of ~32 events. Older events fall off so a long-running
 *     game never grows the buffer unboundedly.
 *
 *   - `consume(predicate)` drops every event matching `predicate` from the
 *     buffer and returns the dropped slice. Idempotent: calling it twice
 *     on the same predicate returns an empty array the second time.
 *
 *   - Bots and humans yield the same event stream (Property 1 — observer-
 *     independence is enforced by `deriveRenderEvents`).
 *
 * @see Requirements 10.1, 10.3, 10.4, 10.5, 10.6, 10.8
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import {
  deriveRenderEvents,
  type RenderEvent,
  type Snapshot,
} from '@/lib/monopolyDiff';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Lightweight shape consumed by the queue. Mirrors the
 * `MonopolyGameSnapshot` contract from `monopolyDiff.ts` — we keep the
 * structural shape rather than re-exporting the type so the queue stays
 * decoupled from the snapshot interface (consumers can pass anything that
 * structurally matches).
 */
export interface QueueGameLike {
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

export interface QueuePlayerLike {
  player_id: string;
  position: number;
  money: number;
  is_bankrupt: boolean;
  in_jail: boolean;
}

export interface QueuePropertyLike {
  property_index: number;
  owner_id: string | null;
  houses: number;
  is_mortgaged: boolean;
}

/**
 * Public API returned by the hook.
 *
 * `events` is a frozen view of the ring buffer; consumers should never
 * mutate it. Use `consume(predicate)` to remove handled entries — this is
 * the only way the buffer shrinks on the consumer side.
 */
export interface AnimationQueueAPI {
  /** Ordered, frozen view of un-consumed events (oldest first). */
  events: ReadonlyArray<RenderEvent>;
  /**
   * Drop every event matching `predicate` from the buffer. Returns the
   * dropped slice (in original order) so the caller can react to the
   * specific events it consumed.
   */
  consume(predicate: (event: RenderEvent) => boolean): RenderEvent[];
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

/**
 * Maximum number of un-consumed events kept in memory. The visual layer
 * generally consumes events on the next frame, so this only matters during
 * a tab-suspension burst. 32 leaves comfortable headroom (≈ 8 turns of
 * concurrent diffs in worst case).
 */
const RING_BUFFER_SIZE = 32;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Build a `Snapshot` from the loose hook inputs. Returns `null` when any
 * required argument is missing (typical first-mount state).
 */
function buildSnapshot(
  game: QueueGameLike | null | undefined,
  players: ReadonlyArray<QueuePlayerLike> | undefined,
  properties: ReadonlyArray<QueuePropertyLike> | undefined,
): Snapshot | null {
  if (!game || !players || !properties) return null;
  return {
    game: {
      current_player_index: game.current_player_index,
      player_order: game.player_order,
      phase: game.phase,
      free_parking_pot: game.free_parking_pot,
      is_finished: game.is_finished,
      winner_id: game.winner_id,
      last_dice_1: game.last_dice_1,
      last_dice_2: game.last_dice_2,
      doubles_count: game.doubles_count,
    },
    players: players.map((p) => ({
      player_id: p.player_id,
      position: p.position,
      money: p.money,
      is_bankrupt: p.is_bankrupt,
      in_jail: p.in_jail,
    })),
    properties: properties.map((p) => ({
      property_index: p.property_index,
      owner_id: p.owner_id,
      houses: p.houses,
      is_mortgaged: p.is_mortgaged,
    })),
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Subscribe to MimicPoly state diffs and expose them as `RenderEvent`s.
 *
 * Usage in `MonopolyGameScreen.tsx` (task 15.2):
 *
 *   ```ts
 *   const queue = useMonopolyAnimationQueue(game, mPlayers, properties);
 *
 *   useEffect(() => {
 *     if (queue.events.length === 0) return;
 *     const drained = queue.consume(() => true);
 *     for (const ev of drained) {
 *       playAudioForEvent(ev, { muted });
 *       fxBus?.play({ kind: fxMap(ev)[0], origin: ... });
 *     }
 *   }, [queue.events]);
 *   ```
 */
export function useMonopolyAnimationQueue(
  game: QueueGameLike | null | undefined,
  players: ReadonlyArray<QueuePlayerLike> | undefined,
  properties: ReadonlyArray<QueuePropertyLike> | undefined,
): AnimationQueueAPI {
  // The previous snapshot is kept in a ref so that running the diff is a
  // synchronous, render-free operation. A `useState` would also work but
  // would force a second render every time we ingest a new pair.
  const prevSnapshotRef = useRef<Snapshot | null>(null);

  // The buffer itself is a ref + a `version` state. Mutating the buffer
  // in-place avoids per-event allocations; bumping `version` triggers a
  // re-render so consumers reading `events` see the change.
  const bufferRef = useRef<RenderEvent[]>([]);
  const [version, setVersion] = useState(0);

  // Ingest snapshots on every dependency change. Effect order:
  //   1. Build the next snapshot (returns null until everything is loaded).
  //   2. If we have no previous snapshot, seed it (cold start / late join)
  //      and emit no events. This is exactly the contract spelled out by
  //      `deriveRenderEvents` for `prev === null`.
  //   3. Otherwise, run the diff and push the resulting events into the
  //      ring buffer, evicting oldest entries when over capacity.
  useEffect(() => {
    const next = buildSnapshot(game, players, properties);
    if (next === null) return;

    const prev = prevSnapshotRef.current;
    if (prev === null) {
      prevSnapshotRef.current = next;
      return;
    }

    const events = deriveRenderEvents(prev, next);

    // Always advance the cursor — even when no events were emitted —
    // so subsequent diffs compare against the latest snapshot.
    prevSnapshotRef.current = next;

    if (events.length === 0) return;

    // Push into the ring buffer. We don't allocate a new array; we splice
    // out the overflow and push in place.
    const buf = bufferRef.current;
    for (const ev of events) buf.push(ev);
    if (buf.length > RING_BUFFER_SIZE) {
      buf.splice(0, buf.length - RING_BUFFER_SIZE);
    }

    // Bump version so consumers re-read `events`.
    setVersion((v) => (v + 1) & 0xffff);
  }, [game, players, properties]);

  // ---- API surface --------------------------------------------------------
  // `events` is a *new* readonly view on every version bump so React.memo /
  // dependency arrays trigger correctly. Consumers should treat it as
  // immutable.
  const api = useMemo<AnimationQueueAPI>(
    () => ({
      events: bufferRef.current.slice(),
      consume(predicate) {
        const buf = bufferRef.current;
        const dropped: RenderEvent[] = [];
        const kept: RenderEvent[] = [];
        for (const ev of buf) {
          if (predicate(ev)) dropped.push(ev);
          else kept.push(ev);
        }
        if (dropped.length > 0) {
          buf.length = 0;
          for (const ev of kept) buf.push(ev);
          setVersion((v) => (v + 1) & 0xffff);
        }
        return dropped;
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  return api;
}
