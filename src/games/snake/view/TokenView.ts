import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { BitOp } from "../components/index.js";
import { TerminalPalette, TerminalFont } from "./TerminalPalette.js";

export interface TokenRender {
  col: number;
  row: number;
  op: BitOp;
}

const TOKEN_GLYPHS: Record<BitOp, string> = {
  [BitOp.SHL]: "<<",
  [BitOp.SHR]: ">>",
  [BitOp.SHL3]: "<<<",
  [BitOp.SHR3]: ">>>",
};

const MAX_TOKEN_VISUALS = 4;
const INSET = 2;
const BORDER = 2;

class TokenVisual {
  public readonly container: Container;
  private readonly block: Graphics;
  private readonly label: Text;
  private readonly cellSize: number;
  private current = "";

  constructor(cellSize: number) {
    this.cellSize = cellSize;
    this.container = new Container();
    this.block = new Graphics();
    const size = this.cellSize - INSET * 2;
    this.block.rect(INSET, INSET, size, size);
    this.block.fill(TerminalPalette.ink);
    this.block.rect(INSET, INSET, size, size);
    this.block.stroke({ color: TerminalPalette.token, width: BORDER });
    this.label = new Text({
      text: "",
      style: new TextStyle({
        fontFamily: TerminalFont.FAMILY,
        fontWeight: "bold",
        fill: TerminalPalette.token,
      }),
    });
    this.label.anchor.set(0.5, 0.5);
    this.container.addChild(this.block);
    this.container.addChild(this.label);
    this.container.visible = false;
  }

  public show(token: TokenRender, alpha: number): void {
    this.container.visible = true;
    this.container.x = token.col * this.cellSize;
    this.container.y = token.row * this.cellSize;
    this.container.alpha = alpha;
    this.label.x = this.cellSize / 2;
    this.label.y = this.cellSize / 2;
    const glyph = TOKEN_GLYPHS[token.op];
    if (this.current !== glyph) {
      this.label.text = glyph;
      this.label.style = this.buildStyle(glyph);
      this.current = glyph;
    }
  }

  private buildStyle(glyph: string): TextStyle {
    const size = this.cellSize - INSET * 2 - BORDER * 2;
    const maxTextWidth = size * 0.92;
    let fontSize = Math.floor(maxTextWidth / (0.6 * glyph.length));
    const cap = Math.floor(size * 0.72);
    if (fontSize > cap) {
      fontSize = cap;
    }
    return new TextStyle({
      fontFamily: TerminalFont.FAMILY,
      fontSize,
      fontWeight: "bold",
      fill: TerminalPalette.token,
    });
  }

  public hide(): void {
    this.container.visible = false;
  }
}

export class TokenView {
  public readonly container: Container;
  private readonly visuals: TokenVisual[] = [];

  constructor(cellSize: number) {
    this.container = new Container();
    for (let i = 0; i < MAX_TOKEN_VISUALS; i++) {
      const visual = new TokenVisual(cellSize);
      this.visuals.push(visual);
      this.container.addChild(visual.container);
    }
  }

  public render(tokens: TokenRender[], timeMS: number): void {
    const pulse = Math.sin(timeMS * 0.005) * 0.5 + 0.5;
    const alpha = 0.9 + pulse * 0.1;
    for (let i = 0; i < this.visuals.length; i++) {
      const visual = this.visuals[i];
      if (visual === undefined) {
        continue;
      }
      if (i < tokens.length) {
        const token = tokens[i];
        if (token === undefined) {
          visual.hide();
        } else {
          visual.show(token, alpha);
        }
      } else {
        visual.hide();
      }
    }
  }
}