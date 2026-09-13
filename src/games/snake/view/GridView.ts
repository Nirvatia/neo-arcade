import { Container, Graphics } from "pixi.js";
import type { GridBitmask } from "../logic/GridBitmask.js";
import { TerminalPalette } from "./TerminalPalette.js";

const WALL_INSET = 1;
const WALL_EDGE_WIDTH = 2;

export class GridView {
  public readonly container: Container;
  private readonly backgroundGraphics: Graphics;
  private readonly wallGraphics: Graphics;
  private readonly exitGraphics: Graphics;
  private readonly cellSize: number;

  constructor(cellSize: number) {
    this.cellSize = cellSize;
    this.container = new Container();
    this.backgroundGraphics = new Graphics();
    this.wallGraphics = new Graphics();
    this.exitGraphics = new Graphics();
    this.container.addChild(this.backgroundGraphics);
    this.container.addChild(this.wallGraphics);
    this.container.addChild(this.exitGraphics);
  }

  public renderBackground(grid: GridBitmask): void {
    this.backgroundGraphics.clear();
    const width = grid.cols * this.cellSize;
    const height = grid.rows * this.cellSize;
    this.backgroundGraphics.rect(0, 0, width, height);
    this.backgroundGraphics.fill(TerminalPalette.bg);
    for (let col = 0; col <= grid.cols; col++) {
      this.backgroundGraphics.rect(col * this.cellSize, 0, 1, height);
    }
    for (let row = 0; row <= grid.rows; row++) {
      this.backgroundGraphics.rect(0, row * this.cellSize, width, 1);
    }
    this.backgroundGraphics.fill(TerminalPalette.grid);
  }

  public renderWalls(grid: GridBitmask): void {
    this.wallGraphics.clear();
    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        if (grid.isWall(col, row)) {
          this.wallGraphics.rect(
            col * this.cellSize + WALL_INSET,
            row * this.cellSize + WALL_INSET,
            this.cellSize - WALL_INSET * 2,
            this.cellSize - WALL_INSET * 2,
          );
        }
      }
    }
    this.wallGraphics.fill(TerminalPalette.wallFill);
    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        if (grid.isWall(col, row)) {
          this.wallGraphics.rect(
            col * this.cellSize + WALL_INSET,
            row * this.cellSize + WALL_INSET,
            this.cellSize - WALL_INSET * 2,
            this.cellSize - WALL_INSET * 2,
          );
        }
      }
    }
    this.wallGraphics.stroke({
      color: TerminalPalette.wallEdge,
      width: WALL_EDGE_WIDTH,
    });
  }

  public renderExit(grid: GridBitmask, timeMS: number): void {
    this.exitGraphics.clear();
    const pulse = Math.sin(timeMS * 0.005) * 0.5 + 0.5;
    const alpha = 0.65 + pulse * 0.35;
    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        if (!grid.isExit(col, row)) {
          continue;
        }
        const x = col * this.cellSize;
        const y = row * this.cellSize;
        this.exitGraphics.rect(x + 2, y + 2, this.cellSize - 4, this.cellSize - 4);
        this.exitGraphics.stroke({
          color: TerminalPalette.exit,
          width: 2,
          alpha,
        });
        const inner = this.cellSize * 0.44;
        const inset = (this.cellSize - inner) / 2;
        this.exitGraphics.rect(x + inset, y + inset, inner, inner);
        this.exitGraphics.fill({
          color: TerminalPalette.exit,
          alpha,
        });
      }
    }
  }
}