# Pac-Man — roadmap

What comes next. The game: `DESIGN.md`. The code: `ARCHITECTURE.md`. What was done and
why: the git history of `feat/pacman` (every stage ends in a commit that says what it did).

## Working agreement

One stage (or one step of stage 10) per chat. A new chat starts with "read
`src/games/pacman/ROADMAP.md`, stage N" (or "stage 10, step K"). Claude reads the parts
of `DESIGN.md` and `ARCHITECTURE.md` the step needs, analyses the code, proposes a plan,
waits for approval, works, updates the three documents (this plan; the design and the
architecture where they changed) and pushes to `feat/pacman`. New art and new effects
start as a prototype the owner approves first (see `ARCHITECTURE.md`, Prototypes), unless
the owner says to go straight into the game.

## Order

**10 → 8 → 9.** Stage 10 is next.

## Plan

10. **Art and polish pass** (set by the owner after stage 7; next). One step per chat
    or several small ones together; the order below is a suggestion.
    1. ~~**Fruit.**~~ Done: the fruit, the heart and the exit stay inside their tile with
       a calm glow (see Done).
    2. **Easter egg + its mechanic.** No art today (`GoldenEggView` is a stand-in): draw
       an Easter egg. Mechanic: the lair code (`LairCodeService`, the right order of
       eaten ghosts) should make the ghosts stop and vanish with an animation; then the
       lair door opens and Pac-Man walks in to the egg (today the egg appears on the
       board and taking it starts the arcade, `GoldenEggService`).
    3. **Pac-Man art**, redone completely (was stage 4). `render/actors/PlayerView.ts`;
       keep the design decisions (organic, wedge mouth, no eyes, ribbon trail) unless
       the owner changes them.
    4. **Ms. Pac-Man**, finish (`render/actors/MsPacmanView.ts`): today she reads a little
       dark rather than cute, not bright enough, hard to read at tile size, and under
       an energizer (overdrive) everything melts into a mash of effects. Brighter, cuter,
       a clear silhouette at tile size, a calmer overdrive.
    5. **Ghosts per season** (`render/actors/GhostView.ts`, one generic look today): art
       for spring, summer, autumn, winter, with normal, scared, flashing and eyes-only;
       focus on cuteness; the eyes show the heading.
    6. **Echo clone, art + mechanic** (`logic/bonuses/EchoCloneService.ts`,
       `render/actors/EchoCloneView.ts`). A rare bonus that spawns at a random place and
       sets off a riot of Pac-Man clones: 7–9 clones for 2–3 s that eat everything they
       find (dots, fruit) and die on contact with ghosts.
    7. **FX rework.** The stage-7 rings look dull (`render/fx/LevelFx.ts`); regular
       levels have no teleport effect (the hell has its teleport fog); redo or improve
       the teleporters' own art (`MeadowBake` portal + `MeadowWorld`): bulky and a bit
       clumsy today, though the spiral works.
    8. **Hell, phase 3.** In the ash storm many flickering lights follow Pac-Man as he
       moves: meant as lighting (`render/doom/DoomLightmap.ts`, the night pass in
       `DoomWorld`), it flickers like a strobe and does not help visibility; make it
       calm and useful. The purple corrupted tiles (`DoomCombatView.drawCorruption`) read
       very well but clash with the hell's look; restyle them in the hell's palette and
       keep them as readable.
    9. **Bugs and transitions.**
       - Pac-Man blinks before the game starts (was stage 4).
       - No screen fade on the very first start of a game (`Director.startGame`).
       - The death decay: the background looks odd (a nebula plus square dots reads
         random); rework the abyss under the shards
         (`render/transitions/decay/decayShader.ts`).
       - Level change: the season turn keeps Pac-Man's sprite on screen until the next
         level starts (`RenderPipeline`, drawn while `lights` + `turn` run); hide him
         during the animation and spawn him once the new level is in place.

8. **New boss worlds, every 5th level.** Level 5 stays the hell; levels 10, 15, … get new
   worlds, each like the hell (`*Bake` + `*World` + a level renderer with `preview()`), its
   own boss and mechanics, a decay palette and a season-turn style
   (`RenderPipeline.turnStyle`).
9. **Global refactor to solid game-dev code**, or local refactors if the code by then is
   already sound. Candidates known today: the large files listed under Known issues,
   `DecayPass` onto `GlPass`, states still using nullable `LevelLoader` getters.

## Known issues

- Headless Chromium without a GPU runs the hell night at ~20 FPS; JS cost is ~2 ms per
  frame, the rest is software rasterisation. Check on real hardware.
- `DecayPass` still has its own WebGL boilerplate; move it onto `render/common/GlPass`
  when the decay is next touched (10.9).
- Large files left as they are, to be cut when their stage rewrites them:
  `logic/doom/DoomBossService.ts` (~1400 lines), `logic/actors/GhostService.ts`,
  `logic/rules/CombatService.ts`, `render/doom/DoomBake.ts`.
- Some states still reach services through the nullable `LevelLoader` getters
  (`DeathState.enter`, `GameOverState`); switch to `level.ensure()` when touched.
- The ESLint project config does not include `prototypes/pacman/hud/Proto.svelte`
  (a parsing error when linting `prototypes/`).

## Done

- Plan v1 (first and second chats): folders and refactor; transitions and timers; the
  death decay; the season turn; the four seasons.
- Plan v2: 1 (partly: Ms. Pac-Man, the fruit, the boss reward ported; the rest moved to
  stage 10), 2 dev and log panels, 5 HUD and screens (third chat); 3 the hell rework,
  6 the arcade, 7 the FX pass (fourth chat). Stage 4 moved into stage 10.
- 10.1 the fruit (fifth chat): the textures lost their backdrop glow, the blooms hug the
  object, `collectibleSprite` measures the object and the glow's reach at bake time, so
  every fruit, the heart and the exit fill 0.78 of a tile and stay inside it (the heart's
  orbit is drawn closer around it). The HUD fruit icon is one tile.
