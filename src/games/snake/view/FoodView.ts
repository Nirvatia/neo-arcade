import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { GridBitmask } from "../logic/GridBitmask.js";
import { Palette, MonoFont } from "./Palette.js";

const INSET = 3;
const RADIUS = 3;
const FONT_SIZE = 14;

export class FoodView {
  public readonly container: Container;
  private readonly graphics: Graphics;
  private readonly digitLayer: Container;
  private readonly texts: Text[] = [];
  private readonly styleOne: TextStyle;
  private readonly styleZero: TextStyle;
  private readonly cellSize: number;

  constructor(cellSize: number) {
    this.cellSize = cellSize;
    this.container = new Container();
    this.graphics = new Graphics();
    this.digitLayer = new Container();
    this.styleOne = this.buildStyle(Palette.foodInk);
    this.styleZero = this.buildStyle(Palette.cyan);
    this.container.addChild(this.graphics);
    this.container.addChild(this.digitLayer);
  }

  public render(grid: GridBitmask, timeMS: number): void {
    this.graphics.clear();
    const pulse = Math.sin(timeMS * 0.004) * 0.5 + 0.5;
    let textIndex = 0;
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
          this.graphics.roundRect(x - 2, y - 2, size + 4, size + 4, RADIUS + 1);
          this.graphics.fill({ color: Palette.cyan, alpha: 0.1 + pulse * 0.12 });
          this.graphics.roundRect(x, y, size, size, RADIUS);
          this.graphics.fill(Palette.cyan);
          textIndex = this.placeDigit(
            textIndex,
            1,
            x + size / 2,
            y + size / 2,
            this.styleOne,
          );
        } else {
          this.graphics.roundRect(x - 2, y - 2, size + 4, size + 4, RADIUS + 1);
          this.graphics.fill({ color: Palette.cyan, alpha: 0.05 + pulse * 0.07 });
          this.graphics.roundRect(x, y, size, size, RADIUS);
          this.graphics.fill(Palette.foodZeroBg);
          this.graphics.roundRect(x + 1, y + 1, size - 2, size - 2, RADIUS - 1);
          this.graphics.stroke({ color: Palette.cyan, width: 2 });
          textIndex = this.placeDigit(
            textIndex,
            0,
            x + size / 2,
            y + size / 2,
            this.styleZero,
          );
        }
      }
    }
    for (let i = textIndex; i < this.texts.length; i++) {
      const text = this.texts[i];
      if (text !== undefined) {
        text.visible = false;
      }
    }
  }

  private placeDigit(
    index: number,
    bit: 0 | 1,
    cx: number,
    cy: number,
    style: TextStyle,
  ): number {
    let text = this.texts[index];
    if (text === undefined) {
      text = new Text({ text: "", style });
      text.anchor.set(0.5, 0.5);
      this.digitLayer.addChild(text);
      this.texts.push(text);
    }
    text.style = style;
    text.text = bit === 1 ? "1" : "0";
    text.x = cx;
    text.y = cy;
    text.visible = true;
    return index + 1;
  }

  private buildStyle(fill: number): TextStyle {
    return new TextStyle({
      fontFamily: MonoFont.FAMILY,
      fontSize: FONT_SIZE,
      fontWeight: "700",
      fill,
    });
  }
}