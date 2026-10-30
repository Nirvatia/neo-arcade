import type { GridMatrix } from '../../config/gridConfig';
import { SCORE_TABLE } from '../../config/scoreConfig';
import type { GhostKind } from '../../logic/actors/GhostModel';
import type { LevelRenderer, RenderFrame } from '../RenderFrame';
import type { GridLayout } from '../maze/GridView';
import { ArcadeView } from './ArcadeView';
import type { ArcadeGhostLook, ArcadeScene } from './ArcadeView';
import { ArcadeScreen } from './ArcadeScreen';
import { drawIntermission } from './ArcadeIntermission';
import type { ArcadeDir } from './arcadeSprites';
import { ARCADE_TILE } from './arcadeSprites';

/** Room kept free for the arcade HUD rows above and below the board (CSS px). */
const HUD_TOP = 56;
const HUD_BOTTOM = 44;
const POPUP_LIFE = 1;
/** Scared ghosts flash for this long before they turn back. */
const FLASH_FROM = 2;

interface Popup {
	x: number;
	y: number;
	value: number;
	life: number;
}

/**
 * The secret level's arcade: the board at native resolution (`ArcadeView`), shown through
 * the CRT pass (`ArcadeScreen`). Death, the maze flash and the intermission are drawn here
 * from the flow phases; the pipeline's level decay and season turn stay out of it.
 */
export class ArcadeLevelRenderer implements LevelRenderer {
	private readonly screen = new ArcadeScreen();
	private view: ArcadeView | null = null;
	private viewGrid: GridMatrix | null = null;
	private intermission: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null;
	private travel = 0;
	private lastPos: { x: number; y: number } | null = null;
	private lastDir: ArcadeDir = 'LEFT';
	private popups: Popup[] = [];
	private eyes = new Set<GhostKind>();
	private chain = 0;
	private lastFruit: { kind: string; x: number; y: number } | null = null;

	render(frame: RenderFrame): GridLayout {
		const { ctx, width, height, level, flow, progress, grid } = frame;
		const view = this.viewFor(frame.season.grid);
		const layout = this.layout(view, width, height);
		const dt = frame.paused ? 0 : frame.dt;

		ctx.fillStyle = '#000';
		ctx.fillRect(0, 0, width, height);

		let source: HTMLCanvasElement = view.canvas;
		if (flow.state === 'level-clear' && flow.phase === 'intermission') {
			const scene = this.intermissionCanvas(view);
			drawIntermission(
				scene.ctx,
				scene.canvas.width,
				scene.canvas.height,
				flow.phaseProgress * flow.phaseDuration
			);
			source = scene.canvas;
		} else {
			const player = level.player;
			const combat = level.combat;
			const dying = flow.state === 'death';
			const clearing = flow.state === 'level-clear';
			const death = dying ? frame.director.death : null;
			let pac: ArcadeScene['pac'] = null;
			if (player) {
				const p = death ?? player.position;
				this.trackTravel(p);
				if (player.facing) {
					this.lastDir = player.facing;
				}
				pac = { x: p.x, y: p.y, dir: this.lastDir, travel: this.travel };
			}
			const scared = combat?.isPowerActive ? combat.powerTimer : 0;
			const ghosts = dying || clearing ? [] : this.ghosts(frame, scared);
			this.trackPopups(frame, dt);
			const fruit = level.fruit;
			const fruitKind = fruit?.active ?? null;
			view.draw({
				time: frame.time,
				food: (x, y) => {
					const token = grid.tileAt(x, y);
					if ((token !== 'DT' && token !== 'EU') || progress.isCollected(x, y)) {
						return null;
					}
					return token === 'DT' ? 'dot' : 'energizer';
				},
				pac,
				death: dying ? (flow.phase === 'fold' ? flow.phaseProgress : 1) : null,
				ghosts,
				fruit: fruit && fruitKind ? { kind: fruitKind, ...fruit.position } : null,
				popups: this.popups,
				flash: clearing && Math.floor((flow.elapsed / 0.25) % 2) === 1,
				frozen: flow.state === 'ready' || frame.paused
			});
		}
		const S = layout.tileSize;
		this.screen.present(
			ctx,
			source,
			layout.offsetX,
			layout.offsetY,
			S * grid.width,
			S * grid.height,
			frame.pixelRatio
		);
		return layout;
	}

