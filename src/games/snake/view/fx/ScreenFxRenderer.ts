import { Graphics } from 'pixi.js';
import { Palette } from '../Palette.js';

const WAVE_MS = 550;
const FAIL_MS = 400;

export class ScreenFxRenderer {
	private waveAt = -1;
	private failAt = -1;
	private flashAlpha = 0;
	private flashColor = 0xf0f0f2;
	private headFlash = 0;
	private time = 0;

	public triggerWave(): void {
		this.waveAt = this.time;
	}

	public triggerFail(): void {
		this.failAt = this.time;
	}

	public triggerFlash(color: number, alpha: number): void {
		this.flashColor = color;
		this.flashAlpha = Math.max(this.flashAlpha, alpha);
	}

	public triggerHeadFlash(): void {
		this.headFlash = 0;
	}

	public update(deltaMS: number): void {
		this.time = this.time + deltaMS;
		const dtS = deltaMS / 1000;
		this.flashAlpha = Math.max(0, this.flashAlpha - dtS * 2.5);
		this.headFlash = Math.max(0, this.headFlash - dtS * 8);
	}

	public draw(
		g: Graphics,
		width: number,
		height: number,
		headX: number,
		headY: number,
		cellSize: number
	): void {
		if (this.waveAt >= 0) {
			const p = (this.time - this.waveAt) / WAVE_MS;
			if (p > 1) {
				this.waveAt = -1;
			} else {
				const x = p * width;
				g.rect(x - 10, 0, 20, height).fill({
					color: Palette.form,
					alpha: 0.08 * (1 - p)
				});
				g.rect(x - 1, 0, 2, height).fill({
					color: Palette.form,
					alpha: 0.5 * (1 - p)
				});
			}
		}
		if (this.failAt >= 0) {
			const p = (this.time - this.failAt) / FAIL_MS;
			if (p > 1) {
				this.failAt = -1;
			} else {
				const a = 0.55 * (1 - p);
				g.rect(0, 0, width, 3).fill({ color: Palette.warn, alpha: a });
				g.rect(0, height - 3, width, 3).fill({ color: Palette.warn, alpha: a });
			}
		}
		if (this.headFlash > 0) {
			const cs = cellSize;
			g.rect(headX - cs / 2, headY - cs / 2, cs, cs).fill({
				color: 0xffffff,
				alpha: 0.3 * this.headFlash
			});
		}
		if (this.flashAlpha > 0.01) {
			g.rect(0, 0, width, height).fill({
				color: this.flashColor,
				alpha: this.flashAlpha
			});
		}
	}
}
