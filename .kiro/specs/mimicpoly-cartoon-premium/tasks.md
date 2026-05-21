# Implementation Plan: MimicPoly Cartoon Premium

## Overview

Convert the feature design into a series of prompts for a code-generation LLM that will implement each step with incremental progress. Make sure that each prompt builds on the previous prompts, and ends with wiring things together. There should be no hanging or orphaned code that isn't integrated into a previous step. Focus ONLY on tasks that involve writing, modifying, or testing code.

The plan starts from the **pure derivation layer** (`monopolyDiff`, `monopolyHopPath`, `monopolyZones`, `monopolyOwnership`, `monopolyAudioMap`, `channels`), where the 15 correctness properties live and where property-based testing applies. It then builds the **visual primitives** (`MonopolyVisualSettings`, durations, convergence, particle pool, FX layer, `Building`, `Tile`, `BoardZone`, `ZoneDecor`, `NeonCorner`, `CenterPlaza`, `PlayerToken`, `DiceSet`, `CinematicCamera`), refactors the **scene** (`MonopolyBoard3D`), wires the **animation queue** (`useMonopolyAnimationQueue`), then refactors the four 2D surfaces (`MonopolyGameScreen`, `MonopolyPlayerPanel`, `MonopolyPropertyPanel`, `MonopolyCardModal`). Existing public component contracts and `useMonopolyGame` are preserved verbatim. No new Supabase tables, channels, or audio engines are introduced.

Each property-based test sub-task is marked optional (`*`), references a property number from `design.md`, and uses the exact file path from the design's "Property → test file" mapping table. All shared arbitraries live in `src/lib/__tests__/monopolyArbitraries.ts`.

## Tasks

- [x] 1. Set up property-based testing infrastructure and shared arbitraries
  - [x] 1.1 Add Vitest and fast-check as devDependencies and wire test scripts
    - Add `vitest` and `fast-check` to `devDependencies` in `package.json` (no runtime deps added — Req 13.5)
    - Add `"test": "vitest --run"` and `"test:watch": "vitest"` scripts; configure `vitest.config.ts` with `globals: true` and `environment: 'jsdom'`
    - Confirm `vite build` does not invoke tests; CI runs `vitest --run` separately
    - _Requirements: 13.5_

  - [ ]* 1.2 Create shared property-based test arbitraries
    - Create `src/lib/__tests__/monopolyArbitraries.ts` exposing `arbitraryGame`, `arbitraryPlayer`, `arbitraryProperty`, `arbitrarySnapshot`, `arbitrarySnapshotPair`, `arbitraryAnimationRequest`, `arbitraryFpsSeries`, `arbitraryHopPair`
    - `arbitrarySnapshotPair` must apply structured random patches (dice / position / money / ownership / mortgage / houses / jail / bankrupt / phase / finished) so the diff layer sees realistic transitions
    - `arbitraryPlayer` covers all 8 `token_type` values and money in a wide range covering negative bankruptcy
    - _Requirements: 13.5_

