import type { GridMatrix } from '../../../config/gridConfig';
import { canvasContext, glowTexture, makeCanvas } from '../../common/textures';
import type { GridLayout } from '../../maze/GridView';
import { DecayPass } from './DecayPass';
import type { DecayPalette } from './DecayPass';
import { computeDecayField, packDecayFields, sampleDecayField } from './decayField';
import type { DecayField } from './decayField';
import { decayFronts, DECAY_BAND } from './decayTimeline';
import type { DebugFront } from '../../debug/DebugOverlayView';

/** World units per tile inside the shader (shard cells are half a tile). */
const TILE_WORLD = 24;
/** The pass runs at most at this pixel ratio; it is upscaled on composite. */
const MAX_PASS_RATIO = 1.5;
const SHAKE_TIME = 0.45;
const SHAKE_PX = 3;
const FLASH_TIME = 0.3;

export const ICE_PALETTE: DecayPalette = {
	deep: 0x050a17,
	mid: 0x142b4a,
	wisp: 0x409ed1,
	ice: 0xcceaff,
	rim: 0x73bfff,
	warm: 0xfff2d9
};

export const EMBER_PALETTE: DecayPalette = {
	deep: 0x120303,
	mid: 0x3a0c07,
	wisp: 0xff5a1e,
	ice: 0xffc08a,
	rim: 0xff6a2a,
	warm: 0xffe2b0
};

export interface DecayRequest {
	readonly grid: GridMatrix;
	/** Death point, tile-centre coordinates (tile (c, r) is centred at (c + .5, r + .5)). */
	readonly deathX: number;
	readonly deathY: number;
	/** Respawn tile (grid indices): the level reassembles from here. */
	readonly spawnX: number;
	readonly spawnY: number;
	/** Seconds since the death state started. */
	readonly elapsed: number;
	readonly palette: DecayPalette;
}

interface Dust {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	max: number;
	s: number;
}

/**
 * The level falling apart around the death point, then reassembling from the respawn
 * point. Usage per frame while dying: draw the world into `begin()`'s context, then
 * `compose()` onto the screen. Without WebGL2 a dark veil stands in for the shader.
 */
export class LevelDecay {
	private debugFrontValue: DebugFront | null = null;

	/** The front being drawn now (dev overlay): the shatter, or the rebuild once it runs. */
	get debugFront(): DebugFront | null {
		return this.debugFrontValue;
	}

	private pass: DecayPass | null | undefined;
	private scene: HTMLCanvasElement | null = null;
	private sceneCtx: CanvasRenderingContext2D | null = null;
	private fieldKey = '';
	private death: DecayField | null = null;
	private respawn: DecayField | null = null;
	private viewKey = '';
	private frontEnd = 1;
	private rebuildEnd = 1;
	private readonly dust: Dust[] = [];
	private lastElapsed = 0;

	/** Camera shake for the first moments of the death, css px. */
	shake(elapsed: number): { x: number; y: number } {
		if (!(elapsed >= 0) || elapsed >= SHAKE_TIME) {
			return { x: 0, y: 0 };
		}
		const a = SHAKE_PX * (1 - elapsed / SHAKE_TIME);
		return { x: (Math.random() - 0.5) * a, y: (Math.random() - 0.5) * a };
	}

	/** Offscreen context the level is rendered into this frame (same size as the screen). */
	begin(pixelWidth: number, pixelHeight: number): CanvasRenderingContext2D {
		if (!this.scene || !this.sceneCtx) {
			this.scene = makeCanvas(pixelWidth, pixelHeight);
			this.sceneCtx = canvasContext(this.scene);
		}
		if (this.scene.width !== pixelWidth || this.scene.height !== pixelHeight) {
			this.scene.width = pixelWidth;
			this.scene.height = pixelHeight;
		}
		return this.sceneCtx;
	}

	/**
	 * Draws the decayed level onto `ctx` (css px transform), then ice dust and the death
	 * flash. `layout` is where the board was drawn, `shake` the offset it was drawn with.
	 */
	compose(
		ctx: CanvasRenderingContext2D,
		width: number,
		height: number,
		pixelRatio: number,
		layout: GridLayout,
		shake: { x: number; y: number },
		time: number,
		request: DecayRequest
	): void {
		const scene = this.scene;
		if (!scene) {
			return;
		}
		this.prepareFields(request);
		this.fitFronts(width, height, layout);
		const death = this.death;
		if (!death) {
			return;
		}
		const fronts = decayFronts(request.elapsed, this.frontEnd, this.rebuildEnd);
		this.debugFrontValue =
			fronts.rebuild > -50 && this.respawn
				? { field: this.respawn, front: fronts.rebuild }
				: this.death
					? { field: this.death, front: fronts.front }
					: null;
		if (this.pass === undefined) {
			this.pass = DecayPass.create();
			if (this.pass) {
				this.uploadFields();
			}
		}
		ctx.save();
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';
		if (this.pass) {
			const ratio = Math.min(pixelRatio, MAX_PASS_RATIO);
			this.pass.render(scene, Math.round(width * ratio), Math.round(height * ratio), {
				width,
				height,
				originX: layout.offsetX + shake.x,
				originY: layout.offsetY + shake.y,
				worldScale: layout.tileSize / TILE_WORLD,
				tileWorld: TILE_WORLD,
				front: fronts.front,
				rebuild: fronts.rebuild,
				shock: fronts.shock,
				time,
				epicX: request.deathX,
				epicY: request.deathY,
				palette: request.palette
			});
			ctx.drawImage(this.pass.canvas, 0, 0, width, height);
		} else {
			ctx.drawImage(scene, 0, 0, width, height);
			ctx.globalAlpha = 0.9 * fronts.cover;
			ctx.fillStyle = '#050a17';
			ctx.fillRect(0, 0, width, height);
		}
		this.drawDust(ctx, width, height, layout, shake, request, fronts.front, fronts.rebuild);
		if (request.elapsed < FLASH_TIME) {
			ctx.globalCompositeOperation = 'lighter';
			ctx.globalAlpha = 0.35 * (1 - request.elapsed / FLASH_TIME);
			ctx.fillStyle = '#bfe6ff';
			ctx.fillRect(0, 0, width, height);
		}
		ctx.restore();
	}

