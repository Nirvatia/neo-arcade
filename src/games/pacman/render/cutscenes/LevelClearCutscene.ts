import type { Cutscene, CutsceneFrame } from './Cutscene';

const LANE_HEIGHT_TILES = 1.7;
const LANE_MARGIN_TILES = 1.1;
const DOT_RADIUS_RATIO = 0.09;
const PLAYER_RADIUS_RATIO = 0.34;
const INTRO_SHARE = 0.12;
const MAX_DOTS = 14;
const TAU = Math.PI * 2;
const EPSILON = 1e-6;

export class LevelClearCutscene implements Cutscene {
	draw(ctx: CanvasRenderingContext2D, frame: CutsceneFrame): void {
		if (!ctx) {
			console.error('LevelClearCutscene.draw', 'missing context');
			return;
		}
		if (!frame) {
			console.error('LevelClearCutscene.draw', 'missing frame');
			return;
		}
		if (
			!Number.isFinite(frame.width) ||
			frame.width <= 0 ||
			!Number.isFinite(frame.height) ||
			frame.height <= 0
		) {
			console.error('LevelClearCutscene.draw', 'invalid frame size', {
				width: frame.width,
				height: frame.height
			});
			return;
		}
		if (!Number.isFinite(frame.tileSize) || frame.tileSize <= 0) {
			console.error('LevelClearCutscene.draw', 'invalid tile size', frame.tileSize);
			return;
		}
		if (
			!Number.isFinite(frame.progress) ||
			frame.progress < 0 ||
			frame.progress > 1
		) {
			console.error('LevelClearCutscene.draw', 'invalid progress', frame.progress);
			return;
		}
		if (frame.profile !== 'pacman' && frame.profile !== 'ms-pacman') {
			console.error('LevelClearCutscene.draw', 'invalid profile', frame.profile);
			return;
		}
		if (typeof frame.background !== 'string' || frame.background.length === 0) {
			console.error('LevelClearCutscene.draw', 'invalid background', frame.background);
			return;
		}
		const ts = frame.tileSize;
		const margin = Math.min(ts * LANE_MARGIN_TILES, frame.width * 0.2);
		const laneWidth = frame.width - margin * 2;
		const laneHeight = Math.min(ts * LANE_HEIGHT_TILES, frame.height * 0.3);
		if (!(laneWidth > 0) || !(laneHeight > 0)) {
			return;
		}
		const laneLeft = margin;
		const laneTop = frame.height / 2 - laneHeight / 2;
		const laneCenter = laneTop + laneHeight / 2;
		const accent = frame.profile === 'ms-pacman' ? '#ff8fd3' : '#ffe24b';
		const intro = this.clamp(frame.progress / INTRO_SHARE, 0, 1);
		if (intro <= 0) {
			return;
		}
		ctx.save();
		ctx.fillStyle = frame.background;
		ctx.fillRect(0, 0, frame.width, frame.height);
		const edge = Math.max(1, Math.floor(ts * 0.06));
		ctx.globalAlpha = intro * 0.25;
		ctx.fillStyle = accent;
		ctx.fillRect(laneLeft, laneTop, laneWidth, edge);
		ctx.fillRect(laneLeft, laneTop + laneHeight - edge, laneWidth, edge);
		const radius = Math.max(
			1,
			Math.min(ts * PLAYER_RADIUS_RATIO, laneHeight * 0.32)
		);
		const runStart = laneLeft + radius;
		const span = Math.max(0, laneWidth - radius * 2);
		const travel = this.clamp(
			(frame.progress - INTRO_SHARE) / Math.max(EPSILON, 1 - INTRO_SHARE),
			0,
			1
		);
		const playerX = runStart + span * travel;
		const dotCount = Math.max(
			3,
			Math.min(MAX_DOTS, Math.floor(laneWidth / (ts * 1.4)))
		);
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
		const mouthWave = 0.5 + 0.5 * Math.sin(frame.progress * Math.PI * 10);
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