- [x] 2. Implement the pure derivation layer
  - [x] 2.1 Implement `monopolyZones.ts` with palettes and tile-to-zone map
    - Create `src/lib/monopolyZones.ts` exporting `ZoneKey`, `ZonePalette`, the const map `ZONE_PALETTES` (8 color groups + 4 corners) exactly as documented in design, and `tileToZone(tileIndex)` derived from `BOARD_SPACES[i].group` and the corner indices (0, 10, 20, 30)
    - _Requirements: 1.3, 1.4, 2.1, 2.2, 2.7_

  - [x] 2.2 Implement `computeHopPath` mod-40 forward path helper
    - Create `src/lib/monopolyHopPath.ts` exporting `computeHopPath(from: number, to: number): number[]`
    - Length must equal `(to - from + 40) mod 40`; values strictly increase modulo 40; ends with `to` when length > 0; empty when `from === to`
    - _Requirements: 5.1, 5.5, 5.8_

  - [ ]* 2.3 Write property test for `computeHopPath`
    - **Property 3: computeHopPath is a correct mod-40 forward path**
    - **Validates: Requirements 5.1, 5.5, 5.8**
    - File: `src/lib/__tests__/monopolyHopPath.pbt.test.ts`
    - Use `arbitraryHopPair`; numRuns ≥ 100; assert length, range, strict mod-40 increment, last element, and `0 ∈ path` iff `from !== 0 && from > to` (passes-GO equivalence with Property 2's `passedGo` flag)

  - [x] 2.4 Implement `deriveRenderEvents` and the `RenderEvent` discriminated union
    - Create `src/lib/monopolyDiff.ts` exporting the `RenderEvent` union (DICE_ROLL, TOKEN_HOP, PASS_GO, PURCHASE, BUILDING_GROW, MORTGAGE, RENT_FLOW, MONEY_DELTA, CARD_DRAW, JAILED, UNJAILED, BANKRUPT, GAME_END) and `deriveRenderEvents(prev, next): RenderEvent[]`
    - Apply diff rules in the documented deterministic order (rules 1–12 in design Components §2); function must be pure (no I/O, no Date.now), idempotent on duplicate snapshots, and emit empty list when `prev === null`
    - `passedGo === (to < from)`; `RENT_FLOW` only when exactly one player's money decreased by `X` and exactly one other increased by the same `X` on the same diff; otherwise emit a generic `MONEY_DELTA{reason: 'tax' | …}`
    - _Requirements: 5.1, 5.6, 5.8, 6.1, 6.2, 6.3, 6.4, 6.6, 6.7, 6.8, 6.9, 10.1, 10.3, 10.7, 10.8, 11.7, 13.2, 13.6_

  - [ ]* 2.5 Write property test for `deriveRenderEvents` purity and observer-independence
    - **Property 1: deriveRenderEvents is pure and observer-independent**
    - **Validates: Requirements 5.6, 6.9, 10.1, 10.3, 10.7, 10.8, 11.7, 13.2, 13.6**
    - File: `src/lib/__tests__/monopolyDiff.determinism.pbt.test.ts`
    - For any `arbitrarySnapshotPair`, calling twice yields identical arrays; substituting a `bot-` `currentPlayerId` does not change output; assert deep equality and no I/O side effects

  - [ ]* 2.6 Write property test for `deriveRenderEvents` event completeness
    - **Property 2: deriveRenderEvents emits the correct events for every diff kind**
    - **Validates: Requirements 5.1, 5.8, 6.1, 6.2, 6.3, 6.6, 6.7, 6.8**
    - File: `src/lib/__tests__/monopolyDiff.events.pbt.test.ts`
    - For every patch kind in `arbitrarySnapshotPair`, assert exactly-one event of the corresponding kind is emitted with correct fields; cover doubles flag, `passedGo` flag, paired-delta `RENT_FLOW`, and ordering (Req 10.8)

  - [x] 2.7 Implement `playerOwnsAllInGroup` ownership predicate
    - Create `src/lib/monopolyOwnership.ts` exporting `getPropertiesInGroup(group)` and `playerOwnsAllInGroup(state, playerId, group): boolean`
    - This must be the **single** predicate consumed by the property-panel `MONOPOLE` stamp and the `<MonopolyAccentRing>` glow; accent color comes from `TOKEN_COLORS[player.token_type]`
    - _Requirements: 3.7, 8.4_

  - [ ]* 2.8 Write property test for `playerOwnsAllInGroup`
    - **Property 9: Ownership predicate drives monopole stamp and accent ring uniformly**
    - **Validates: Requirements 3.7, 8.4**
    - File: `src/lib/__tests__/monopolyOwnership.pbt.test.ts`
    - Generate property sets with random ownership; predicate equals `true` iff every tile in `getPropertiesInGroup(group)` has `owner_id === playerId`

  - [x] 2.9 Implement `monopolyAudioMap.ts` and `fxMap`; extend `useInkSoundEffects` if needed
    - Create `src/lib/monopolyAudioMap.ts` exporting `audioMap(kind): SoundCue[]` (totals every `RenderEvent.kind`, distinct per kind per design table) and `fxMap(event): FXKind[]`
    - All cues drawn from `useInkSoundEffects` only — no parallel audio engine (Req 9.1); add any missing cue inside `src/hooks/useInkSoundEffects.ts` itself (Req 9.5)
    - When `muted = true`, calls return synchronously, no sound, no error, no queue effect
    - _Requirements: 6.4, 6.5, 9.1, 9.4, 9.5, 9.6_

  - [ ]* 2.10 Write property test for audio + FX maps totality and distinctness
    - **Property 8: Audio and FX maps are total and distinct per kind**
    - **Validates: Requirements 6.4, 6.5, 9.1, 9.4, 9.6**
    - File: `src/lib/__tests__/monopolyAudioMap.pbt.test.ts`
    - For every `RenderEvent.kind`, `audioMap(kind)` is non-empty and uses only cues from `useInkSoundEffects`; distinct kinds map to distinct cue sequences (PURCHASE ≠ MORTGAGE ≠ BANKRUPT); `audioMap` with muted = true is synchronous no-op

  - [x] 2.11 Implement `channelsFor(event)` multi-channel registry
    - Create `src/lib/monopolyChannels.ts` exporting `channelsFor(event): Channel[]` enumerating which of `{text, color, icon, motion, sound}` an event triggers, derived from `audioMap`, `fxMap`, and the documented UI surfaces
    - _Requirements: 12.6_

  - [ ]* 2.12 Write property test for ≥2 channels per critical event
    - **Property 14: Critical state changes are conveyed by ≥ 2 channels**
    - **Validates: Requirements 12.6**
    - File: `src/lib/__tests__/monopolyChannels.pbt.test.ts`
    - For every kind in `{DICE_ROLL, PURCHASE, CARD_DRAW, JAILED, BANKRUPT, GAME_END, MONEY_DELTA(rent)}`, `channelsFor(event).length ≥ 2`; removing any single channel still leaves at least one perceivable channel

- [x] 3. Checkpoint - Pure derivation layer ready
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement visual settings, timing, and convergence helpers
  - [x] 4.1 Implement `MonopolyVisualSettings` provider and perf-tier classifier
    - Create `src/components/monopoly/visual/MonopolyVisualSettings.tsx` exporting the `MonopolyVisualSettings` interface, `MonopolyVisualSettingsProvider`, `useMonopolyVisualSettings`, a hidden `useFpsProbe`, `perfTierFor(fpsSeries)`, and `lodFor(distance)`
    - `reducedMotion` reads `window.matchMedia('(prefers-reduced-motion: reduce)')`; `isMobile` from `pointer:coarse` + viewport ≤ 900px; perf-tier downshift to `'low'` after sustained FPS < 40 for 2s (one-way per session); console-only — no UI overlay
    - _Requirements: 11.2, 11.4, 11.8, 12.1, 12.4_

  - [x] 4.2 Implement `durationFor` animation-timing helper
    - Create `src/components/monopoly/visual/durations.ts` exporting `durationFor(req: AnimationRequest, reducedMotion: boolean): number` and a `totalHopDurationMs(roll: number): number`
    - Bounds match design Property 5 (dice tumble 700–1400ms, hop 120–280ms, settle 300–600ms, building grow 600–1200ms, unmortgage 300–700ms, camera travel 600–1200ms, focus 600–1500ms, whip-pan < 500ms, MoneyChip 300–700ms, dice settle shake 150–300ms); under reduced-motion every duration ≤ 200ms; total dice anim < 1500ms; `totalHopDurationMs(r) < 3000` for r ∈ [2, 12]
    - _Requirements: 3.4, 3.6, 4.1, 4.3, 4.6, 5.4, 5.5, 7.2, 7.4, 7.5, 8.3, 12.2_

  - [ ]* 4.3 Write property test for animation duration bounds
    - **Property 5: Animation durations respect documented bounds and reduced-motion**
    - **Validates: Requirements 3.4, 3.6, 4.1, 4.3, 4.6, 5.4, 5.5, 7.2, 7.4, 7.5, 8.3, 12.2**
    - File: `src/components/monopoly/visual/__tests__/durations.pbt.test.ts`
    - Use `arbitraryAnimationRequest`; assert per-kind bounds, reduced-motion ≤ 200ms, total dice anim < 1500ms, `totalHopDurationMs(r) < 3000` for r ∈ [2, 12]

  - [ ]* 4.4 Write property test for reduced-motion zeroing continuous rates
    - **Property 6: Reduced motion zeroes continuous animation rates**
    - **Validates: Requirements 12.1, 7.8**
    - File: `src/components/monopoly/visual/__tests__/reducedMotion.pbt.test.ts`
    - Enumerate every continuous animator (camera idle drift, decor sway, water UV scroll, neon emissive pulse, glow pulse, monopole accent ring); each `rateUnder(reducedMotion = true)` must be `0`

  - [x] 4.5 Implement convergence helper for missed-update interpolation
    - Create `src/components/monopoly/visual/convergence.ts` exporting `forwardDistance(prev, next, modulus = 40)` and `convergenceDuration(deltaTiles, budgetTiles): number`
    - When `|deltaTiles| ≤ B`, duration ∈ (0, 2000]ms; when `> B`, duration `= 0` (hard snap); same shape for money (small deltas tween 300–700ms, large deltas snap)
    - _Requirements: 10.4, 10.5_

  - [ ]* 4.6 Write property test for convergence bounds and snap-safety
    - **Property 12: Convergence after missed updates is bounded and snap-safe**
    - **Validates: Requirements 10.4, 10.5**
    - File: `src/components/monopoly/visual/__tests__/convergence.pbt.test.ts`
    - For all `(prev_position, next_position)` pairs and any budget `B`, assert duration bounds and that visual position equals `next_position` after at most 2 seconds

- [x] 5. Implement the particle pool and FX layer
  - [x] 5.1 Implement `ParticlePool`
    - Create `src/components/monopoly/visual/particles/ParticlePool.ts` exporting `createParticlePool({ cap, particlesPerSystemCap })`, `acquire()`, `release(slot)`
    - Pre-allocate `THREE.Points` instances; never exceed `cap` simultaneous active systems (default 8) or `particlesPerSystemCap` particles per system (default 60); `acquire()` returns `null` when exhausted (never queues)
    - _Requirements: 11.3, 11.7_

  - [x] 5.2 Implement particle effect catalog
    - Create `src/components/monopoly/visual/particles/effects.ts` exporting per-effect parameter builders for `COIN_BURST`, `DUST_PUFF`, `SPARKLE`, `CONFETTI`, `MONEY_STREAM`, `MONEY_RAIN`, `COIN_LOSS`, `SHOCKWAVE`, `JAIL_BARS`, `RED_FLASH`, `COLOR_FLASH`, `STAMP`
    - Each effect respects per-system particle cap and is removable in one `release()` call
    - _Requirements: 4.2, 4.3, 5.4, 6.1, 6.2, 6.4, 6.5, 6.6, 6.7, 6.8, 11.3_

  - [x] 5.3 Implement `FXLayer` with `useFXBus` and `useScreenShake`
    - Create `src/components/monopoly/visual/FXLayer.tsx` exposing `useFXBus().play({kind, payload})` and `useScreenShake()` returning a shared shake offset consumed by `<CinematicCamera>` each frame
    - Cap full-screen flashes at 3 Hz (Req 12.5); pool exhaustion drops the request silently with a `console.debug` (no production overlay)
    - _Requirements: 4.3, 6.1, 6.2, 6.4, 6.5, 6.6, 6.7, 6.8, 11.3, 11.7, 11.8, 12.5_

  - [ ]* 5.4 Write property test for particle pool, LOD, and perf-tier invariants
    - **Property 10: Particle pool, LOD, and perf-tier classifier respect their bounds**
    - **Validates: Requirements 11.2, 11.3, 11.4**
    - File: `src/components/monopoly/visual/particles/__tests__/pool.pbt.test.ts`
    - Generate sequences of `acquire/release`; active count never exceeds cap; `acquire` is non-blocking on exhaustion; `lodFor(d) === 'near' iff d < 12`; `perfTierFor` returns `'low'` for sustained < 40 fps over 2s, `'high'` for ≥ 55, `'medium'` otherwise, and is monotonic

- [x] 6. Checkpoint - Visual primitives and FX scaffolding ready
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement Building progression
  - [x] 7.1 Implement `resolveBuildingKind` and `houseSlotPositions` selectors
    - Add to `src/components/monopoly/visual/Building.tsx` (selector exports): `resolveBuildingKind(p): { kind: 'empty' | 'terrain' | 'house' | 'hotel' | 'mortgaged'; count?: number }` and `houseSlotPositions(n: 1|2|3|4): Array<{x: number; z: number}>`
    - Slot positions: `[-0.5, -0.18, 0.18, 0.5]` along x at z = -0.4; pairwise x-distance ≥ 0.3 (no overlap)
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

  - [x] 7.2 Implement `<Building>` component
    - In `src/components/monopoly/visual/Building.tsx`, render terrain badge (fenced lot in owner color) when `houses === 0 && owner_id`, 1–4 cartoon houses for `1..4`, hotel mesh for `5`; mortgaged → grayscale + tilt + chained icon
    - Grow tween: scale 0 → 1 elastic over `durationFor('building_grow')` plus a one-shot `DUST_PUFF`; unmortgage snap-back per `durationFor('unmortgage')`
    - Far LOD swaps each `<HouseMesh>` for a `<RoundedBox>` only (no roof) when `lodFor(distance) === 'far'`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 11.4_

  - [ ]* 7.3 Write property test for `resolveBuildingKind` and `houseSlotPositions`
    - **Property 4: resolveBuildingKind matches the documented building rules**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.5**
    - File: `src/components/monopoly/visual/__tests__/Building.selector.pbt.test.ts`
    - Use `arbitraryProperty`; assert mortgaged overlay precedence, terrain when owned-empty, house count match, hotel at 5, empty when null+0; for every `n ∈ [1,4]` slot positions are distinct with pairwise x-distance ≥ 0.3

- [x] 8. Implement Tile, BoardZone, ZoneDecor, NeonCorner, CenterPlaza
  - [x] 8.1 Implement `<Tile>` (refactor of `BoardTile`)
    - Create `src/components/monopoly/visual/Tile.tsx` rendering chamfered 3D blocks with thick borders, embossed labels, per-zone color treatment from `ZONE_PALETTES`, mortgage tilt, owned-terrain badge child, and a `<Building>` child
    - Preserve existing tile metadata from `src/lib/monopolyBoard.ts`; tile indexes 0–39 unchanged
    - _Requirements: 1.1, 1.2, 2.1, 2.7, 3.5_

  - [x] 8.2 Implement `<ZoneDecor>` variants
    - Create `src/components/monopoly/visual/ZoneDecor.tsx` rendering the 12 `ZonePalette.decor` variants (lamppost, fountain, neonsign, bench, minicar, tree, spotlight, go_arrow_neon, jail_bars, parking_neon, gtj_lights) with continuous idle animations (sway/blink/rotate/hop) via `<Float>` (drei) or `useFrame` sin/cos drivers
    - Idle animation rates returned by helpers that consult `useMonopolyVisualSettings().reducedMotion` to satisfy Property 6
    - _Requirements: 2.3, 2.6, 12.1_

  - [x] 8.3 Implement `<BoardZone>` with accent ring driven by ownership
    - Create `src/components/monopoly/visual/BoardZone.tsx` rendering zone-specific accent point lights, at least one `<ZoneDecor>` per zone, and `<MonopolyAccentRing>` around all zone tiles when `playerOwnsAllInGroup(state, activePlayerId, group)` is true (color = `TOKEN_COLORS[player.token_type]`)
    - _Requirements: 1.4, 2.2, 2.3, 3.7, 8.4_

  - [x] 8.4 Implement `<NeonCorner>`
    - Create `src/components/monopoly/visual/NeonCorner.tsx` for GO / JAIL / FREE_PARKING / GO_TO_JAIL with `MeshBasicMaterial` toneMapped=false + emissive intensity oscillating on a 1.5–2.5s loop via `useFrame`
    - Reduced-motion → static emissive at base intensity
    - _Requirements: 2.5, 12.1_

  - [x] 8.5 Implement `<CenterPlaza>` with animated water/energy ribbon
    - Create `src/components/monopoly/visual/CenterPlaza.tsx` evolving the existing `BoardCenter`; add a `ShaderMaterial` with `uniforms.u_time` UV-scrolling a stylised sine-noise pattern; perf-tier `'low'` falls back to a textured plane scrolling its `offset`; reduced-motion freezes
    - _Requirements: 2.4, 11.2, 11.6, 12.1_

- [x] 9. Implement player tokens and tests
  - [x] 9.1 Implement `tokenOffset` and `tokenTrailColor` helpers
    - Add to `src/components/monopoly/visual/PlayerToken.tsx` (helper exports): `tokenOffset(playerOrderIndex: number): { dx: number; dz: number }` deterministic for indexes 0–7 with pairwise 2D distance ≥ 0.25; `tokenTrailColor(player) === TOKEN_COLORS[player.token_type]`
    - _Requirements: 1.5, 5.3, 5.7_

  - [x] 9.2 Implement `<PlayerToken>` with hop FSM, squash/stretch, trail, settle, pass-go billboard
    - In `src/components/monopoly/visual/PlayerToken.tsx`, consume `TOKEN_HOP` events from the queue, expand path via `computeHopPath`, run a per-tile spring tween (120–280ms each) using `useFrame` + a small ref-based FSM (`{phase: 'idle'|'anticipate'|'jump'|'land', tileCursor}`)
    - Apply squash-and-stretch (vertical scale 1.0 → 0.7 takeoff → 1.2 apex → 0.85 landing → 1.0); short ribbon trail in `tokenTrailColor(player)`; one-shot `DUST_PUFF` + glow pulse on settle (300–600ms); on `passedGo` last hop, emit `<Text>` "+200$" billboard + `COIN_BURST`
    - Bot players (`bot-` prefix) animate identically — driven only by state diff
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 10.7_

  - [ ]* 9.3 Write property test for token offsets and trail/halo colors
    - **Property 7: Token offsets and trail/halo colors derive deterministically from player data**
    - **Validates: Requirements 1.5, 5.3, 5.7**
    - File: `src/components/monopoly/visual/__tests__/PlayerToken.geometry.pbt.test.ts`
    - For every `playerOrderIndex ∈ [0, 8)`, `tokenOffset` is pure; offsets for any subset are pairwise distinct with min 2D distance ≥ 0.25; halo / panel border / trail colors all equal `TOKEN_COLORS[player.token_type]`

- [x] 10. Implement DiceSet
  - [x] 10.1 Implement `<DiceSet>` with deterministic angular trajectory
    - Create `src/components/monopoly/visual/DiceSet.tsx` taking `{ d1, d2, rolling, reducedMotion }`; pre-compute angular trajectory seeded from `(d1, d2)` so all clients see the same path; damped tween over 700–1400ms landing on the rotation matrix for each face (per-face lookup table)
    - On settle: emit `SHOCKWAVE` + `useScreenShake({ magnitude: 2..6, durMs: 150..300 })`; show `InkStamp` "DOUBLE !" + extra `SPARKLE` burst when `d1 === d2`
    - Visual layer cap < 1500ms total so host's 1400ms `setTimeout(handleLandingFor)` is never blocked; reduced-motion → 200ms fade-in to final faces
    - Use only `useFrame` + hand-tuned damping + optional `maath/easing` — no new physics dependency
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 12.2_

- [x] 11. Implement CinematicCamera
  - [x] 11.1 Implement `<CinematicCamera>` state machine
    - Create `src/components/monopoly/visual/CinematicCamera.tsx` wrapping drei's `<OrbitControls>`; states `idle | follow | focus | userOverride`
    - `idle`: orbit < 5°/s + breathing zoom; `follow`: lerp factor ∈ [0.06, 0.18]; `focus`: 600–1500ms easeOut; whip-pan (< 500ms) on `DICE_ROLL` doubles; `userOverride` for ≥ 4s after any OrbitControls input; floor clamp `‖p(t)‖ ≥ 8`; reduced-motion collapses to `userOverride` static framing
    - Read shake offset from `useScreenShake()`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 12.1_

  - [ ]* 11.2 Write property test for camera state-machine invariants
    - **Property 11: Camera state machine invariants**
    - **Validates: Requirements 7.1, 7.3, 7.6, 7.7, 7.8**
    - File: `src/components/monopoly/visual/__tests__/CinematicCamera.pbt.test.ts`
    - For random tween targets and user-input sequences, sampled trajectory `‖p(t)‖ ≥ 8`; idle `|dθ/dt| ≤ 5°/s`; follow lerp factor in `[0.06, 0.18]`; userOverride lasts ≥ 4s after last input; reduced-motion stays in userOverride

- [x] 12. Checkpoint - 3D building blocks ready
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Refactor `MonopolyBoard3D` to compose the new scene
  - [x] 13.1 Refactor `src/components/monopoly/MonopolyBoard3D.tsx`
    - Keep public `MonopolyBoard3DCanvas` props compatible; rebuild the internal tree as: `<BoardBase>` + `<BoardZone>×12` + `<Tile>×40` (with `<Building>`) + `<CenterPlaza>` + `<NeonCorner>×4` + `<PlayerToken>×N` + `<DiceSet>` + `<FXLayer>` + `<CinematicCamera>`
    - Apply cartoon outline pass, warm key + cool fill + zone-tinted accent lights with smooth color transitions; emit glow halos on Active_Player / owned property / hotel / dice-mid-roll matching token / zone palette
    - Assert `WebGLRenderer.info.programs.length ≤ 12` at scene mount via a console.debug check
    - Honor `useMonopolyVisualSettings` for shadow map size, secondary lights toggle, building LOD, particle caps; only run `useFrame` on visible objects
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 13.1, 13.5_

- [x] 14. Implement the animation queue hook
  - [x] 14.1 Implement `useMonopolyAnimationQueue`
    - Create `src/hooks/useMonopolyAnimationQueue.ts` exposing `AnimationQueueAPI { events, consume }`
    - Internally call `deriveRenderEvents(prev, next)` on every `(game, players, properties)` update; append to a ring buffer of size ~32; expose `consume(predicate)` so FX side can ack events
    - Late joiners: cursor seeded to `next` only; no replay of past events; visual state seeds from snapshot
    - Hook performs no Supabase writes and never delays writes performed by `useMonopolyGame`
    - _Requirements: 10.1, 10.3, 10.4, 10.5, 10.6, 10.8_

- [x] 15. Refactor `MonopolyGameScreen` and wire the queue
  - [x] 15.1 Wrap the screen with `MonopolyVisualSettingsProvider` and preserve existing affordances
    - Update `src/components/monopoly/MonopolyGameScreen.tsx` to wrap its tree with `<MonopolyVisualSettingsProvider><InkGameStage accent={turnPlayerColor}>…</InkGameStage></MonopolyVisualSettingsProvider>`
    - Preserve verbatim: quit button, properties toggle, free-parking pot badge, end-screen ranking, stuck-loading recovery (4s timeout → host `forceRestart`), jail actions, mortgage actions, bankruptcy declaration; do not introduce any FPS / ping / hardware overlay
    - Apply spring entrance + phase-aware accent on the central action card per `phaseInfo.color`; `InkButton` hover / tap states preserved
    - _Requirements: 8.1, 8.5, 8.6, 8.8, 11.8, 13.1, 13.4, 13.8_

  - [x] 15.2 Wire `useMonopolyAnimationQueue` and forward events to UI / SFX / FX
    - Inside `MonopolyGameScreen`, call `useMonopolyAnimationQueue(game, mPlayers, properties)`; forward events to `MonopolyPlayerPanel` / `MonopolyPropertyPanel` / `MonopolyCardModal` / 3D scene
    - For each consumed event, call `playInkSound(audioMap(kind))` 1-to-1 with event kinds and dispatch `useFXBus().play(fxMap(event))`; never write Supabase from this layer; never block turn flow
    - _Requirements: 6.9, 9.1, 9.4, 9.5, 9.6, 10.1, 10.3, 10.6, 13.2, 13.4_

  - [ ]* 15.3 Write property test for critical UI affordances and negative overlay invariant
    - **Property 13: Critical UI affordances and information are always reachable**
    - **Validates: Requirements 8.8, 11.8, 13.8**
    - File: `src/components/monopoly/__tests__/MonopolyGameScreen.affordances.pbt.test.tsx`
    - Render across `arbitrarySnapshot` states; assert quit button, properties toggle, free-parking pot badge (when pot > 0), active player name, dice values, money, owned properties, current phase, end-screen ranking, jail actions, bankruptcy declaration are all queryable; assert no DOM node matches `{fps, ping, latency, hardware, perf-overlay}` selectors

- [x] 16. Refactor `MonopolyPlayerPanel`
  - [x] 16.1 Add active-row spotlight, `MoneyChip` count tween, bankrupt shrink
    - Update `src/components/monopoly/MonopolyPlayerPanel.tsx`: active player row gets animated wobble token disc, glowing border in player color, animated `<TourCrownBadge>` (continuous `rotate: [-3, 3]`)
    - `MoneyChip` upgraded to count-up/down via `useMotionValue + useTransform` over `durationFor('money_chip')` (300–700ms) flashing green (gain) / red (loss) from `MONEY_DELTA` events
    - On `BANKRUPT` event, shrink-and-fade row
    - _Requirements: 8.2, 8.3, 12.6_

  - [ ]* 16.2 Write property test for active-player spotlight uniqueness
    - **Property 15: Active-player spotlight selects exactly one player**
    - **Validates: Requirements 8.2**
    - File: `src/components/monopoly/__tests__/MonopolyPlayerPanel.spotlight.pbt.test.tsx`
    - For random `(players, currentTurnPlayerId)`, exactly one rendered row carries the spotlight (border + crown + wobble) and matches `currentTurnPlayerId`; if id not in `players`, no row is spotlit

- [x] 17. Refactor `MonopolyPropertyPanel`
  - [x] 17.1 Add `MONOPOLE` stamp, accent glow, and event-driven pulses
    - Update `src/components/monopoly/MonopolyPropertyPanel.tsx`: per-color-group header gates `MONOPOLE` star stamp + continuous accent glow on `playerOwnsAllInGroup(...)`; pulsing glow on a property card when queue emits `PURCHASE`, `BUILDING_GROW`, or `MORTGAGE` for that property — driven by ref + `framer-motion`, removed after 1.5s
    - Preserve existing mortgage / unmortgage / buy-house buttons and their preconditions verbatim
    - _Requirements: 8.4, 8.7, 13.8_

- [x] 18. Refactor `MonopolyCardModal`
  - [x] 18.1 Chain modal opening behind 3D card-flip cinematic + swoosh
    - Update `src/components/monopoly/MonopolyCardModal.tsx`: open after queue emits `CARD_DRAW` and after FX layer plays the 3D card-flip cinematic + swoosh sound finishes
    - Reduced-motion → no flip; modal opens with a 200ms fade-in
    - Public modal props unchanged
    - _Requirements: 6.3, 12.2, 13.1_

- [ ] 19. Existing-feature regression and example tests
  - [ ]* 19.1 Write example / smoke tests for palette, decor, regression, and bot parity
    - Create example tests that:
      - Enumerate every `ZONE_PALETTE` entry and assert pairwise distinctness (Req 2.2)
      - Assert each of the 12 zones mounts at least one `<ZoneDecor>` mesh (Req 2.3, 2.5)
      - Loop WCAG contrast ratio across all `(fg, bg)` pairings using the Ink palette anchors (Req 1.3, 1.7)
      - Sample squash-and-stretch curve at `t = 0, 0.25, 0.5, 0.75, 1` and assert documented values (Req 5.2)
      - Render `MonopolyGameScreen` with seeded states reaching jail, bankruptcy, monopole, end-screen, and stuck-loading; assert each affordance still works (Req 13.8)
      - Render a snapshot pair with `player_id === 'bot-1'` and another with a human id; assert `deriveRenderEvents` outputs are equal (Req 10.7, 13.6)
    - _Requirements: 1.3, 1.7, 2.2, 2.3, 2.5, 5.2, 10.7, 13.6, 13.8_

- [ ] 20. Build-time / repo-grep / a11y / shader-budget tests
  - [ ]* 20.1 Write build-time and source-grep tests
    - Create tests that:
      - `grep` the monopoly tree for `socket.io` / `webrtc` imports and assert none exist (Req 10.2, 13.3)
      - Assert no parallel audio engine import — only `useInkSoundEffects` is used in monopoly components (Req 9.1, 13.4)
      - Assert no `fps` / `ping` / `latency` / `hardware` / `perf-overlay` component is exported from the monopoly tree (Req 8.8, 11.8)
      - Diff `package.json` runtime deps against baseline and assert no new runtime dep was added (Req 13.5)
      - Assert no Supabase migration file dedicated to "animation events" was added (Req 13.7)
      - Mock `prefers-reduced-motion: reduce` matchMedia and assert no CSS animation longer than 200ms is registered and the camera state machine reports `userOverride` only (Req 12.1, 12.2, 7.8)
      - Tab-order through `MonopolyGameScreen` matches the existing snapshot; visible focus ring on every interactive `InkButton` (Req 12.4)
      - At scene mount, `WebGLRenderer.info.programs.length ≤ 12` (Req 11.6)
    - _Requirements: 7.8, 8.8, 9.1, 10.2, 11.6, 11.8, 12.1, 12.2, 12.4, 13.3, 13.4, 13.5, 13.7_

- [ ] 21. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP; core implementation tasks are never marked optional.
- Each property test sub-task references a property number from `design.md` and uses the exact file path from the design's "Property → test file" mapping table (15 properties → 15 PBT files), plus shared arbitraries in `src/lib/__tests__/monopolyArbitraries.ts`.
- Each task references granular sub-requirements (e.g. `5.4`, `8.7`) for traceability.
- Property tests cover only the pure derivation layer (`deriveRenderEvents`, `computeHopPath`, `tokenOffset`, `resolveBuildingKind`, `houseSlotPositions`, `durationFor`, `audioMap`, `fxMap`, `playerOwnsAllInGroup`, `lodFor`, `perfTierFor`, particle pool, camera state machine, channels, convergence). Rendering, lighting, and visual feel are validated by example / smoke / a11y / build-time tests.
- Public component contracts of `MonopolyGameScreen`, `MonopolyBoard3DCanvas`, `MonopolyPlayerPanel`, `MonopolyPropertyPanel`, `MonopolyCardModal` are preserved. `useMonopolyGame` remains the sole writer to Supabase.
- No new Supabase tables, channels, or audio engines are introduced. No FPS / ping / hardware overlay is rendered.
- Checkpoints (tasks 3, 6, 12, 21) ensure incremental validation and are not part of the dependency graph.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "2.2", "2.4", "2.7", "4.1", "4.2", "4.5", "5.1", "7.1", "9.1"] },
    { "id": 2, "tasks": ["2.3", "2.5", "2.6", "2.8", "2.9", "2.11", "4.3", "4.4", "4.6", "5.2", "7.2", "7.3", "9.2", "9.3"] },
    { "id": 3, "tasks": ["2.10", "2.12", "5.3", "5.4", "8.2", "8.4", "8.5"] },
    { "id": 4, "tasks": ["8.1", "8.3", "10.1", "11.1"] },
    { "id": 5, "tasks": ["11.2", "13.1", "14.1"] },
    { "id": 6, "tasks": ["15.1"] },
    { "id": 7, "tasks": ["15.2", "16.1", "17.1", "18.1"] },
    { "id": 8, "tasks": ["15.3", "16.2", "19.1", "20.1"] }
  ]
}
```
