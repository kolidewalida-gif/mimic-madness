/**
 * Pure mapping tables from `RenderEvent` (and its `kind`) to:
 *
 *   - `audioMap(kind, reason?)`: an ordered list of `SoundCue` to play through
 *     `playInkSound` when the event fires.
 *   - `fxMap(event)`: an ordered list of `FXKind` to dispatch on `useFXBus()`.
 *
 * This module is **pure**: no React, no audio engine, no `Date.now()`, no
 * `Math.random()`. It is a lookup table consumed by
 * `useMonopolyAnimationQueue` consumers (task 15.2). Actual sound playback
 * happens in the consumer via `playInkSound`; muting is the consumer's
 * responsibility — see `audioMap` JSDoc.
 *
 * All cues are drawn exclusively from `useInkSoundEffects` (Req 9.1). No
 * parallel audio engine is introduced. If a new cue is needed in the
 * future, it must be added inside `src/hooks/useInkSoundEffects.tsx` itself
 * (Req 9.5).
 *
 * @see Requirements 6.4, 6.5, 9.1, 9.4, 9.5, 9.6
 * @see design.md §"Components / Audio mapping" and §"Property 8"
 */

import { playInkSound, type InkSoundType } from '../hooks/useInkSoundEffects';
import type { FXKind } from '../components/monopoly/visual/particles/effects';
import type {
  MoneyDeltaReason,
  RenderEvent,
  RenderEventKind,
} from './monopolyDiff';

/* ------------------------------------------------------------------ */
/* SoundCue                                                           */
/* ------------------------------------------------------------------ */

/**
 * A single audio cue: a `useInkSoundEffects` cue type plus an optional
 * volume override. Volume defaults to `0.3` if omitted (matching
 * `playInkSound`'s own default).
 */
export interface SoundCue {
  cue: InkSoundType;
  volume?: number;
}

/* ------------------------------------------------------------------ */
/* FXKind — re-exported from the particle effect catalog              */
/* ------------------------------------------------------------------ */

/**
 * Visual effect names supported by `useFXBus()` (see `FXLayer`).
 *
 * The canonical literal union lives in
 * `src/components/monopoly/visual/particles/effects.ts` (the particle
 * catalog) and is re-exported here so consumers of `fxMap` get a single
 * source of truth — the audio→FX mapping cannot drift out of sync with
 * the catalog (see header comment in `effects.ts`).
 */
export type { FXKind };

/* ------------------------------------------------------------------ */
/* audioMap                                                           */
/* ------------------------------------------------------------------ */

/**
 * Map a `RenderEvent.kind` to the ordered list of sound cues to play.
 *
 * Total over every `RenderEventKind`. Cues are drawn exclusively from
 * `useInkSoundEffects` so no parallel audio engine is required (Req 9.1).
 *
 * `MONEY_DELTA` depends on the `reason` field of the event:
 *   - `'collect' | 'go' | 'free_parking'` → `cartoonDing`
 *   - `'pay' | 'tax'`                     → `cartoonZap`
 *   - `'rent'`                            → `[]` (RENT_FLOW already plays audio)
 *   - `'unknown'`                         → `cartoonPop`
 *   - reason omitted                      → `[]` (caller must pass reason)
 *
 * Distinct kinds map to distinct cue sequences for the four visually
 * critical kinds (PURCHASE, MORTGAGE, BANKRUPT, GAME_END), as required by
 * Property 8: PURCHASE = Ding, MORTGAGE = Zap, BANKRUPT = Zap (loud),
 * GAME_END = Fanfare.
 *
 * **Muted semantics**: this function never plays sound itself. When the
 * caller has `muted = true`, it simply does not invoke `playInkSound` on
 * the returned cue list — the call is therefore a synchronous no-op with
 * no error and no queue side effects (Req 9.6).
 *
 * @param kind   The event kind.
 * @param reason Optional reason for `MONEY_DELTA` events. Ignored for
 *               every other kind. When omitted on `MONEY_DELTA`, returns
 *               an empty list (the caller is expected to forward
 *               `event.reason`).
 */
export function audioMap(
  kind: RenderEventKind,
  reason?: MoneyDeltaReason,
): SoundCue[] {
  switch (kind) {
    case 'DICE_ROLL':
      return [
        { cue: 'cartoonBoing', volume: 0.35 },
        { cue: 'cartoonWobble', volume: 0.25 },
      ];
    case 'TOKEN_HOP':
      return [{ cue: 'cartoonPop', volume: 0.15 }];
    case 'PASS_GO':
      return [{ cue: 'cartoonFanfare', volume: 0.45 }];
    case 'PURCHASE':
      return [{ cue: 'cartoonDing', volume: 0.4 }];
    case 'BUILDING_GROW':
      return [
        { cue: 'cartoonBoing', volume: 0.3 },
        { cue: 'cartoonDing', volume: 0.35 },
      ];
    case 'MORTGAGE':
      return [{ cue: 'cartoonZap', volume: 0.3 }];
    case 'RENT_FLOW':
      return [{ cue: 'cartoonSwoosh', volume: 0.35 }];
    case 'MONEY_DELTA': {
      if (reason === undefined) return [];
      switch (reason) {
        case 'collect':
        case 'go':
        case 'free_parking':
          return [{ cue: 'cartoonDing', volume: 0.3 }];
        case 'pay':
        case 'tax':
          return [{ cue: 'cartoonZap', volume: 0.3 }];
        case 'rent':
          // RENT_FLOW already played audio; avoid double-playing.
          return [];
        case 'unknown':
          return [{ cue: 'cartoonPop', volume: 0.2 }];
      }
      // exhaustive — MoneyDeltaReason is a closed union
      return [];
    }
    case 'CARD_DRAW':
      return [{ cue: 'cartoonSwoosh', volume: 0.4 }];
    case 'JAILED':
      return [{ cue: 'cartoonZap', volume: 0.4 }];
    case 'UNJAILED':
      return [{ cue: 'cartoonDing', volume: 0.3 }];
    case 'BANKRUPT':
      return [{ cue: 'cartoonZap', volume: 0.5 }];
    case 'GAME_END':
      return [{ cue: 'cartoonFanfare', volume: 0.6 }];
  }
}

