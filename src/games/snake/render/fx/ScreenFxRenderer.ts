import type { BiomeManager, BiomePalette } from '../../biomes/index.js';
import { rgba } from '../../canvas/canvasColor.js';
import { FxConfig } from '../../config/index.js';

const FAIL_MS = 400;
const TAU = Math.PI * 2;

interface BiomeTransitionState {
	active: boolean;
	progress: number;
}

interface SequencePulseState {
	active: boolean;
	startMS: number;
	x: number;
	y: number;
}

/**
 * Screen FX Renderer.
 *
 * - эффект успешной последовательности — радиальный импульс от головы змейки;
 * - переход между биомами — кольцо, виньетка и вспышка в момент смены.
 */
export class ScreenFxRenderer {
	private readonly biomeManager: BiomeManager;
	private failAt = -1;
	private flashAlpha = 0;
	private flashColor = 0xf0f0f2;
	private time = 0;
	private lastWidth = 0;
	private lastHeight = 0;
	private biomeTransition: BiomeTransitionState = {
		active: false,
		progress: 0
	};
	private sequencePulse: SequencePulseState = {
		active: false,
		startMS: 0,
		x: 0,
		y: 0
	};

	constructor(biomeManager: BiomeManager) {
		this.biomeManager = biomeManager;
	}

	private get palette(): BiomePalette {
		return this.biomeManager.biome.palette;
	}

	// ===== Импульс успешной последовательности =====

	public triggerSequencePulse(x: number, y: number): void {
		this.sequencePulse = {
			active: true,
			startMS: this.time,
			x,
			y
		};
	}

	public triggerFail(): void {
		this.failAt = this.time;
	}

	public triggerFlash(color: number, alpha: number): void {
		this.flashColor = color;
		this.flashAlpha = Math.max(this.flashAlpha, alpha);
	}

	// ===== Переход между биомами =====

	public beginBiomeTransition(): void {
		this.biomeTransition.active = true;
		this.biomeTransition.progress = 0;
	}

	public setBiomeTransitionProgress(progress: number): void {
		this.biomeTransition.progress = Math.max(0, Math.min(1, progress));
	}

	public endBiomeTransition(): void {
		this.biomeTransition.active = false;
		this.biomeTransition.progress = 0;
	}

	public update(deltaMS: number): void {
		this.time = this.time + deltaMS;
		const dtS = deltaMS / 1000;
		this.flashAlpha = Math.max(0, this.flashAlpha - dtS * 2.5);
	}

	public draw(
		ctx: CanvasRenderingContext2D,
		width: number,
		height: number,
		_headX: number,
		_headY: number,
		_cellSize: number
	): void {
		const pal = this.palette;
		this.lastWidth = width;
		this.lastHeight = height;

		// ===== Импульс успешной последовательности =====
		this.drawSequencePulse(ctx);

		// ===== Эффект провала =====
		if (this.failAt >= 0) {
			const p = (this.time - this.failAt) / FAIL_MS;

			if (p > 1) {
				this.failAt = -1;
			} else {
				const a = 0.55 * (1 - p);

				ctx.fillStyle = rgba(pal.warn, a);
				ctx.fillRect(0, 0, width, 3);
				ctx.fillStyle = rgba(pal.warn, a);
				ctx.fillRect(0, height - 3, width, 3);
				ctx.fillStyle = rgba(pal.warn, a * 0.08);
				ctx.fillRect(0, 0, width, height);
				ctx.fillStyle = rgba(pal.warn, a * 0.5);
				ctx.fillRect(0, 0, 2, height);
				ctx.fillRect(width - 2, 0, 2, height);
			}
		}

		// ===== Общая вспышка экрана =====
		if (this.flashAlpha > 0.01) {
			ctx.fillStyle = rgba(this.flashColor, this.flashAlpha);
			ctx.fillRect(0, 0, width, height);
		}

		// ===== Переход между биомами (поверх остальных эффектов) =====
		if (this.biomeTransition.active) {
			this.drawBiomeTransition(ctx, width, height);
		}
	}

