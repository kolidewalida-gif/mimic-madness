# Requirements Document

## Introduction

MimicPoly is the Monopoly-style party game mode of the Mimic Madness app. This feature is a complete visual and UX overhaul of the existing mode to deliver a "cartoon premium next-gen party-game" experience inspired by Mario Party, Fall Guys, and modern Nintendo party games. It evolves the current `MonopolyGameScreen`, `MonopolyBoard3D`, `MonopolyPlayerPanel`, `MonopolyPropertyPanel`, and `MonopolyCardModal` into a vivid, hyper-animated 3D world while keeping the existing technical foundations intact: Vite + React 18 + TypeScript + Tailwind + Framer Motion, `@react-three/fiber` ^8.17 with `@react-three/drei` ^9.122 (three ^0.170), the `InkPrimitives` design system, the `useMonopolyGame` hook, the `useInkSoundEffects` audio layer, and Supabase Postgres + Realtime as the multiplayer source of truth.

The overhaul covers a true 3D cartoon board world with per-zone ambiance, real 3D buildings that grow from terrain to hotel, physics-feel dice, expressive token movement, layered FX for every action (purchase, rent, bankruptcy, cards, money rain, screen shake), a cinematic dynamic camera, premium animated UI, synchronized audio feedback, and rock-solid multiplayer correctness so that visuals never block or desync game logic. Bots (player IDs starting with `bot-`, simulated by the host) MUST animate exactly like human players. The feature MUST respect `prefers-reduced-motion`, hit a 60fps target on mid-range desktop and a graceful mobile fallback, and MUST NOT add any FPS counter, ping indicator, or hardware stats overlay anywhere on screen.

## Glossary

- **MimicPoly_System**: The full overhauled MimicPoly game mode (3D scene + UI + audio + sync layers).
- **Board_World**: The 3D scene rendered by `MonopolyBoard3D` containing the board, tiles, decor, buildings, tokens, dice, lights, and particles.
- **Board_Zone**: A logical region of the board grouping tiles by theme (e.g. brown/light-blue/pink/orange/red/yellow/green/blue color groups, railroad band, utility band, corner zones GO/JAIL/FREE_PARKING/GO_TO_JAIL).
- **Tile**: A single board space (`BOARD_SPACES[i]`, 0-39).
- **Building**: A 3D cartoon structure standing on a property tile, whose shape depends on `monopoly_properties.houses` (0 = empty terrain, 1-4 = houses, 5 = hotel).
- **Token**: A player's 3D pawn (car, hat, shoe, dog, ship, thimble, iron, cannon).
- **Dice_Set**: The pair of 3D dice rolled at the start of each turn.
- **Active_Player**: The player whose `player_id` equals `monopoly_games.player_order[current_player_index]`.
- **Bot_Player**: A player whose `player_id` starts with `bot-`; their actions are executed by the host client.
- **Cinematic_Camera**: The 3D scene camera, including its automated movements (idle drift, focus, travelling, zoom-in, transitions).
- **FX_Layer**: The visual effects subsystem (particles, screen shake, money rain, confetti, glows, flashes, trails).
- **Audio_Layer**: The sound effect subsystem driven by `playInkSound` from `useInkSoundEffects`, layered with optional ambient music.
- **Sync_Layer**: The realtime data flow between Supabase tables (`monopoly_games`, `monopoly_players`, `monopoly_properties`) and the client state used by `useMonopolyGame`.
- **Reduced_Motion**: The user-agent setting `prefers-reduced-motion: reduce`.
- **Ink_Primitives**: The shared cartoon-graffiti UI library at `src/components/ink/InkPrimitives.tsx`.
- **Ink_Sound_Effects**: The audio helper exposed by `playInkSound` in `src/hooks/useInkSoundEffects.ts`.

## Requirements

### Requirement 1: Cartoon Premium Visual Identity

**User Story:** As a player, I want MimicPoly to feel like a vibrant Nintendo-style party game, so that the experience looks premium, fun, and cohesive instead of flat or cheap.

#### Acceptance Criteria

