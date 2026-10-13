# Game Design Document: Pac-Man REIMAGINED
**Architectural Style:** High-Juice, Deterministic Event-Driven 2D Simulation  
**Visual & Atmospheric Paradigm:** Cosmic Minimalist Vector Style (*Gris*, *Katana Zero*, *Ori*)

---

## 1. System Foundations & Grid Architecture

The game simulation executes on a strict, high-performance static 2D grid where logical spatial data is completely decoupled from Pixi.js visual representation.

### 1.1 Spatial Grid Constraints
* **Tile Dimensions:** 36px by 36px uniform bounding boxes.
* **Entity Scale Constraints:** All logical entity bounding boxes and interaction fields are confined to a single tile footprint (1.0 by 1.0 grid units). Spatial presentation arrays (visual trails, warp distortion fields, consumption vortexes) are permitted to overflow bounding boundaries via the presentation layer.

### 1.2 Grid Node Specification
The map matrix compiles from an array of strict structural tokens:

```typescript
export type TeleportType = `0${string}`;

export type TileType =
  | "WL" // Wall (Static kinematic collider)
  | "DT" // Dot (Static collectible data node)
  | "CF" // Cherry Fruit
  | "SF" // Strawberry Fruit
  | "OF" // Orange Fruit
  | "AF" // Apple Fruit
  | "MF" // Melon Fruit
  | "GF" // Galaxian Fruit
  | "BF" // Bell Fruit
  | "KF" // Key Fruit
  | "EU" // Energizer Power Up (Animated dynamic modifier)
  | "SU" // Speed Lightning Bolt Power Up
  | "GU" // Golden Egg Power Up
  | "LU" // Extra Life Power Up
  | "ES" // Empty Space (Unwalkable, non-interactive node)
  | "LE" // Lair Entrance (One-way directional ghost gate)
  | "LT" // Lair Tile (Internal ghost spawning enclosure)
  | "PM" // Player Spawn Point (Initial vector origin)
  | "BY" // Blinky Spawn Point (Blinky initial coordinate)
  | "PY" // Pinky Spawn Point (Pinky initial coordinate)
  | "IY" // Inky Spawn Point (Inky initial coordinate)
  | "CE" // Clyde Spawn Point (Clyde initial coordinate)
  | "SW" // Lair Switch Tile (Active trap mechanics for Ultra Ghost)
  | TeleportType; // Dynamic Token Pair (e.g., "0A", "0B" for grouped wormholes)
  // more tile types to come
```

### 1.3 Kinematic Teleportation Launch System
The grid engine supports unlimited, arbitrarily linked pairs of TeleportType nodes. When an actor cross-references a teleport boundary, the system executes an instantaneous spatial translation paired with a high-velocity momentum curve:

Coordinate Swap: The player's coordinate vectors instantly overwrite to the matching exit node's exit vector.

Buff Application: Spawns a temporal InvincibilityBuff and a VelocityPropel modifier. Player sprite exits rotating like a spinning ball and stabilizes when propel acceleration ends.

Kinematic Blast: Forces player velocity to peak maximum forward acceleration along the exiting directional vector, overwriting normal directional speed controls.

Friction Decay: Over successive frames, a friction coefficient decays velocity down to standard baseline speeds (or active buff baselines) while preserving responsive cornering calculations.

### 1.4 Level Configuration
There must be a helper function to generate persistent level configuration, such as {currentGrid, currentGridColor, powerPillDuration, powerPillThreshold, etc} based on level.

## 2. Entity Specifications & Capabilities
Entities are designed as lightweight data structural instances driven by stateless processing systems.

### 2.1 The Player (Golden Singularity)
Mechanics: Retro grid navigation modified by high-frequency input buffering.

Input Buffering: Captures directional commands milliseconds before intersection arrival, executing pixel-perfect corner clipping and minimizing friction dead-zones.

### 2.2 The Sub-Boss (Ultra Ghost)
Spawning Trigger: 15% occurrence probability on any level sequence greater than Level 1.

Orchestration Phase (The Event Horizon):

The simulation loop freezes all active systems.

The Renderer applies a global ColorMatrixFilter to shift the environment hue to deep, atmospheric reds.

The four active ghosts surrender independent AI logic and execute a forced linear convergence toward a designated tile intersection.

Upon spatial convergence, a fusion animation plays to form the ultra ghost.

The separate entities are purged from the EntityManager, spawning the singular UltraGhost.

Behavioral Engine: Swaps standard lookahead vector steering for a continuous, high-frequency A* graph-search routine. The entity actively hunts the player while consuming available star dots on the grid.

Active Trap Lair Resolution Mechanic: The player must survive an active survival countdown (X seconds). Once the countdown expires, the Ghost Lair entrance switches to an accessible state, and the "Rune Trap" (RT) tile on the grid becomes armed. To defeat the threat, Pac-Man must actively bait the relentless Ultra Ghost toward the RT tile (clearly visible on the grid). This seals the Ultra Ghost, resulting in a proactive micro-victory, a unique collapse animation, and a 3000 point milestone bounty.

### 2.3 Character Selection & Dynamic AI Profiles

At the start of the simulation, the player selects their operational profile, directly shifting the core gameplay loops and threat matrix behaviors.

#### Profile A: Standard Pac-Man (Classic Predator-Prey)
*   Standard core execution rules, fixed power-up durations, and traditional ghost pathfinding configurations.

