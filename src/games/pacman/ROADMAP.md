# Pac-Man — roadmap

Working agreement: one stage per chat. A new chat starts with
"read `src/games/pacman/ROADMAP.md`, stage N". Claude analyses the code, proposes a plan,
waits for approval, works, then updates this file (done / found) and pushes to `feat/pacman`.

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
  SharedLayers     Pac-Man, bonuses, level clear, overlay (every level)
  seasons/meadow/  MeadowBake (static world) + MeadowWorld (live layer) + MeadowLevelRenderer,
                   driven by a MeadowTheme per season (seasons/<season>/<season>Theme.ts)
  seasons/         SeasonLevelRenderer + tile bundle for the secret level only
  doom/            DoomLevelRenderer, baked world, lamprey boss, combat and weapon FX
  transitions/decay/  level decay on death: field (Dijkstra), timeline, WebGL2 pass, shader
  maze/ actors/ items/ (fruit stubs: one file per fruit) transitions/ (level clear,
  cutscenes) overlay/ contracts/ common/ (textures, seededRandom, clamp, rgba)
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
  logged and ignored. Level changes use `director.changeLevel(route)` (fade + short READY).

### Game flow (stage 2)

```
menu ──fade──▶ ready(intro 5 s, jingle) ──▶ playing ──▶ death 5 s ──▶ ready(short 2 s)
                  ▲   skip: Enter                │  │           └─ no lives ─▶ game-over
                  │                              │  └─▶ level-clear 8 s ──fade──▶ ready(short)
game-over ─fade───┘  (input locked 1 s)          └─ golden egg ──fade──▶ secret ready(short)
hell: dying in the abyss ──fade──▶ next level, ready(short)
pause (Space/P, Esc in play): ready, playing, death, level-clear — freezes and resumes the
same state; tab hidden / window blur auto-pauses; requests during a fade apply after it.
```

Hooks for later stages: `DeathState` runs `shatter` → `void` → `rebuild`
(`flowConfig.death`); stage 4 retimes `LevelClearState` phases (`blink`, `cutscene`, `maze-out`), stage 7 draws
cutscenes in the `cutscene` phase. The fade is a flat colour in `RenderPipeline.drawFade`
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
- Art polish postponed: Pac-Man, lamprey and minions are approved directions, not final.
- Regular levels have no Svelte HUD (only the canvas top bar); stage 5 adds one.
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
- Fruit views stay one file per fruit (`render/items/fruit/*View.ts`), even while they are
  stubs: each fruit gets its own art later.

## Stages

Order matters: each stage builds on the ones before it.

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
4. **Level-complete animation.** Built on stage 2's transitions.
5. **New regular HUD.** The hell HUD is the reference for quality.
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
7. **Cutscenes.** One per season (4), then an original one for the secret level. The
   skeleton is in `render/transitions/cutscenes/` (`Cutscene` interface, catalog,
   `LevelClearCutscene`); it is not wired in yet — the level-clear state has a `cutscene`
   phase drawn by `LevelClearView`. Needs stages 2, 4 and the matching season from 6.
