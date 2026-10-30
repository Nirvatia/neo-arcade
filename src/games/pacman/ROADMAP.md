# Pac-Man — roadmap

Working agreement: one stage per chat. A new chat starts with
"read `src/games/pacman/ROADMAP.md`, stage N" — N is a stage of the **Plan** below (plan v2).
Claude analyses the code, proposes a plan, waits for approval, works, then updates this
file (done / found) and pushes to `feat/pacman`. New art and new effects start as a
prototype the owner approves first: an HTML page built from the game's own sources
(`prototypes/pacman/<name>/main.ts` + `index.html`, built by `node prototypes/pacman/build.mjs <name>`), so the approved
prototype already is the game code.

## Architecture (after stage 3)

```
core/        GameMain (wiring, input → director, auto-pause), Events
             Director (transition table, pause stack, screen fade, `flow` snapshot)
  flow/      GameState interface, StateClock (timeline of named phases)
  states/    menu, ready (intro | short), playing, paused, death, level-clear, game-over
engine/      EventBus, GameLoop
config/      grids, scores, actor contact distance, flowConfig (every flow duration)
logic/
  level/     LevelLoader (the run: level number, profile, secret/hell routing, carry-over)
             LevelSession (all services of one level, built together, never partial)
             SeasonCatalog (palettes, grids, per-season gameplay modifiers), progress, score
  maze/      GridModel, GridService, SpawnLocator, LairExit
  actors/    Player*, Ghost*
  rules/     CombatService, HypnosisService (Ms. Pac-Man overdrive), LairCodeService
  bonuses/   fruit, golden egg, echo clone
  doom/      hell boss, weapons, hazards (+ tests)
render/
  RenderPipeline   canvas, HiDPI, render clock → builds a RenderFrame per frame
  RenderFrame      frame data + the LevelRenderer interface
  SharedLayers     Pac-Man, bonuses, overlay (every level)
  seasons/meadow/  MeadowBake (static world) + MeadowWorld (live layer) + MeadowLevelRenderer,
                   driven by a MeadowTheme per season (seasons/<season>/<season>Theme.ts)
  arcade/          the secret level: pixel art at native size, CRT pass, intermission
  doom/            DoomLevelRenderer, baked world, lamprey boss, combat and weapon FX
  transitions/decay/       level decay on death: field (Dijkstra), timeline, WebGL2 pass
  transitions/seasonTurn/  level clear: corridor lights + tile cards to the next world
  maze/ actors/ items/ (fruit: one file each; bonus life, exit) overlay/ contracts/
  common/ (textures, GlPass, seededRandom, clamp, rgba)
ui/          Svelte HUD (hell), overlay, debug panel, action bridges
```

Rules of thumb:

- Logic never imports render. Render reads logic through `RenderFrame` (`frame.level`,
  `frame.director`), never mutates it (the doom FX queue is the one consumer-side drain).
- A new level kind = a new `LevelRenderer`; the pipeline only picks one per frame.
- Per-level state goes into `LevelSession`; anything that survives a level change is
  carried explicitly by `LevelLoader.changeLevel`.
- Shared drawing helpers go to `render/common/`, not copied into views.
- A level renderer returns the board layout and never draws the overlay; in the death
  state it leaves Pac-Man out. `RenderPipeline` renders the level offscreen while dying,
  runs the decay pass, then draws Pac-Man, the overlay and the screen fade on top.
- No PixiJS: per-pixel effects are WebGL2 passes over the Canvas2D frame, uploaded only
  while the effect runs (`transitions/decay/DecayPass` is the pattern).
- Timed things are `StateClock` phases with durations in `config/flowConfig.ts`.
  Animations read `frame.flow` (`state`, `phase`, `phaseProgress`, `progress`, `remaining`,
  `paused`, `fade`) and never keep their own timers for flow events.
- State changes go through `Director`; a change missing from its `TRANSITIONS` table is
  logged and ignored. Level changes use `director.changeLevel(route)` (fade + short READY),
  or `director.startLevelInPlace(route)` after the season turn (no fade).

### Game flow (stage 2)

