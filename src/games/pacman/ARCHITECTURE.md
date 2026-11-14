# Pac-Man — architecture

How the code is built. The game itself: `DESIGN.md`. The plan: `ROADMAP.md`.

## Code map

```
core/        GameMain (wiring, input → director, auto-pause, HUD frame), Events, InputController
             Director (transition table, pause stack, screen fade, `flow` snapshot)
  flow/      GameState interface, StateClock (timeline of named phases)
  states/    menu, ready (intro | short), playing, paused, death, level-clear, game-over
  debug/     DebugController (every dev command, dev builds only), FrameMeter (frame
             and input timings for the panel)
engine/      EventBus, GameLoop, TimeControl
config/      gridConfig (tile tokens, level constants), mazes/ (one file per maze, one
             string per row, checked by parseMaze; `grid_01`–`grid_04` the season mazes,
             `classic01` the secret level's, `doom` the hell's; validateMaze), scores, actor contact distance,
             flowConfig (every flow duration), arcadeConfig (the secret level's rounds),
             echoConfig (the echo bonus), hypnosisConfig (the overdrive and the
             hypnosis: times, the feeder's threshold, the hunter's speed)
logic/
  level/     LevelLoader (the run: level number, profile, secret / hell routing, arcade
             round and tries, carry-over), LevelSession (all services of one level, built
             together, never partial), SeasonCatalog (season and maze of a season level, per-season
             modifiers), MazeCycle (the order the four mazes come in),
             LevelProgress, ScoreModel
  maze/      GridModel, GridService, SpawnLocator, LairExit
  actors/    Player*, Ghost*, ghostTargets (scatter, chase, flight), ghostRoutes (routes by
             path length: shortestRoute, planFeeding), arcadeTargets (the arcade ghosts' characters)
  rules/     CombatService (power, lives / tries, score, death, hit-stop), ghostContact
             (who touches which ghost, per profile; near misses), HypnosisService
             (Ms. Pac-Man overdrive and hypnosis: feeder / hunter, guides the ghost), LairCodeService
  bonuses/   fruit, Easter egg, echo clone, boss reward
  doom/      the hell: DoomBossService (the boss's state machine), DoomArena (hazards,
             seals, void, pull, corruption, echo, shake), DoomMinionSwarm, DoomAttackPlanner
             (which attack, fair or not), DoomTargeting (tile picks), weapons, pickups
  debug/     debugLog (dev log lines; no-op in production)
render/
  RenderPipeline   canvas, HiDPI, render clock → a RenderFrame per frame, picks the level
                   renderer, runs the decay and the season turn
  RenderFrame      frame data + the LevelRenderer / WorldPreview interfaces
  SharedLayers     Pac-Man, Ms. Pac-Man and the bonuses (every level)
  seasons/meadow/  MeadowBake (static world: a frame + one function per layer; decor and
                   walls in meadowBakeDecor / meadowBakeWalls) + MeadowWorld (live layer) +
                   MeadowLevelRenderer, driven by a MeadowTheme per season
                   (seasons/<season>/<season>Theme.ts)
  doom/            DoomLevelRenderer, the flesh hell: DoomWorld (camera, mood) over a scene
                   baked once (fleshBake, with fleshNoise) and moved by the heartbeat
                   (fleshLive), light map, Blinky lord of hell, imps, combat and weapon FX
  arcade/          the secret level: pixel sprites, maze bake, view, CRT pass, intermission,
                   ArcadeLevelRenderer
  fx/              LevelFx (gameplay effects on the season levels: it plays and ages the
                   effects), fxPresets (`recipeFor`: an event to a pure recipe), fxDraw
                   (the shockwave, flashes, sparks, pop-ups, edge pulse), fxTypes
  transitions/decay/       the death black hole: field (Dijkstra), timeline (pure clock), WebGL2 pass
  transitions/seasonTurn/  level clear: corridor lights + tile cards to the next world
  transitions/arcadeShift/ the way into the arcade (mosaic, CRT on) and out of it (CRT off, a dot unfolds the world)
  actors/ (hero/: the shared Hero, PacmanHero, MsPacmanHero, heroSeasons (the season's colours), heroFx (season particles, ki flames); heroCharge (the hell's BFG charge light, painted over the body), playerDrawOptions; HeroView drives them, in every world, with the game's feel `GAME_FEEL`: the gaze, the corner cut, the smear, the bump, the shadow, the kick-up, the sphere, and the food's pull through `SharedLayers.attract`) items/ (fruit: one file each; bonus life, exit, egg) maze/ debug/
  common/          textures, GlPass (every WebGL2 pass), moodBuffer (a world's atmosphere and
                   night in small multiply/additive buffers), renderQuality (the dev quality
                   tiers' DPR caps and atmosphere rates), boardScale
                   (where the maze goes on the screen: 80 % of the height, below the HUD band),
                   colour, maths, seeded random, worldDecor (the decor layout and stream shared
                   by every world)
audio/       PacmanAudioPlayer (samples; routes the arcade to ArcadeSynth), ArcadeSynth,
             audioSettings (mute and master volume, remembered in localStorage)
ui/          PacmanUi (HUD + screens + fade over the canvas), hud/ (season/: the HUD of the
             four season worlds, `SeasonHud` in the side margins and `SeasonHudStack` in two bands
             on a taller screen, over `seasonArt` and `seasonThemes`; `BossHud`, the boss levels' one, over
             `hellArt`; ArcadeHud; hudSnapshot, hudFrame), screens/ (`WorldScreens` over `screenArt` for the
             seasons and the hell; `GameScreens`, the older cards, for the arcade),
             debug/ (dev panel and log), MuteButton (a knob, bottom left, and the volume slider beside it), i18n
```