	private prepareFields(request: DecayRequest): void {
		const dx = Math.floor(request.deathX);
		const dy = Math.floor(request.deathY);
		const key = `${dx},${dy}:${request.spawnX},${request.spawnY}`;
		if (key === this.fieldKey && this.death && this.respawn && this.death.cols > 0) {
			return;
		}
		this.death = computeDecayField(request.grid, dx, dy);
		this.respawn = computeDecayField(request.grid, request.spawnX, request.spawnY);
		this.fieldKey = key;
		this.viewKey = '';
		this.dust.length = 0;
		if (this.pass) {
			this.uploadFields();
		}
	}

	private uploadFields(): void {
		const { death, respawn, pass } = this;
		if (!death || !respawn || !pass) {
			return;
		}
		pass.setFields(
			packDecayFields(death, respawn),
			death.cols,
			death.rows,
			death.margin,
			death.max,
			respawn.max
		);
	}

	/** Largest distances on screen: each front must sweep the whole view in its phase. */
	private fitFronts(width: number, height: number, layout: GridLayout): void {
		const key = `${this.fieldKey}|${width}x${height}|${layout.tileSize},${layout.offsetX},${layout.offsetY}`;
		const { death, respawn } = this;
		if (key === this.viewKey || !death || !respawn || !(layout.tileSize > 0)) {
			return;
		}
		const x0 = -layout.offsetX / layout.tileSize;
		const y0 = -layout.offsetY / layout.tileSize;
		const x1 = (width - layout.offsetX) / layout.tileSize;
		const y1 = (height - layout.offsetY) / layout.tileSize;
		let a = 0;
		let b = 0;
		for (let y = y0; y <= y1 + 0.5; y += 0.5) {
			for (let x = x0; x <= x1 + 0.5; x += 0.5) {
				a = Math.max(a, sampleDecayField(death, x, y));
				b = Math.max(b, sampleDecayField(respawn, x, y));
			}
		}
		this.frontEnd = a + 2;
		this.rebuildEnd = b + 2;
		this.viewKey = key;
	}

	/** Ice dust thrown up where the front is tearing the level apart. */
	private drawDust(
		ctx: CanvasRenderingContext2D,
		width: number,
		height: number,
		layout: GridLayout,
		shake: { x: number; y: number },
		request: DecayRequest,
		front: number,
		rebuild: number
	): void {
		const death = this.death;
		if (!death) {
			return;
		}
		if (request.elapsed < this.lastElapsed) {
			// a new death: the old dust belongs to the previous one
			this.dust.length = 0;
		}
		// zero while paused, so the dust freezes with the rest of the frame
		const dt = Math.min(0.1, Math.max(0, request.elapsed - this.lastElapsed));
		this.lastElapsed = request.elapsed;
		const ts = layout.tileSize;
		if (front > -50 && rebuild < -50 && dt > 0) {
			const w = width / ts;
			const h = height / ts;
			const x0 = -layout.offsetX / ts;
			const y0 = -layout.offsetY / ts;
			const tries = Math.round(900 * dt);
			for (let i = 0; i < tries && this.dust.length < 700; i++) {
				const tx = x0 + Math.random() * w;
				const ty = y0 + Math.random() * h;
				const a = Math.min(1, Math.max(0, (front - sampleDecayField(death, tx, ty)) / DECAY_BAND));
				if (a < 0.25 || a > 0.6) {
					continue;
				}
				let ax = tx - request.deathX;
				let ay = ty - request.deathY;
				const l = Math.hypot(ax, ay) || 1;
				ax /= l;
				ay /= l;
				const sp = 0.6 + Math.random() * 1.6;
				this.dust.push({
					x: tx,
					y: ty,
					vx: ax * sp + (Math.random() - 0.5) * 1.2,
					vy: ay * sp + (Math.random() - 0.5) * 1.2 - 0.6,
					life: 0,
					max: 0.8 + Math.random() * 0.9,
					s: (2 + Math.random() * 4) / TILE_WORLD
				});
			}
		}
		if (rebuild > -50) {
			this.dust.length = 0;
			return;
		}
		const glow = glowTexture(request.palette.ice);
		ctx.globalCompositeOperation = 'lighter';
		for (let i = this.dust.length - 1; i >= 0; i--) {
			const p = this.dust[i];
			p.life += dt;
			if (p.life >= p.max) {
				this.dust.splice(i, 1);
				continue;
			}
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			p.vx *= 0.985;
			p.vy *= 0.985;
			const u = p.life / p.max;
			const size = p.s * ts * (1 - u * 0.5);
			ctx.globalAlpha = (1 - u) * 0.9;
			ctx.drawImage(
				glow,
				layout.offsetX + shake.x + p.x * ts - size / 2,
				layout.offsetY + shake.y + p.y * ts - size / 2,
				size,
				size
			);
		}
	}
}
