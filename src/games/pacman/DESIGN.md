# Pac-Man (neo-arcade) — design document

What the game is and how it plays. How the code is built: `ARCHITECTURE.md`. What comes
next: `ROADMAP.md`. Numbers live in the config files named in each section; this document
quotes them for reading, the code is the source of truth.

## 1. Concept and tone

A maze-chase game in the spirit of the arcade classic, set in living worlds: four seasons
that turn into each other, a hell with a boss every fifth level, and a hidden 80s arcade.
The look is organic and alive, not metal: soft bodies, breathing, squash and stretch,
cute where it can be, harsh where it must be (the hell). Everything important reads at the
size of one tile.

## 2. Players and controls

- Two profiles, picked in the menu or with `M`: **Pac-Man** and **Ms. Pac-Man**. They
  differ in their energizer power (§4) and in which worlds they see (only Pac-Man goes to
  the hell, §7).
- Arrows or `WASD` steer. A key may be pressed early (the turn is taken at the next
  junction) or up to 0.15 tile late; a reversal turns round on the spot; a held key keeps
  steering through pauses, deaths and fades.
- `Enter` confirms (start, skip the intro READY), `F` / `Shift` fires a hell weapon,
  `Space` / `P` pauses, `Esc` pauses in play and backs out of screens.
- English by default, Russian switchable (remembered).

## 3. The run

- A new game starts on level 1 with 3 lives and runs until the lives are gone.
- Level `n` is a season: 1 summer, 2 autumn, 3 winter, 4 spring, then again
  (`logic/level/SeasonCatalog.ts`). Every 5th level is the hell for Pac-Man; Ms. Pac-Man
  gets the season instead. Later boss worlds take levels 10, 15, … (plan stage 8).
- Level 7 hides the way into the secret level (§8, the arcade); after it the run continues
  on the level after the one it was entered from.
- Score and lives carry over between levels. Extra life at 10 000 points, then every
  30 000 (`config/scoreConfig.ts`).

## 4. Core rules (season levels)

- **Speeds**: Pac-Man 6 tiles/s, ghosts 5.4 (scared ×0.6, eyes ×1.6); seasons tune them
  slightly (§6).
- **Food**: dots 10, energizers 50. Clearing the board wins the level: +1000, and +2000 more
  for a perfect clear (no death, no dot lost).
- **Energizer (Pac-Man)**: the ghosts turn scared and turn round for the season's power time
  (6–6.5 s); they flash in the last 2 s. Eaten ghosts give 200, 400, 800, 1600 within one
  energizer and run home as eyes.
- **Overdrive (Ms. Pac-Man)**: instead of scaring, an energizer starts a 5 s overdrive.
  Touching a ghost hypnotises it for 4 s (+200); it then eats dots for her. Touching another
  moves the hypnosis over (+200) and frees the first, scared. A ghost that wakes up on its
  own is enraged for 2 s (faster, deadly).
- **Death**: touching an active ghost costs a life; the board shatters and rebuilds from
  the respawn point (§10). No lives left: game over.

### Ghosts (season levels)

Four ghosts with fixed names and colours: Blinky (red), Pinky (pink), Inky (cyan), Clyde
(orange). They leave the lair one by one (0, 3, 6, 9 s) and alternate scatter (7 s, each
to its corner) and chase (20 s). In chase Blinky heads straight for Pac-Man, Pinky for a
point ahead of him, Inky for a point mirrored through Blinky, Clyde chases from afar and
backs off up close (`logic/actors/GhostService.ts`). Their eyes look where they are going.

## 5. Bonuses

- **Fruit**: two per level, after 70 and 170 dots, on a fixed pad, for the season's fruit
  time (12–14 s), blinking as it runs out. The kind follows the level: cherry 100,
  strawberry 300, orange 500, pretzel 500, apple 700, pear 1000, melon 1000, Galaxian 2000,
  bell 3000, key 5000 (then key). Ms. Pac-Man gets a random fruit.