```
menu ──fade──▶ ready(intro 5 s, jingle) ──▶ playing ──▶ death 5 s ──▶ ready(short 2 s)
                  ▲   skip: Enter                │  │           └─ no lives ─▶ game-over
                  │                              │  └─▶ level-clear 5.3 s (season turn) ─▶ ready(short)
game-over ─fade───┘  (input locked 1 s)          └─ golden egg ──fade──▶ secret ready(short)
hell: dying in the abyss ──fade──▶ next level, ready(short)
boss level: boss dies → heart (where it fell) + exit (far end) → taking either ends the
      level as a win (level-clear); the heart also gives +1 life (`BossRewardService`)
pause (Space/P, Esc in play): ready, playing, death, level-clear — freezes and resumes the
same state; tab hidden / window blur auto-pauses; requests during a fade apply after it.
```

Phases: `DeathState` runs `shatter` → `void` → `rebuild` (`flowConfig.death`),
`LevelClearState` runs `lights` → `turn` → `settle` (`flowConfig.levelClear`). The fade is a flat colour in `RenderPipeline.drawFade`
and covers the canvas only (Svelte buttons stay on top); replace it there.

## Current state

- **Hell level** (`render/doom/`): the CLAUDE_GRID_DOOM_v3 prototype ported 1:1
  (`DoomBake` static world, `DoomWorld` camera, live objects, atmosphere). Ash storm in boss
  phase 2, dark night with a per-tile corridor light map (`DoomLightmap`) in phase 3. Actors
  are drawn above the atmosphere. Doom-style teleporter pads with green teleport fog.
  Separate hell HUD (`ui/hud/HellHud.svelte`).
- **Boss** (`logic/doom/`): three phases with distinct attack sets — phase 1 ambush chase,
  dash, rift; phase 2 seals, pull, cross, rift, void trail; phase 3 split + echo, eruption
  waves, corruption of outer corridors, blink, brood. Hazards in `DoomHazards.ts`, fairness
  checks guarantee an escape. Visual: `render/doom/HellBlinkyView.ts` (Blinky, lord of
  hell). Minions: imps (`render/doom/HellImpView.ts`); shared ghost-demon drawing in
  `render/doom/hellGhost.ts`.
- **Weapons**: BFG, barrel, berserk (the fist), medkit; effects in `render/doom/DoomFxView.ts`, fed by
  an FX event queue from the doom logic.
- **Pac-Man** (`render/actors/PlayerView.ts`, every level): living soft body, energized /
  berserk looks, ribbon trail, arcade-style death.
- **Core fixes**: render bundle cached per level (no flicker), HiDPI canvas, variable-step
  game loop (no judder), one tile-center coordinate convention for all actors.
- **Tests**: `logic/doom/doomMechanics.test.ts` (pickups, BFG hits, maze bounds, minions,
  stun vs death/transition, attack sets per phase, rift escape, eruption parity, seals keep
  the maze connected) and `core/director.test.ts` (game flow: fades, intro/short ready,
  pause in every state, auto-pause, game-over lock, transition table). Run with
  `npx vitest run src/games/pacman`.

### Debug tools (dev build only)

