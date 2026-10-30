# Pac-Man — architecture

How the code is built. The game itself: `DESIGN.md`. The plan: `ROADMAP.md`.

## Code map

```
core/        GameMain (wiring, input → director, auto-pause, HUD frame), Events, InputController
             Director (transition table, pause stack, screen fade, `flow` snapshot)
  flow/      GameState interface, StateClock (timeline of named phases)
  states/    menu, ready (intro | short), playing, paused, death, level-clear, game-over
  debug/     DebugController (every dev command, dev builds only)
engine/      EventBus, GameLoop, TimeControl
config/      grids, scores, actor contact distance, flowConfig (every flow duration),
             arcadeConfig (the secret level's rounds)
logic/
  level/     LevelLoader (the run: level number, profile, secret / hell routing, arcade
             round and tries, carry-over), LevelSession (all services of one level, built
             together, never partial), SeasonCatalog (grids, per-season modifiers),
             LevelProgress, ScoreModel
  maze/      GridModel, GridService, SpawnLocator, LairExit
  actors/    Player*, Ghost*, arcadeTargets (the arcade ghosts' characters)
  rules/     CombatService (contacts, power, lives / tries, hit-stop, near misses),
             HypnosisService (Ms. Pac-Man overdrive), LairCodeService
  bonuses/   fruit, Easter egg, echo clone, boss reward
  doom/      hell boss, weapons, hazards, fairness checks
  debug/     debugLog (dev log lines; no-op in production)
render/
  RenderPipeline   canvas, HiDPI, render clock → a RenderFrame per frame, picks the level
                   renderer, runs the decay and the season turn
  RenderFrame      frame data + the LevelRenderer / WorldPreview interfaces
  SharedLayers     Pac-Man, Ms. Pac-Man and the bonuses (every level)
  seasons/meadow/  MeadowBake (static world) + MeadowWorld (live layer) +
                   MeadowLevelRenderer, driven by a MeadowTheme per season
                   (seasons/<season>/<season>Theme.ts)
  doom/            DoomLevelRenderer, baked world, light map, Blinky lord of hell, imps,
                   combat and weapon FX
  arcade/          the secret level: pixel sprites, maze bake, view, CRT pass, intermission,
                   ArcadeLevelRenderer
  fx/              LevelFx (gameplay effects on the season levels)
  transitions/decay/       level decay on death: field (Dijkstra), timeline, WebGL2 pass
  transitions/seasonTurn/  level clear: corridor lights + tile cards to the next world
  actors/ items/ (fruit: one file each; bonus life, exit, egg) maze/ (GridLayout) debug/
  common/          textures, GlPass, colour, maths, seeded random
audio/       PacmanAudioPlayer (samples; routes the arcade to ArcadeSynth), ArcadeSynth
ui/          PacmanUi (HUD + screens + fade over the canvas), hud/ (GameHud, ArcadeHud,
             hudSnapshot, hudFrame), screens/, debug/ (dev panel and log), i18n
```

## Rules of thumb

- Logic never imports render. Render reads logic through `RenderFrame` (`frame.level`,
  `frame.director`) and never mutates it; the doom FX queue is the one consumer-side
  drain. Logic tells render about moments through events: `audio:cue`, `fx:event`.
- A new level kind = a new `LevelRenderer`; the pipeline only picks one per frame.
- Per-level state goes into `LevelSession`; anything that survives a level change is
  carried explicitly by `LevelLoader.changeLevel` (score, lives, life threshold, arcade
  tries).
- Shared drawing helpers go to `render/common/`, not copied into views.
- A meadow frame: `MeadowWorld.drawWorld` (baked background, live lair gate, portals),
  `drawMood` (weather, night), `drawFood` (dots, energizers), then the actors and
  `drawOverlay`. Food sits over the mood so neither night nor weather dims it.
- Collectibles (fruit, bonus life, exit) draw through `render/items/collectibleSprite`:
  callers pass the tile size and the time; the bake measures the object and how far its
  glow reaches over its ticker, so the object fills 0.78 of the tile and nothing leaves
  the tile. Textures carry no backdrop glow; `extraBounds` declares what `extra` draws. Their
  textures are painted with `render/common/itemPaint` (256-unit design, outline, gloss,
  sparkle).
- A level renderer returns the board layout. In the death state it leaves Pac-Man out:
  `RenderPipeline` renders the level offscreen, runs the decay pass, then draws Pac-Man
  on top. The arcade draws its own death and level clear (no decay, no season turn).
- No PixiJS: per-pixel effects are WebGL2 passes (`render/common/GlPass`) over the
  Canvas2D frame, uploaded only while the effect runs.
- Timed things are `StateClock` phases with durations in `config/flowConfig.ts`.
  Animations read `frame.flow` (`state`, `phase`, `phaseProgress`, `progress`,
  `remaining`, `paused`, `fade`) and keep no timers of their own for flow events.
