# Pac-Man — roadmap

Working agreement: one stage per chat. A new chat starts with
"read `src/games/pacman/ROADMAP.md`, stage N". Claude analyses the code, proposes a plan,
waits for approval, works, then updates this file (done / found) and pushes to `feat/pacman`.

## Architecture (after stage 1)

```
core/        GameMain (wiring, input → director), Director + states/ (game flow), Events
engine/      EventBus, GameLoop
config/      grids, scores, actor contact distance
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
  SharedLayers     Pac-Man, bonuses, death wave, level clear, overlay (every level)
  seasons/         SeasonLevelRenderer + per-season bundles (scene, maze, pellets, weather)
  doom/            DoomLevelRenderer, baked world, lamprey boss, combat and weapon FX
  maze/ actors/ items/ (fruit stubs: one file per fruit) transitions/ (death wave,
  level clear, cutscenes) overlay/ contracts/ common/ (seededRandom, clamp, rgba)
ui/          Svelte HUD (hell), overlay, debug panel, action bridges
```

Rules of thumb:

- Logic never imports render. Render reads logic through `RenderFrame` (`frame.level`,
  `frame.director`), never mutates it (the doom FX queue is the one consumer-side drain).
- A new level kind = a new `LevelRenderer`; the pipeline only picks one per frame.
- Per-level state goes into `LevelSession`; anything that survives a level change is
  carried explicitly by `LevelLoader.changeLevel`.
- Shared drawing helpers go to `render/common/`, not copied into views.

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
  the maze connected). Run with `npx vitest run src/games/pacman`.

### Debug tools (dev build only)

- Debug panel: `ENTER HELL`, `BOSS -250 HP`, `GOD MODE`, `DIE`, `COMPLETE LEVEL`, …
- `window.__pacman = { level, director, render }` for the console and Playwright play-tests.
  Directions are upper case: `level.setDesiredDirection('LEFT')`.
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
- States still reach services through the nullable `LevelLoader` getters; stage 2 can switch
  them to `level.session` / `level.ensure()` like `PlayingState`.

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
2. **Transitions and timers.** State flow `menu → ready → playing → death → level-clear →
game-over`, durations, pause/resume. Later animations hook into these.
3. **Replace the level disintegration on death.** Pac-Man's own death is done; replace the
   reaction of the level around it (`render/transitions/DeathWaveView.ts`, the
   disintegration mask in `SharedLayers`).
4. **Level-complete animation.** Built on stage 2's transitions.
5. **New regular HUD.** The hell HUD is the reference for quality.
6. **Integrate the 4 seasons.** Largest stage; one season per chat, from the owner's
   mock-ups, following the hell pattern (`*Bake` static world + `*World` live layer).
7. **Cutscenes.** One per season (4), then an original one for the secret level. The
   skeleton is in `render/transitions/cutscenes/` (`Cutscene` interface, catalog,
   `LevelClearCutscene`); it is not wired in yet — the level-clear state has a `cutscene`
   phase drawn by `LevelClearView`. Needs stages 2, 4 and the matching season from 6.