- Dev panels (stage 2): `` ` `` or the DEV button; `F8` steps one frame.
- `window.__pacman = { level, director, render }` for the console and Playwright play-tests.
  Directions are upper case: `level.setDesiredDirection('LEFT')`. `director.startGame()`
  now fades for 0.8 s before READY; wait for it before `showPlaying()` / `debugEnter*()`
  (both are ignored during a fade). `director.flow` shows the state, phase and timers.
- Fire key is `F` / `Shift`; `Space` pauses.
- Controls (fixed after plan v2 stage 1): a reversal turns Pac-Man round on the spot
  (`PlayerModel.reverse`, no wait for the next tile); a turn pressed up to 0.15 tile past
  a junction still takes it (`LATE_TURN`); `InputController` tracks held direction keys and
  `GameMain` applies the latest held one every frame, so a held key survives pauses, deaths
  and fades, and releasing it falls back to a key still held. The sprite turns ~2.5×
  faster. Tests: `logic/actors/playerControl.test.ts`. Speed is unchanged (Pac-Man 6
  tiles/s, ghosts 5.4).
- Deterministic screenshots: Playwright `page.clock.install()` + a seeded `Math.random`
  init script make most frames repeatable (noise < 0.1 %). Boss phase 3 and the death wave
  stay chaotic; compare those by eye.

### Known issues

- Headless Chromium without a GPU runs the hell night at ~20 FPS (the reference prototype
  ~26); JS cost is ~2 ms/frame, the rest is software rasterisation. Check on real hardware.
- Art not final: Pac-Man (plan stage 4), fruit and ghosts (stage 1).
- Regular levels have no Svelte HUD (only the canvas top bar); plan stage 5 adds one.
- `DecayPass` still has its own WebGL boilerplate; move it onto `render/common/GlPass`
  (the season turn already uses it) when the decay is next touched.
- Large files left as they are, to be cut when their stage rewrites them:
  `logic/doom/DoomBossService.ts` (~1300 lines), `logic/actors/GhostService.ts`,
  `logic/rules/CombatService.ts`, `render/doom/DoomBake.ts`.
- Some states still reach services through the nullable `LevelLoader` getters
  (`DeathState.enter`, `GameOverState`); harmless, switch to `level.ensure()` when touched.

### Design decisions (keep)

- Organic and alive, not metal: soft bodies, breathing, squash and stretch.
- Effects stay inside the tile (no coronas spilling onto walls).
- Pac-Man: wedge mouth, no eyes, no lips, ribbon trail (not a slug or a snake).
- Boss: Doom-like, harsh and dangerous, changes visibly by phase, fits in one tile.
- Ash and night are driven by boss phases, never by UI buttons.
- Fruit views stay one file per fruit (`render/items/fruit/*View.ts`): each holds its own
  art, the owner's mock-up texture code 1:1.
- A boss level ends by the player's choice: the heart (+1 life) or the exit (no life).

## Plan (v2, set by the owner after plan v1)

Order matters; new boss worlds come last. **Owner's order after stage 3: 6 → 7 → 8 → 9
→ 4** (5 and 3 are done; the secret level comes next, the Pac-Man art and its pre-game
blink move to the very end); the numbers below stay as they are. Each art or effect stage starts with a prototype
on the real game code for the owner to approve.

1. **Migrate the remaining art.**
   - Ms. Pac-Man: **ported 1:1, awaiting the owner's verdict.** The owner's "Stardust
     Heart" mock-up (MS_PACMAN.html) in Canvas2D: `render/actors/MsPacmanView.ts`, picked by
     `SharedLayers.drawPlayer` for the `ms-pacman` profile. Same palette, shapes, blend modes
     (additive everywhere but the body), timings and effects; r = 0.42 tile, every mock-up
     pixel scales with it, so the bow and aura reach past the tile as in the mock-up. The
     first port re-styled it (lit body, small bow pinned to the top of the head); the owner
     asked for 1:1, and the pinned bow sat at the mouth when moving up. Now the sprite
     (body, mouth glow, bow) is drawn in its own frame rotated to the heading, bow at
     heading + 0.85π as in the mock-up, mirrored by the last horizontal heading like the
     arcade sprite: on top behind the head moving left/right, behind the head moving
     up/down. The mouth chomps only while moving; reactions follow game events (dot,
     energizer / fruit, ghost eaten with the light streak from ahead, teleport wormholes,
     overdrive, invulnerability blink, death). Prototype: `prototypes/pacman/ms-pacman`
     (`node prototypes/pacman/build.mjs ms-pacman`).
   - Fruit: the owner's mock-ups (COLLECTIBLE_*.html), arriving in batches. **All 10 fruit
     ported (batches 1–3), awaiting the verdict**, plus the bonus-life heart.
     Shared engine `render/items/collectibleSprite.ts`: the mock-up's texture code is run
     1:1 once into a canvas, its two bloom copies are blurred once (canvas `filter`, or
     down-up sampling where unsupported), and each frame draws sprite + additive blooms with
     the mock-up's breathing, sway and shimmer. Each fruit file holds its texture code, the
     object bounds (glow excluded), the mock-up's display sizes and, when its ticker differs
     (pretzel), its own motion; `FruitView` fits the
     object's larger side to `FRUIT_EXTENT` = 0.9 tile, centred on the tile, and still
     blinks while the timer runs out. The stub primitive is gone. The orange's skin pores are random, as in its mock-up (placed
     once per page load). Prototype:
     `prototypes/pacman/collectibles` (`node prototypes/pacman/build.mjs collectibles`).
   - Boss reward (owner's rule): beating a boss ends the level through a choice. The boss
     dies → the bonus life (`render/items/BonusLifeView.ts`, heartbeat + orbiting
     particles) appears on its last tile and an exit (`render/items/ExitView.ts`, a stand-in
     doorway until the owner's icon arrives) on the walkable tile farthest from it. Taking
     the heart ends the level with +1 life, the exit ends it without; nothing ends it before
     (`logic/bonuses/BossRewardService.ts`, wired in `PlayingState`, tests in
     `bonuses/bossReward.test.ts`). Boss levels get it through `LevelSession.bossReward`
     (the hell today, the stage-8 boss worlds later). The debug `COMPLETE LEVEL` still ends
     the hell at once, without the choice.
   - Golden egg → Easter egg: the owner wants it redrawn as an Easter egg, by Claude, later.
   - Ghosts: art for each season (spring, summer, autumn, winter), with the normal,
     frightened, flashing and eaten (eyes only) states. `GhostView` is one generic look now.
   - Direction indicator (see stage 3): ghosts' eyes looking where they move is the
     classic answer; settle the shared rule here so stages 3 and 4 reuse it.
2. ✅ **Dev panel + log panel** (dev build only). Done in the third chat.
   - `core/debug/DebugController`: every dev command in one object, built only in dev
     builds (`GameMain`); the Svelte side holds it in a store (`ui/debug/debugActions`).
   - Time: `engine/TimeControl` (freeze, scale 0.1–2×, one-frame step); `GameLoop` asks it
     for game time and passes the same time to `RenderPipeline.render(dt)`, so a frozen
     game stands still on screen too. Hotkeys: `` ` `` panels, `F8` step.
   - Windows (`ui/debug/DevWindow` + `DevGroup`): float over the game, drag by the title,
     fold; position and open groups in localStorage (`pacman.dev.*`, failures ignored).
     Panel (`PacmanDebugPanel`): live line + FLOW, LEVEL, PLAYER, BOSS (phase 1–3, force any
     attack of the phase, kill), SPAWNS (any fruit, egg, echo, hell pickups), RENDER.
   - Log (`ui/debug/DevLogWindow`, `devLog`): WATCH table of live timers
     (`DebugController.watches()`, incl. every boss attack cooldown) and the LOG stream of
     `debug:log` events with channel toggles, filter, hold, clear, copy (last 500 lines).
     Logic writes through `logic/debug/debugLog` (`debugLog(events, …)`, or a `DebugSink`
     for the doom services, wired in `LevelSession`); all of it is a no-op in production.
   - Render overlays (`render/debug/DebugOverlayView`): grid with coordinates; next tile,
     heading and state of ghosts, boss and Pac-Man (plus the buffered turn); contact
     hitboxes; the decay / season-turn front over its distance field (`debugFront` on
     `LevelDecay` and `SeasonTurn`).
   - New logic hooks: `DoomBossService.debugSetPhase / debugForceAttack / debugKill /
     debugCooldowns`, `takeDamage(amount, source)`, `DoomAbilityService.debugGiveWeapon`,
     `damagePlayer(…, source)`, `FruitService.debugSpawn(kind)`, `GoldenEggService.debugSpawn`,
     `CombatService.debugAddLives / debugPower`, `LevelLoader.debugGotoLevel`,
     `Director.debugGotoLevel`.
   - Tests: `core/debug/debugTools.test.ts` (time control, boss phase / forced attack /
     kill, dev log silent in production).
3. ✅ **Hell rework.** Done in the fourth chat. Owner's decisions: seals deal damage; the
   minions become small demon ghosts; the berserk pickup is a fist.
   - Done in the game logic: **eruption** is a disc (path distance ≤ `ERUPTION_INNER` = 3)
     that bursts after 1.2 s, then the ring out to 6 tiles 0.65 s later; it starts only if
     `canOutlast` (`DoomHazards.ts`: a search over tile × time at 80 % speed, stopping only
     where Pac-Man can stop, against a wall) finds a way through. The new eruption can be
     outlasted from every tile of the hell, the old even/odd waves from 8 %. A later wave is
     drawn dim until its turn. **Seals** are aimed (`pickSeals` + `predictPlayerPath`): the
     tile the player reaches as they burn (a junction near that point wins), the next
     junction past it, then others; standing on a seal when it burns is a hit; the sigil and
     its countdown arc stay inside the tile. Tests in `doomMechanics.test.ts`.
   - Art approved by the owner and wired into the game. Prototype: `prototypes/pacman/hell`
     (`node prototypes/pacman/build.mjs hell`). Gallery: Blinky, lord of hell
     (`render/doom/HellBlinkyView.ts`; phases 1–3, wind-up, dash, cast, stunned, hit, echo),
     the imps (`HellImpView.ts`, Pinky / Inky / Clyde colours), the berserk fist
     (`berserkFistSprite` in `DoomSprites.ts`); large, on the maze and magnified. Fight: the
     real boss logic, Pac-Man on the arrow keys, attack buttons. Shared ghost-demon drawing
     in `render/doom/hellGhost.ts`. In the game: `DoomLevelRenderer` draws `HellBlinkyView`,
     `DoomCombatView` draws the imps, the fist replaced the megasphere (pickup FX tint
     orange too); `LampreyBossView` is deleted. Pac-Man's berserk look is unchanged.
   - Direction rule (also settles the stage 1 item): eyes look where the body heads (on a
     wind-up, at the player); hell actors add a small chevron on the tile's leading edge;
     Pac-Man keeps the mouth.
   The original task list:
   - Boss art: the lamprey reads badly on a small tile. Return to the idea of Blinky as
     the lord of hell (a demon red ghost) — readable at tile size, changes by phase.
   - Direction indicator for every entity (boss, minions, Pac-Man, ghosts): the player
     must see where each one is heading.
   - Phase 3: the purple circles that fill the area around Pac-Man cannot be dodged and
     always cost a life — make them telegraphed and escapable (extend the fairness
     checks in `DoomFairness.ts` and cover it with a test).
   - Berserk orb: new art that reads as a weapon.
   - Triple-pentagram attack: it almost always misses, and its art spills out of the tile
     — aim it (lead the player's path) and keep the art inside the tile.
4. **Pac-Man art rework** + bug: Pac-Man blinks before the game starts.
5. ✅ **Full HUD and overlays** (third chat; moved before stages 3 and 4 by the owner).
   **Wired into the game.** After two rejected designs (a glass plate with a rounded accent
   border; numbers scattered over the screen corners) the owner accepted, as a prototype,
   a compact boxed HUD: one solid dark box at the top centre right above the board (score
   + high, level + world, lives as a number, power timer or the weapon, dot progress along
   its bottom edge) and, on boss levels, a boss box of the same width 8 px below. Lesson:
   everything important in one place before the eyes, on a background, in a tidy box.
   In the game: `GameMain` builds `ui/hud/hudSnapshot` every frame into the `hudFrame`
   store; `ui/PacmanUi.svelte` (on the page) shows `GameHud` (or `ArcadeHud` on the secret
   level; none in the menu), `ui/screens/GameScreens` (buttons through the input, RESTART =
   `Director.restartLevel`) and the screen fade as a DOM layer over both. High score from
   `shared/utils/scoreStore` ('pacman'), saved on game over. Removed: the canvas
   `OverlayView` + top bar + canvas fade, `HellHud`, `PacmanOverlay`, the HUD adapter and
   store, `ui/actions`. Language: `ui/i18n` (EN default, RU, remembered).
   Open: the boss box covers the top row of the hell maze (as the old hell HUD did); the
   secret level's fruit row shows its big level number's fruit (keys). The plan below is
   kept for reference.
   Today: the hell HUD (`ui/hud/HellHud.svelte`, metal plate with hazard stripes, Russian
   labels) on the hell only; on other levels only the canvas top bar and canvas titles
   (`render/overlay/OverlayView` + `overlaySnapshot`); buttons in `ui/overlay/PacmanOverlay`
   (English); HUD data by `ui:hudChanged` events (timers rounded); the screen fade is on
   the canvas, under the Svelte buttons.
   Owner's decisions:
   - One HUD for the whole game; style = the hell HUD without the hell stripes: dark
     glass and metal, the accent colour taken from the world (spring, summer, autumn,
     winter, hell). The boss block keeps the "dangerous" look (stripes).
   - Boss levels add a boss block on top: name and phase, HP bar with phase marks, the
     player's HP in the fight, weapon slot with icon, berserk timer, BFG charge; after the
     boss dies a hint "take the heart or the exit".
   - The secret level is the original Pac-Man: it gets the **original arcade HUD**
     (1UP / HIGH SCORE on top, lives and the level fruits at the bottom, arcade lettering).
   - Two languages, English by default, Russian switchable (remembered).
   Work:
   1. Prototype `prototypes/pacman/hud` over a real season and the hell, every screen on a
      button; `build.mjs` gets the Svelte plugin so the prototype mounts the game's own
      components. Owner approves before wiring.
   2. Data: one `HudSnapshot` built every frame from the director and the level (like the
      dev panel), so timers and bars move smoothly; replaces `ui:hudChanged` + adapter.
   3. Main HUD: score + high score (`shared/utils/scoreStore`), level + world name, lives as
      Pac-Man / Ms. Pac-Man icons, dot progress with weather (50 %) and night (75 %) marks,
      power / overdrive / echo timer, the level fruits row (owner's fruit art).
   4. Boss block (above). Arcade HUD for the secret level.
   5. Screens in Svelte: menu (start, Pac-Man / Ms. Pac-Man, high score, controls,
      language), ready (level, world, countdown), pause (resume, restart, menu), death
      (lives left), game over (score, new record, again, mode, menu). Remove `OverlayView`,
      its top bar, `HellHud`, `PacmanOverlay`.
   6. The fade moves to a DOM layer over the HUD and screens, under the dev panels.
6. ✅ **Secret level rework: "Arcade".** Done in the fourth chat. Not a copy of the
   original Pac-Man (its sprites, ghost rules, fruit table, cutscenes and sounds are not
   reproduced): our own 80s-style arcade round inside the secret level.
   Owner's decisions: three rounds, faster each time, the intermission after round 2;
   its own three tries (dying never costs the main game's lives; losing them all returns
   to the main game without a penalty); the intermission is scene (a): Blinky chalks an
   ambush plan, Pac-Man eats the chalk.
   - Prototype approved by the owner: `prototypes/pacman/arcade`
     (`node prototypes/pacman/build.mjs arcade`). Code in `render/arcade/`: `arcadeSprites`
     (our pixel art at 10 px a tile: Pac-Man, ghosts, scared / flashing / eyes, pear,
     pretzel, melon, 3×5 digits), `ArcadeMaze` (neon double walls baked from the grid),
     `ArcadeView` (one frame from an `ArcadeScene`, stepped 30 fps, death, maze flash),
     `ArcadeScreen` + `crtShader` (the CRT `GlPass`: slight curve, scanlines, mask, glow,
     vignette; hard pixels without WebGL2), `ArcadeIntermission` (7.5 s); sound in
     `audio/ArcadeSynth` (WebAudio chiptune: hum / scared / eyes loops, chomp, power, ghost,
     fruit, extra try, death, round start, clear, intermission tune).
   - In the game: `config/arcadeConfig` (per round: speeds, energizer time, scatter /
     chase waves, fruit pear / pretzel / melon; 3 tries; round bonus 2000, final 10000).
     `LevelLoader` keeps the round and carries the tries between rounds; `advanceLevel`
     goes to the next round and after the last one home; `leaveArcade` when the tries are
     gone (no game over, lives and score kept); RESTART replays the round (the pause
     screen's RESTART used to send the secret level to a season level 99). `CombatService`
     in the arcade: plain Pac-Man rules for both profiles, energizers on, deaths spend
     `tries`. `GhostService.setArcade`: the round's waves, then the characters of
     `logic/actors/arcadeTargets` (hunter, ambusher, herder, keeper). Flow: `DeathState`
     runs `fold` → `pause`, `LevelClearState` runs `flash` (+ `intermission` after round 2,
     cue `intermission`); the next round starts in place, leaving fades. Render:
     `render/arcade/ArcadeLevelRenderer` (score pop-ups for ghosts and fruit; no decay,
     no season turn in the arcade). Sound: `PacmanAudioPlayer` sends the arcade's cues to
     `ArcadeSynth` (round jingle on READY, hum rising with the dots). HUD: tries, round,
     the rounds' fruits. No golden egg or echo in the arcade.
   - Removed: the ghost / player train, the tile-by-tile bundle (`seasons/secret/`,
     `SeasonLevelRenderer`, `seasonRenderBundleFactory`, `contracts/`), the season
     palettes; `render/maze/GridView` is only the `GridLayout` type now.
   - Tests: `logic/level/arcade.test.ts` (tries never cost lives, the last try goes home,
     three rounds with the intermission, tries carried, energizers and the round's fruit,
     restart, the ghost characters).
7. **FX pass**, e.g. hitting a ghost while energized; also eaten-ghost score pop-ups,
   pickups, near misses, screen feedback — consistent across seasons.
8. **New boss worlds, every 5th level.** Level 5 stays the hell; levels 10, 15, … get new
   worlds, each like the hell (`*Bake` + `*World` + a level renderer with `preview()`), its
   own boss and mechanics, a decay palette and a season-turn style
   (`RenderPipeline.turnStyle`).
9. **Global refactor to solid game-dev code**, or local refactors if the code by then is
   already sound. Candidates known today: the large files listed under Known issues,
   `DecayPass` onto `GlPass`, states still using nullable `LevelLoader` getters.

## Done (plan v1)

1. ✅ **Folder reorganisation, global refactor, dead code, bug fixes.** Done in the second
   chat:
   - ESLint 51 → 0, Prettier applied to the module (separate commit).
   - Dead code removed: `DoomCombatRules` (never imported), `doomDistanceSq`, the
     unplugged `PacmanHud.svelte`, the `render/FruitView` re-export.
   - Duplicates shared: `seededRandom` (5 copies), `clamp` (3), `rgba` (2), actor contact
     distance (4).
   - `LevelSession` replaces 13 nullable fields in `LevelLoader`; level changes go through
     one `changeLevel`.
   - `RenderPipeline` split into `SeasonLevelRenderer`, `DoomLevelRenderer`, `SharedLayers`.
   - Folders regrouped (see Architecture).
   - Found: no gameplay bugs. A 90 s randomized play-test per level kind (seasons, secret,
     hell, Ms. Pac-Man, a 9-level chain through hell) logs no errors. Dying in hell skips
     to the next level without losing a life — intentional (`abyss`), not a bug.
   - Before/after screenshots (menu, ready/playing per season, secret, hell phases 1–3,
     death, level clear) match within run-to-run noise.
2. ✅ **Transitions and timers.** Done in the second chat (see Game flow above):
   - `StateClock` timelines for every timed state, durations in `config/flowConfig.ts`,
     typed `director.flow` instead of duck-typed `overlayTimer` / `deathWave` getters.
   - Transition table in `Director`; pause is a stack that resumes the same state.
   - Owner-approved behaviour changes: long READY + jingle only on a new game, short
     READY (2 s) after death and level changes; pause in death and level clear too;
     auto-pause on hidden tab / blur; 0.4 s + 0.4 s screen fade between menu and game and
     between levels (incl. secret entry and the hell abyss); game-over input lock 1 s.
   - Removed: the never-used `PlayingState` reset path, `ReadySnapshot`, the ready-timer
     hand-off through `PausedState`.
   - 11 flow tests; randomized play-test and screenshots: no errors, play frames unchanged.
3. ✅ **Replace the level disintegration on death.** Done in the second chat.
   - Decision: no PixiJS (see Architecture).
   - Prototype approved by the owner (corridor mode): `prototypes/pacman/winter-decay.html`.
   - In the game (`render/transitions/decay/`), on every level: the level shatters into
     Voronoi ice shards along a geodesic front from the death point (corridors cost 1,
     walls 5, open ground 2.4, so it runs down the corridors first), hangs over the abyss,
     then reassembles from the respawn point. Shock ring, flash, shake and ice dust at the
     start. Palettes: ice (seasons), ember (hell). Without WebGL2 a dark veil stands in.
   - `DeathState` phases `shatter` 2.6 s, `void` 0.5 s, `rebuild` 1.9 s; `director.death`
     gives the death point. Removed: `DeathWaveView`, the disintegration mask in
     `GridView`, `GhostView`, `SharedLayers` and the hell renderer.
   - Tests: `transitions/decay/decay.test.ts` (field: corridors beat walls, no corner
     cutting, shader-equivalent sampling, 16-bit packing; timeline sweeps and rebuilds).
   - Performance: the pass runs at ≤ 1.5× pixel ratio. Headless Chromium renders it in
     software (~0.8 s/frame), so smoothness must be checked on real hardware.
4. ✅ **Level-complete animation.** Done in the second chat: the season turn
   (`render/transitions/seasonTurn/`, prototype `prototypes/pacman/level-clear.html`,
   rebuilt from the sources by `node prototypes/pacman/build.mjs level-clear`).
   - Beads of light run down the corridors from the last dot, then every tile flips like
     a card from the cleared level (at night, in its weather) to the next level's world
     (morning, full of dots), with that world's particles thrown up at the front.
   - It replaces the whole old level clear (blink, cutscene, maze-out, `LevelClearView`):
     `LevelClearState` runs `lights` 1.3 s → `turn` 3 s → `settle` 1 s, then
     `director.startLevelInPlace` opens the next level with a short READY and no fade —
     its world is already on screen. No overlay text during the turn.
   - The destination is drawn by `WorldPreview.preview()` from
     `LevelLoader.peekNextLevel()`; the meadow renderer keeps the previewed world and
     reuses it for the level (no jump at the hand-over), the hell renderer adopts its
     preview world too.
   - Boss levels: one transition for every boss world — the same turn, in the boss
     world's palette (embers instead of golden light). A new boss world only needs a
     `WorldPreview` and a palette in `RenderPipeline.turnStyle`.
   - Note: the season after a hell level is autumn (level 6), not summer — the season
     index follows the level number, unchanged from before.
5. → **New regular HUD**: moved to plan v2, stage 5.
6. ✅ **Integrate the 4 seasons.** Largest stage; one season per chat, from the owner's
   mock-ups, following the hell pattern (`*Bake` static world + `*World` live layer).
   - ✅ All four seasons (second chat). The owner's CLAUDE_GRID_{SPRING,SUMMER,AUTUMN,
     WINTER} mock-ups share one layout, so they run on one engine (`seasons/meadow/`): the
     bake code is the mock-ups' code once, parameterised by a `MeadowTheme` (every colour,
     plus hooks for the landmark — snowman, picnic blanket, beach umbrella, hay bale — the
     meadow flowers or leaves and the pond extras); the live layer takes the food sprites,
     drift particles, weather and night from the theme. Each bake was checked pixel for
     pixel against its mock-up's `bake()` (0 % difference) before the owner's fixes.
   - Owner's fixes: summer — new food (small amber drops, watermelon-slice energizers) and
     a darker sand floor; autumn — warmer, lighter golden stones and a smaller acorn pellet.
     Rule for food art: pellets stay ~1/5 of a tile, calm, no inner detail (200 on screen);
     energizers differ from pellets in shape, colour and size.
   - Weather rises at 50 % of the dots and night falls at 75 % (`MeadowLevelRenderer`):
     blizzard (winter), petal wind (spring), heat shimmer (summer), rain (autumn).
   - Decay palettes per season: ice (winter), moss and pink (spring), indigo and amber
     (summer), umber and amber (autumn), ember (hell).
   - The old tile-by-tile spring/summer/autumn/winter bundles are deleted.
7. → **More boss worlds**: moved to plan v2, stage 8. (The former cutscene stage is
   dropped: the season turn replaces it.)