## Rules of thumb

- Logic never imports render. Render reads logic through `RenderFrame` (`frame.level`,
  `frame.director`) and never mutates it; the doom FX queue is the one consumer-side
  drain. Logic tells render about moments through events: `audio:cue`, `fx:event`.
- A new level kind = a new `LevelRenderer`; the pipeline only picks one per frame.
- A world (the hell today, the boss worlds of part II next) is a folder pair:
  `logic/<world>/` (services, balance, tests) and `render/<world>/` (`*Bake` with the
  layer shape above, `*World`, the level renderer), plus its route in
  `LevelLoader.worldOf` and a `LevelSession` slot. Logic stays free of render.
- Keep files at ~200–400 lines, one job each. Pure rules (targets, contacts, attack
  choice) live in functions of their own, so tests call them directly instead of
  casting into private fields.
- Per-level state goes into `LevelSession`; anything that survives a level change is
  carried explicitly by `LevelLoader.changeLevel` (score, lives, life threshold, arcade
  tries).
- Shared drawing helpers go to `render/common/`, not copied into views.
- A meadow frame: `MeadowWorld.drawWorld` (baked background, live lair gate, portals),
  `drawMood` (drift, atmosphere, night), `drawFood` (dots, energizers), then the actors and
  `drawOverlay` (weather, vignette). Food sits over the mood so neither night nor weather dims it.
- Fill rate is the budget. On integrated graphics a frame is bound by how many full-screen
  layers it blends, not by script: a GPU that falls behind queues frames, the picture stays
  smooth and the controls lag. Count a new full-screen layer as a cost. A world's atmosphere
  (mist, light, wash, storm tint and the night tint) goes through `render/common/moodBuffer`:
  covering layers become a small multiply map, additive layers a light map. High composites both
  every frame (four season passes with the world and vignette), Medium repaints the maps at 30 Hz
  and drops the vignette (three), Low mixes both into one layer at 15 Hz (two). No gradient is
  built per frame: paint it once into a sprite.
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
menu ──(no fade on the first world)──▶ ready(intro 5 s, jingle) ──▶ playing ──▶ death ──▶ ready(short 2 s)
                  ▲   skip: Enter                │  │          └─ no lives ─▶ game-over
                  │                              │  └─▶ level-clear (season turn) ─▶ ready(short)
