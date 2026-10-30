import type { GridMatrix } from '../../../config/gridConfig';
import { canvasContext, glowTexture, makeCanvas } from '../../common/textures';
import { GlPass, rgb01 } from '../../common/GlPass';
import type { GridLayout } from '../../maze/GridView';
import { computeDecayField, sampleDecayField } from '../decay/decayField';
import type { DecayField } from '../decay/decayField';
import { SEASON_TURN_FRAGMENT, TURN_BAND } from './seasonTurnShader';
import { seasonTurnFronts } from './seasonTurnTimeline';
import type { DebugFront } from '../../debug/DebugOverlayView';

const TILE_WORLD = 24;

/** Tiles the corridor light runs along: everything walkable outside the lair. */
function isCorridor(t: string): boolean {
	return t !== 'WL' && t !== 'ES' && !['LT', 'LE', 'BY', 'PY', 'IY', 'CE', 'DB'].includes(t);
}

/** RG: the distance field as 16 bits of its maximum; B: corridor mask. */
function packTurnField(field: DecayField, grid: GridMatrix): Uint8Array {
	const data = new Uint8Array(field.cols * field.rows * 4);
	for (let r = 0; r < field.rows; r++) {
		for (let c = 0; c < field.cols; c++) {
			const i = r * field.cols + c;
			const x = Math.min(254.999, (field.dist[i] / field.max) * 255);
			const hi = Math.floor(x);
			data[i * 4] = hi;
			data[i * 4 + 1] = Math.floor((x - hi) * 255);
			const t = grid[r - field.margin]?.[c - field.margin];
			data[i * 4 + 2] = t && isCorridor(t) ? 255 : 0;
			data[i * 4 + 3] = 255;
		}
	}
	return data;
}
const MAX_PASS_RATIO = 1.5;

const UNIFORMS = [
	'uOld',
	'uNew',
	'uDist',
	'uSizePx',
	'uScenePx',
	'uWorld',
	'uDistSize',
	'uMargin',
	'uDMax',
	'uGlow',
	'uFront',
	'uTime',
	'uEpic',
	'uLight',
	'uGap'
] as const;

type Uniform = (typeof UNIFORMS)[number];

export interface SeasonTurnRequest {
	readonly grid: GridMatrix;
	/** Last dot, tile-centre coordinates. */
	readonly x: number;
	readonly y: number;
	/** Seconds since the level was cleared. */
	readonly elapsed: number;
	/** Corridor light and edge glints, light through the seams (0xRRGGBB). */
	readonly light: number;
	readonly gap: number;
	/** Particles of the incoming season thrown up at the front. */
	readonly particle: (i: number) => HTMLCanvasElement;
}

interface Bit {
	im: HTMLCanvasElement;
	x: number;
	y: number;
	vx: number;
	vy: number;
	rot: number;
	spin: number;
	life: number;
	max: number;
	s: number;
	glow: boolean;
}

/**
 * A cleared level turning into the next season: light runs down the corridors from the
 * last dot, then a mosaic of cards turns over from the old world to the new one. Per frame:
 * draw the cleared world into `old()`, the next season into `next()`, then `compose()`.
 * Without WebGL2 it cross-fades.
 */
export class SeasonTurn {
	private debugFrontValue: DebugFront | null = null;

	/** The turning front now (dev overlay). */
	get debugFront(): DebugFront | null {
		return this.debugFrontValue;
	}

