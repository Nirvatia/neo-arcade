import { Container, Graphics } from "pixi.js";
import type { Direction } from "../components/index.js";
import { TerminalPalette } from "./TerminalPalette.js";

export interface SnakeSegmentRender {
  col: number;
  row: number;
  bit: 0 | 1;
  order: number;
  active: boolean;
}

const INSET = 2;
const STROKE = 2;

export class SnakeView {
  public readonly container: Container;
  private readonly graphics: Graphics;
  private readonly cellSize: number;

  constructor(cellSize: number) {
    this.cellSize = cellSize;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  // Сегменты идут от хвоста к голове, голова рисуется последней.
  // _headDir не используется в новом дизайне, оставлен для совместимости сигнатуры.
  public render(segments: SnakeSegmentRender[], _headDir?: Direction): void {
    this.graphics.clear();
    for (const segment of segments) {
      const x = segment.col * this.cellSize + INSET;
      const y = segment.row * this.cellSize + INSET;
      const size = this.cellSize - INSET * 2;
      if (segment.order === 0) {
        this.graphics.rect(x, y, size, size);
        this.graphics.fill(TerminalPalette.head);
        continue;
      }
      let color:number = TerminalPalette.tail;
      if (segment.active) {
        color = TerminalPalette.register;
      }
      if (segment.bit === 1) {
        this.graphics.rect(x, y, size, size);
        this.graphics.fill(color);
      } else {
        this.graphics.rect(x, y, size, size);
        this.graphics.stroke({ color, width: STROKE });
      }
    }
  }
}