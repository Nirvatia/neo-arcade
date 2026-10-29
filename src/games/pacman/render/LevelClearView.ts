import type { GridLayout } from './GridView';
import type { GridService } from '../logic/GridService';
import type { GameProfile } from '../logic/HypnosisService';
import {
	LEVEL_CLEAR_MAX_BLINK,
	type LevelClearSnapshot
} from '../core/states/LevelClearState';

const LANE_HEIGHT_TILES = 1.7;
const LANE_MARGIN_TILES = 1.1;
const DOT_RADIUS_RATIO = 0.09;
const PLAYER_RADIUS_RATIO = 0.34;
const INTRO_SHARE = 0.12;
const MAX_DOTS = 14;
const TAU = Math.PI * 2;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const EPSILON_DENOM = 1e-6;

export class LevelClearView {
	private readonly reducedMotion: boolean;

	constructor() {
		let reduced = false;
		if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
			try {
				reduced = window.matchMedia(REDUCED_MOTION_QUERY).matches;
			} catch {
				reduced = false;
			}
		}
		this.reducedMotion = reduced;
	}

	draw(
		ctx: CanvasRenderingContext2D,
		snapshot: LevelClearSnapshot,
		grid: GridService,
		layout: GridLayout,
		profile: GameProfile
	): void {
		if (!ctx) {
			console.error('LevelClearView.draw', 'missing context');
			return;
		}
		if (!snapshot) {
			console.error('LevelClearView.draw', 'missing snapshot');
			return;
		}
		if (!grid) {
			console.error('LevelClearView.draw', 'missing grid');
			return;
		}
		if (!layout) {
			console.error('LevelClearView.draw', 'missing layout');
			return;
		}
		if (profile !== 'pacman' && profile !== 'ms-pacman') {
			console.error('LevelClearView.draw', 'invalid profile', profile);
			return;
		}
		if (
			!Number.isFinite(layout.tileSize) ||
			layout.tileSize <= 0 ||
			!Number.isFinite(layout.offsetX) ||
			!Number.isFinite(layout.offsetY)
		) {
			console.error('LevelClearView.draw', 'invalid layout', layout);
			return;
		}
		if (
			!Number.isFinite(grid.width) ||
			grid.width <= 0 ||
			!Number.isFinite(grid.height) ||
			grid.height <= 0
		) {
			console.error('LevelClearView.draw', 'invalid grid size', {
				width: grid.width,
				height: grid.height
			});
			return;
		}
		if (
			!Number.isFinite(snapshot.duration) ||
			snapshot.duration < 0 ||
			!Number.isFinite(snapshot.progress) ||
			snapshot.progress < 0 ||
			snapshot.progress > 1 ||
			!Number.isFinite(snapshot.phaseProgress) ||
			snapshot.phaseProgress < 0 ||
			snapshot.phaseProgress > 1 ||
			!Number.isFinite(snapshot.blinkAmount) ||
			snapshot.blinkAmount < 0 ||
			snapshot.blinkAmount > 1 ||
			!Number.isFinite(snapshot.mazeAlpha) ||
			snapshot.mazeAlpha < 0 ||
			snapshot.mazeAlpha > 1
		) {
			console.error('LevelClearView.draw', 'invalid snapshot', snapshot);
			return;
		}
		if (
			snapshot.phase !== 'blink' &&
			snapshot.phase !== 'cutscene' &&
			snapshot.phase !== 'maze-out'
		) {
			console.error('LevelClearView.draw', 'unknown phase', snapshot.phase);
			return;
		}
		const ts = layout.tileSize;
		const left = layout.offsetX;
		const top = layout.offsetY;
		const boardWidth = grid.width * ts;
		const boardHeight = grid.height * ts;
		if (!(boardWidth > 0) || !(boardHeight > 0)) {
			console.error('LevelClearView.draw', 'empty board rectangle');
			return;
		}
		ctx.save();
		if (snapshot.phase === 'blink') {
			this.drawBlink(ctx, left, top, boardWidth, boardHeight, snapshot.blinkAmount);
		}
		if (snapshot.phase === 'cutscene' || snapshot.phase === 'maze-out') {
			const progress = snapshot.phase === 'maze-out' ? 1 : snapshot.phaseProgress;
			this.drawCutscene(ctx, left, top, boardWidth, boardHeight, ts, progress, profile);
		}
		if (snapshot.phase === 'maze-out') {
			const alpha = 1 - this.clamp(snapshot.mazeAlpha, 0, 1);
			if (alpha > 0) {
				ctx.globalAlpha = alpha;
				ctx.fillStyle = '#030509';
				ctx.fillRect(left, top, boardWidth, boardHeight);
				ctx.globalAlpha = 1;
			}
		}
		ctx.restore();
	}

	private drawBlink(
		ctx: CanvasRenderingContext2D,
		left: number,
		top: number,
		width: number,
		height: number,
		amount: number
	): void {
		if (this.reducedMotion) {
			return;
		}
		const depth = this.clamp(amount, 0, LEVEL_CLEAR_MAX_BLINK);
		if (depth <= 0) {
			return;
		}
		ctx.globalAlpha = depth;
		ctx.fillStyle = '#030509';
		ctx.fillRect(left, top, width, height);
		ctx.globalAlpha = 1;
	}

	private drawCutscene(
		ctx: CanvasRenderingContext2D,
		left: number,
		top: number,
		boardWidth: number,
		boardHeight: number,
		ts: number,
		progress: number,
		profile: GameProfile
	): void {
		const laneHeight = Math.min(ts * LANE_HEIGHT_TILES, boardHeight * 0.3);
		const margin = Math.min(ts * LANE_MARGIN_TILES, boardWidth * 0.2);
		const laneLeft = left + margin;
		const laneWidth = boardWidth - margin * 2;
		if (!(laneWidth > 0) || !(laneHeight > 0)) {
			return;
		}
		const laneTop = top + boardHeight / 2 - laneHeight / 2;
		const laneCenter = laneTop + laneHeight / 2;
		const accent = profile === 'ms-pacman' ? '#ff8fd3' : '#ffe24b';
		const intro = this.clamp(progress / INTRO_SHARE, 0, 1);
		if (intro <= 0) {
			return;
		}
		const radius = Math.max(1, Math.min(ts * PLAYER_RADIUS_RATIO, laneHeight * 0.32));
		const runStart = laneLeft + radius;
		const span = Math.max(0, laneWidth - radius * 2);
		const travel = this.reducedMotion
			? 0.5
			: this.clamp((progress - INTRO_SHARE) / Math.max(EPSILON_DENOM, 1 - INTRO_SHARE), 0, 1);
		const playerX = runStart + span * travel;
		ctx.save();
		ctx.globalAlpha = intro;
		ctx.fillStyle = '#030509';
		ctx.fillRect(left, laneTop, boardWidth, laneHeight);
		const edge = Math.max(1, Math.floor(ts * 0.06));
		ctx.globalAlpha = intro * 0.25;
		ctx.fillStyle = accent;
		ctx.fillRect(left, laneTop, boardWidth, edge);
		ctx.fillRect(left, laneTop + laneHeight - edge, boardWidth, edge);
		const dotCount = Math.max(3, Math.min(MAX_DOTS, Math.floor(laneWidth / (ts * 1.4))));
		const dotRadius = Math.max(1, ts * DOT_RADIUS_RATIO);
		for (let i = 0; i < dotCount; i += 1) {
			const t = dotCount > 1 ? i / (dotCount - 1) : 0.5;
			const x = runStart + span * t;
			const eaten = x <= playerX;
			ctx.globalAlpha = intro * (eaten ? 0.12 : 1);
			ctx.fillStyle = accent;
			ctx.beginPath();
			ctx.arc(x, laneCenter, dotRadius, 0, TAU);
			ctx.fill();
		}
		ctx.globalAlpha = intro;
		ctx.fillStyle = accent;
		const mouthWave = this.reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(progress * Math.PI * 10);
		const opening = (0.08 + 0.2 * mouthWave) * Math.PI;
		ctx.beginPath();
		ctx.moveTo(playerX, laneCenter);
		ctx.arc(playerX, laneCenter, radius, opening, TAU - opening);
		ctx.closePath();
		ctx.fill();
		ctx.fillStyle = '#030509';
		ctx.beginPath();
		ctx.arc(
			playerX + radius * 0.08,
			laneCenter - radius * 0.42,
			Math.max(1, radius * 0.12),
			0,
			TAU
		);
		ctx.fill();
		ctx.restore();
	}

	private clamp(value: number, min: number, max: number): number {
		if (!Number.isFinite(value)) {
			return min;
		}
		return Math.min(max, Math.max(min, value));
	}
}