1. THE MimicPoly_System SHALL render every 3D surface with a stylised cartoon material palette using vibrant saturated base colors, soft cel-style shading, soft drop shadows, subtle bloom, and dark outline accents that match the existing 4px black-border / 3D-shadow language of `Ink_Primitives`.
2. THE MimicPoly_System SHALL apply a cartoon outline pass (rim or post-process equivalent achievable with `@react-three/fiber` and `@react-three/drei` without adding new heavy dependencies) on tokens, buildings, and dice to give a thick "drawn" silhouette readable from any camera angle.
3. THE MimicPoly_System SHALL keep the existing graffiti palette anchors (`#0a0810` ink black, `#a855f7` purple, `#ec4899` pink, `#06b6d4` cyan, `#fbbf24` amber, `#22c55e` green, `#ef4444` red) as the dominant colors of UI, lights, glows, and FX so the mode stays visually consistent with other Ink-mode game screens.
4. THE MimicPoly_System SHALL light the Board_World with at least one warm key light, one cool fill light, and color-tinted accent lights matched to the active Board_Zone, with smooth color transitions when the focus moves between zones.
5. WHEN a 3D mesh represents an interactive or important element (Active_Player Token, owned property, hotel, dice mid-roll), THE MimicPoly_System SHALL emit a glow halo whose color matches the player's token color or the zone palette.
6. THE MimicPoly_System SHALL NOT use any photorealistic textures, dark/grim color schemes, flat unlit materials, or empty static surfaces in the Board_World.
7. THE MimicPoly_System SHALL keep all on-screen text readable at 1920x1080 and 1280x720 with a contrast ratio of at least 4.5:1 against its immediate background for body text and at least 3:1 for graffiti display titles.

### Requirement 2: 3D Cartoon Board World

**User Story:** As a player, I want the board to feel like a tiny living cartoon world with distinct neighborhoods, so that exploring it stays entertaining turn after turn.

#### Acceptance Criteria

1. THE MimicPoly_System SHALL render the 40 board Tiles as 3D blocks with thick chamfered edges, raised borders, embossed lettering, and per-zone color treatments derived from `BOARD_SPACES[i].group` and `GROUP_COLORS`.
2. THE MimicPoly_System SHALL define at least 8 distinct Board_Zones (the 8 property color groups) plus 4 corner zones, and SHALL apply a unique combination of base palette, accent light color, and ambient decor to each Board_Zone.
3. THE MimicPoly_System SHALL place animated cartoon decor around the outer ring of the board (e.g. stylised trees, lamp posts, mini vehicles, neon signs, benches) such that each Board_Zone displays at least one zone-specific decor element with a continuous idle animation (sway, blink, rotate, or hop).
4. THE MimicPoly_System SHALL render at least one continuous water or "energy stream" surface element (e.g. fountain, river, neon ribbon) inside the central plaza of the board with an animated stylised shader (UV scroll, wave, or noise distortion) running at the target frame rate.
5. THE MimicPoly_System SHALL render at least three neon-style signs or pulsing light strips on corner zones (GO, JAIL, FREE_PARKING, GO_TO_JAIL) whose emissive intensity oscillates on a continuous loop.
6. WHEN no player is currently moving and no modal is open, THE MimicPoly_System SHALL play subtle idle micro-animations (breathing, swaying, twinkling) on at least 50% of decor elements without exceeding the performance budget defined in Requirement 11.
7. THE MimicPoly_System SHALL preserve the existing tile metadata (name, price, color group, type) from `src/lib/monopolyBoard.ts` and SHALL NOT alter game-relevant tile geometry such that the 40-tile turn order or tile indexes change.

### Requirement 3: 3D Building Progression

**User Story:** As a property owner, I want my buildings to visibly grow from empty land to a luxury hotel with satisfying animations, so that progress on the board feels tangible and rewarding.

#### Acceptance Criteria

