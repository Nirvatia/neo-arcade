import { MonoFont } from './Palette.js';

const STYLE_ID = 'snake-hud-style-v4';

const CSS = `
/* ===== Верхний блок: НАД полем ===== */
.snake-hud-top {
	box-sizing: border-box;
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: 20px;
	background: var(--hud-bg, #3a4a2c);
	border: 1px solid var(--hud-edge, #6a7a4c);
	border-radius: 12px;
	padding: 14px 20px;
	font-family: ${MonoFont.FAMILY};
	color: var(--hud-ink, #ffffff);
	pointer-events: none;
	box-shadow:
		0 10px 32px rgba(0, 0, 0, 0.65),
		inset 0 1px 0 rgba(255, 240, 200, 0.08);
	margin-bottom: 12px;
}

.sht-block {
	display: flex;
	flex-direction: column;
	gap: 4px;
}
.sht-block.center { align-items: center; }
.sht-block.right { align-items: flex-end; }

.sht-label {
	font-size: 11px;
	font-weight: 800;
	letter-spacing: 2px;
	text-transform: uppercase;
	color: var(--hud-ink, #ffffff);
	opacity: 0.75;
	line-height: 1;
}

.sht-value {
	font-size: 30px;
	font-weight: 800;
	letter-spacing: 1px;
	color: var(--hud-ink, #ffffff);
	line-height: 1;
	text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.sht-value.accent {
	color: var(--hud-accent, #c8a040);
}

.sht-value.bump { animation: shbump4 0.2s ease-out; }
@keyframes shbump4 { 40% { transform: scale(1.08); } }

/* ===== Нижний блок: ПОД полем ===== */
.snake-hud-bottom {
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	gap: 12px;
	background: var(--hud-bg, #3a4a2c);
	border: 1px solid var(--hud-edge, #6a7a4c);
	border-radius: 12px;
	padding: 14px 20px;
	font-family: ${MonoFont.FAMILY};
	color: var(--hud-ink, #ffffff);
	pointer-events: none;
	box-shadow:
		0 10px 32px rgba(0, 0, 0, 0.65),
		inset 0 1px 0 rgba(255, 240, 200, 0.08);
	margin-top: 12px;
}

/* Строка битов: TARGET или REGISTER */
.shb-row {
	display: flex;
	align-items: center;
	gap: 14px;
}

.shb-label {
	font-size: 11px;
	font-weight: 800;
	letter-spacing: 1.5px;
	text-transform: uppercase;
	color: var(--hud-ink, #ffffff);
	opacity: 0.75;
	width: 80px;
	flex: none;
	line-height: 1;
}

.shb-label.final {
	color: var(--hud-accent, #c8a040);
	opacity: 1;
}

.shb-bits {
	display: flex;
	gap: 6px;
}

/* Ячейка бита */
.shb-bit {
	width: 34px;
	height: 34px;
	border-radius: 8px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 20px;
	font-weight: 800;
	line-height: 1;
	background: rgba(0, 0, 0, 0.35);
	border: 2px solid var(--hud-edge, #6a7a4c);
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}

/* 1 — белый, 0 — приглушённый. Контраст через --hud-ink */
.shb-bit.b1 { color: var(--hud-ink, #ffffff); }
.shb-bit.b0 { color: var(--hud-soft, #c8d0a8); }

/* Совпавший бит — акцент биома */
.shb-bit.match {
	border-color: var(--hud-accent, #c8a040);
	color: var(--hud-accent, #c8a040);
}

.shb-bit.pop { animation: shpop4 0.2s ease-out backwards; }
@keyframes shpop4 {
	0% { transform: scale(0.5); }
	60% { transform: scale(1.1); }
	100% { transform: scale(1); }
}

.shb-bit.shake { animation: shshake4 0.26s; }
@keyframes shshake4 {
	0%, 100% { transform: translateX(0); }
	25% { transform: translateX(-5px); }
	75% { transform: translateX(5px); }
}

/* Мета справа: матч + рост */
.shb-meta {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-left: auto;
}

.shb-match {
	font-size: 24px;
	font-weight: 800;
	color: var(--hud-accent, #c8a040);
	line-height: 1;
	text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.shb-growth {
	font-size: 14px;
	font-weight: 700;
	color: var(--hud-ink, #ffffff);
	border: 1px solid var(--hud-edge, #6a7a4c);
	border-radius: 10px;
	padding: 4px 12px;
	line-height: 1.2;
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}

.shb-growth.hot {
	background: var(--hud-accent, #c8a040);
	color: #1e2816;
	border-color: var(--hud-accent, #c8a040);
}

.shb-growth.pop { animation: shbump4 0.25s ease-out; }
`;