	private viewFor(grid: GridMatrix): ArcadeView {
		if (!this.view || this.viewGrid !== grid) {
			this.view = new ArcadeView(grid);
			this.viewGrid = grid;
			this.intermission = null;
		}
		return this.view;
	}

	private intermissionCanvas(view: ArcadeView): {
		canvas: HTMLCanvasElement;
		ctx: CanvasRenderingContext2D;
	} {
		if (!this.intermission) {
			const canvas = document.createElement('canvas');
			canvas.width = view.canvas.width;
			canvas.height = view.canvas.height;
			const ctx = canvas.getContext('2d');
			if (!ctx) {
				throw new Error('ArcadeLevelRenderer: 2d context unavailable');
			}
			ctx.imageSmoothingEnabled = false;
			this.intermission = { canvas, ctx };
		}
		return this.intermission;
	}

	/** The board fitted between the HUD rows, keeping the native aspect. */
	private layout(view: ArcadeView, width: number, height: number): GridLayout {
		const cols = view.canvas.width / ARCADE_TILE;
		const rows = view.canvas.height / ARCADE_TILE;
		const tile = Math.max(1, Math.min((width - 16) / cols, (height - HUD_TOP - HUD_BOTTOM) / rows));
		return {
			tileSize: tile,
			offsetX: Math.floor((width - tile * cols) / 2),
			offsetY: Math.floor(HUD_TOP + (height - HUD_TOP - HUD_BOTTOM - tile * rows) / 2)
		};
	}

	/** The mouth chomps with the distance travelled; a teleport jump does not count. */
	private trackTravel(p: { x: number; y: number }): void {
		const last = this.lastPos;
		if (last) {
			const d = Math.abs(p.x - last.x) + Math.abs(p.y - last.y);
			if (d < 1) {
				this.travel += d;
			}
		}
		this.lastPos = { x: p.x, y: p.y };
	}

	private ghosts(frame: RenderFrame, scared: number): ArcadeScene['ghosts'] {
		const ghosts = frame.level.ghosts;
		if (!ghosts) {
			return [];
		}
		return ghosts.list.map((ghost) => {
			let look: ArcadeGhostLook = 'normal';
			if (ghost.state === 'eyes') {
				look = 'eyes';
			} else if (ghost.state === 'frightened') {
				look = scared > 0 && scared < FLASH_FROM ? 'flash' : 'scared';
			}
			const p = ghost.position;
			return { kind: ghost.kind, x: p.x, y: p.y, dir: ghost.facing ?? 'LEFT', look };
		});
	}

	/**
	 * Score pop-ups where a ghost was eaten (the chain value, doubling within one energizer)
	 * and where a fruit was taken.
	 */
	private trackPopups(frame: RenderFrame, dt: number): void {
		const { level } = frame;
		const combat = level.combat;
		if (!combat?.isPowerActive) {
			this.chain = 0;
		}
		for (const ghost of level.ghosts?.list ?? []) {
			const isEyes = ghost.state === 'eyes';
			if (isEyes && !this.eyes.has(ghost.kind)) {
				const value =
					SCORE_TABLE.ghostChain[Math.min(this.chain, SCORE_TABLE.ghostChain.length - 1)];
				this.chain += 1;
				this.popups.push({ ...ghost.position, value, life: POPUP_LIFE });
				this.eyes.add(ghost.kind);
			} else if (!isEyes) {
				this.eyes.delete(ghost.kind);
			}
		}
		const fruit = level.fruit;
		const kind = fruit?.active ?? null;
		if (fruit && kind) {
			this.lastFruit = { kind, ...fruit.position };
		} else if (this.lastFruit && level.player) {
			// the fruit went: a pop-up only if Pac-Man ate it (not when it timed out)
			const p = level.player.position;
			const f = this.lastFruit;
			if (Math.hypot(p.x - f.x, p.y - f.y) < 1.2) {
				const value = SCORE_TABLE.fruit[f.kind as keyof typeof SCORE_TABLE.fruit] ?? 0;
				this.popups.push({ x: f.x, y: f.y, value, life: POPUP_LIFE });
			}
			this.lastFruit = null;
		}
		this.popups = this.popups.map((p) => ({ ...p, life: p.life - dt })).filter((p) => p.life > 0);
	}
}
