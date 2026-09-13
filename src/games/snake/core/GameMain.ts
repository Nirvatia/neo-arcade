import type { GameModule } from "$shared/core/types.js";
import { World } from "./ecs/World.js";
import { GameLoop } from "./GameLoop.js";
import { Director } from "./Director.js";
import { DirectorState, type DirectorStateType } from "./Events.js";
import { GridBitmask } from "../logic/GridBitmask.js";
import { GridHolder } from "../logic/GridHolder.js";
import { SeededRNG } from "../logic/SeededRNG.js";
import { spawnSnake } from "../logic/SnakeFactory.js";
import { Direction } from "../components/index.js";
import { MovementSystem } from "../systems/MovementSystem.js";
import { InputSystem } from "../systems/InputSystem.js";
import { SnakeControlSystem } from "../systems/SnakeControlSystem.js";
import { SpawnSystem } from "../systems/SpawnSystem.js";
import { ScoreSystem } from "../systems/ScoreSystem.js";
import { BitRegisterSystem } from "../systems/BitRegisterSystem.js";
import { BitTokenSystem } from "../systems/BitTokenSystem.js";
import { LevelSystem } from "../systems/LevelSystem.js";
import { RenderSystem } from "../systems/RenderSystem.js";
import { PixiApp } from "../view/PixiApp.js";
import { MusicPlayer } from "../audio/MusicPlayer.js";
import { TerminalPalette } from "../view/TerminalPalette.js";

const GRID_COLS = 24;
const GRID_ROWS = 16;
const CELL_SIZE = 30;
const STEP_INTERVAL_MS = 150;
const INITIAL_SNAKE_LENGTH = 3;
const TARGET_FOOD_COUNT = 5;
const POINTS_PER_FOOD = 10;
const POINTS_PER_SEQUENCE = 100;
const PENALTY_PER_FAILURE = 25;
const MAX_INPUT_QUEUE = 3;
const MAX_DELTA_MS = 200;
const MAX_ACTIVE_TOKENS = 1;

const GROWTH_COLS = 2;
const GROWTH_ROWS = 1;
const MAX_GRID_COLS = 38;
const MAX_GRID_ROWS = 23;

const BUTTON_TYPE = "button";
const BUTTON_LABEL_START = "START";
const BUTTON_LABEL_PAUSE = "PAUSE";
const BUTTON_LABEL_RESUME = "RESUME";
const BUTTON_LABEL_RESTART = "RESTART";
const BUTTON_LABEL_SOUND_ON = "SOUND: ON";
const BUTTON_LABEL_SOUND_OFF = "SOUND: OFF";

const MUSIC_SRC = "/assets/snake/music/theme.mp3";

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: Direction.UP,
  KeyW: Direction.UP,
  ArrowDown: Direction.DOWN,
  KeyS: Direction.DOWN,
  ArrowLeft: Direction.LEFT,
  KeyA: Direction.LEFT,
  ArrowRight: Direction.RIGHT,
  KeyD: Direction.RIGHT,
};

const HOTKEYS = {
  PAUSE: "Space",
  PAUSE_ALT: "Escape",
  CONFIRM: "Enter",
  MUTE: "KeyM",
} as const;

export class SnakeGame implements GameModule {
  private canvasParent!: HTMLDivElement;
  private pixiApp!: PixiApp;

  private world: World | null = null;
  private holder: GridHolder | null = null;
  private gameLoop: GameLoop | null = null;
  private director: Director | null = null;
  private inputSystem: InputSystem | null = null;
  private renderSystem: RenderSystem | null = null;
  private music: MusicPlayer | null = null;

  private keyDownHandler: ((event: KeyboardEvent) => void) | null = null;

  private controlsContainer: HTMLDivElement | null = null;
  private startButton: HTMLButtonElement | null = null;
  private pauseButton: HTMLButtonElement | null = null;
  private restartButton: HTMLButtonElement | null = null;
  private muteButton: HTMLButtonElement | null = null;

  private muted = false;