export interface HudState {
	level: number;
	score: number;
	movesLeft: number;
	targetBits: (0 | 1)[];
	activeBits: (0 | 1)[];
	nextGrowth: number;
	finalMode: boolean;
}

export class DomHud {
	private readonly topEl: HTMLDivElement;
	private readonly bottomEl: HTMLDivElement;
	private readonly scoreValue: HTMLSpanElement;
	private readonly levelValue: HTMLSpanElement;
	private readonly movesValue: HTMLSpanElement;
	private readonly targetLabel: HTMLSpanElement;
	private readonly targetBox: HTMLDivElement;
	private readonly currentBox: HTMLDivElement;
	private readonly matchValue: HTMLSpanElement;
	private readonly growthValue: HTMLSpanElement;

	private lastScore = '';
	private lastLevel = '';
	private lastMoves = -1;
	private lastGrowth = '';
	private lastFinal = false;
	private lastTargetKey = '';
	private lastCurrentKey = '';

	constructor(parent: HTMLElement) {
		if (document.getElementById(STYLE_ID) === null) {
			const style = document.createElement('style');
			style.id = STYLE_ID;
			style.textContent = CSS;
			document.head.appendChild(style);
		}

		// ===== Верхний блок: SCORE · PATTERN · MOVES =====
		this.topEl = document.createElement('div');
		this.topEl.className = 'snake-hud-top';

		// Score
		const scoreBlock = document.createElement('div');
		scoreBlock.className = 'sht-block';
		const scoreLabel = document.createElement('span');
		scoreLabel.className = 'sht-label';
		scoreLabel.textContent = 'Score';
		this.scoreValue = document.createElement('span');
		this.scoreValue.className = 'sht-value accent';
		scoreBlock.appendChild(scoreLabel);
		scoreBlock.appendChild(this.scoreValue);

		// Pattern
		const levelBlock = document.createElement('div');
		levelBlock.className = 'sht-block center';
		const levelLabel = document.createElement('span');
		levelLabel.className = 'sht-label';
		levelLabel.textContent = 'Pattern';
		this.levelValue = document.createElement('span');
		this.levelValue.className = 'sht-value';
		levelBlock.appendChild(levelLabel);
		levelBlock.appendChild(this.levelValue);

		// Moves
		const movesBlock = document.createElement('div');
		movesBlock.className = 'sht-block right';
		const movesLabel = document.createElement('span');
		movesLabel.className = 'sht-label';
		movesLabel.textContent = 'Moves';
		this.movesValue = document.createElement('span');
		this.movesValue.className = 'sht-value';
		movesBlock.appendChild(movesLabel);
		movesBlock.appendChild(this.movesValue);

		this.topEl.appendChild(scoreBlock);
		this.topEl.appendChild(levelBlock);
		this.topEl.appendChild(movesBlock);

		// ===== Нижний блок: TARGET + REGISTER =====
		this.bottomEl = document.createElement('div');
		this.bottomEl.className = 'snake-hud-bottom';

		// TARGET row
		const targetRow = document.createElement('div');
		targetRow.className = 'shb-row';
		this.targetLabel = document.createElement('span');
		this.targetLabel.className = 'shb-label';
		this.targetLabel.textContent = 'Target';
		this.targetBox = document.createElement('div');
		this.targetBox.className = 'shb-bits';
		targetRow.appendChild(this.targetLabel);
		targetRow.appendChild(this.targetBox);

		// REGISTER row + meta
		const registerRow = document.createElement('div');
		registerRow.className = 'shb-row';
		const registerLabel = document.createElement('span');
		registerLabel.className = 'shb-label';
		registerLabel.textContent = 'Register';
		this.currentBox = document.createElement('div');
		this.currentBox.className = 'shb-bits';

		const meta = document.createElement('div');
		meta.className = 'shb-meta';
		this.matchValue = document.createElement('span');
		this.matchValue.className = 'shb-match';
		this.growthValue = document.createElement('span');
		this.growthValue.className = 'shb-growth';
		this.growthValue.textContent = '+1';
		meta.appendChild(this.matchValue);
		meta.appendChild(this.growthValue);

		registerRow.appendChild(registerLabel);
		registerRow.appendChild(this.currentBox);
		registerRow.appendChild(meta);

		this.bottomEl.appendChild(targetRow);
		this.bottomEl.appendChild(registerRow);

		// ===== Вставка: верхний перед канвасом, нижний после =====
		const canvas = parent.querySelector('canvas');
		if (canvas !== null) {
			parent.insertBefore(this.topEl, canvas);
			parent.appendChild(this.bottomEl);
		} else {
			parent.insertBefore(this.topEl, parent.firstChild);
			parent.appendChild(this.bottomEl);
		}
	}

