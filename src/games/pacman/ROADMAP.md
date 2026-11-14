# Pac-Man — roadmap

What is left to do. The game: `DESIGN.md`. The code: `ARCHITECTURE.md`. What was done and
why: the git history of `feat/pacman` (every stage ends in a commit that says what it did; the
long "Done" log that used to live here was dropped, the history has it).

## Working agreement

One step per chat. A new chat starts with "read `src/games/pacman/ROADMAP.md`, step N" (for
example "part II, step 3, TRON"). Claude reads the parts of `DESIGN.md` and `ARCHITECTURE.md`
the step needs, analyses the code, proposes a plan, waits for approval, works, updates the
three documents (this plan: delete what is done and add what came up; the design and the
architecture where they changed) and pushes to `feat/pacman`. New art and new effects start as
a prototype the owner approves first, in the chat, as screenshots (the built pages are not
committed; see `ARCHITECTURE.md`, Prototypes), unless the owner says to go straight into the
game.

How the looks are decided: a mock-up first, and only for what defines a world (the world, the
heroes, the boss, the walls). A candidate comparison is a throwaway page built from the game's
own sources on the real maze (`node prototypes/pacman/build.mjs <name>`, then published as an
artifact: strip the document wrapper from the built page; delete the page when the owner has
chosen), not a hand-drawn picture. Effects inside an accepted language are restyled in one
pass and shown as frame series, not mock-up by mock-up.

Every bug fix gets a test that is checked to fail on the old behaviour. Checks before a push:
`npm run check`, `npm test`, `npx eslint src/games/pacman`, `npx prettier --check` on the
changed files (the repository-wide `npm run lint` is red for files of other games; leave
them). A UI change is also looked at in a browser (Playwright against `vite dev`).

**All graphics are drawn in code** (Canvas2D / WebGL2). No PNG sprites, no sprite sheets, no
image pipeline. An owner's mock-up is a picture of the target look that Claude reproduces in
code; it is never loaded as an asset. Motion, particles and seasonal details are code too.

Token budget: code first, art after the mechanics of its part. The model named per step is a
suggestion (Opus for the design of a look or a mechanic, Sonnet for the steps).

## Order

