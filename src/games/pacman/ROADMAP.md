# Pac-Man — roadmap

Working agreement: one stage per chat. A new chat starts with
"read `src/games/pacman/ROADMAP.md`, stage N". Claude analyses the code, proposes a plan,
waits for approval, works, then updates this file (done / found) and pushes to `feat/pacman`.

## Current state (end of the first chat)

- **Hell level** (`render/doom/`): the CLAUDE_GRID_DOOM_v3 prototype ported 1:1
  (`DoomBake` static world, `DoomWorld` camera, live objects, atmosphere). Ash storm in boss
  phase 2, dark night with a per-tile corridor light map (`DoomLightmap`) in phase 3. Actors
  are drawn above the atmosphere. Doom-style teleporter pads with green teleport fog.
  Separate hell HUD (`ui/hud/HellHud.svelte`).
- **Boss** (`logic/doom/`): three phases with distinct attack sets — phase 1 ambush chase,
  dash, rift; phase 2 seals, pull, cross, rift, void trail; phase 3 split + echo, eruption
  waves, corruption of outer corridors, blink, brood. Hazards in `DoomHazards.ts`, fairness
  checks guarantee an escape. Visual: `render/LampreyBossView.ts` (the lamprey).
  Minions: lamprey spawn in `render/DoomCombatView.ts`.
- **Weapons**: BFG, barrel, berserk, medkit; effects in `render/doom/DoomFxView.ts`, fed by
  an FX event queue from the doom logic.
- **Pac-Man** (`render/PlayerView.ts`, every level): living soft body, energized / berserk
  looks, ribbon trail, arcade-style death.
- **Core fixes**: render bundle cached per level (no flicker), HiDPI canvas, variable-step
  game loop (no judder), one tile-center coordinate convention for all actors.
- **Tests**: `logic/doom/doomMechanics.test.ts` (pickups, BFG hits, maze bounds, minions,
  stun vs death/transition, attack sets per phase, rift escape, eruption parity, seals keep
  the maze connected). Run with `npx vitest run src/games/pacman`.

### Debug tools (dev build only)

- Debug panel: `ENTER HELL`, `BOSS -250 HP`, `GOD MODE`, `DIE`, `COMPLETE LEVEL`, …
- `window.__pacman = { level, director, render }` for the console and Playwright play-tests.
- Fire key is `F` / `Shift`; `Space` pauses.

### Known issues

- 51 pre-existing ESLint errors in season render files, `EchoCloneService`, `OverlayView`.
- Headless Chromium without a GPU runs the hell night at ~20 FPS (the reference prototype
  ~26); JS cost is ~2 ms/frame, the rest is software rasterisation. Check on real hardware.
- Art polish postponed: Pac-Man, lamprey and minions are approved directions, not final.

### Design decisions (keep)

- Organic and alive, not metal: soft bodies, breathing, squash and stretch.
- Effects stay inside the tile (no coronas spilling onto walls).
- Pac-Man: wedge mouth, no eyes, no lips, ribbon trail (not a slug or a snake).
- Boss: Doom-like, harsh and dangerous, changes visibly by phase, fits in one tile.
- Ash and night are driven by boss phases, never by UI buttons.

## Stages

Order matters: each stage builds on the ones before it.

1. **Folder reorganisation, global refactor, dead code, bug fixes.** Behaviour must not
   change. Includes the ESLint backlog and duplicated helpers (e.g. `makeRandom` copied into
   five season scenes). Acceptance: tests green, lint clean, before/after screenshots match.
2. **Transitions and timers.** State flow `menu → ready → playing → death → level-clear →
   game-over`, durations, pause/resume. Later animations hook into these.
3. **Replace the level disintegration on death.** Pac-Man's own death is done; replace the
   reaction of the level around it (`render/DeathWaveView.ts`, the disintegration mask).
4. **Level-complete animation.** Built on stage 2's transitions.
5. **New regular HUD.** The hell HUD is the reference for quality.
6. **Integrate the 4 seasons.** Largest stage; one season per chat, from the owner's
   mock-ups, following the hell pattern (`*Bake` static world + `*World` live layer).
