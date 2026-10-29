import type { GridLayout } from './GridView';

export type OverlayMode =
	'none' | 'ready' | 'playing' | 'paused' | 'death' | 'level-clear' | 'game-over';

export interface OverlaySnapshot {
	readonly mode: OverlayMode;
	readonly title: string;
	readonly timer: number;
	readonly duration: number;
	readonly level: number;
	readonly lives: number;
	readonly powerLabel: string;
	readonly powerTimer: number;
}

export class OverlayView {
	draw(
		ctx: CanvasRenderingContext2D,
		snapshot: OverlaySnapshot,
		layout: GridLayout,
		boardWidth: number,
		boardHeight: number,
		showTopBar = true
	): void {
		if (!ctx) {
			console.error('OverlayView.draw', 'missing context');
			return;
		}
		if (!snapshot) {
			console.error('OverlayView.draw', 'missing snapshot');
			return;
		}
		if (!layout) {
			console.error('OverlayView.draw', 'missing layout');
			return;
		}
		if (
			!Number.isFinite(layout.tileSize) ||
			layout.tileSize <= 0 ||
			!Number.isFinite(layout.offsetX) ||
			!Number.isFinite(layout.offsetY)
		) {
			console.error('OverlayView.draw', 'invalid layout', layout);
			return;
		}
		if (
			!Number.isFinite(boardWidth) ||
			boardWidth <= 0 ||
			!Number.isFinite(boardHeight) ||
			boardHeight <= 0
		) {
			console.error('OverlayView.draw', 'invalid board size', {
				boardWidth,
				boardHeight
			});
			return;
		}
		if (!this.isValidSnapshot(snapshot)) {
			console.error('OverlayView.draw', 'invalid snapshot', snapshot);
			return;
		}
		if (snapshot.mode === 'none') {
			return;
		}
		ctx.save();
		if (showTopBar) {
			this.drawTopBar(ctx, snapshot, layout, boardWidth);
		}
		this.drawCenter(ctx, snapshot, layout, boardWidth, boardHeight);
		ctx.restore();
	}

	private isValidSnapshot(snapshot: OverlaySnapshot): boolean {
		if (
			snapshot.mode !== 'none' &&
			snapshot.mode !== 'ready' &&
			snapshot.mode !== 'playing' &&
			snapshot.mode !== 'paused' &&
			snapshot.mode !== 'death' &&
			snapshot.mode !== 'level-clear' &&
			snapshot.mode !== 'game-over'
		) {
			return false;
		}
		if (typeof snapshot.title !== 'string') {
			return false;
		}
		if (typeof snapshot.powerLabel !== 'string') {
			return false;
		}
		if (!Number.isFinite(snapshot.timer) || snapshot.timer < 0) {
			return false;
		}
		if (!Number.isFinite(snapshot.duration) || snapshot.duration < 0) {
			return false;
		}
		if (!Number.isFinite(snapshot.level) || snapshot.level < 0) {
			return false;
		}
		if (!Number.isFinite(snapshot.lives) || snapshot.lives < 0) {
			return false;
		}
		if (!Number.isFinite(snapshot.powerTimer) || snapshot.powerTimer < 0) {
			return false;
		}
		return true;
	}

	private drawTopBar(
		ctx: CanvasRenderingContext2D,
		snapshot: OverlaySnapshot,
		layout: GridLayout,
		boardWidth: number
	): void {
		const fontSize = Math.max(10, Math.floor(layout.tileSize * 0.55));
		const pad = Math.max(4, Math.floor(layout.tileSize * 0.25));
		const barHeight = fontSize + pad * 2;
		if (!(barHeight > 0) || !(boardWidth > barHeight)) {
			return;
		}
		ctx.fillStyle = 'rgba(3, 5, 9, 0.45)';
		ctx.fillRect(layout.offsetX, layout.offsetY, boardWidth, barHeight);
		ctx.font = `${fontSize}px monospace`;
		ctx.textBaseline = 'middle';
		const y = layout.offsetY + barHeight / 2;
		const leftText = `LV ${snapshot.level}  LIVES ${snapshot.lives}`;
		ctx.textAlign = 'left';
		ctx.fillStyle = '#e8efff';
		ctx.fillText(leftText, layout.offsetX + pad, y);
		if (snapshot.powerLabel.length > 0) {
			const rightText =
				snapshot.powerTimer > 0
					? `${snapshot.powerLabel} ${snapshot.powerTimer.toFixed(1)}`
					: snapshot.powerLabel;
			ctx.textAlign = 'right';
			ctx.fillStyle = '#56d9ff';
			ctx.fillText(rightText, layout.offsetX + boardWidth - pad, y);
		}
	}

