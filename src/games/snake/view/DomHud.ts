import { Palette, MonoFont, paletteCss } from './Palette.js';

const STYLE_ID = 'snake-hud-style';
const MAX_PIPS = 12;

const CSS = `
.snake-hud{box-sizing:border-box;display:flex;flex-direction:column;gap:7px;background:#0C1016;border:1px solid ${paletteCss(Palette.chrome)};border-bottom:none;padding:10px 14px;font-family:${MonoFont.FAMILY};color:${paletteCss(Palette.light)};}
.sh-row{display:flex;align-items:center;gap:18px;font-size:13px;letter-spacing:1px;white-space:nowrap;}
.sh-hl{color:${paletteCss(Palette.gray)};font-size:11px;margin-right:6px;letter-spacing:2px;}
.sh-status{font-size:11px;font-weight:700;letter-spacing:2px;}
.sh-spacer{flex:1;}
.sh-pips{display:inline-flex;gap:3px;margin-right:8px;}
.sh-pip{width:7px;height:14px;background:${paletteCss(Palette.chrome)};}
.sh-pip.on{background:${paletteCss(Palette.light)};}
.sh-moves-num{color:${paletteCss(Palette.white)};font-weight:700;}
.sh-bitrow{display:flex;align-items:center;gap:4px;}
.sh-bitrow-label{width:64px;color:${paletteCss(Palette.gray)};font-size:11px;letter-spacing:2px;}
.sh-bits{display:flex;gap:4px;}
.sh-bc{width:26px;height:26px;background:#0E1319;border:1px solid #2A3542;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;}
.sh-tgt{background:#0E141B;border-color:#38455A;color:#B9C5D1;}
.sh-ok{color:${paletteCss(Palette.green)};border-color:#2F6B42;box-shadow:0 0 6px rgba(91,224,122,.3);}
.sh-no{color:#93A0AD;}
.sh-match{margin-left:10px;font-size:12px;font-weight:700;color:${paletteCss(Palette.green)};}
.sh-footer{display:flex;align-items:center;justify-content:center;gap:18px;padding-top:6px;border-top:1px solid #1A2028;font-size:11px;letter-spacing:1.5px;color:${paletteCss(Palette.gray)};}
.sh-kbd{color:${paletteCss(Palette.amber)};font-weight:700;margin-right:4px;}
`;

export interface HudState {
	level: number;
	score: number;
	movesLeft: number;
	targetBits: (0 | 1)[];
	activeBits: (0 | 1)[];
	status: string;
	statusColor: number;
}

export class DomHud {
	private readonly root: HTMLDivElement;
	private readonly levelValue: HTMLSpanElement;
	private readonly scoreValue: HTMLSpanElement;
	private readonly statusSpan: HTMLSpanElement;
	private readonly pips: HTMLSpanElement[] = [];
	private readonly movesValue: HTMLSpanElement;
	private readonly targetBox: HTMLDivElement;
	private readonly regBox: HTMLDivElement;
	private readonly matchSpan: HTMLSpanElement;
	private lastLevel = '';
	private lastScore = '';
	private lastMoves = -1;
	private lastStatusKey = '\u0000';
	private lastTargetKey = '';
	private lastRegKey = '';

	constructor(parent: HTMLElement) {
		if (document.getElementById(STYLE_ID) === null) {
			const style = document.createElement('style');
			style.id = STYLE_ID;
			style.textContent = CSS;
			document.head.appendChild(style);
		}
		this.root = document.createElement('div');
		this.root.className = 'snake-hud';

		const topRow = document.createElement('div');
		topRow.className = 'sh-row';

		const lvlWrap = document.createElement('span');
		const lvlLabel = document.createElement('span');
		lvlLabel.className = 'sh-hl';
		lvlLabel.textContent = 'LVL';
		this.levelValue = document.createElement('span');
		lvlWrap.appendChild(lvlLabel);
		lvlWrap.appendChild(this.levelValue);

		const scoreWrap = document.createElement('span');
		const scoreLabel = document.createElement('span');
		scoreLabel.className = 'sh-hl';
		scoreLabel.textContent = 'SCORE';
		this.scoreValue = document.createElement('span');
		scoreWrap.appendChild(scoreLabel);
		scoreWrap.appendChild(this.scoreValue);

		this.statusSpan = document.createElement('span');
		this.statusSpan.className = 'sh-status';

		const spacer = document.createElement('span');
		spacer.className = 'sh-spacer';

		const movesLabel = document.createElement('span');
		movesLabel.className = 'sh-hl';
		movesLabel.textContent = 'MOVES';

		const pipsBox = document.createElement('span');
		pipsBox.className = 'sh-pips';
		for (let i = 0; i < MAX_PIPS; i++) {
			const pip = document.createElement('span');
			pip.className = 'sh-pip';
			pipsBox.appendChild(pip);
			this.pips.push(pip);
		}

		this.movesValue = document.createElement('span');
		this.movesValue.className = 'sh-moves-num';

		topRow.appendChild(lvlWrap);
		topRow.appendChild(scoreWrap);
		topRow.appendChild(this.statusSpan);
		topRow.appendChild(spacer);
		topRow.appendChild(movesLabel);
		topRow.appendChild(pipsBox);
		topRow.appendChild(this.movesValue);

		const targetRow = document.createElement('div');
		targetRow.className = 'sh-bitrow';
		const targetLabel = document.createElement('span');
		targetLabel.className = 'sh-bitrow-label';
		targetLabel.textContent = 'TARGET';
		this.targetBox = document.createElement('div');
		this.targetBox.className = 'sh-bits';
		targetRow.appendChild(targetLabel);
		targetRow.appendChild(this.targetBox);

		const regRow = document.createElement('div');
		regRow.className = 'sh-bitrow';
		const regLabel = document.createElement('span');
		regLabel.className = 'sh-bitrow-label';
		regLabel.textContent = 'REG';
		this.regBox = document.createElement('div');
		this.regBox.className = 'sh-bits';
		this.matchSpan = document.createElement('span');
		this.matchSpan.className = 'sh-match';
		regRow.appendChild(regLabel);
		regRow.appendChild(this.regBox);
		regRow.appendChild(this.matchSpan);

		// Footer с клавиатурными подсказками — виден всегда.
		const footer = document.createElement('div');
		footer.className = 'sh-footer';
		footer.appendChild(this.makeHint('ENTER', 'START'));
		footer.appendChild(this.makeHint('SPACE', 'PAUSE'));
		footer.appendChild(this.makeHint('M', 'MUTE'));
		footer.appendChild(this.makeHint('↑↓←→', 'MOVE'));

		this.root.appendChild(topRow);
		this.root.appendChild(targetRow);
		this.root.appendChild(regRow);
		this.root.appendChild(footer);
		parent.insertBefore(this.root, parent.firstChild);
	}