1. WHERE a property Tile has `houses = 0` and an `owner_id`, THE MimicPoly_System SHALL render a stylised "owned terrain" indicator (fenced lot, decorative ground patch, or owner-color flag) on top of that Tile.
2. WHERE a property Tile has `houses` between 1 and 4, THE MimicPoly_System SHALL render that exact number of distinct cartoon house meshes on the Tile, each with a unique placement so they do not visually overlap.
3. WHERE a property Tile has `houses = 5`, THE MimicPoly_System SHALL render a single larger cartoon hotel mesh that visually replaces the four houses.
4. WHEN a property's `houses` value increases, THE MimicPoly_System SHALL play a "rise from ground" growth animation (scale-up + bounce + dust puff particles) on the new building over 600 to 1200 milliseconds, then settle to its idle state.
5. WHEN a property is mortgaged (`is_mortgaged = true`), THE MimicPoly_System SHALL visually dim the Tile, tilt or grayscale its buildings, and overlay a chained / "closed" cartoon icon.
6. WHEN a property is unmortgaged, THE MimicPoly_System SHALL reverse the dimming with a snap-back animation lasting between 300 and 700 milliseconds.
7. WHILE a player owns a complete color group (monopole), THE MimicPoly_System SHALL emit an ongoing glow ring or pulse around all Tiles of that group in the player's token color.

### Requirement 4: 3D Dice with Physics-Feel Roll

**User Story:** As a player, I want rolling dice to feel weighty, bouncy, and cinematic, so that the most-repeated action of the game stays satisfying.

#### Acceptance Criteria

1. WHEN the Active_Player rolls the dice, THE MimicPoly_System SHALL spawn two 3D Dice_Set meshes above the central plaza, animate them tumbling with simulated rebound and angular velocity for between 700 and 1400 milliseconds, then settle them flat showing the values of `monopoly_games.last_dice_1` and `monopoly_games.last_dice_2`.
2. WHILE the Dice_Set is rolling, THE MimicPoly_System SHALL emit cartoon dust / sparkle particles at each simulated bounce contact and SHALL play a layered tumbling sound effect via the Audio_Layer.
3. WHEN the Dice_Set settles, THE MimicPoly_System SHALL trigger an impact FX (radial shockwave ring + screen-shake of magnitude 2 to 6 pixels for 150 to 300 milliseconds) and a confirmation sound effect.
4. WHEN the rolled dice values are equal (doubles), THE MimicPoly_System SHALL display an animated "DOUBLE !" cartoon stamp using `Ink_Primitives` with a distinct extra particle burst.
5. THE MimicPoly_System SHALL derive every dice animation purely from the broadcast values `last_dice_1` and `last_dice_2` so that all clients (including spectators) see the same final faces.
6. THE MimicPoly_System SHALL guarantee the Dice_Set animation completes in under 1500 milliseconds of wall-clock time so that turn progression in `useMonopolyGame.handleLandingFor` (which is currently triggered after 1400ms) is never blocked by the visual layer.
7. IF physics-style rebounds cannot be implemented without adding a new physics dependency, THEN THE MimicPoly_System SHALL achieve an equivalent "physics feel" using `useFrame`, `maath/easing`, or `framer-motion-3d` with hand-tuned damping curves.

### Requirement 5: Expressive Token Movement

**User Story:** As a player, I want my pawn to hop tile-by-tile with cartoon personality, so that watching it move around the board is part of the fun.

#### Acceptance Criteria

1. WHEN a player's `position` changes by N tiles, THE MimicPoly_System SHALL animate that player's Token along the path of N intermediate tile positions, performing one discrete hop per tile.
2. THE MimicPoly_System SHALL apply squash-and-stretch deformation (vertical scale 1.0 → 0.7 on takeoff, 1.0 → 1.2 at apex, 1.0 → 0.85 on landing) to each hop with anticipation and follow-through frames.
3. WHILE the Token is moving, THE MimicPoly_System SHALL emit a colored light trail behind it whose color matches the player's `token_type` color from `TOKEN_COLORS`.
4. WHEN the Token arrives on its destination Tile, THE MimicPoly_System SHALL play a "settle" reaction (small bounce + dust puff + glow pulse) lasting between 300 and 600 milliseconds.
5. THE MimicPoly_System SHALL keep per-tile hop duration between 120 and 280 milliseconds so total movement stays under 3 seconds for any roll between 2 and 12.
6. THE MimicPoly_System SHALL apply identical movement, squash-and-stretch, trails, and settle reactions to Bot_Players.
7. WHEN multiple Tokens occupy the same Tile, THE MimicPoly_System SHALL space them with a deterministic offset so that none fully occlude another and so that the rendering order is stable across clients.
8. WHEN movement crosses tile index 0 (passing GO), THE MimicPoly_System SHALL play a celebratory "+200$" floating text + coin burst FX above the Token.

