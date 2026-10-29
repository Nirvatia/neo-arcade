import type { GridService } from '../GridService';
import type { PlayerService } from '../PlayerService';
import type { DoomPickupKind } from './DoomPickupModel';
import { DoomWeaponModel } from './DoomWeaponModel';
import type { DoomSlotItem } from './DoomWeaponModel';

const BARREL_LIFETIME = 12;
const BFG_BALL_SPEED = 14;
const BFG_SHOT_LIFETIME = 2.0;
const BFG_TRACER_VISIBLE = 0.25;

export interface DoomBfgShot {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
}

export interface DoomBarrel {
	x: number;
	y: number;
	timer: number;
}

/** Something the renderer should show an effect for (tile-center coordinates). */
export interface DoomFxEvent {
	readonly kind:
		| 'bfg-fire'
		| 'bfg-impact'
		| 'barrel-place'
		| 'barrel-blast'
		| 'barrel-fizzle'
		| 'bite'
		| 'pickup'
		| 'boss-hit'
		| 'player-hit';
	readonly x: number;
	readonly y: number;
	readonly dx?: number;
	readonly dy?: number;
	readonly detail?: string;
}

export interface DoomBfgTracer {
	x: number;
	y: number;
	dx: number;
	dy: number;
	length: number;
	timer: number;
}

export class DoomWeaponService {
	private readonly model: DoomWeaponModel;
	private readonly grid: GridService;
	private readonly bfgShots: DoomBfgShot[] = [];
	private readonly barrels: DoomBarrel[] = [];
	private readonly tracers: DoomBfgTracer[] = [];
	private readonly fxQueue: DoomFxEvent[] = [];

	constructor(grid: GridService) {
		if (!grid) {
			console.error('DoomWeaponService.constructor', 'missing grid service');
			throw new Error('DoomWeaponService.constructor: missing grid service');
		}
		this.model = new DoomWeaponModel();
		this.grid = grid;
	}

	get slot(): DoomSlotItem {
		return this.model.slot;
	}

	get berserkActive(): boolean {
		return this.model.berserkActive;
	}

	get berserkTimer(): number {
		return this.model.berserkTimer;
	}

	get bfgCharging(): boolean {
		return this.model.bfgCharging;
	}

	get bfgChargeProgress(): number {
		return this.model.bfgChargeState.progress;
	}

	get shots(): readonly DoomBfgShot[] {
		return this.bfgShots;
	}

	get barrelList(): readonly DoomBarrel[] {
		return this.barrels;
	}

	get tracerList(): readonly DoomBfgTracer[] {
		return this.tracers;
	}

	pushFx(event: DoomFxEvent): void {
		if (this.fxQueue.length < 64) {
			this.fxQueue.push(event);
		}
	}

	consumeFx(): DoomFxEvent[] {
		return this.fxQueue.splice(0, this.fxQueue.length);
	}

	handlePickup(kind: DoomPickupKind): void {
		if (kind === 'berserk') {
			this.model.activateBerserk();
		} else if (kind === 'bfg') {
			if (this.model.slot === null) {
				this.model.slot = 'bfg';
			}
		} else if (kind === 'barrel') {
			if (this.model.slot === null) {
				this.model.slot = 'barrel';
			}
		}
	}

	extendBerserk(seconds: number): void {
		this.model.extendBerserk(seconds);
	}

	startBfgCharge(): boolean {
		return this.model.startBfgCharge();
	}

	cancelBfgCharge(): void {
		this.model.cancelBfgCharge();
	}

	consumeChargeCompleted(): boolean {
		return this.model.consumeChargeCompleted();
	}

	placeBarrel(player: PlayerService): boolean {
		if (!this.model.consumeBarrel()) {
			return false;
		}
		const pos = player.position;
		const facing = player.facing;
		let barrelX = Math.floor(pos.x);
		let barrelY = Math.floor(pos.y);
		if (facing === 'UP') {
			barrelY -= 1;
		} else if (facing === 'DOWN') {
			barrelY += 1;
		} else if (facing === 'LEFT') {
			barrelX -= 1;
		} else if (facing === 'RIGHT') {
			barrelX += 1;
		}
		if (!this.grid.isInside(barrelX, barrelY) || !this.grid.isWalkable(barrelX, barrelY)) {
			barrelX = Math.floor(pos.x);
			barrelY = Math.floor(pos.y);
		}
		this.barrels.length = 0;
		this.barrels.push({ x: barrelX, y: barrelY, timer: BARREL_LIFETIME });
		this.pushFx({ kind: 'barrel-place', x: barrelX + 0.5, y: barrelY + 0.5 });
		return true;
	}