	private pass: GlPass<Uniform> | null | undefined;
	private readonly scenes: Array<{ cv: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null> =
		[null, null];
	private field: DecayField | null = null;
	private fieldKey = '';
	private uploadedKey = '';
	private viewKey = '';
	private end = 1;
	private glowEnd = 1;
	private readonly bits: Bit[] = [];
	private lastElapsed = 0;
	private emitted = 0;

	old(pixelWidth: number, pixelHeight: number): CanvasRenderingContext2D {
		return this.scene(0, pixelWidth, pixelHeight);
	}

	next(pixelWidth: number, pixelHeight: number): CanvasRenderingContext2D {
		return this.scene(1, pixelWidth, pixelHeight);
	}

	compose(
		ctx: CanvasRenderingContext2D,
		width: number,
		height: number,
		pixelRatio: number,
		layout: GridLayout,
		time: number,
		request: SeasonTurnRequest
	): void {
		const [oldScene, newScene] = this.scenes;
		if (!oldScene || !newScene) {
			return;
		}
		this.prepareField(request);
		this.fit(width, height, layout);
		const fronts = seasonTurnFronts(request.elapsed, this.end, this.glowEnd);
		this.debugFrontValue = this.field ? { field: this.field, front: fronts.front } : null;
		if (this.pass === undefined) {
			this.pass = GlPass.create('SeasonTurn', SEASON_TURN_FRAGMENT, UNIFORMS);
			if (this.pass) {
				this.pass.addTexture(0, 'uOld', 'linear');
				this.pass.addTexture(1, 'uNew', 'linear');
				this.pass.addTexture(2, 'uDist', 'nearest');
			}
		}
		ctx.save();
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';
		const pass = this.pass;
		const field = this.field;
		if (pass && field) {
			if (this.uploadedKey !== this.fieldKey) {
				pass.uploadBytes(2, packTurnField(field, request.grid), field.cols, field.rows);
				this.uploadedKey = this.fieldKey;
			}
			pass.uploadCanvas(0, oldScene.cv);
			pass.uploadCanvas(1, newScene.cv);
			const gl = pass.gl;
			const ratio = Math.min(pixelRatio, MAX_PASS_RATIO);
			const pw = Math.round(width * ratio);
			const ph = Math.round(height * ratio);
			gl.uniform2f(pass.uniform('uSizePx'), pw, ph);
			gl.uniform2f(pass.uniform('uScenePx'), width, height);
			gl.uniform4f(
				pass.uniform('uWorld'),
				layout.offsetX,
				layout.offsetY,
				layout.tileSize / TILE_WORLD,
				TILE_WORLD
			);
			gl.uniform2f(pass.uniform('uDistSize'), field.cols, field.rows);
			gl.uniform1f(pass.uniform('uMargin'), field.margin);
			gl.uniform1f(pass.uniform('uDMax'), field.max);
			gl.uniform1f(pass.uniform('uGlow'), fronts.glow);
			gl.uniform1f(pass.uniform('uFront'), fronts.front);
			gl.uniform1f(pass.uniform('uTime'), time);
			gl.uniform2f(pass.uniform('uEpic'), request.x, request.y);
			gl.uniform3f(pass.uniform('uLight'), ...rgb01(request.light));
			gl.uniform3f(pass.uniform('uGap'), ...rgb01(request.gap));
			pass.draw(pw, ph);
			ctx.drawImage(pass.canvas, 0, 0, width, height);
		} else {
			ctx.drawImage(oldScene.cv, 0, 0, width, height);
			ctx.globalAlpha = fronts.progress;
			ctx.drawImage(newScene.cv, 0, 0, width, height);
		}
		this.drawBits(ctx, width, height, layout, request, fronts.front);
		ctx.restore();
	}

	private scene(i: number, w: number, h: number): CanvasRenderingContext2D {
		let s = this.scenes[i];
		if (!s) {
			const cv = makeCanvas(w, h);
			s = { cv, ctx: canvasContext(cv) };
			this.scenes[i] = s;
		}
		if (s.cv.width !== w || s.cv.height !== h) {
			s.cv.width = w;
			s.cv.height = h;
		}
		return s.ctx;
	}

	private prepareField(request: SeasonTurnRequest): void {
		const x = Math.floor(request.x);
		const y = Math.floor(request.y);
		const key = `${x},${y}`;
		if (key !== this.fieldKey || !this.field) {
			const field = computeDecayField(request.grid, x, y);
			this.field = field;
			this.fieldKey = key;
			this.viewKey = '';
			// the light runs along the corridors only, so it ends at the farthest corridor
			let far = 0;
			request.grid.forEach((row, r) =>
				row.forEach((t, c) => {
					if (isCorridor(t)) {
						far = Math.max(far, field.dist[(r + field.margin) * field.cols + c + field.margin]);
					}
				})
			);
			this.glowEnd = far + 1;
		}
	}

	/** Largest distance on screen, so the fronts sweep the whole view. */
	private fit(width: number, height: number, layout: GridLayout): void {
		const key = `${this.fieldKey}|${width}x${height}|${layout.tileSize},${layout.offsetX},${layout.offsetY}`;
		const field = this.field;
		if (key === this.viewKey || !field || !(layout.tileSize > 0)) {
			return;
		}
		const x0 = -layout.offsetX / layout.tileSize;
		const y0 = -layout.offsetY / layout.tileSize;
		const x1 = (width - layout.offsetX) / layout.tileSize;
		const y1 = (height - layout.offsetY) / layout.tileSize;
		let m = 0;
		for (let y = y0; y <= y1 + 0.5; y += 0.5) {
			for (let x = x0; x <= x1 + 0.5; x += 0.5) {
				m = Math.max(m, sampleDecayField(field, x, y));
			}
		}
		this.end = m + 2;
		this.viewKey = key;
	}

	/** Leaves, snowflakes or petals of the new season, thrown up where cards turn. */
	private drawBits(
		ctx: CanvasRenderingContext2D,
		width: number,
		height: number,
		layout: GridLayout,
		request: SeasonTurnRequest,
		front: number
	): void {
		const field = this.field;
		if (!field) {
			return;
		}
		if (request.elapsed < this.lastElapsed) {
			this.bits.length = 0;
		}
		const dt = Math.min(0.1, Math.max(0, request.elapsed - this.lastElapsed));
		this.lastElapsed = request.elapsed;
		const ts = layout.tileSize;
		if (front > -50 && dt > 0) {
			const tries = Math.round(700 * dt);
			for (let i = 0; i < tries && this.bits.length < 500; i++) {
				const tx = -layout.offsetX / ts + (Math.random() * width) / ts;
				const ty = -layout.offsetY / ts + (Math.random() * height) / ts;
				const d = front - sampleDecayField(field, tx, ty);
				if (d < 0.2 || d > TURN_BAND * 0.7) {
					continue;
				}
				let ax = tx - request.x;
				let ay = ty - request.y;
				const l = Math.hypot(ax, ay) || 1;
				ax /= l;
				ay /= l;
				const glow = Math.random() < 0.35;
				const sp = 0.4 + Math.random() * 1.2;
				this.bits.push({
					im: glow ? glowTexture(request.light) : request.particle(this.emitted++),
					x: tx,
					y: ty,
					vx: ax * sp + (Math.random() - 0.5) * 0.8,
					vy: ay * sp + (Math.random() - 0.5) * 0.8 - 0.5,
					rot: Math.random() * 6,
					spin: (Math.random() - 0.5) * 6,
					life: 0,
					max: 0.9 + Math.random() * 0.9,
					s: glow ? 0.12 + Math.random() * 0.2 : 0.28 + Math.random() * 0.18,
					glow
				});
			}
		}
		for (let i = this.bits.length - 1; i >= 0; i--) {
			const p = this.bits[i];
			p.life += dt;
			if (p.life >= p.max) {
				this.bits.splice(i, 1);
				continue;
			}
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			p.vx *= 0.98;
			p.vy *= 0.98;
			p.rot += p.spin * dt;
			const u = p.life / p.max;
			const size = p.s * ts * (p.glow ? 1 - u * 0.5 : 1);
			const h = p.glow ? size : size * (p.im.height / p.im.width);
			ctx.globalCompositeOperation = p.glow ? 'lighter' : 'source-over';
			ctx.globalAlpha = Math.min(1, (1 - u) * 1.4) * (p.glow ? 0.9 : 1);
			ctx.save();
			ctx.translate(layout.offsetX + p.x * ts, layout.offsetY + p.y * ts);
			ctx.rotate(p.glow ? 0 : p.rot);
			ctx.drawImage(p.im, -size / 2, -h / 2, size, h);
			ctx.restore();
		}
		ctx.globalCompositeOperation = 'source-over';
		ctx.globalAlpha = 1;
	}
}