game-over ─no fade (same overlay, same world)┘   └─ Easter egg ─▶ world-shift (enter) ─▶ arcade ready(short)
game-over / menu ─▶ start: on level 1 at once; from another world world-shift (rebirth: the
      death's black hole unfolds level 1) ─▶ ready(intro); a dev start-at level keeps the fade
hell: losing the fight (abyss) ──black hole unfolds the next world, no fade──▶ next level, ready(short)
boss level: boss dies → heart + exit → taking either ends the level (level-clear)
arcade: death ─▶ ready(short) | last try ─world-shift (leave)─▶ main game; level-clear: flash
      (+ intermission after round 2) ─▶ next round in place | after round 3 ─world-shift (leave)─▶ home
```

Fades remain for the pause and READY → menu, a dev jump to a level and a dev start-at level.

pause (Space/P): ready, playing, death, level-clear — freezes and resumes the
same state; tab hidden / window blur auto-pauses; requests during a fade apply after it.

```

Phases (`config/flowConfig.ts`): death `shatter` (drain, fall into the hole) → `void` (flash,
dark) → `rebuild` (unfold, colour returns), 4 s (arcade: `fold` → `pause`); level clear `lights` → `turn` → `settle` (arcade: `flash` → `intermission`).
The screen fade is a DOM layer over the HUD and the screens, under the dev panels.

## Controls (implementation)

`InputController` tracks held direction keys; `GameMain` applies the latest held one
every frame, so a held key survives pauses, deaths and fades. A reversal turns Pac-Man
round on the spot (`PlayerModel.reverse`); a turn pressed up to 0.15 tile past a junction
still takes it (`LATE_TURN`). Food is eaten once the hero's centre is within `EAT_REACH`
(0.3 of a tile, `config/actorConfig`) of it, so a turn back just short of a dot still takes it.
Tests: `logic/actors/playerControl.test.ts`.

## Balance tool

`logic/balance/balanceBot.ts` plays one season level on the real services (no screen): the
nearest dot by path, out of the ghosts' reach, an energizer when a ghost is near, scared ghosts
while the power lasts; a middling player on purpose, seeded (the game's own dice too).
`BALANCE=1 BALANCE_SEEDS=12 BALANCE_OUT=<file> npx vitest run src/games/pacman/logic/balance`
runs every season maze in every season as both heroes and writes a table (clear rate, time,
deaths, first death, score, echo and hypnosis statistics); without `BALANCE` the report is
skipped. `BALANCE=levels` (with `BALANCE_LEVELS=1,4,...`) plays chosen game levels one by one
to read the difficulty ramp (`config/difficultyConfig.ts`, applied in `buildLevelSession`).

## Debug tools (dev build only)

- Dev panels: `` ` `` or the DEV button; `F8` steps one frame. Panel groups (`ui/debug/`, the
  look is `devUi.css`): a status card with FPS, p95 update/render times, rAF backlog, input-to-
  render latency and the canvas size, then ВРЕМЯ, УРОВЕНЬ, ИГРОК, БОСС (the hell), СПАВН,
  ОТРИСОВКА (manual quality low/medium/high, debug overlays and the season layer switches:
  atmosphere, night, weather, drift, vignette). The quality tiers cap the canvas's DPR at
  1 / 1.5 / 2 and set the atmosphere's pass count and repaint rate. The log window shows live timers and
  the `debug:log` stream. The text grows with the screen (12 to 16 px). `FrameMeter` keeps the
  last few seconds and exists in dev builds only.
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
- `core/debug/debugTools.test.ts` — time control, boss debug hooks, silent dev log, the frame
  meter's summaries and input samples.
- `render/common/renderQuality.test.ts` — the quality names and the DPR cap of each tier.
- `logic/actors/playerControl.test.ts` — reversal, late turns, held keys.
- `logic/doom/doomMechanics.test.ts` — pickups, BFG, minions, attack sets per phase,
  fairness (rift, eruption, seals), maze stays connected.
- `logic/bonuses/bossReward.test.ts` — heart and exit.
- `logic/bonuses/easterEgg.test.ts` — the egg in the lair's centre, the vanish → gate →
  egg order, banished ghosts frozen, nothing outside level 7.
- `logic/level/arcade.test.ts` — tries, rounds, intermission, restart, ghost characters.
- `config/mazes/mazes.test.ts` — the validator and every maze file.
- `config/difficulty.test.ts` — the ramp is monotonic and capped, level 1 is the base, a late
  level has faster ghosts / shorter waves, no ghost outruns the hero, the secret level is
  untouched.
- `logic/balance/balanceBot.test.ts` — the balance bot plays a level and a seed plays one game.
- `logic/actors/ghostRoutes.test.ts` — routes by path length, no turning back, tunnels, the
  feeding plan.
- `logic/rules/hypnosis.test.ts` — feeder / hunter choice, the mode holds, a hunter eats (200
  each), frightened ghosts run from it.
- `logic/bonuses/echoClone.test.ts` — the echo: the chance and the window, the token, 7-9 clones for
  2-3 s, dots and fruit eaten, energizers left, active ghosts kill a clone, the end.
- `render/actors/hero/heroTrail.test.ts` — the heroes' season table, trail and rolling ball.
- `logic/actors/playerTunnel.test.ts` — the tunnel's `teleport` fx.
- `logic/level/mazeCycle.test.ts` — the maze order, the season levels without the boss
  levels.
- `logic/level/levelRouting.test.ts` — seasons in order, the hell every 5th level per
  profile, the maze of each level, score / lives / next-life threshold carried across a level change.
- `logic/rules/fx.test.ts` — fx events, hit-stop, near misses.
- `logic/rules/ghostContact.test.ts` — eat, death, overdrive and who never touches, for
  both profiles.
- `render/transitions/decay/decay.test.ts` — the decay field, the black hole's clock and reach.

## Prototypes

New art and effects start as a page built from the game's own sources:
`prototypes/pacman/<name>/main.ts` + `index.html`, built by
`node prototypes/pacman/build.mjs <name>` into `prototypes/pacman/<name>.html`. The built
pages are not stored in git (`.gitignore`); the owner looks at prototypes in the chat, as
screenshots or an artifact Claude builds from the page, never by opening the files. The
approved prototype already is the game code. `prototypes/pacman/art/hell-flesh-scene.html` is
not a built prototype but the source of the accepted hell scene (a standalone page, open it as a
file), the reference for the hell's art pass; `hell-flesh-heroes.html` is the same scene with
the heroes' mock-up on it (the armor the owner dropped). Existing: `hell`, `arcade`,
`hud`, `death` (the death black hole: the real `LevelDecay` on the real worlds, a slider over the 4 s),
`collectibles` (with each item's reach from its tile centre and a tile grid),
`mazes` (every season maze in every season, with marks for tunnels, spawn, fruit and lair),
`mood` (the hell's night and ash storm styles side by side on the real `grid_doom`, the hero walking a corridor so the light can be judged in motion),
`level-clear`, `fx` (every gameplay effect on the real season worlds, click to fire),
`easter-egg` (the lair code's reward played by the real
services), `hero` (the hero stage: Pac-Man or Ms. Pac-Man large on a dark panel and on strips of the real season worlds, magnified and 1:1, with season buttons and the hell's BFG charge; `render/actors/hero`: the shared `Hero`, `PacmanHero`,
`MsPacmanHero`, `heroCharge`), `feel` (how the hero feels in motion: the real player logic on a season level, driven by the arrows, every `HeroFeel` / `PlayerFeel` idea on a switch (all on in the game), a x2 magnifier), `hell-exit` (the hell's lair gate opened only by who goes through it, the calmer heartbeat against the old curve, and the exit, on the real `grid_doom`), `echo` (the echo bonus's wisps played by the real services on a season world at game scale); `winter-decay.html` is an older standalone page.
```
