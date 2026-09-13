import { Container, Graphics } from "pixi.js";
import type { GridBitmask } from "../logic/GridBitmask.js";
import { TerminalPalette } from "./TerminalPalette.js";

const INSET = 3;
const STROKE = 2;

export class FoodView {
  public readonly container: Container;
  private readonly graphics: Graphics;
  private readonly cellSize: number;

  constructor(cellSize: number) {
    this.cellSize = cellSize;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  public render(grid: GridBitmask, timeMS: number): void {
    this.graphics.clear();
    const pulse = Math.sin(timeMS * 0.004) * 0.5 + 0.5;
    const alpha = 0.78 + pulse * 0.22;
    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        if (!grid.isFood(col, row)) {
          continue;
        }
        const bit = grid.getFoodBit(col, row);
        const x = col * this.cellSize + INSET;
        const y = row * this.cellSize + INSET;
        const size = this.cellSize - INSET * 2;
        if (bit === 1) {
          this.graphics.rect(x, y, size, size);
          this.graphics.fill({ color: TerminalPalette.food, alpha });
        } else {
          this.graphics.rect(x, y, size, size);
          this.graphics.stroke({
            color: TerminalPalette.food,
            width: STROKE,
            alpha,
          });
        }
      }
    }
  }
}