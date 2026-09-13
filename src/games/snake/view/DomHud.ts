import { TerminalPalette, terminalCss } from "./TerminalPalette.js";

const STYLE_ID = "snake-hud-style";

const HUD_BG = terminalCss(TerminalPalette.bg);
const HUD_EDGE = terminalCss(TerminalPalette.wallEdge);
const HUD_BRIGHT = terminalCss(TerminalPalette.exit);
const HUD_MID = terminalCss(TerminalPalette.register);
const HUD_DIM = terminalCss(TerminalPalette.tail);
const HUD_MAX = terminalCss(TerminalPalette.head);

const CSS = `
.snake-hud{box-sizing:border-box;display:flex;flex-direction:column;gap:4px;background:${HUD_BG};border:1px solid ${HUD_EDGE};border-bottom:none;padding:6px 10px;font-family:'Courier New',monospace;color:${HUD_BRIGHT};}
.snake-hud-row{display:flex;align-items:center;gap:12px;font-size:15px;letter-spacing:1px;white-space:nowrap;}
.snake-hud-label{color:${HUD_MID};font-size:12px;}
.snake-hud-bits{display:flex;gap:3px;}
.snake-hud-spacer{flex:1;}
.sh-bit{display:inline-block;min-width:18px;text-align:center;font-size:15px;border:1px solid ${HUD_EDGE};padding:0 2px;}
.sh-b0{color:${HUD_MID};border-color:${HUD_DIM};}
.sh-b1{color:${HUD_BRIGHT};border-color:${HUD_MID};}
.sh-match{color:${HUD_MAX};border-color:${HUD_BRIGHT};}
`;

export interface HudState {
  level: number;
  score: number;
  movesLeft: number;
  targetBits: (0 | 1)[];
  activeBits: (0 | 1)[];
}

export class DomHud {
  private readonly root: HTMLDivElement;
  private readonly levelSpan: HTMLSpanElement;
  private readonly scoreSpan: HTMLSpanElement;
  private readonly movesSpan: HTMLSpanElement;
  private readonly targetBox: HTMLDivElement;
  private readonly regBox: HTMLDivElement;
  private lastLevel = "";
  private lastScore = "";
  private lastMoves = "";
  private lastTargetKey = "";
  private lastRegKey = "";

  constructor(parent: HTMLElement) {
    if (document.getElementById(STYLE_ID) === null) {
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = CSS;
      document.head.appendChild(style);
    }
    this.root = document.createElement("div");
    this.root.className = "snake-hud";

    const topRow = document.createElement("div");
    topRow.className = "snake-hud-row";
    this.levelSpan = document.createElement("span");
    this.scoreSpan = document.createElement("span");
    this.movesSpan = document.createElement("span");
    const spacer = document.createElement("span");
    spacer.className = "snake-hud-spacer";
    topRow.appendChild(this.levelSpan);
    topRow.appendChild(this.scoreSpan);
    topRow.appendChild(spacer);
    topRow.appendChild(this.movesSpan);

    const bitsRow = document.createElement("div");
    bitsRow.className = "snake-hud-row";
    const targetLabel = document.createElement("span");
    targetLabel.className = "snake-hud-label";
    targetLabel.textContent = "TARGET";
    this.targetBox = document.createElement("div");
    this.targetBox.className = "snake-hud-bits";
    const regLabel = document.createElement("span");
    regLabel.className = "snake-hud-label";
    regLabel.textContent = "REG";
    this.regBox = document.createElement("div");
    this.regBox.className = "snake-hud-bits";
    bitsRow.appendChild(targetLabel);
    bitsRow.appendChild(this.targetBox);
    bitsRow.appendChild(regLabel);
    bitsRow.appendChild(this.regBox);

    this.root.appendChild(topRow);
    this.root.appendChild(bitsRow);
    parent.insertBefore(this.root, parent.firstChild);
  }

  public setWidth(width: number): void {
    this.root.style.width = `${width}px`;
  }

  public update(state: HudState): void {
    const levelText = `LVL ${state.level}`;
    const scoreText = `SCORE ${state.score}`;
    const movesText = `MOVES ${state.movesLeft}`;
    if (levelText !== this.lastLevel) {
      this.levelSpan.textContent = levelText;
      this.lastLevel = levelText;
    }
    if (scoreText !== this.lastScore) {
      this.scoreSpan.textContent = scoreText;
      this.lastScore = scoreText;
    }
    if (movesText !== this.lastMoves) {
      this.movesSpan.textContent = movesText;
      this.lastMoves = movesText;
    }
    const targetKey = state.targetBits.join("");
    if (targetKey !== this.lastTargetKey) {
      this.rebuildBits(this.targetBox, state.targetBits, []);
      this.lastTargetKey = targetKey;
    }
    const matchedFlags: boolean[] = [];
    let maskKey = "";
    for (let i = 0; i < state.activeBits.length; i++) {
      let matched = false;
      if (i < state.targetBits.length) {
        const targetBit = state.targetBits[i];
        const activeBit = state.activeBits[i];
        if (targetBit !== undefined && activeBit !== undefined) {
          if (targetBit === activeBit) {
            matched = true;
          }
        }
      }
      matchedFlags.push(matched);
      if (matched) {
        maskKey = maskKey + "1";
      } else {
        maskKey = maskKey + "0";
      }
    }
    const regKey = state.activeBits.join("") + "|" + maskKey;
    if (regKey !== this.lastRegKey) {
      this.rebuildBits(this.regBox, state.activeBits, matchedFlags);
      this.lastRegKey = regKey;
    }
  }

  public destroy(): void {
    this.root.remove();
  }

  private rebuildBits(
    box: HTMLDivElement,
    bits: (0 | 1)[],
    matchedFlags: boolean[],
  ): void {
    box.textContent = "";
    for (let i = 0; i < bits.length; i++) {
      const bit = bits[i];
      if (bit === undefined) {
        continue;
      }
      const span = document.createElement("span");
      let className = "sh-bit ";
      if (bit === 0) {
        className = className + "sh-b0";
      } else {
        className = className + "sh-b1";
      }
      const matched = matchedFlags[i];
      if (matched === true) {
        className = className + " sh-match";
      }
      span.className = className;
      if (bit === 0) {
        span.textContent = "0";
      } else {
        span.textContent = "1";
      }
      box.appendChild(span);
    }
  }
}