### Requirement 6: Action Feedback FX (Purchase, Rent, Card, Bankruptcy)

**User Story:** As a player, I want every meaningful action to produce a satisfying visual and audio reaction, so that the game feels generous with feedback and never silent.

#### Acceptance Criteria

1. WHEN a property is purchased (a `monopoly_properties` row transitions from `owner_id = NULL` to a non-null value), THE MimicPoly_System SHALL play a "building rises from terrain" animation on that Tile combined with a coin-burst particle effect, a screen flash in the owner's token color, and a confirmation sound.
2. WHEN a player pays rent (a player's `money` decreases while another's increases on the same turn for an owned property), THE MimicPoly_System SHALL play a "money flies from payer to receiver" particle stream lasting between 500 and 1000 milliseconds and animate both players' MoneyChip counters.
3. WHEN a card is drawn (`monopoly_games.phase` becomes `'card'`), THE MimicPoly_System SHALL animate a 3D card flip into the camera with a swoosh sound before opening the existing `MonopolyCardModal`.
4. WHEN a card grants money (`collect`, `collect_each`), THE MimicPoly_System SHALL trigger a "money rain" particle effect over the Active_Player Token for 1 to 2 seconds.
5. WHEN a card costs money (`pay`, `pay_each`, `repairs`), THE MimicPoly_System SHALL trigger a brief red flash overlay and a "coin loss" particle puff on the Active_Player Token.
6. WHEN a player is sent to jail (`in_jail` transitions from false to true), THE MimicPoly_System SHALL play a cartoon "jail bars slam" overlay around the Token plus a stamp animation of "EN PRISON" using `Ink_Primitives`.
7. WHEN a player is declared bankrupt (`is_bankrupt` transitions from false to true), THE MimicPoly_System SHALL play a "shrink and tumble" animation on their Token, fade their owned-property indicators, and emit a defeated stinger sound.
8. WHEN the game ends (`is_finished` becomes true), THE MimicPoly_System SHALL trigger a confetti rain across the full canvas, a winning fanfare sound, and a slow camera zoom on the winner's Token.
9. THE MimicPoly_System SHALL trigger every FX described in this requirement based on changes detected from Sync_Layer state alone, so that FX play identically for actions performed by the local player, by remote players, and by Bot_Players.

### Requirement 7: Cinematic Dynamic Camera

**User Story:** As a player, I want the camera to follow the action like a Mario Party broadcast, so that I always feel like I'm watching the most interesting thing on the board.

#### Acceptance Criteria

1. WHEN no animation is in progress, THE Cinematic_Camera SHALL perform a slow continuous idle drift (gentle orbit + slight breathing zoom) of magnitude under 5 degrees per second around the board center.
2. WHEN the Active_Player changes, THE Cinematic_Camera SHALL smoothly travel to a framing that keeps the Active_Player Token at roughly one-third of the screen height and the most relevant board section in view, completing the transition in 600 to 1200 milliseconds.
3. WHEN a Token is moving (Requirement 5), THE Cinematic_Camera SHALL track the moving Token with a soft follow lerp factor between 0.06 and 0.18 per frame so the motion stays smooth and never jittery.
4. WHEN a property is purchased, a building grows, a card is drawn, or the game ends, THE Cinematic_Camera SHALL perform a focused zoom-in on the relevant Tile or Token for 600 to 1500 milliseconds before returning to its previous framing.
5. WHEN doubles are rolled, THE Cinematic_Camera SHALL execute a quick celebratory whip-pan around the Active_Player Token of less than 500 milliseconds.
6. THE Cinematic_Camera SHALL allow manual user override via the existing `OrbitControls`, and SHALL pause automated movements while the user is actively dragging or zooming.
7. THE Cinematic_Camera SHALL never clip into the board base, into Buildings, or into Tokens; minimum distance from the central origin SHALL remain at least 8 units.
8. IF Reduced_Motion is enabled, THEN THE Cinematic_Camera SHALL replace continuous drift, whip-pans, and zoom-ins with static framings or single-frame cuts.

