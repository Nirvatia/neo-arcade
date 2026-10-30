// Dev build only: what the dev panel's RENDER group turns on, drawn over the level in
// screen space (board coordinates from the level layout). Reads the level, never changes it.
import type { LevelLoader } from '../../logic/level/LevelLoader';
import type { GridLayout } from '../maze/GridView';
import type { DecayField } from '../transitions/decay/decayField';
import { sampleDecayField } from '../transitions/decay/decayField';
import { ACTOR_CONTACT_DISTANCE_SQ } from '../../config/actorConfig';
import { CONTACT_DISTANCE } from '../../logic/doom/DoomBalance';

export interface DebugRenderFlags {
	grid: boolean;
	ghostPaths: boolean;
	hitboxes: boolean;
	fronts: boolean;
}

/** A transition's distance field and where its front is now (tiles). */
export interface DebugFront {
	readonly field: DecayField;
	readonly front: number;
}

const GHOST_COLORS: Record<string, string> = {
	BLINKY: '#ff4d4d',
	PINKY: '#ff9ce6',
	INKY: '#4de1ff',
	CLYDE: '#ffb04d'
};

const ARROWS: Record<string, [number, number]> = {
	UP: [0, -1],
	DOWN: [0, 1],
	LEFT: [-1, 0],
	RIGHT: [1, 0]
};

export class DebugOverlayView {
	draw(
		ctx: CanvasRenderingContext2D,
		layout: GridLayout,
		level: LevelLoader,
		flags: DebugRenderFlags,
		front: DebugFront | null
	): void {
		const grid = level.grid;
		if (!grid || !(layout.tileSize > 0)) {
			return;
		}
		const S = layout.tileSize;
		const px = (x: number) => layout.offsetX + x * S;
		const py = (y: number) => layout.offsetY + y * S;
		ctx.save();
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';
		ctx.font = `${Math.max(8, Math.round(S * 0.32))}px monospace`;
		ctx.textBaseline = 'top';

		if (flags.fronts && front) {
			for (let y = 0; y < grid.height; y++) {
				for (let x = 0; x < grid.width; x++) {
					const d = front.front - sampleDecayField(front.field, x + 0.5, y + 0.5);
					if (d > 0.5) {
						ctx.fillStyle = 'rgba(86, 217, 255, 0.18)';
					} else if (d > -0.5) {
						ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
					} else {
						continue;
					}
					ctx.fillRect(px(x), py(y), S, S);
				}
			}
			ctx.fillStyle = '#fff';
			ctx.fillText(`front ${front.front.toFixed(1)}`, px(0) + 2, py(0) + 2);
		}

		if (flags.grid) {
			ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
			ctx.lineWidth = 1;
			ctx.beginPath();
			for (let x = 0; x <= grid.width; x++) {
				ctx.moveTo(px(x), py(0));
				ctx.lineTo(px(x), py(grid.height));
			}
			for (let y = 0; y <= grid.height; y++) {
				ctx.moveTo(px(0), py(y));
				ctx.lineTo(px(grid.width), py(y));
			}
			ctx.stroke();
			ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
			for (let y = 0; y < grid.height; y += 5) {
				for (let x = 0; x < grid.width; x += 5) {
					ctx.fillText(`${x},${y}`, px(x) + 1, py(y) + 1);
				}
			}
		}

		if (flags.ghostPaths) {
			const ghosts = level.hellMode ? [] : (level.ghosts?.list ?? []);
			for (const ghost of ghosts) {
				const color = GHOST_COLORS[ghost.kind] ?? '#fff';
				const pos = ghost.position;
				ctx.strokeStyle = color;
				ctx.fillStyle = color;
				ctx.lineWidth = 2;
				const next = ghost.target;
				if (next) {
					ctx.strokeRect(px(next.x) + 2, py(next.y) + 2, S - 4, S - 4);
					ctx.beginPath();
					ctx.moveTo(px(pos.x), py(pos.y));
					ctx.lineTo(px(next.x + 0.5), py(next.y + 0.5));
					ctx.stroke();
				}
				this.arrow(ctx, px(pos.x), py(pos.y), ghost.facing, S);
				ctx.fillText(ghost.state, px(pos.x) + S * 0.5, py(pos.y) - S * 0.9);
			}
			const boss = level.doomBoss;
			if (boss && !boss.defeated) {
				const pos = boss.position;
				ctx.strokeStyle = ctx.fillStyle = '#ffb454';
				ctx.lineWidth = 2;
				this.arrow(ctx, px(pos.x), py(pos.y), boss.facing, S);
				ctx.fillText(boss.state, px(pos.x) + S * 0.5, py(pos.y) - S * 0.9);
			}
			const player = level.player;
			if (player) {
				const pos = player.position;
				ctx.strokeStyle = ctx.fillStyle = '#ffe14d';
				this.arrow(ctx, px(pos.x), py(pos.y), player.facing, S);
				if (player.desired && player.desired !== player.facing) {
					ctx.strokeStyle = 'rgba(255, 225, 77, 0.5)';
					this.arrow(ctx, px(pos.x), py(pos.y), player.desired, S * 0.7);
				}
			}
		}

		if (flags.hitboxes) {
			const contact = Math.sqrt(ACTOR_CONTACT_DISTANCE_SQ);
			const circle = (x: number, y: number, r: number, color: string) => {
				ctx.strokeStyle = color;
				ctx.lineWidth = 1.5;
				ctx.beginPath();
				ctx.arc(px(x), py(y), r * S, 0, Math.PI * 2);
				ctx.stroke();
			};
			const dot = (x: number, y: number, color: string) => {
				ctx.fillStyle = color;
				ctx.fillRect(px(x) - 2, py(y) - 2, 4, 4);
			};
			const player = level.player;
			if (player) {
				// pick-ups and ghosts touch the player when their centre enters this circle
				circle(player.position.x, player.position.y, contact, '#ffe14d');
				dot(player.position.x, player.position.y, '#ffe14d');
			}
			if (!level.hellMode) {
				for (const ghost of level.ghosts?.list ?? []) {
					dot(ghost.position.x, ghost.position.y, GHOST_COLORS[ghost.kind] ?? '#fff');
				}
			}
			const fruit = level.fruit;
			if (fruit?.active) dot(fruit.position.x, fruit.position.y, '#79ff6f');
			const reward = level.bossReward;
			if (reward?.offered) {
				if (reward.heart) dot(reward.heart.x, reward.heart.y, '#79ff6f');
				if (reward.exit) dot(reward.exit.x, reward.exit.y, '#79ff6f');
			}
			const boss = level.doomBoss;
			if (boss && !boss.defeated) {
				circle(boss.position.x, boss.position.y, CONTACT_DISTANCE, '#ff7a7a');
			}
		}
		ctx.restore();
	}

	private arrow(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		facing: string | null,
		S: number
	): void {
		const v = facing ? ARROWS[facing] : null;
		if (!v) {
			return;
		}
		const len = S * 0.8;
		const ex = x + v[0] * len;
		const ey = y + v[1] * len;
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.lineTo(ex, ey);
		ctx.moveTo(ex - v[0] * S * 0.25 - v[1] * S * 0.2, ey - v[1] * S * 0.25 + v[0] * S * 0.2);
		ctx.lineTo(ex, ey);
		ctx.lineTo(ex - v[0] * S * 0.25 + v[1] * S * 0.2, ey - v[1] * S * 0.25 - v[0] * S * 0.2);
		ctx.stroke();
	}
}