/* ------------------------------------------------------------------ */
/* fxMap                                                              */
/* ------------------------------------------------------------------ */

/**
 * Map a full `RenderEvent` to the ordered list of FX layer effects to
 * dispatch. Total over every event kind.
 *
 * Some kinds branch on the event payload:
 *   - `MONEY_DELTA`: `delta > 0` → `COIN_BURST`; `delta < 0` → `COIN_LOSS`;
 *     `delta === 0` → `[]`.
 */
export function fxMap(event: RenderEvent): FXKind[] {
  switch (event.kind) {
    case 'DICE_ROLL':
      return ['SHOCKWAVE', 'SPARKLE'];
    case 'TOKEN_HOP':
      return ['DUST_PUFF'];
    case 'PASS_GO':
      return ['COIN_BURST', 'SPARKLE'];
    case 'PURCHASE':
      return ['SPARKLE', 'STAMP'];
    case 'BUILDING_GROW':
      return ['DUST_PUFF', 'SPARKLE'];
    case 'MORTGAGE':
      return ['COLOR_FLASH'];
    case 'RENT_FLOW':
      return ['MONEY_STREAM'];
    case 'MONEY_DELTA':
      if (event.delta > 0) return ['COIN_BURST'];
      if (event.delta < 0) return ['COIN_LOSS'];
      return [];
    case 'CARD_DRAW':
      return ['CONFETTI'];
    case 'JAILED':
      return ['JAIL_BARS', 'RED_FLASH'];
    case 'UNJAILED':
      return ['SPARKLE'];
    case 'BANKRUPT':
      return ['RED_FLASH', 'COIN_LOSS'];
    case 'GAME_END':
      return ['CONFETTI', 'SPARKLE', 'MONEY_RAIN'];
  }
}

/* ------------------------------------------------------------------ */
/* playAudioForEvent — muted-aware playback wrapper                    */
/* ------------------------------------------------------------------ */

/**
 * Look up the audio cues for a `RenderEvent` and play them through
 * `playInkSound`.
 *
 * This is the canonical entrypoint task 15.2 uses to forward queue
 * events to the audio layer; consumers should never call `playInkSound`
 * directly for `RenderEvent`s so the `audioMap` lookup table stays the
 * single source of truth.
 *
 * **Muted semantics (Req 9.6)**: when `options.muted === true` the call
 * returns synchronously, plays no sound, throws no error, and never
 * touches the queue or the `AudioContext`. This is the same shape the
 * design contract specifies for the `audioMap` table itself ("calls
 * return synchronously, no sound, no error, no queue effect").
 *
 * Pure side effect: the only mutation is `playInkSound`, which itself
 * is a fire-and-forget call into the shared Ink `AudioContext`. No
 * queueing, no scheduling, no awaitable.
 *
 * @example
 *   // task 15.2 — forwarding queue events
 *   for (const event of api.events) {
 *     playAudioForEvent(event, { muted: settings.muted });
 *     fxBus.play(...fxMap(event));
 *   }
 */
export function playAudioForEvent(
  event: RenderEvent,
  options?: { muted?: boolean },
): void {
  if (options?.muted === true) return;

  const cues =
    event.kind === 'MONEY_DELTA'
      ? audioMap('MONEY_DELTA', event.reason)
      : audioMap(event.kind);

  for (const cue of cues) {
    playInkSound(cue.cue, cue.volume ?? 0.3);
  }
}

/* ------------------------------------------------------------------ */
/* Test helper — distinct-acoustic-signature                          */
/* ------------------------------------------------------------------ */

/**
 * Returns a stable string signature of the cue sequence for a given kind,
 * used by the property tests (task 2.10) to assert that visually critical
 * kinds produce distinct acoustic responses (PURCHASE ≠ MORTGAGE ≠
 * BANKRUPT ≠ GAME_END — Property 8).
 *
 * Not intended for runtime use.
 */
export function __test_kindAcousticSignature(kind: RenderEventKind): string {
  // For MONEY_DELTA, signature is intentionally the "default" branch
  // (reason omitted) since the caller drives the reason. Use a `'collect'`
  // signature for distinctness comparisons.
  const cues =
    kind === 'MONEY_DELTA' ? audioMap(kind, 'collect') : audioMap(kind);
  return cues
    .map((c) => `${c.cue}@${c.volume ?? 0.3}`)
    .join('|');
}