### Requirement 8: Premium Cartoon UI/UX

**User Story:** As a player, I want the 2D UI overlaying the board to feel as cartoon-premium as the 3D scene, so that the whole experience reads as a unified party game.

#### Acceptance Criteria

1. THE MimicPoly_System SHALL render every UI surface (header, action card, player panel, property panel, modals) using `Ink_Primitives` components (`InkCard`, `InkButton`, `InkPhasePill`, `InkTitle`, `InkIconBadge`, `InkPill`, `InkStamp`, `InkTimerBar`) and SHALL NOT introduce a parallel cartoon design system.
2. THE MimicPoly_System SHALL display the Active_Player with a permanent visual spotlight in the player panel: animated wobble on token disc, glowing border in the player's color, and an animated "TOUR" crown badge.
3. WHEN a player's `money` value changes, THE MimicPoly_System SHALL animate the corresponding MoneyChip with a count-up/count-down tween of 300 to 700 milliseconds and a color flash (green for gain, red for loss).
4. WHEN a player owns a property displayed in the property panel, THE MimicPoly_System SHALL show a per-color-group badge that lights up with a "MONOPOLE" star stamp once the player owns the entire group.
5. THE MimicPoly_System SHALL animate every primary button (`InkButton`) on hover with a scale + slight rotation (existing `whileHover` pattern) and a press-down on tap.
6. THE MimicPoly_System SHALL render the central action card (turn header + message + dice + actions) with a spring entrance animation and a phase-aware accent color matching `phaseInfo.color`.
7. WHEN important properties are highlighted (e.g. just bought, mortgaged, monopoly completion), THE MimicPoly_System SHALL apply a pulsing glow to the corresponding card in the property panel.
8. THE MimicPoly_System SHALL NOT render any FPS counter, ping indicator, latency meter, or hardware-stats overlay anywhere on screen at any time.

### Requirement 9: Synchronized Audio Feedback

**User Story:** As a player, I want every action to be punctuated by a satisfying cartoon sound, so that the audio reinforces every visual reaction.

#### Acceptance Criteria

1. THE MimicPoly_System SHALL trigger sound effects exclusively through `playInkSound` from `useInkSoundEffects` and SHALL NOT introduce a parallel audio engine for in-game SFX.
2. WHEN the Dice_Set rolls, lands, and reveals values, THE Audio_Layer SHALL play a layered sequence of dice-tumble, impact, and reveal sound effects with a total duration matching the visual roll length defined in Requirement 4.
3. WHEN a Token hops, THE Audio_Layer SHALL play a low-volume hop SFX on each hop, capped to one playback per hop and to a maximum of 12 simultaneous voices to avoid audio clipping.
4. WHEN a property is purchased, a building grows, a card is drawn, rent is paid, a player is jailed, a player goes bankrupt, or the game ends, THE Audio_Layer SHALL play a distinct dedicated SFX cue that maps one-to-one to each event.
5. THE MimicPoly_System SHALL keep the existing phase-driven SFX cues already wired in `MonopolyGameScreen.tsx` (`cartoonWobble`, `cartoonDing`, `cartoonSwoosh`, `cartoonZap`, `cartoonFanfare`, `cartoonBoing`, `cartoonPop`, `inkClick`) and SHALL extend the set with additional cues only via `useInkSoundEffects`.
6. WHEN the user has muted audio at the OS or app level, THE MimicPoly_System SHALL produce no sound and SHALL NOT block, queue, or stutter any visual animation.

### Requirement 10: Multiplayer Correctness and Determinism