  public async init(canvasParent: HTMLDivElement): Promise<void> {
    this.canvasParent = canvasParent;

    this.pixiApp = new PixiApp();

    const width = GRID_COLS * CELL_SIZE;
    const height = GRID_ROWS * CELL_SIZE;

    await this.pixiApp.init(canvasParent, width, height, TerminalPalette.bg);

    this.pixiApp.addTickerCallback((deltaMS) => {
      if (this.gameLoop !== null) {
        this.gameLoop.tick(deltaMS);
      }
    });

    this.createControls();
    this.bindKeyboard();
    this.setupRun();

    this.updateControlsForState(DirectorState.MENU);
  }

private createControls(): void {
  const controls = document.createElement("div");

  controls.style.display = "flex";
  controls.style.gap = "8px";
  controls.style.margin = "8px 0";

  const startButton = document.createElement("button");
  startButton.type = BUTTON_TYPE;
  startButton.textContent = BUTTON_LABEL_START;
  startButton.style.padding = "6px 10px";
  startButton.style.background = "#0a1a0f";
  startButton.style.border = "1px solid #2fbf6a";
  startButton.style.color = "#d9ffe9";
  startButton.style.fontFamily = "Courier New, monospace";
  startButton.style.cursor = "pointer";
  startButton.addEventListener("click", () => {
    this.unlockAudio();
    this.onStartPressed();
  });

  const pauseButton = document.createElement("button");
  pauseButton.type = BUTTON_TYPE;
  pauseButton.textContent = BUTTON_LABEL_PAUSE;
  pauseButton.style.padding = "6px 10px";
  pauseButton.style.background = "#0a1a0f";
  pauseButton.style.border = "1px solid #2fbf6a";
  pauseButton.style.color = "#d9ffe9";
  pauseButton.style.fontFamily = "Courier New, monospace";
  pauseButton.style.cursor = "pointer";
  pauseButton.addEventListener("click", () => {
    this.unlockAudio();
    this.onPausePressed();
  });

  const restartButton = document.createElement("button");
  restartButton.type = BUTTON_TYPE;
  restartButton.textContent = BUTTON_LABEL_RESTART;
  restartButton.style.padding = "6px 10px";
  restartButton.style.background = "#0a1a0f";
  restartButton.style.border = "1px solid #2fbf6a";
  restartButton.style.color = "#d9ffe9";
  restartButton.style.fontFamily = "Courier New, monospace";
  restartButton.style.cursor = "pointer";
  restartButton.addEventListener("click", () => {
    this.unlockAudio();
    this.restart();
  });

  const muteButton = document.createElement("button");
  muteButton.type = BUTTON_TYPE;
  muteButton.textContent = BUTTON_LABEL_SOUND_ON;
  muteButton.style.padding = "6px 10px";
  muteButton.style.background = "#0a1a0f";
  muteButton.style.border = "1px solid #2fbf6a";
  muteButton.style.color = "#d9ffe9";
  muteButton.style.fontFamily = "Courier New, monospace";
  muteButton.style.cursor = "pointer";
  muteButton.addEventListener("click", () => {
    this.unlockAudio();
    this.toggleMute();
  });

  controls.appendChild(startButton);
  controls.appendChild(pauseButton);
  controls.appendChild(restartButton);
  controls.appendChild(muteButton);

  this.canvasParent.appendChild(controls);

  this.controlsContainer = controls;
  this.startButton = startButton;
  this.pauseButton = pauseButton;
  this.restartButton = restartButton;
  this.muteButton = muteButton;
}