- **Lair code and the Easter egg** (level 7): eat (or, for Ms. Pac-Man, hypnotise) the
  ghosts in the order Blinky, Pinky, Inky, Clyde. Every ghost stops and vanishes (1.2 s:
  it swells, shrinks and rises as it fades, sparks in its colour) and is gone for the rest
  of the level; the lair gate slides into its posts (0.8 s); the Easter egg appears in the
  lair's centre, between the ghosts' spawns. Pac-Man walks in and takes it: the remaining
  dots turn into points, +500, and the arcade starts. Clearing the dots first just ends
  the level.
- **Echo clone**: at 60 % of the dots a token appears for 8 s; taking it releases one clone
  of Pac-Man for 4 s that runs to the densest dots and eats them. _Planned (stage 10.6)_:
  a rare bonus at a random place that sets off a riot of 7–9 clones for 2–3 s, eating
  everything they find and dying on ghosts.

## 6. Seasons

One meadow world in four seasons, each with its own colours, landmark (hay bale, picnic
blanket, beach umbrella, snowman), meadow decoration, food sprites and weather
(`render/seasons/<season>/<season>Theme.ts`).

- Food stays calm and small: dots about a fifth of a tile with no inner detail;
  energizers differ from dots in shape, colour and size, and never look like food or a
  collectible (summer: a little sun, not a watermelon).
- Food is drawn over the weather and the night, like the actors: it always reads. The
  floor is dark enough for the dots, the lair floor muted so ghosts and the egg read on
  it; the weather stays faint (no big pale blobs over the board).
- **Weather** rises at 50 % of the dots eaten (spring petal wind, summer heat shimmer,
  autumn rain, winter blizzard); **night** falls at 75 %.
- Gameplay tuning (`SeasonCatalog.seasonModifiers`): spring power 6.5 s; summer fruit
  14 s; autumn ghosts ×0.97; winter Pac-Man ×0.97.
- **Season turn** (level clear): beads of light run down the corridors from the last dot,
  then every tile flips like a card to the next level's world, with that world's
  particles thrown up at the front. The next level starts in place, without a fade.

## 7. The hell (boss level)

Level 5 (Pac-Man only): a burnt version of the meadow with lava, pentagrams and teleporter
pads, and no ghosts but their lord.

- **Boss: Blinky, lord of hell** — a red demon ghost, one tile in size, 1500 HP, three
  phases (at 1000 and 500 HP), each with its look and attack set
  (`logic/doom/DoomBalance.ts`):
  - phase 1: ambush chase, dash, rift (the corridor burns end to end);
  - phase 2: + seals (the junctions ahead of Pac-Man burn, a hit if standing on one, then
    stay locked), pull, cross, void trail; an ash storm rises;
  - phase 3: + split (boss and echo close in from both ends), eruption (a disc around
    Pac-Man, then the ring around it), corruption of the outer corridors (slows), blink,
    brood (imps: small horned ghosts in Pinky / Inky / Clyde colours); night falls.
  - Every attack is telegraphed and checked for fairness: there is always a way out.
- **Player**: 3 HP in the fight (separate from lives). Losing them drops Pac-Man into the
  abyss: the run goes on to the next level without losing a life.
- **Weapons** (corner pickups, one slot): BFG (charge, then a green orb), barrel (placed,
  explodes), berserk (a fist: faster, bites the boss, minions extend it), medkit.
- **Reward**: when the boss dies a heart appears where it fell and an exit at the far end;
  taking either ends the level as a win, the heart also gives +1 life.