**User Story:** As a player in a multiplayer game, I want every animation, FX, and camera move to play consistently across all clients without ever blocking the turn flow, so that the game stays synchronized and fair.

#### Acceptance Criteria

1. THE MimicPoly_System SHALL derive every animation, FX trigger, and camera move from observable state changes in `monopoly_games`, `monopoly_players`, and `monopoly_properties`, and SHALL NOT introduce a new animation-events table or Supabase channel beyond what `useMonopolyGame.tsx` already subscribes to.
2. THE MimicPoly_System SHALL keep Supabase Postgres + Realtime as the single source of truth for game state, and SHALL NOT introduce Socket.io, WebRTC, or any other real-time transport.
3. THE MimicPoly_System SHALL maintain a strict separation between game state (Supabase rows) and render state (animation timers, particle systems, camera tweens) so that a render delay can never block the host-side turn loop in `useMonopolyGame`.
4. WHEN a remote client joins or rejoins mid-game, THE MimicPoly_System SHALL reconstruct all visual state (tokens at correct positions, buildings at correct house counts, mortgage states, money values) directly from the current row snapshots without replaying past animations.
5. WHEN the local client misses a state update due to a transient network issue, THE MimicPoly_System SHALL converge to the correct visual state within 2 seconds of receiving the next snapshot via interpolation rather than a hard snap, except when the position or money delta is out of safe interpolation range.
6. THE MimicPoly_System SHALL NOT delay or queue any Supabase write performed by `useMonopolyGame` (rolls, buys, mortgages, end-turn) behind a visual animation; visuals SHALL be advisory only.
7. WHEN the Active_Player is a Bot_Player, THE MimicPoly_System SHALL animate, FX, and camera-track that Bot_Player exactly as it would a human player and SHALL NOT skip, fast-forward, or simplify any animation purely because the player is a bot.
8. IF a state change implies a multi-step animation (e.g. a card sends a Token to another Tile and grants money), THEN THE MimicPoly_System SHALL play those animations sequentially in a deterministic order on every client based on the same observable state diff.

### Requirement 11: Performance Budget and Optimization

**User Story:** As a player on a mid-range device, I want the game to stay smooth despite all the visual richness, so that the experience never feels laggy.

#### Acceptance Criteria

1. THE MimicPoly_System SHALL target a sustained 60 frames per second during normal play (idle board, single Token movement, single building growth) on a baseline mid-range desktop (4-core CPU, integrated or entry GPU, 1080p viewport).
2. THE MimicPoly_System SHALL maintain at least 30 frames per second on a baseline mid-range mobile device (recent mid-tier smartphone, 720p viewport) by automatically reducing particle counts, disabling secondary lights, and lowering shadow map resolution when the device is detected as mobile or when sustained framerate drops below 40 for more than 2 seconds.
3. THE MimicPoly_System SHALL cap total simultaneous active particle systems in the Board_World to a configured maximum (default 8 systems, each capped to 60 particles) and SHALL pool / reuse particle systems instead of spawning new ones each frame.
4. THE MimicPoly_System SHALL implement at least two LOD levels for Buildings (full-detail when the camera distance is under 12 units from the Tile, simplified mesh otherwise).
5. THE MimicPoly_System SHALL only run `useFrame` work on visible objects and SHALL skip per-frame updates for Tokens, decor, or Buildings that are off-camera or fully occluded.
6. THE MimicPoly_System SHALL keep the count of distinct shader programs used by the Board_World under 12 to limit GPU pipeline switches.
7. THE MimicPoly_System SHALL NOT perform any synchronous network call or any blocking work longer than 8 milliseconds inside the render loop.
8. THE MimicPoly_System SHALL NOT display any in-game performance overlay, FPS counter, ping indicator, or hardware stats to the user; performance instrumentation, if any, SHALL remain in `console` logs only and SHALL NOT be visible in production builds.

### Requirement 12: Accessibility and Reduced Motion

**User Story:** As a player who is sensitive to motion or has accessibility needs, I want the game to remain enjoyable and understandable, so that I can play comfortably without sacrificing core gameplay.

