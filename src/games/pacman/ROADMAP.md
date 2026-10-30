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
  seasons/         SeasonLevelRenderer + tile bundle for the secret level only
  doom/            DoomLevelRenderer, baked world, lamprey boss, combat and weapon FX
  transitions/decay/       level decay on death: field (Dijkstra), timeline, WebGL2 pass
  transitions/seasonTurn/  level clear: corridor lights + tile cards to the next world
  maze/ actors/ items/ (fruit stubs: one file per fruit) overlay/ contracts/
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
  checks guarantee an escape. Visual: `render/doom/LampreyBossView.ts` (the lamprey).
  Minions: lamprey spawn in `render/doom/DoomCombatView.ts`.
- **Weapons**: BFG, barrel, berserk, medkit; effects in `render/doom/DoomFxView.ts`, fed by
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

- Debug panel: `ENTER HELL`, `BOSS -250 HP`, `GOD MODE`, `DIE`, `COMPLETE LEVEL`, …
- `window.__pacman = { level, director, render }` for the console and Playwright play-tests.
  Directions are upper case: `level.setDesiredDirection('LEFT')`. `director.startGame()`
  now fades for 0.8 s before READY; wait for it before `showPlaying()` / `debugEnter*()`
  (both are ignored during a fade). `director.flow` shows the state, phase and timers.
- Fire key is `F` / `Shift`; `Space` pauses.
- Deterministic screenshots: Playwright `page.clock.install()` + a seeded `Math.random`
  init script make most frames repeatable (noise < 0.1 %). Boss phase 3 and the death wave
  stay chaotic; compare those by eye.

### Known issues

- Headless Chromium without a GPU runs the hell night at ~20 FPS (the reference prototype
  ~26); JS cost is ~2 ms/frame, the rest is software rasterisation. Check on real hardware.
- Art not final: Pac-Man (plan stage 4), fruit and ghosts (stage 1), the
  hell boss, berserk orb and pentagram attack (stage 3).
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
  art (the owner's mock-up texture code 1:1), the rest stay stubs until their art arrives.

## Plan (v2, set by the owner after plan v1)

Order matters; new boss worlds come last. Each art or effect stage starts with a prototype
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
   - Fruit: the owner's mock-ups (COLLECTIBLE_*.html), arriving in batches. **Batch 1
     ported, awaiting the verdict:** cherry, apple, Galaxian, bell, plus the bonus-life heart.
     Shared engine `render/items/collectibleSprite.ts`: the mock-up's texture code is run
     1:1 once into a canvas, its two bloom copies are blurred once (canvas `filter`, or
     down-up sampling where unsupported), and each frame draws sprite + additive blooms with
     the mock-up's breathing, sway and shimmer. Each fruit file holds its texture code, the
     object bounds (glow excluded) and the mock-up's display sizes; `FruitView` fits the
     object's larger side to `FRUIT_EXTENT` = 0.9 tile, centred on the tile, and still
     blinks while the timer runs out. Fruit without art yet (strawberry, orange, pretzel,
     pear, melon, key) stay stubs on `fruitPrimitive`. Prototype:
     `prototypes/pacman/collectibles` (`node prototypes/pacman/build.mjs collectibles`).
   - Bonus life (`render/items/BonusLifeView.ts`, heartbeat + orbiting particles): drawn,
     not placed — no pickup grants a life today (lives come from score thresholds); the
     owner decides how it enters the game.
   - Golden egg → Easter egg: the owner wants it redrawn as an Easter egg, by Claude, later.
   - Ghosts: art for each season (spring, summer, autumn, winter), with the normal,
     frightened, flashing and eaten (eyes only) states. `GhostView` is one generic look now.
   - Direction indicator (see stage 3): ghosts' eyes looking where they move is the
     classic answer; settle the shared rule here so stages 3 and 4 reuse it.
2. **Dev panel + log panel** (dev build only).
   - Panel with proper buttons, grouped: flow (state, phase, timers; pause, slow motion,
     single-frame step), level (jump to any level / season / hell / secret, complete,
     die), player (god mode, lives, power, weapon), boss (HP, set phase, trigger a given
     attack), spawns (fruit, golden egg, echo, pickups), render (grid, paths, hitboxes,
     fronts of the decay and season turn).
   - Log panel: a live, filterable stream of numbers — damage dealt and taken, debuffs
     (stun, slow, pull), timers (power, berserk, BFG charge, attack cooldowns), state
     changes. Logic emits typed `debug:*` events on the bus (no-ops outside dev); the
     panel only listens. Comes before stages 3 and 7 so both can be tuned with it.
3. **Hell rework.**
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
5. **Full HUD and overlays.** A regular HUD for every season (the hell HUD is the quality
   reference) and Svelte screens for menu, ready, pause, death, game over, replacing the
   canvas `OverlayView` and its top bar; the screen fade should cover them too.
6. **Secret level rework.** The original Pac-Man: original arcade art, animation at a
   stepped 30 fps (the wedge snaps open and shut, no smooth tween), and very light CRT
   effects (scanlines, slight curvature, glow) as a `GlPass`. This replaces the last
   tile-by-tile bundle (`seasons/secret/`, `SeasonLevelRenderer`, `contracts/`).
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