  private setupRun(): void {
    if (this.gameLoop !== null) {
      this.gameLoop.stop();
      this.gameLoop = null;
    }

    if (this.renderSystem !== null) {
      this.renderSystem.dispose();
      this.renderSystem = null;
    }

    if (this.music !== null) {
      this.music.dispose();
      this.music = null;
    }

    if (this.world !== null) {
      this.world.clear();
    }

    this.director = null;
    this.inputSystem = null;

    const world = new World();
    this.world = world;

    const grid = new GridBitmask(GRID_COLS, GRID_ROWS);
    grid.buildPerimeter();

    const holder = new GridHolder(grid);
    this.holder = holder;

    const rng = new SeededRNG(this.createSeed());

    const startCol = Math.floor(GRID_COLS / 2);
    const startRow = Math.floor(GRID_ROWS / 2);

    const snakeId = spawnSnake(
      world,
      grid,
      startCol,
      startRow,
      Direction.RIGHT,
      INITIAL_SNAKE_LENGTH,
    );

    const scoreEntity = world.createEntity();
    world.addComponent(scoreEntity, "score", { value: 0 });

    const inputSystem = new InputSystem(world, snakeId, MAX_INPUT_QUEUE);
    this.inputSystem = inputSystem;

    const controlSystem = new SnakeControlSystem(world, snakeId);

    const movementSystem = new MovementSystem(
      world,
      holder,
      snakeId,
      STEP_INTERVAL_MS,
    );

    const bitRegisterSystem = new BitRegisterSystem(
      world,
      holder,
      rng,
      snakeId,
    );

    const bitTokenSystem = new BitTokenSystem(
      world,
      holder,
      rng,
      snakeId,
      MAX_ACTIVE_TOKENS,
    );

    const levelSystem = new LevelSystem(
      world,
      holder,
      rng,
      snakeId,
      GROWTH_COLS,
      GROWTH_ROWS,
      MAX_GRID_COLS,
      MAX_GRID_ROWS,
    );

    const spawnSystem = new SpawnSystem(world, holder, rng, TARGET_FOOD_COUNT);

    const scoreSystem = new ScoreSystem(
      world,
      POINTS_PER_FOOD,
      POINTS_PER_SEQUENCE,
      PENALTY_PER_FAILURE,
    );

    const renderSystem = new RenderSystem(
      world,
      holder,
      snakeId,
      this.pixiApp.stage,
      CELL_SIZE,
      this.canvasParent,
    );

    this.renderSystem = renderSystem;

    const music = new MusicPlayer(world.events, MUSIC_SRC);
    music.setMuted(this.muted);
    this.music = music;

    spawnSystem.refillFood();

    world.addSystem(inputSystem);
    world.addSystem(controlSystem);
    world.addSystem(movementSystem);
    world.addSystem(bitTokenSystem);
    world.addSystem(bitRegisterSystem);
    world.addSystem(levelSystem);
    world.addSystem(spawnSystem);
    world.addSystem(scoreSystem);
    world.addSystem(renderSystem);

    const gameLoop = new GameLoop(world, MAX_DELTA_MS);
    this.gameLoop = gameLoop;

    const director = new Director(world, gameLoop);
    this.director = director;

    this.bindWorldEvents(world);

    world.update(0);
  }

  private bindWorldEvents(world: World): void {
    world.events.on("director:stateChanged", (payload) => {
      this.updateControlsForState(payload.current);
    });

    world.events.on("level:expanded", () => {
      this.resizeCanvas();
    });
  }

  private resizeCanvas(): void {
    if (this.holder === null) {
      return;
    }

    const grid = this.holder.grid;
    const width = grid.cols * CELL_SIZE;
    const height = grid.rows * CELL_SIZE;

    this.pixiApp.resize(width, height);
  }

  private createSeed(): number {
    return Math.floor(Math.random() * 2147483647);
  }

  private bindKeyboard(): void {
    this.keyDownHandler = (event: KeyboardEvent): void => {
      this.handleKeyDown(event);
    };

    window.addEventListener("keydown", this.keyDownHandler);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    this.unlockAudio();

    const direction = KEY_TO_DIRECTION[event.code];

    if (direction !== undefined) {
      if (this.isState(DirectorState.PLAYING) && this.inputSystem !== null) {
        this.inputSystem.pressDirection(direction);
      }

      event.preventDefault();
      return;
    }

    if (event.code === HOTKEYS.PAUSE || event.code === HOTKEYS.PAUSE_ALT) {
      this.togglePause();
      event.preventDefault();
      return;
    }

    if (event.code === HOTKEYS.CONFIRM) {
      this.onEnterPressed();
      event.preventDefault();
      return;
    }

    if (event.code === HOTKEYS.MUTE) {
      this.toggleMute();
      event.preventDefault();
      return;
    }
  }

  private isState(state: DirectorStateType): boolean {
    if (this.director === null) {
      return false;
    }

    return this.director.getState() === state;
  }

  private getDirectorState(): DirectorStateType {
    if (this.director === null) {
      return DirectorState.MENU;
    }

    return this.director.getState();
  }

  private onStartPressed(): void {
    this.unlockAudio();

    if (this.director === null) {
      return;
    }

    const state = this.director.getState();

    if (state === DirectorState.MENU) {
      this.director.transitionTo(DirectorState.PLAYING);
      return;
    }

    if (state === DirectorState.PAUSED) {
      this.director.transitionTo(DirectorState.PLAYING);
      return;
    }

    if (state === DirectorState.GAME_OVER) {
      this.restart();
      return;
    }
  }

