import type { GridMatrix } from '../../config/gridConfig';
import type { GhostKind } from '../../logic/actors/GhostModel';
import type { FruitKind } from '../../logic/bonuses/fruitCatalog';
import { makeCanvas, canvasContext } from '../common/textures';
import { ArcadeMaze } from './ArcadeMaze';
import type { ArcadeDir } from './arcadeSprites';
import {
	ARCADE_COLORS,
	ARCADE_TILE,
	GHOST_COLORS,
	fruitSprite,
	ghostBody,
	ghostEyes,
	numberSprite,
	pacDeathFrame,
	pacFrame,
	scaredFace
} from './arcadeSprites';

/** Animation runs at a stepped 30 fps: every sprite frame is held for whole ticks. */
export const ARCADE_FPS = 30;

export type ArcadeGhostLook = 'normal' | 'scared' | 'flash' | 'eyes';

/** One frame of the arcade level, in tile-centre coordinates (x = 12.5 is a tile centre). */
export interface ArcadeScene {
	readonly time: number;
	/** Tiles still holding a dot or an energizer. */
	readonly food: (x: number, y: number) => 'dot' | 'energizer' | null;
	readonly pac: {
		readonly x: number;
		readonly y: number;
		readonly dir: ArcadeDir;
		/** Distance travelled in tiles: the mouth chomps with it, not with time. */
		readonly travel: number;
	} | null;
	/** Death 0..1: the mouth opens until Pac-Man folds away, then pixels scatter. */
	readonly death: number | null;
	readonly ghosts: ReadonlyArray<{
		readonly kind: GhostKind;
		readonly x: number;
		readonly y: number;
		readonly dir: ArcadeDir;
		readonly look: ArcadeGhostLook;
	}>;
	readonly fruit: { readonly kind: FruitKind; readonly x: number; readonly y: number } | null;
	readonly popups: ReadonlyArray<{
		readonly x: number;
		readonly y: number;
		readonly value: number;
	}>;
	/** Level clear: the maze blinks white. */
	readonly flash: boolean;
	/** Hide the energizer blink (READY) and the actors' wiggle (paused). */
	readonly frozen: boolean;
}

/**
 * Draws the arcade level at native resolution (`ARCADE_TILE` pixels per tile) into its own
 * small canvas; `ArcadeScreen` puts that canvas on screen through the CRT pass.
 */
export class ArcadeView {
	readonly canvas: HTMLCanvasElement;
	private readonly ctx: CanvasRenderingContext2D;
	private readonly maze: ArcadeMaze;
	readonly grid: GridMatrix;

	constructor(grid: GridMatrix) {
		this.grid = grid;
		this.maze = new ArcadeMaze(grid);
		this.canvas = makeCanvas(this.maze.width, this.maze.height);
		this.ctx = canvasContext(this.canvas);
		this.ctx.imageSmoothingEnabled = false;
	}

	draw(scene: ArcadeScene): void {
		const ctx = this.ctx;
		const T = ARCADE_TILE;
		const tick = Math.max(0, Math.floor(scene.time * ARCADE_FPS));
		ctx.fillStyle = ARCADE_COLORS.void;
		ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
		this.maze.draw(ctx, scene.flash);
		if (scene.flash) {
			return;
		}
		// food: 2-pixel dots, energizers blinking every 8 ticks
		const blink = scene.frozen || Math.floor(tick / 8) % 2 === 0;
		this.grid.forEach((row, ty) =>
			row.forEach((_, tx) => {
				const food = scene.food(tx, ty);
				if (food === 'dot') {
					ctx.fillStyle = ARCADE_COLORS.dot;
					ctx.fillRect(tx * T + 4, ty * T + 4, 2, 2);
				} else if (food === 'energizer' && blink) {
					ctx.fillStyle = ARCADE_COLORS.energizer;
					ctx.fillRect(tx * T + 2, ty * T + 3, 6, 4);
					ctx.fillRect(tx * T + 3, ty * T + 2, 4, 6);
				}
			})
		);
		if (scene.fruit) {
			const s = fruitSprite(scene.fruit.kind);
			this.blit(s, scene.fruit.x, scene.fruit.y);
		}
		const wiggle = scene.frozen ? 0 : Math.floor(tick / 6) % 2;
		for (const ghost of scene.ghosts) {
			this.drawGhost(ghost, wiggle, tick);
		}
		if (scene.death !== null) {
			this.drawDeath(scene, tick);
		} else if (scene.pac) {
			const p = scene.pac;
			// three frames, closed → half → open → half, stepped by distance
			const step = Math.floor(p.travel * 4) % 4;
			const frame = step === 3 ? 1 : step;
			this.blit(pacFrame(p.dir, frame), p.x, p.y);
		}
		for (const pop of scene.popups) {
			this.blit(numberSprite(`${pop.value}|${ARCADE_COLORS.popup}`), pop.x, pop.y);
		}
	}

	private drawGhost(ghost: ArcadeScene['ghosts'][number], wiggle: number, tick: number): void {
		const x = this.px(ghost.x) - 7;
		const y = this.px(ghost.y) - 7;
		const ctx = this.ctx;
		if (ghost.look !== 'eyes') {
			const flashOn = ghost.look === 'flash' && Math.floor(tick / 7) % 2 === 0;
			const color =
				ghost.look === 'normal'
					? GHOST_COLORS[ghost.kind]
					: flashOn
						? ARCADE_COLORS.flash
						: ARCADE_COLORS.scared;
			ctx.drawImage(ghostBody(`${color}|${wiggle}`), x, y);
			if (ghost.look !== 'normal') {
				ctx.drawImage(
					scaredFace(flashOn ? ARCADE_COLORS.flashFace : ARCADE_COLORS.scaredFace),
					x,
					y
				);
				return;
			}
		}
		ctx.drawImage(ghostEyes(ghost.dir), x, y);
	}

	/** Death: the mouth opens to nothing over 70 %, then eight pixels fly out and fade. */
	private drawDeath(scene: ArcadeScene, tick: number): void {
		const pac = scene.pac;
		const death = scene.death ?? 0;
		if (!pac) {
			return;
		}
		const ctx = this.ctx;
		if (death < 0.7) {
			const half = (death / 0.7) * Math.PI;
			this.blit(pacDeathFrame(half), pac.x, pac.y);
			return;
		}
		const u = (death - 0.7) / 0.3;
		const cx = this.px(pac.x);
		const cy = this.px(pac.y);
		const r = Math.round(2 + u * 9);
		ctx.fillStyle = tick % 2 === 0 ? ARCADE_COLORS.pac : ARCADE_COLORS.pacShine;
		for (let i = 0; i < 8; i += 1) {
			const a = (i / 8) * Math.PI * 2;
			if (u < 0.9) {
				ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 2, 2);
			}
		}
	}

	/** Native pixel of a tile-centre coordinate, rounded to a whole pixel. */
	private px(v: number): number {
		return Math.round(v * ARCADE_TILE);
	}

	private blit(sprite: HTMLCanvasElement, x: number, y: number): void {
		this.ctx.drawImage(
			sprite,
			this.px(x) - Math.floor(sprite.width / 2),
			this.px(y) - Math.floor(sprite.height / 2)
		);
	}
}