**I** the main game (what is left: the volume slider, the seasons' scenes), **II** the boss
levels (the hell's polish, then the random boss, then the new worlds), **III** the interface of
each new boss. The depth and post-processing pass comes last of all (see Later).

## Part I. The main game

1. **Music track support** (postponed: the owner is still working out how to generate the
   music). A looped file (ogg/mp3 from `static/`) per world, under the same volume. The
   seasons' music is optional; the hell's track is part II, step 1.1.
2. **Season scenes, in code** (Opus for the look, one season per chat, prototype first). Today
   a season is a palette and a few props on one meadow. The owner wants a whole scene per
   season, in the maze and in the background, not a recolour:
   1. **Winter: New Year (next).** A fir tree, baubles, garlands, snow on the walls, lights.
   2. **Autumn: Halloween.** Pumpkins, cobwebs, bats, a gravestone or a lantern here and
      there; the walls and the ground dressed for it too, not only the margins.
   3. **Spring and summer** get the same treatment afterwards (their themes to be decided with
      the owner).
      Rules that still hold: the walls and the corridors keep their full width, nothing hangs in
      the air in the maze, the decor sits on a surface and moves little, and every important
      thing reads at the size of one tile.

3. **Ms. Pac-Man's look** (Opus, prototype first). The heroes' feel is in the game (every idea
   of the `feel` prototype, `GAME_FEEL`), Pac-Man has his minimal eye, neither has a tongue,
   the trail stays the original. Left from the owner's notes: Ms. Pac-Man looks clumsy (try
   the eye, the bow's seat and the proportions one at a time; keep the bow).

## Part II. Boss levels

1. **The hell: the polish and what is left** (Opus for a look, Sonnet for the steps). The hell is
   in the game: the flesh world, the maze of charred iron plates (with a little blood and rust),
   the heroes, Blinky and the imps, the weapons, the attacks, the light. The look's rules, kept
   from the owner's rounds: one flesh world with no void; the maze is built of blocks (the owner:
   walls are best as blocks, living matter does not suit a maze) with no height, face or
   extrusion, so the corridors keep their full width; the surround is not dimmed (a darker
   surround makes the maze hang in the air); no bright bone or anything that jumps forward; few
   bold details on a surface; a slow heartbeat (about 2.5 s) and a calm background; the teleport
   is the iron gateway (cyan, with chevrons that flow in); the night stays
   `cord`; the heroes are the season heroes plus the BFG charge. Start from the `hell`
   prototype (`node prototypes/pacman/build.mjs hell`: "Бой" runs the real fight, the attack
   buttons force an attack, "Бессмертие" keeps the hero alive, "Фаза 1-3" jump to a phase; query
   `?ms`, `?zerk`, `?chg`) and the `mood` prototype. Left (the owner: everything else in the
   hell is done):
   1. **The hell's music track** (the owner brings it: generated or a free licence).
   2. **Balance and a polish pass** of the whole fight.
2. **A random boss on every 5th level, for both heroes.** Level 5 stays the hell while it is
   the only boss. The selection arrives with the second boss: a `BossCatalog` (id, world, maze,
   renderer, design page), a seeded pick per boss level (no immediate repeat), the same for
   Pac-Man and Ms. Pac-Man. A boss world is no longer tied to a level number, so the boss's
   difficulty is scaled by the level number, not by the world. The dev panel can force a boss.
3. **Each new boss world** (Opus for the design, Sonnet for the steps): still Pac-Man in a
   maze, with a different boss, a different mechanic and a different way to play, never a
   reskin of the hell's fight. Like the hell: `*Bake` + `*World` + a level renderer with
   `preview()`, a death `style` for the universal transition and a season-turn style
   (`RenderPipeline.turnStyle`). Each starts with a one-page design (boss, mechanic, rules, how
   it differs from the others) that the owner approves before code; mechanics on placeholder
   art first, then the art, all in code. Its interface is part III. The candidates, in the order
   proposed (each differs from the others in what the player does: the hell is combat):
   1. **TRON, a neon grid** (the maze is `grid_tron`, no tunnels). The hero leaves a light
      trail that becomes a wall for a few seconds; the boss rides a light cycle that cuts the
      maze; the ghosts derez. A spatial puzzle. The best fit for movement on rails.
   2. **An Alien Isolation style stalker.** Darkness, a flashlight cone, one hunter that cannot
      be killed, a motion tracker instead of weapons, the vents as tunnels. Stealth, the
      opposite of the hell. The costliest in light and sound.
   3. **Sharkboy and Lavagirl: a tide.** A playful tone. The mechanic is the terrain, not a
      boss bar: water and lava flood the tiles in waves, sharks patrol the water, the safe
      islands change. Ms. Pac-Man fits. Its palette must stay clear of the hell's reds.
   4. **A Bomberman style world** (an idea from the old arcades): bombs and blasts along the
      maze's lines, soft and hard walls. To be thought through with the owner.
   - Zombies were rejected: a horde with weapons is the hell again.
   - The owner knows few old arcades: more candidates (Dig Dug, Space Invaders, Frogger) can
     be offered in a chat before step 3 starts.

## Part III. The interface

1. **A skin per boss level.** The hell's is done. Each new boss world has its own interface
   (the hell's boss box: name, phase, HP with phase marks, the player's HP, weapon, berserk,
   BFG charge, the reward hint), on the same skeleton. Added as each boss lands.
2. The arcade (secret level) keeps its own pixel HUD.

## Later

**Depth and post-processing** (the very end). More volume with modern 2D techniques, as far as
WebGL2 over Canvas2D allows (no tessellation shaders in WebGL2):

1. Soft drop shadows for actors and walls; walls with height (a baked height map and a bevel).
2. Normal maps for walls and bodies drawn in code, so the world lights (energizers, the hell's
   lights, the neon grid) shade them.
3. A post-processing stack on `render/common/GlPass`: bloom, colour grading per world, a light
   vignette, optional chromatic aberration on hits.
4. A performance budget: everything switchable, measured on real hardware.

## Known issues

- **Weak graphics.** The owner's report: on PCs with integrated graphics the controls feel
  sluggish from the start of a level, while the animation stays smooth (a GPU-bound frame
  queue). Done so far: the atmosphere of the seasons and the hell in two passes
  (`render/common/moodBuffer`), no per-frame gradient for the lair's heart, no plain fill
  under a covering background. Chromium without a GPU, 1600x900: a season 21 → 28 FPS, the
  hell 15 → 17 FPS. Still to check on the owner's weak PC. If it still lags, the next
  candidates, by measured cost: the hell's maze-sized glow layers (`emis` and `glow`, drawn
  additively twice, four times at night) and the hell's ground. The dev frame meter now reads
  FPS, update/render p95, the rAF backlog and input-to-render latency. Manual dev quality tiers
  cap the canvas at DPR 1 / 1.5 / 2 and the season atmosphere at 4 / 3 / 2 full-screen passes
  (the night tint is part of the mood's multiply map; only High keeps the vignette). Measured
  again in Chromium without a GPU at 1600x900 DPR 2, a winter night: High 14 FPS, Medium 27,
  Low 60. Still to check on the owner's weak PC; if it still lags, the next candidates are the
  hell's maze-sized glow layers and ground.
- Headless Chromium without a GPU runs the hell night at ~20 FPS and the flesh hell's first
  frame blocks for about a second while `bakeFlesh` paints the world (once per level). Nobody
  has timed either on real hardware; if the bake shows, spread it over frames.
- The `hud` prototype does not build: it imports a `GameHud.svelte` that no longer exists (the HUD
  was split into `SeasonHud`, `SeasonHudStack`, `BossHud`). Fix or delete it when it is next needed.
- The `collectibles` prototype throws "undefined is not iterable" in a `forEach` while it draws
  the item row and so never reaches the exit; find it when the prototype is next touched.
- `Hero.ts` is still large (~960 lines); the sprite-free heroes are one class family, cut what
  no longer serves.
- Not checked in play: the hero's death over the black hole, the hell's and Ms. Pac-Man's
  deaths, a low-end GPU, the hero going through a season tunnel, the hell's night and ash storm
  over the cord maze.