	/**
	 * Радиальный импульс успешной последовательности.
	 * Расширяющиеся кольца + яркая вспышка в точке головы.
	 */
	private drawSequencePulse(ctx: CanvasRenderingContext2D): void {
		const pulse = this.sequencePulse;

		if (!pulse.active) {
			return;
		}

		const elapsed = this.time - pulse.startMS;
		const duration = FxConfig.SEQUENCE_PULSE_MS;

		if (elapsed > duration) {
			pulse.active = false;
			return;
		}

		const p = elapsed / duration;
		const pal = this.palette;
		const easeOut = 1 - Math.pow(1 - p, 3);
		const fieldMax = Math.max(this.lastWidth, this.lastHeight);

		// Расширяющиеся кольца от головы.
		const ringCount = FxConfig.SEQUENCE_RING_COUNT;

		for (let i = 0; i < ringCount; i++) {
			const ringDelay = i * 0.12;
			const ringP = (p - ringDelay) / (1 - ringDelay);

			if (ringP < 0 || ringP > 1) {
				continue;
			}

			const ringEase = 1 - Math.pow(1 - ringP, 3);
			const radius = ringEase * fieldMax * 0.7;
			const alpha = (1 - ringP) * 0.4;

			ctx.strokeStyle = rgba(pal.accent, alpha);
			ctx.lineWidth = Math.max(0.5, 3 - i * 0.7);
			ctx.beginPath();
			ctx.arc(pulse.x, pulse.y, radius, 0, TAU);
			ctx.stroke();
		}

		// Яркая центральная вспышка на голове.
		const flashP = Math.max(0, 1 - p * 2.5);

		if (flashP > 0) {
			const flashRadius = 18 + easeOut * 46;
			const grad = ctx.createRadialGradient(
				pulse.x,
				pulse.y,
				0,
				pulse.x,
				pulse.y,
				flashRadius
			);

			grad.addColorStop(0, rgba(pal.form, flashP * 0.9));
			grad.addColorStop(0.5, rgba(pal.accent, flashP * 0.4));
			grad.addColorStop(1, rgba(pal.accent, 0));

			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.arc(pulse.x, pulse.y, flashRadius, 0, TAU);
			ctx.fill();
		}
	}

	/**
	 * Переход между биомами.
	 * Кольцо, радиальное затемнение краёв и вспышка в момент смены.
	 */
	private drawBiomeTransition(
		ctx: CanvasRenderingContext2D,
		width: number,
		height: number
	): void {
		const progress = this.biomeTransition.progress;
		const peak = FxConfig.BIOME_TRANSITION_PEAK;
		const cx = width / 2;
		const cy = height / 2;
		const maxRadius = Math.hypot(width, height) / 2;
		const pal = this.palette;

		let radius = 0;
		let vignetteAlpha = 0;
		let flashAlpha = 0;

		if (progress <= peak) {
			const t = progress / peak;
			radius = maxRadius * (1 - t);
			vignetteAlpha = t * 0.6;
		} else {
			const t = (progress - peak) / (1 - peak);
			radius = maxRadius * t;
			vignetteAlpha = (1 - t) * 0.6;
			flashAlpha = Math.max(0, 1 - t * 2.2);
		}

		// Вспышка в момент смены биома.
		if (flashAlpha > 0) {
			ctx.fillStyle = rgba(pal.form, flashAlpha * 0.9);
			ctx.fillRect(0, 0, width, height);
		}

		// Затемнение к краям.
		if (vignetteAlpha > 0) {
			const gradient = ctx.createRadialGradient(
				cx,
				cy,
				maxRadius * 0.25,
				cx,
				cy,
				maxRadius
			);

			gradient.addColorStop(0, rgba(0x000000, 0));
			gradient.addColorStop(1, rgba(0x000000, vignetteAlpha));

			ctx.fillStyle = gradient;
			ctx.fillRect(0, 0, width, height);
		}

		// Кольцо перехода.
		if (radius > 0) {
			ctx.lineCap = 'round';
			ctx.strokeStyle = rgba(pal.accent, 0.16);
			ctx.lineWidth = Math.max(10, maxRadius * 0.06);
			ctx.beginPath();
			ctx.arc(cx, cy, radius, 0, TAU);
			ctx.stroke();

			ctx.strokeStyle = rgba(pal.accent, 0.55);
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.arc(cx, cy, radius, 0, TAU);
			ctx.stroke();

			ctx.strokeStyle = rgba(pal.form, 0.9);
			ctx.lineWidth = 1.4;
			ctx.beginPath();
			ctx.arc(cx, cy, radius, 0, TAU);
			ctx.stroke();
		}
	}
}