	private makeHint(key: string, action: string): HTMLSpanElement {
		const span = document.createElement('span');
		const kbd = document.createElement('span');
		kbd.className = 'sh-kbd';
		kbd.textContent = key;
		span.appendChild(kbd);
		span.appendChild(document.createTextNode(action));
		return span;
	}

	public setWidth(width: number): void {
		this.root.style.width = `${width}px`;
	}

	public update(state: HudState): void {
		const levelText = String(state.level);
		if (levelText !== this.lastLevel) {
			this.levelValue.textContent = levelText;
			this.lastLevel = levelText;
		}
		const scoreText = String(state.score);
		if (scoreText !== this.lastScore) {
			this.scoreValue.textContent = scoreText;
			this.lastScore = scoreText;
		}
		if (state.movesLeft !== this.lastMoves) {
			this.lastMoves = state.movesLeft;
			for (let i = 0; i < this.pips.length; i++) {
				const pip = this.pips[i];
				if (pip === undefined) {
					continue;
				}
				if (i < state.movesLeft) {
					pip.classList.add('on');
				} else {
					pip.classList.remove('on');
				}
			}
			this.movesValue.textContent =
				state.movesLeft < 10 ? '0' + state.movesLeft : String(state.movesLeft);
		}
		const statusKey = state.status + '|' + state.statusColor;
		if (statusKey !== this.lastStatusKey) {
			this.lastStatusKey = statusKey;
			this.statusSpan.textContent = state.status;
			this.statusSpan.style.color = paletteCss(state.statusColor);
		}
		const targetKey = state.targetBits.join('');
		if (targetKey !== this.lastTargetKey) {
			this.rebuildBits(this.targetBox, state.targetBits, []);
			this.lastTargetKey = targetKey;
		}
		const matchedFlags: boolean[] = [];
		let matchedCount = 0;
		let maskKey = '';
		for (let i = 0; i < state.activeBits.length; i++) {
			let matched = false;
			const targetBit = state.targetBits[i];
			const activeBit = state.activeBits[i];
			if (targetBit !== undefined && activeBit !== undefined && targetBit === activeBit) {
				matched = true;
				matchedCount = matchedCount + 1;
			}
			matchedFlags.push(matched);
			if (matched) {
				maskKey = maskKey + '1';
			} else {
				maskKey = maskKey + '0';
			}
		}
		const regKey = state.activeBits.join('') + '|' + maskKey;
		if (regKey !== this.lastRegKey) {
			this.rebuildBits(this.regBox, state.activeBits, matchedFlags);
			this.matchSpan.textContent = `${matchedCount}/${state.targetBits.length}`;
			this.lastRegKey = regKey;
		}
	}

	public destroy(): void {
		this.root.remove();
	}

	private rebuildBits(box: HTMLDivElement, bits: (0 | 1)[], matchedFlags: boolean[]): void {
		box.textContent = '';
		const isTarget = matchedFlags.length === 0;
		for (let i = 0; i < bits.length; i++) {
			const bit = bits[i];
			if (bit === undefined) {
				continue;
			}
			const cell = document.createElement('span');
			let className = 'sh-bc';
			if (isTarget) {
				className = className + ' sh-tgt';
			} else if (matchedFlags[i] === true) {
				className = className + ' sh-ok';
			} else {
				className = className + ' sh-no';
			}
			cell.className = className;
			cell.textContent = bit === 1 ? '1' : '0';
			box.appendChild(cell);
		}
	}
}