	fireBfg(player: PlayerService): void {
		const facing = player.facing;
		if (!facing) {
			console.error('DoomWeaponService.fireBfg', 'player has no facing direction');
			return;
		}
		const pos = player.position;
		let vx = 0;
		let vy = 0;
		if (facing === 'UP') {
			vy = -BFG_BALL_SPEED;
		} else if (facing === 'DOWN') {
			vy = BFG_BALL_SPEED;
		} else if (facing === 'LEFT') {
			vx = -BFG_BALL_SPEED;
		} else if (facing === 'RIGHT') {
			vx = BFG_BALL_SPEED;
		}
		this.bfgShots.push({ x: pos.x, y: pos.y, vx, vy, life: BFG_SHOT_LIFETIME });
		this.pushFx({ kind: 'bfg-fire', x: pos.x, y: pos.y, dx: Math.sign(vx), dy: Math.sign(vy) });
	}

	detonateShot(index: number): void {
		if (index < 0 || index >= this.bfgShots.length) {
			return;
		}
		const shot = this.bfgShots[index];
		this.spawnTracers(shot.x, shot.y);
		this.bfgShots.splice(index, 1);
	}

	removeBarrel(index: number): void {
		if (index < 0 || index >= this.barrels.length) {
			return;
		}
		this.barrels.splice(index, 1);
	}

	update(dt: number): void {
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('DoomWeaponService.update', 'invalid delta time', dt);
			return;
		}
		this.model.update(dt);
		for (let i = this.bfgShots.length - 1; i >= 0; i -= 1) {
			const shot = this.bfgShots[i];
			shot.life -= dt;
			if (shot.life <= 0) {
				this.spawnTracers(shot.x, shot.y);
				this.bfgShots.splice(i, 1);
				continue;
			}
			const nextX = shot.x + shot.vx * dt;
			const nextY = shot.y + shot.vy * dt;
			if (this.hitWall(nextX, nextY)) {
				this.spawnTracers(shot.x, shot.y);
				this.bfgShots.splice(i, 1);
				continue;
			}
			shot.x = nextX;
			shot.y = nextY;
		}
		for (let i = this.barrels.length - 1; i >= 0; i -= 1) {
			this.barrels[i].timer -= dt;
			if (this.barrels[i].timer <= 0) {
				this.pushFx({
					kind: 'barrel-fizzle',
					x: this.barrels[i].x + 0.5,
					y: this.barrels[i].y + 0.5
				});
				this.barrels.splice(i, 1);
			}
		}
		for (let i = this.tracers.length - 1; i >= 0; i -= 1) {
			this.tracers[i].timer -= dt;
			if (this.tracers[i].timer <= 0) {
				this.tracers.splice(i, 1);
			}
		}
	}

	clearBarrels(): void {
		this.barrels.length = 0;
	}

	reset(): void {
		this.model.reset();
		this.bfgShots.length = 0;
		this.barrels.length = 0;
		this.tracers.length = 0;
		this.fxQueue.length = 0;
	}

	private hitWall(x: number, y: number): boolean {
		const tileX = Math.floor(x);
		const tileY = Math.floor(y);
		if (!this.grid.isInside(tileX, tileY)) {
			return true;
		}
		return !this.grid.isWalkable(tileX, tileY);
	}

	private spawnTracers(x: number, y: number): void {
		this.pushFx({ kind: 'bfg-impact', x, y });
		const directions = [
			{ dx: 1, dy: 0 },
			{ dx: -1, dy: 0 },
			{ dx: 0, dy: 1 },
			{ dx: 0, dy: -1 }
		];
		for (const dir of directions) {
			let length = 0;
			let testX = Math.floor(x);
			let testY = Math.floor(y);
			while (this.grid.isInside(testX, testY) && this.grid.isWalkable(testX, testY)) {
				length += 1;
				testX += dir.dx;
				testY += dir.dy;
			}
			if (length > 0) {
				this.tracers.push({ x, y, dx: dir.dx, dy: dir.dy, length, timer: BFG_TRACER_VISIBLE });
			}
		}
	}
}