- State changes go through `Director`; a change missing from its `TRANSITIONS` table is
  logged and ignored. Level changes use `director.changeLevel(route)` (fade + short
  READY) or `director.startLevelInPlace(route)` (no fade: after the season turn, and
  between arcade rounds).
- The HUD and the screens are Svelte, fed by one `HudSnapshot` built every frame
  (`ui/hud/hudSnapshot`); the canvas draws no text overlay.

## Game flow

```
menu ──fade──▶ ready(intro 5 s, jingle) ──▶ playing ──▶ death ──▶ ready(short 2 s)
                  ▲   skip: Enter                │  │          └─ no lives ─▶ game-over
                  │                              │  └─▶ level-clear (season turn) ─▶ ready(short)
game-over ─fade───┘  (input locked 1 s)          └─ Easter egg ──fade──▶ arcade ready(short)
hell: losing the fight (abyss) ──fade──▶ next level, ready(short)
boss level: boss dies → heart + exit → taking either ends the level (level-clear)
arcade: death ─▶ ready(short) | last try ─fade─▶ main game; level-clear: flash
      (+ intermission after round 2) ─▶ next round in place | after round 3 ─fade─▶ home
pause (Space/P, Esc in play): ready, playing, death, level-clear — freezes and resumes the
same state; tab hidden / window blur auto-pauses; requests during a fade apply after it.
```

Phases (`config/flowConfig.ts`): death `shatter` → `void` → `rebuild` (arcade: `fold` →
`pause`); level clear `lights` → `turn` → `settle` (arcade: `flash` → `intermission`).
The screen fade is a DOM layer over the HUD and the screens, under the dev panels.

## Controls (implementation)

`InputController` tracks held direction keys; `GameMain` applies the latest held one
every frame, so a held key survives pauses, deaths and fades. A reversal turns Pac-Man
round on the spot (`PlayerModel.reverse`); a turn pressed up to 0.15 tile past a junction
still takes it (`LATE_TURN`). Tests: `logic/actors/playerControl.test.ts`.

## Debug tools (dev build only)

- Dev panels: `` ` `` or the DEV button; `F8` steps one frame. Panel groups: FLOW, LEVEL,
  PLAYER, BOSS, SPAWNS, RENDER (grid, headings, hitboxes, decay / turn fronts); the log
  window shows live timers and the `debug:log` stream.
- `window.__pacman = { level, director, render }` for the console and Playwright.
  Directions are upper case: `level.setDesiredDirection('LEFT')`. `director.startGame()`
  fades for 0.8 s before READY; wait for it before `showPlaying()` / `debug*()` (both are
  ignored during a fade). `director.flow` shows the state, phase and timers. Useful:
  `debugGotoLevel(n)`, `debugEnterSecret()`, `debugEnterHell()`, `debugCompleteLevel()`,
  `debugKillPlayer()`.
- Deterministic screenshots: Playwright `page.clock.install()` + a seeded `Math.random`
  init script make most frames repeatable; boss phase 3 and the death wave stay chaotic.

## Tests

`npx vitest run src/games/pacman`:

- `core/director.test.ts` — game flow: fades, READY, pause everywhere, auto-pause,
  game-over lock, transition table.
- `core/debug/debugTools.test.ts` — time control, boss debug hooks, silent dev log.
- `logic/actors/playerControl.test.ts` — reversal, late turns, held keys.
- `logic/doom/doomMechanics.test.ts` — pickups, BFG, minions, attack sets per phase,
  fairness (rift, eruption, seals), maze stays connected.
- `logic/bonuses/bossReward.test.ts` — heart and exit.
- `logic/bonuses/easterEgg.test.ts` — the egg in the lair's centre, the vanish → gate →
  egg order, banished ghosts frozen, nothing outside level 7.
- `logic/level/arcade.test.ts` — tries, rounds, intermission, restart, ghost characters.
- `logic/rules/fx.test.ts` — fx events, hit-stop, near misses.
- `render/transitions/decay/decay.test.ts` — the decay field and timeline.

## Prototypes

New art and effects start as a page built from the game's own sources:
`prototypes/pacman/<name>/main.ts` + `index.html`, built by
`node prototypes/pacman/build.mjs <name>` into `prototypes/pacman/<name>.html` (open as a
file). The approved prototype already is the game code. Existing: `hell`, `arcade`,
`hud`, `collectibles` (with each item's reach from its tile centre and a tile grid),
`ms-pacman`, `level-clear`, `easter-egg` (the lair code's reward played by the real
services), `characters` (Pac-Man and Ms. Pac-Man concepts for 10.3/10.4: large and in the
maze, normal and under the energizer); `winter-decay.html` is an older standalone page.