#### Profile B: Ms. Pac-Man (The Hypnotic Conductor)
*   **Core Trait:** The standard "Energizer / Power Pill" mechanic is replaced by the **Hypnotic Overdrive** state.
*   **Threat Matrix & Competition:** 
    *   While un-hypnotized, Ghost entities are fully lethal upon direct contact.
    *   Active hostile Ghosts actively flee from Ms. Pac-Man but route themselves to consume dots at **2.0x baseline speed**, aggressively draining map resources and threatening a low-score penalty.
*   **Hypnosis Lifecycle:**
    *   Upon Ms. Pac-Man successfully making contact with a hostile Ghost during an active Overdrive window, the target entity does not return to the Ghost House.
    *   The Ghost's behavioral AI profile temporarily switches to a `DotConsumerComponent`.
    *   For a duration of $T$ seconds, the hypnotized Ghost roams the corridors peacefully, assisting the player by eating remaining dots (points are credited directly to the player).
*   **Reversion Sequence:** 
    *   Upon expiration of the hypnosis cooldown timer ($T$), the `DotConsumerComponent` is detached.
    *   The Ghost instantly regains its lethal collision state and hostile pathfinding profile at its current spatial coordinate (bypassing the respawn chamber pipeline).

## 3. The Collectible Data Ledger
Collectibles exist as modular components bound to grid spatial locations.

### 3.1 Star Dot (DT)
Static placement. Standard inert state; listens for localized tractor-beam suction interpolation when within player collection range. Disintegrates programmatically during Death Waves.

### 3.2 Energizer (EU)
Static placement. Continuously loops an internal parametric scale animation loop. Supports standard suction properties.

### 3.3 Quest Fruit / Keys
Static placement. Standard design; triggers custom UI scoring widgets upon deletion.
TODO: fill the points reward data here.

### 3.4 Extra Life (EU)
Static placement. Spawns unpredictably at a calculated safe vector distance from the player's current location. Enforces a rigid time-to-live countdown window. Validates path routing layout during generation to guarantee physical accessibility at baseline player speed.

### 3.5 Lightning Bolt Power Up (LU)
*   **Placement Type:** Static environment placement; instantiated during grid generation.
*   **Activation Trigger:** Instantaneous upon Pac-Man overlapping the power-up tile.

Mechanics & Lifecycle
*   **Input Lock:** Immediate suspension of user directional controls upon activation (`controlsLocked = true`).
*   **Pathfinding Modification:** The engine calculates a deterministic, autonomous trajectory spanning exactly $N$ tiles from the activation origin.
*   **Optimization Vector:** The routing algorithm overrides standard shortest-path logic, prioritizing the trajectory branch that yields the maximum concentration of consumable dots.
*   **Kinematics:** Linear translation velocity is scaled up significantly relative to the baseline simulation speed.
*   **Lifecycle Termination:** Upon reaching the destination tile index, the state flags dissolve, control hooks are restored to the user, and standard movement parameters resume.

Collision & State Flags
*   **Ghost Immunity:** Temporary invincibility flag applied to the Player entity (`isImmune = true`). 
*   **Interactions:** Standard collision resolution with Ghost entities is bypassed entirely during the execution sequence. 

Visual & FX Specifications
*   **Entity Transformation:** The standard Pac-Man mesh/sprite is substituted with a dynamic "Lightning Spark" asset.
*   **Grid Illumination:** Active tile blocks along the calculated trajectory dynamically shift their emissive layer or color matrix upon traversal.
*   **Particle Systems:** The execution loop instantiates a temporary, self-fading particle trail ("Lightning Trail") trailing the entity's sub-pixel coordinate history. 

### 3.6 Golden Cosmic Egg Power Up (GU)
Static placement. Ultra-rare structural spawn anomaly with a strict 10 second persistence duration. To preserve gameplay balance, the system runs an internal level timer gate: the egg is strictly blocked from spawning until the player has survived at least 30 to 45 seconds of active gameplay on that specific level. Once collected, it instantly forces a level complete transition phase, calculating remaining level dots/collectibles and adding their exact values directly to the player's session point score.

## 4. Global State Transitions & Presentation Sequences
Macro flow changes are strictly managed by a decoupled Director State Machine that routes game states cleanly through separate lifecycle phases.

### 4.1 The Cosmic Disintegration Wave (Global Death Event)
When a lethal collision is validated, the Director freezes the gameplay simulation loops and initiates the centralized death timeline sequence. A radial mathematical boundary propagates outward from the coordinates of Pac-Man's death based on a wave-speed equation: Radius = Velocity * Delta Time. Every entity on the map continuously evaluates its distance vector from the origin. The exact frame the expanding shockwave radius crosses an entity's coordinates, the entity stops rendering its base sprite and triggers its procedural vector-shattering animation, ensuring a perfectly synchronized outward disintegration sequence.

### 4.2 Level Complete Sequence
Triggers when all dots are cleared or when a Golden Egg condition resolves. It bypasses classic uniform screen flashing in favor of an artistic vector transition where ambient cosmic background grids perform an elegant mathematical vector warp or collapse animation sequence, smoothly transitioning the camera viewport toward the intermission stage layout.

## 5. Control & Sound Specifications
### 5.1 Input Management
Default configuration utilizes dual WASD and Keyboard Arrow binding maps. Features an abstracted Input Mapper layer capable of reading and applying custom hardware configuration files directly from localStorage for custom user remapping.

### 5.2 Audio Pipeline (Deterministic SFX Engine)
Strict monophonic style management for retro audio channels to prevent overlapping waveforms from creating audio distortion. When a sound plays via the CentralEventBus, it checks the current active audio registry slot. If a sound is already playing on that slot, it is immediately cut off or mixed down to prioritize the new high-priority gameplay feedback cue. Integrates system volume accessors supporting linear, non-logarithmic gain adjustments (Mute, Volume Up, Volume Down).