- Direction rule: every actor shows where it heads (eyes; hell actors add a small chevron
  on the tile's leading edge; Pac-Man has his mouth).

## 8. The arcade (secret level)

Our own 80s-style arcade inside the game (not a copy of any existing game's art, rules or
sound): pixel art at 10 px a tile through a light CRT pass, stepped 30 fps animation,
chiptune sound (`config/arcadeConfig.ts`).

- Three rounds on the main maze, each faster; fruit pear, pretzel, melon; a cleared round
  pays 2000, the last one 10 000 more. After round 2 an intermission: Blinky chalks an
  ambush plan on a board, Pac-Man eats the chalk.
- Its own 3 tries, carried between rounds: dying never costs the game's lives; losing all
  tries returns to the main game with no penalty.
- Plain Pac-Man rules for both profiles (energizers scare), no egg, no echo.
- Ghost characters: Blinky the hunter (straight at Pac-Man), Pinky the ambusher (the
  junction he runs into), Inky the herder (the junction behind him), Clyde the keeper
  (guards the quarter with the most food, chases only up close); per-round scatter / chase
  waves, then chase for good.

## 9. Feedback and effects

- Eating a ghost: a 0.12 s hit-stop, a flash, a ring and sparks in the ghost's colour, a
  score pop-up, a small shake.
- Energizer: a shockwave, the season's particles, an edge pulse. Fruit and egg: a burst of
  the season's particles and a pop-up. Extra life: "1UP". A ghost brushing past: a whoosh.
- One style for all seasons, coloured by the season. The hell and the arcade keep their
  own effects. _Planned (stage 10.7)_: livelier rings, a teleport effect, new teleporters.

## 10. Flow and screens

- Menu (profile, high score, language) → fade → READY (5 s with a jingle on a new game,
  2 s after a death or a level change) → play.
- Pause from READY, play, death and level clear; it resumes the same moment. A hidden tab
  or a lost window focus pauses on its own.
- Death: the level shatters into ice-like shards along the corridors from the death point,
  hangs over the abyss and rebuilds from the respawn point (each season and the hell have
  their own palette). The arcade has its own pixel death.
- Game over: score, new record, play again (input locked for 1 s so a held key does not
  restart at once).
- HUD: one compact box at the top centre (score and high score, level and world, lives,
  power timer or weapon, dot progress); on boss levels a boss box below it (name, phase, HP
  with phase marks, the player's HP, weapon, berserk, BFG charge, the reward hint). The
  arcade has its own arcade HUD (1UP, high score, round, tries, the rounds' fruit).

## 11. Audio

Sample sound effects on the season levels and the hell (`static/assets/pacman/sfx/`):
start jingle, chomp, energizer, ghost eaten, fruit, death, extra life, the siren and the
scared loop. The arcade synthesises its own (`audio/ArcadeSynth.ts`).

## 12. Art direction (keep)

- Organic and alive, not metal: soft bodies, breathing; the heroes stay round (their size
  pulses on a spring, they are never stretched into an ellipse).
- Effects stay inside the tile (no coronas spilling onto walls).
- Pac-Man: wedge mouth (wide, about 92° open), no eyes, ink lips, streaming trail; fire.
- Ms. Pac-Man: his pair, starlight: one cute glossy eye with lashes, a bow, red lipstick, a
  softer mouth; pastel trail.
- Eyes show where an actor is heading.
- Food is calm (§6); energizers read differently from dots.
- Boss: harsh and dangerous, changes visibly by phase, fits in one tile.
- Ash and night are driven by boss phases, never by UI buttons.
- Fruit: one file per fruit (`render/items/fruit/*View.ts`), each with its own art.
- Fruit, the heart and the exit stay inside their tile, glow included: the object is 0.78
  of a tile, the bloom hugs it, no halo spills onto the walls.
- One style for all of them: a clear silhouette with a wide dark outline, gradient fill,
  a gloss and a glint (`render/common/itemPaint`); the mock-ups' looks are not kept.
- A boss level ends by the player's choice: the heart (+1 life) or the exit.

### Art status

| Element                                                         | State                                                        |
| --------------------------------------------------------------- | ------------------------------------------------------------ |
| Seasons (world, food, weather, night), season turn, death decay | final; decay background to rework (10.9)                     |
| Hell world, Blinky lord of hell, imps, weapons                  | final; phase-3 lighting and corrupted tiles to rework (10.8) |
| Arcade                                                          | final                                                        |
| HUD and screens                                                 | final                                                        |
| Fruit, heart, exit                                              | final (inside the tile, calm glow)                           |
| Easter egg                                                      | final: a painted egg (pink, lilac, mint, blue)               |
| Pac-Man                                                         | the hero, in the game (the hell still uses the old look)     |
| Ms. Pac-Man                                                     | the heroine, in the game                                     |
| Season ghosts                                                   | missing: one generic look today (10.5)                       |
| Echo clone                                                      | to redo (10.6)                                               |
| Teleporters, ring effects                                       | to improve (10.7)                                            |