  private onPausePressed(): void {
    this.unlockAudio();

    if (this.director === null) {
      return;
    }

    const state = this.director.getState();

    if (state === DirectorState.PLAYING) {
      this.director.transitionTo(DirectorState.PAUSED);
      return;
    }

    if (state === DirectorState.PAUSED) {
      this.director.transitionTo(DirectorState.PLAYING);
      return;
    }
  }

  private unlockAudio(): void {
    if (this.music !== null) {
      this.music.unlock();
    }
  }

  private togglePause(): void {
    this.unlockAudio();

    if (this.director === null) {
      return;
    }

    const state = this.director.getState();

    if (state === DirectorState.PLAYING) {
      this.director.transitionTo(DirectorState.PAUSED);
      return;
    }

    if (state === DirectorState.PAUSED) {
      this.director.transitionTo(DirectorState.PLAYING);
      return;
    }
  }

  private onEnterPressed(): void {
    this.unlockAudio();

    if (this.director === null) {
      return;
    }

    const state = this.director.getState();

    if (state === DirectorState.MENU) {
      this.director.transitionTo(DirectorState.PLAYING);
      return;
    }

    if (state === DirectorState.PAUSED) {
      this.director.transitionTo(DirectorState.PLAYING);
      return;
    }

    if (state === DirectorState.GAME_OVER) {
      this.restart();
      return;
    }
  }

  private restart(): void {
    this.setupRun();

    if (this.director !== null) {
      this.director.transitionTo(DirectorState.PLAYING);
    }

    this.unlockAudio();
  }

  private toggleMute(): void {
    if (this.muted) {
      this.muted = false;
    } else {
      this.muted = true;
    }

    this.updateControlsForState(this.getDirectorState());

    if (this.music !== null) {
      this.music.setMuted(this.muted);
    }
  }

  private updateControlsForState(state: DirectorStateType): void {
    const startButton = this.startButton;
    const pauseButton = this.pauseButton;
    const restartButton = this.restartButton;
    const muteButton = this.muteButton;

    if (
      startButton === null ||
      pauseButton === null ||
      restartButton === null ||
      muteButton === null
    ) {
      return;
    }

    if (this.muted) {
      muteButton.textContent = BUTTON_LABEL_SOUND_OFF;
    } else {
      muteButton.textContent = BUTTON_LABEL_SOUND_ON;
    }

    if (state === DirectorState.MENU) {
      startButton.textContent = BUTTON_LABEL_START;
      startButton.disabled = false;
      pauseButton.textContent = BUTTON_LABEL_PAUSE;
      pauseButton.disabled = true;
    }

    if (state === DirectorState.PLAYING) {
      startButton.textContent = BUTTON_LABEL_START;
      startButton.disabled = true;
      pauseButton.textContent = BUTTON_LABEL_PAUSE;
      pauseButton.disabled = false;
    }

    if (state === DirectorState.PAUSED) {
      startButton.textContent = BUTTON_LABEL_RESUME;
      startButton.disabled = false;
      pauseButton.textContent = BUTTON_LABEL_RESUME;
      pauseButton.disabled = false;
    }

    if (state === DirectorState.GAME_OVER) {
      startButton.textContent = BUTTON_LABEL_RESTART;
      startButton.disabled = false;
      pauseButton.textContent = BUTTON_LABEL_PAUSE;
      pauseButton.disabled = true;
    }

    restartButton.disabled = false;
  }

  public destroy(): void {
    if (this.keyDownHandler !== null) {
      window.removeEventListener("keydown", this.keyDownHandler);
      this.keyDownHandler = null;
    }

    if (this.controlsContainer !== null) {
      this.controlsContainer.remove();
      this.controlsContainer = null;
    }

    this.startButton = null;
    this.pauseButton = null;
    this.restartButton = null;
    this.muteButton = null;

    if (this.gameLoop !== null) {
      this.gameLoop.stop();
      this.gameLoop = null;
    }

    if (this.renderSystem !== null) {
      this.renderSystem.dispose();
      this.renderSystem = null;
    }

    if (this.music !== null) {
      this.music.dispose();
      this.music = null;
    }

    if (this.world !== null) {
      this.world.clear();
      this.world = null;
    }

    this.pixiApp.destroy();
  }
}