	public setWidth(width: number): void {
		this.topEl.style.width = `${width}px`;
		this.bottomEl.style.width = `${width}px`;
	}

	public update(state: HudState): void {
		// Score
		const scoreText = String(state.score).padStart(6, '0');
		if (scoreText !== this.lastScore) {
			this.lastScore = scoreText;
			this.scoreValue.textContent = scoreText;
			this.scoreValue.classList.remove('bump');
			void this.scoreValue.offsetWidth;
			this.scoreValue.classList.add('bump');
		}

		// Level
		const levelText = String(state.level).padStart(2, '0');
		if (levelText !== this.lastLevel) {
			this.lastLevel = levelText;
			this.levelValue.textContent = levelText;
		}

		// Moves
		if (state.movesLeft !== this.lastMoves) {
			this.lastMoves = state.movesLeft;
			this.movesValue.textContent = String(state.movesLeft).padStart(2, '0');
		}

		// Growth
		const growthText = '+' + state.nextGrowth;
		if (growthText !== this.lastGrowth) {
			this.lastGrowth = growthText;
			this.growthValue.textContent = growthText;
			this.growthValue.classList.toggle('hot', state.nextGrowth > 1);
			this.growthValue.classList.remove('pop');
			void this.growthValue.offsetWidth;
			this.growthValue.classList.add('pop');
		}

		// Final mode
		if (state.finalMode !== this.lastFinal) {
			this.lastFinal = state.finalMode;
			this.targetLabel.textContent = state.finalMode ? 'Final' : 'Target';
			this.targetLabel.classList.toggle('final', state.finalMode);
		}

		// Target bits
		const targetKey = state.targetBits.join('');
		if (targetKey !== this.lastTargetKey) {
			this.lastTargetKey = targetKey;
			this.rebuildBits(this.targetBox, state.targetBits, []);
		}

		// Register bits + match
		const currentKey = state.activeBits.join('');
		if (currentKey !== this.lastCurrentKey) {
			this.lastCurrentKey = currentKey;
			const matched: boolean[] = [];
			let matchedCount = 0;
			for (let i = 0; i < state.activeBits.length; i++) {
				const t = state.targetBits[i];
				const a = state.activeBits[i];
				const isMatch = t !== undefined && a !== undefined && t === a;
				matched.push(isMatch);
				if (isMatch) matchedCount++;
			}
			this.rebuildBits(this.currentBox, state.activeBits, matched);
			this.matchValue.textContent =
				String(matchedCount) + '/' + String(state.targetBits.length);
		}
	}

	public shakeCurrent(): void {
		for (const el of this.currentBox.children) {
			el.classList.remove('shake');
			void (el as HTMLElement).offsetWidth;
			el.classList.add('shake');
		}
	}

	public destroy(): void {
		this.topEl.remove();
		this.bottomEl.remove();
	}

	private rebuildBits(
		box: HTMLDivElement,
		bits: (0 | 1)[],
		matched: boolean[]
	): void {
		box.textContent = '';
		for (let i = 0; i < bits.length; i++) {
			const bit = bits[i];
			if (bit === undefined) continue;
			const bitCls = bit === 1 ? 'b1' : 'b0';
			const matchCls = matched[i] === true ? ' match' : '';
			const cell = document.createElement('span');
			cell.className = `shb-bit ${bitCls}${matchCls} pop`;
			cell.style.animationDelay = `${i * 30}ms`;
			cell.textContent = bit === 1 ? '1' : '0';
			box.appendChild(cell);
		}
	}
}