	private drawCenter(
		ctx: CanvasRenderingContext2D,
		snapshot: OverlaySnapshot,
		layout: GridLayout,
		boardWidth: number,
		boardHeight: number
	): void {
		if (snapshot.mode === 'playing' || snapshot.mode === 'none') {
			return;
		}
		if (snapshot.title.length === 0) {
			return;
		}
		const centerX = layout.offsetX + boardWidth / 2;
		const centerY = layout.offsetY + boardHeight / 2;
		const titleSize = Math.max(16, Math.floor(layout.tileSize * 1.1));
		const timerSize = Math.max(12, Math.floor(layout.tileSize * 0.8));
		const titleColor = this.colorFor(snapshot.mode);
		this.drawBackdropText(
			ctx,
			snapshot.title,
			centerX,
			centerY - titleSize * 0.7,
			titleSize,
			titleColor
		);
		const showsTimer =
			snapshot.mode === 'ready' || snapshot.mode === 'death' || snapshot.mode === 'level-clear';
		if (!showsTimer) {
			return;
		}
		this.drawBackdropText(
			ctx,
			snapshot.timer.toFixed(1),
			centerX,
			centerY + timerSize * 0.6,
			timerSize,
			'#e8efff'
		);
		if (snapshot.duration > 0) {
			const barWidth = Math.max(24, Math.min(boardWidth * 0.5, titleSize * 8));
			const barHeight = Math.max(3, Math.floor(timerSize * 0.25));
			this.drawTimerBar(
				ctx,
				centerX,
				centerY + timerSize * 1.8,
				barWidth,
				barHeight,
				snapshot.timer,
				snapshot.duration,
				titleColor
			);
		}
	}

	private drawTimerBar(
		ctx: CanvasRenderingContext2D,
		centerX: number,
		y: number,
		width: number,
		height: number,
		timer: number,
		duration: number,
		color: string
	): void {
		if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
			return;
		}
		if (!Number.isFinite(duration) || duration <= 0) {
			return;
		}
		const progress = this.clamp(1 - timer / duration);
		const left = centerX - width / 2;
		ctx.fillStyle = 'rgba(232, 239, 255, 0.25)';
		ctx.fillRect(left, y, width, height);
		if (progress > 0) {
			ctx.fillStyle = color;
			ctx.fillRect(left, y, width * progress, height);
		}
	}

	private drawBackdropText(
		ctx: CanvasRenderingContext2D,
		text: string,
		x: number,
		y: number,
		fontSize: number,
		color: string
	): void {
		if (typeof text !== 'string' || text.length === 0) {
			return;
		}
		if (!Number.isFinite(fontSize) || fontSize <= 0) {
			return;
		}
		if (!Number.isFinite(x) || !Number.isFinite(y)) {
			return;
		}
		const safeColor = typeof color === 'string' && color.length > 0 ? color : '#e8efff';
		ctx.font = `${Math.floor(fontSize)}px monospace`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		const metrics = ctx.measureText(text);
		const padX = fontSize * 0.45;
		const padY = fontSize * 0.35;
		const boxWidth = metrics.width + padX * 2;
		const boxHeight = fontSize + padY * 2;
		ctx.fillStyle = 'rgba(3, 5, 9, 0.55)';
		ctx.fillRect(x - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight);
		ctx.fillStyle = safeColor;
		ctx.fillText(text, x, y);
	}

	private colorFor(mode: OverlayMode): string {
		if (mode === 'ready') {
			return '#79ff6f';
		}
		if (mode === 'death') {
			return '#ff4d4d';
		}
		if (mode === 'level-clear') {
			return '#ffd93b';
		}
		if (mode === 'paused') {
			return '#56d9ff';
		}
		if (mode === 'game-over') {
			return '#ff4d4d';
		}
		return '#e8efff';
	}

	private clamp(value: number): number {
		if (!Number.isFinite(value)) {
			return 0;
		}
		return Math.min(1, Math.max(0, value));
	}
}
