import { SystemBase } from "../core/ecs/SystemBase.js";
import type { World } from "../core/ecs/World.js";
import type { EntityId } from "../core/ecs/types.js";
import type { GridHolder } from "../logic/GridHolder.js";
import type { GridBitmask } from "../logic/GridBitmask.js";
import { GridView } from "../view/GridView.js";
import { FoodView } from "../view/FoodView.js";
import { SnakeView, type SnakeSegmentRender } from "../view/SnakeView.js";
import { TokenView, type TokenRender } from "../view/TokenView.js";
import { DomHud, type HudState } from "../view/DomHud.js";
import type { Container } from "pixi.js";

interface SequenceState {
  targetBits: (0 | 1)[];
  activeBits: (0 | 1)[];
  movesLeft: number;
}

export class RenderSystem extends SystemBase {
  public readonly name = "RenderSystem";
  private readonly holder: GridHolder;
  private readonly snakeId: EntityId;
  private readonly stage: Container;
  private readonly cellSize: number;
  private readonly gridView: GridView;
  private readonly foodView: FoodView;
  private readonly tokenView: TokenView;
  private readonly snakeView: SnakeView;
  private readonly hud: DomHud;
  private cachedWallGrid: GridBitmask | null = null;
  private cachedWidth = -1;
  private level = 1;
  private time = 0;

  constructor(
    world: World,
    holder: GridHolder,
    snakeId: EntityId,
    stage: Container,
    cellSize: number,
    canvasParent: HTMLElement,
  ) {
    super(world);
    this.holder = holder;
    this.snakeId = snakeId;
    this.stage = stage;
    this.cellSize = cellSize;
    this.gridView = new GridView(cellSize);
    this.foodView = new FoodView(cellSize);
    this.tokenView = new TokenView(cellSize);
    this.snakeView = new SnakeView(cellSize);
    this.hud = new DomHud(canvasParent);
    this.stage.addChild(this.gridView.container);
    this.stage.addChild(this.foodView.container);
    this.stage.addChild(this.tokenView.container);
    this.stage.addChild(this.snakeView.container);
    this.world.events.on("level:expanded", (payload) => {
      this.level = payload.level;
    });
  }

  private get grid(): GridBitmask {
    return this.holder.grid;
  }

  public update(deltaMS: number): void {
    this.time = this.time + deltaMS;
    const width = this.grid.cols * this.cellSize;
    if (this.cachedWidth !== width) {
      this.hud.setWidth(width);
      this.cachedWidth = width;
    }
    if (this.cachedWallGrid !== this.grid) {
      this.gridView.renderBackground(this.grid);
      this.gridView.renderWalls(this.grid);
      this.cachedWallGrid = this.grid;
    }
    this.gridView.renderExit(this.grid, this.time);
    this.foodView.render(this.grid, this.time);
    const sequenceState = this.readSequenceState();
    this.renderSnake(sequenceState.targetBits.length);
    this.renderTokens();
    const hudState: HudState = {
      level: this.level,
      score: this.getScore(),
      movesLeft: sequenceState.movesLeft,
      targetBits: sequenceState.targetBits,
      activeBits: sequenceState.activeBits,
    };
    this.hud.update(hudState);
  }

  public dispose(): void {
    this.stage.removeChild(this.gridView.container);
    this.stage.removeChild(this.foodView.container);
    this.stage.removeChild(this.tokenView.container);
    this.stage.removeChild(this.snakeView.container);
    this.gridView.container.destroy({ children: true });
    this.foodView.container.destroy({ children: true });
    this.tokenView.container.destroy({ children: true });
    this.snakeView.container.destroy({ children: true });
    this.hud.destroy();
  }

  private readSequenceState(): SequenceState {
    let targetBits: (0 | 1)[] = [];
    let activeBits: (0 | 1)[] = [];
    let movesLeft = 0;
    const targets = this.world.query(["targetSequence"]).entities;
    const targetEntity = targets[0];
    if (targetEntity !== undefined) {
      const target = this.world.getComponent(targetEntity, "targetSequence");
      if (target !== undefined) {
        targetBits = target.bits.slice();
        movesLeft = target.movesLeft;
      }
    }
    const collectors = this.world.query(["bitCollector"]).entities;
    for (const entity of collectors) {
      const collector = this.world.getComponent(entity, "bitCollector");
      if (collector !== undefined && collector.snakeId === this.snakeId) {
        activeBits = collector.collected.slice();
      }
    }
    return { targetBits, activeBits, movesLeft };
  }

  private renderSnake(activeLength: number): void {
    const segments: SnakeSegmentRender[] = [];
    const entities = this.world.query(["snakeSegment", "gridPosition"]).entities;
    for (const entity of entities) {
      const segment = this.world.getComponent(entity, "snakeSegment");
      const position = this.world.getComponent(entity, "gridPosition");
      if (segment === undefined || position === undefined) {
        continue;
      }
      if (segment.snakeId !== this.snakeId) {
        continue;
      }
      segments.push({
        col: position.col,
        row: position.row,
        bit: segment.bit,
        order: segment.order,
        active: segment.order < activeLength,
      });
    }
    segments.sort((a, b) => b.order - a.order);
    this.snakeView.render(segments);
  }

  private renderTokens(): void {
    const tokens: TokenRender[] = [];
    const entities = this.world.query(["bitPowerUp", "gridPosition"]).entities;
    for (const entity of entities) {
      const tokenPos = this.world.getComponent(entity, "gridPosition");
      const token = this.world.getComponent(entity, "bitPowerUp");
      if (tokenPos === undefined || token === undefined) {
        continue;
      }
      tokens.push({
        col: tokenPos.col,
        row: tokenPos.row,
        op: token.op,
      });
    }
    this.tokenView.render(tokens, this.time);
  }

  private getScore(): number {
    const scoreEntities = this.world.query(["score"]).entities;
    const scoreEntity = scoreEntities[0];
    if (scoreEntity === undefined) {
      return 0;
    }
    const score = this.world.getComponent(scoreEntity, "score");
    if (score === undefined) {
      return 0;
    }
    return score.value;
  }
}