#### Acceptance Criteria

1. WHEN the user-agent reports `prefers-reduced-motion: reduce`, THE MimicPoly_System SHALL replace all continuous decorative animations (idle drift, decor sway, water UV scroll, neon pulse, glow pulses) with static rendering.
2. WHEN Reduced_Motion is enabled, THE MimicPoly_System SHALL replace Token hops, building growth, dice tumble, money streams, money rain, and confetti with shortened or single-frame transitions of 200 milliseconds or less while still surfacing the same state changes.
3. WHEN Reduced_Motion is enabled, THE MimicPoly_System SHALL keep all gameplay-critical information visible at all times (current player, dice values, money amounts, owned properties, phase) and SHALL NOT hide any of it behind animation.
4. THE MimicPoly_System SHALL keep all interactive UI controls reachable via keyboard with a visible focus ring and SHALL preserve the existing Tab order of `MonopolyGameScreen`.
5. THE MimicPoly_System SHALL avoid full-screen flashes brighter than 50% screen luminance more than 3 times per second to mitigate photosensitivity risk.
6. THE MimicPoly_System SHALL ensure all critical state changes (turn change, card draw, purchase, bankruptcy, game end) are conveyed by at least two channels among text, color, icon, motion, and sound, so removing one channel still leaves the change perceivable.

### Requirement 13: Hard Constraints and Integration with Existing Systems

**User Story:** As a maintainer of the Mimic Madness codebase, I want the new MimicPoly experience to plug into the existing architecture without breaking it, so that the overhaul stays a refactor and not a rewrite.

#### Acceptance Criteria

1. THE MimicPoly_System SHALL evolve the existing files `src/components/monopoly/MonopolyGameScreen.tsx`, `src/components/monopoly/MonopolyBoard3D.tsx`, `src/components/monopoly/MonopolyPlayerPanel.tsx`, `src/components/monopoly/MonopolyPropertyPanel.tsx`, and `src/components/monopoly/MonopolyCardModal.tsx`, and SHALL keep their public component contracts compatible with their current consumers.
2. THE MimicPoly_System SHALL continue to use the existing `useMonopolyGame` hook (`src/hooks/useMonopolyGame.tsx`) as the single owner of game logic (init, dice, landing, turn order, bot AI, jail, bankruptcy, cards) and SHALL NOT duplicate that logic in render components.
3. THE MimicPoly_System SHALL keep Supabase Postgres + Realtime channels (`monopoly_games`, `monopoly_players`, `monopoly_properties`) as the only multiplayer transport and SHALL NOT propose Socket.io, custom WebSockets, or peer-to-peer sync.
4. THE MimicPoly_System SHALL reuse `Ink_Primitives` for all 2D UI surfaces and SHALL reuse `Ink_Sound_Effects` (`playInkSound`) for all SFX.
5. THE MimicPoly_System SHALL build on the existing Three.js stack (`@react-three/fiber` ^8.17, `@react-three/drei` ^9.122, three ^0.170) and Framer Motion already in `package.json`; any new dependency (e.g. `framer-motion-3d`, `maath`, a physics library) SHALL be explicitly justified in the design phase, kept under a combined gzipped budget of 80 KB, and SHALL fall back to existing primitives (`useFrame`, `Float`, `OrbitControls`, hand-tuned easings) when no equivalent feature gap exists.
6. THE MimicPoly_System SHALL animate Bot_Players (player IDs starting with `bot-`) with the same fidelity as human players, including dice rolls, hops, building growth, and FX.
7. THE MimicPoly_System SHALL NOT introduce new Supabase tables, Realtime channels, or migrations dedicated to "animation events"; if a new column is strictly necessary to coordinate a visual cue, it SHALL be justified in design and SHALL piggyback on the existing tables rather than creating new ones.
8. THE MimicPoly_System SHALL NOT remove or break any feature currently exposed by `MonopolyGameScreen` (quit button, properties toggle, free-parking pot badge, end-screen ranking, stuck-loading recovery, jail actions, mortgage actions, bankruptcy declaration).
