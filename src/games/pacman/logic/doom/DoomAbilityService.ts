import type { GridService } from '../GridService';
import type { GridPoint } from '../GridModel';
import type { PlayerService } from '../PlayerService';
import { DoomPickupService } from './DoomPickupService';
import type { DoomPickupKind, DoomPickupModel } from './DoomPickupModel';
import { DoomWeaponService } from './DoomWeaponService';
import type { DoomBfgShot, DoomBarrel, DoomBfgTracer, DoomFxEvent } from './DoomWeaponService';
import type { DoomBossService } from './DoomBossService';
import { minionPosition } from './DoomMinions';
import { assertDoomMap } from './DoomMapValidation';
import {
	PLAYER_MAX_HP,
	PLAYER_IFRAMES,
	BFG_ORB_DAMAGE,
	BFG_ORB_STUN,
	BFG_TRACER_DAMAGE,
	BARREL_DAMAGE,
	BARREL_STUN,
	BERSERK_BITE_DAMAGE,
	BERSERK_BITE_STUN,
	BERSERK_SPEED_MUL
} from './DoomBalance';

const BOSS_SHOT_HIT_RADIUS_SQ = 0.25;
const MINION_SHOT_HIT_RADIUS_SQ = 0.25;
const RECOIL_LOCK = 0.3;
const BERSERK_EXTEND_PER_MINION = 1.5;

export class DoomAbilityService {
	private readonly grid: GridService;
	private readonly boss: DoomBossService;
	private readonly pickups: DoomPickupService;
	private readonly weapons: DoomWeaponService;
	private playerHpValue = PLAYER_MAX_HP;
	private playerDeadValue = false;
	private godModeValue = false;
	private moveLockTimer = 0;
	private ballHitBossValue = false;
	private readonly processedTracers = new Set<DoomBfgTracer>();

	constructor(grid: GridService, boss: DoomBossService) {
		if (!grid) {
			console.error('DoomAbilityService.constructor', 'missing grid service');
			throw new Error('DoomAbilityService.constructor: missing grid service');
		}
		if (!boss) {
			console.error('DoomAbilityService.constructor', 'missing boss service');
			throw new Error('DoomAbilityService.constructor: missing boss service');
		}
		assertDoomMap(grid);
		this.grid = grid;
		this.boss = boss;
		this.pickups = new DoomPickupService(grid);
		this.weapons = new DoomWeaponService(grid);
		this.boss.setProtectedTiles(this.buildProtectedTiles());
		this.boss.setBarrelLocator(() => this.locateBarrel());
	}

	get armed(): string {
		if (this.weapons.berserkActive) {
			return 'berserk';
		}
		const slot = this.weapons.slot;
		return slot ? slot : '';
	}

	get playerHp(): number {
		return this.playerHpValue;
	}

	get pickupList(): readonly DoomPickupModel[] {
		return this.pickups.list;
	}

	canCollect(kind: DoomPickupKind): boolean {
		return this.pickups.isCollectible(kind, this.playerHpValue, this.weapons.slot !== null);
	}

	get bfgChargeProgress(): number {
		return this.weapons.bfgChargeProgress;
	}

	get berserkTimer(): number {
		return this.weapons.berserkTimer;
	}

	get shots(): readonly DoomBfgShot[] {
		return this.weapons.shots;
	}

	get barrelList(): readonly DoomBarrel[] {
		return this.weapons.barrelList;
	}

	get tracerList(): readonly DoomBfgTracer[] {
		return this.weapons.tracerList;
	}

	get bfgCharging(): boolean {
		return this.weapons.bfgCharging;
	}

	get berserkActive(): boolean {
		return this.weapons.berserkActive;
	}

	/** Effects that happened since the last call (consumed by the renderer). */
	consumeFx(): DoomFxEvent[] {
		return this.weapons.consumeFx();
	}

	update(dt: number, player: PlayerService): void {
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('DoomAbilityService.update', 'invalid delta time', dt);
			return;
		}
		player.setSpeedModifier(
			(this.weapons.berserkActive ? BERSERK_SPEED_MUL : 1) * this.boss.playerSpeedFactor(player)
		);
		if (this.playerDeadValue) {
			return;
		}
		this.ballHitBossValue = false;
		this.weapons.update(dt);
		if (this.weapons.consumeChargeCompleted()) {
			this.weapons.fireBfg(player);
			this.moveLockTimer = RECOIL_LOCK;
		}
		if (this.boss.consumePhaseTransition()) {
			this.pickups.fillEmpty(this.playerHpValue);
		}
		const slotOccupied = this.weapons.slot !== null;
		const collected = this.pickups.update(dt, player, this.playerHpValue, slotOccupied);
		if (collected) {
			this.applyPickup(collected);
			const p = player.position;
			this.weapons.pushFx({ kind: 'pickup', x: p.x, y: p.y, detail: collected });
		}
		if (this.boss.consumeBossContactHit()) {
			if (this.weapons.berserkActive) {
				this.biteBoss();
			} else {
				this.damagePlayer(1, player);
			}
		}
		if (this.boss.consumeMinionContactHit()) {
			if (this.weapons.berserkActive) {
				this.weapons.extendBerserk(BERSERK_EXTEND_PER_MINION);
			} else {
				this.damagePlayer(1, player);
			}
		}
		if (this.boss.consumeHazardHit()) {
			this.damagePlayer(1, player);
		}
		this.resolveShotCollisions(player);
		this.resolveTracerDamage(player);
		this.resolveBarrelBossCollision(player);
		this.moveLockTimer = Math.max(0, this.moveLockTimer - dt);
		player.setMovementLocked(this.weapons.bfgCharging || this.moveLockTimer > 0);
	}

	fire(player: PlayerService): 'bfg' | 'barrel' | null {
		if (this.playerDeadValue) {
			return null;
		}
		const slot = this.weapons.slot;
		if (slot === 'bfg') {
			if (player.facing && this.weapons.startBfgCharge()) {
				return 'bfg';
			}
			return null;
		}
		if (slot === 'barrel') {
			if (this.weapons.placeBarrel(player)) {
				return 'barrel';
			}
			return null;
		}
		return null;
	}

	get godMode(): boolean {
		return this.godModeValue;
	}

	/** Debug: the player takes no damage. */
	setGodMode(value: boolean): void {
		this.godModeValue = value;
	}

	damagePlayer(amount: number, player: PlayerService): void {
		if (this.godModeValue) {
			return;
		}
		if (!Number.isFinite(amount) || amount <= 0) {
			console.error('DoomAbilityService.damagePlayer', 'invalid damage amount', amount);
			return;
		}
		if (this.playerDeadValue) {
			return;
		}
		if (player.isInvulnerable) {
			return;
		}
		this.playerHpValue = Math.max(0, this.playerHpValue - amount);
		this.weapons.pushFx({ kind: 'player-hit', x: player.position.x, y: player.position.y });
		this.weapons.cancelBfgCharge();
		if (this.playerHpValue <= 0) {
			this.playerDeadValue = true;
		} else {
			player.grantInvulnerability(PLAYER_IFRAMES);
		}
	}

	consumePlayerDeath(): boolean {
		const dead = this.playerDeadValue;
		this.playerDeadValue = false;
		return dead;
	}

	reset(): void {
		this.pickups.reset();
		this.weapons.reset();
		this.playerHpValue = PLAYER_MAX_HP;
		this.playerDeadValue = false;
		this.moveLockTimer = 0;
		this.ballHitBossValue = false;
		this.processedTracers.clear();
	}

	debugSpawn(): void {
		this.pickups.fillEmpty(this.playerHpValue);
	}

	private buildProtectedTiles(): GridPoint[] {
		const keys = new Set<string>();
		const tiles: GridPoint[] = [];
		for (const pickup of this.pickups.list) {
			const candidates: GridPoint[] = [
				pickup.tile,
				...this.grid.walkableNeighbors(pickup.tile.x, pickup.tile.y)
			];
			for (const candidate of candidates) {
				const key = `${candidate.x},${candidate.y}`;
				if (!keys.has(key)) {
					keys.add(key);
					tiles.push({ x: candidate.x, y: candidate.y });
				}
			}
		}
		return tiles;
	}

	private locateBarrel(): GridPoint | null {
		const barrels = this.weapons.barrelList;
		if (barrels.length === 0) {
			return null;
		}
		const barrel = barrels[0];
		return { x: barrel.x, y: barrel.y };
	}

	private applyPickup(kind: DoomPickupKind): void {
		if (kind === 'medkit') {
			this.playerHpValue = Math.min(PLAYER_MAX_HP, this.playerHpValue + 1);
			return;
		}
		this.weapons.handlePickup(kind);
	}

	private biteBoss(): void {
		if (this.boss.isStunned || this.boss.isStunImmune) {
			return;
		}
		this.boss.takeDamage(BERSERK_BITE_DAMAGE);
		this.boss.applyStun(BERSERK_BITE_STUN);
		this.weapons.pushFx({ kind: 'bite', x: this.boss.position.x, y: this.boss.position.y });
	}

	private resolveShotCollisions(player: PlayerService): void {
		const shots = this.weapons.shots;
		const bossPos = this.boss.position;
		for (let i = shots.length - 1; i >= 0; i -= 1) {
			const shot = shots[i];
			const bdx = shot.x - bossPos.x;
			const bdy = shot.y - bossPos.y;
			if (bdx * bdx + bdy * bdy < BOSS_SHOT_HIT_RADIUS_SQ) {
				this.boss.takeDamage(BFG_ORB_DAMAGE);
				this.boss.applyStun(BFG_ORB_STUN);
				this.weapons.pushFx({ kind: 'boss-hit', x: bossPos.x, y: bossPos.y });
				this.weapons.detonateShot(i);
				this.ballHitBossValue = true;
				continue;
			}
			const barrels = this.weapons.barrelList;
			for (let b = barrels.length - 1; b >= 0; b -= 1) {
				if (Math.floor(shot.x) === barrels[b].x && Math.floor(shot.y) === barrels[b].y) {
					this.detonateBarrel(b, player);
				}
			}
			this.boss.killMinionsWhere((minion) => {
				const pos = minionPosition(minion);
				const mdx = shot.x - pos.x;
				const mdy = shot.y - pos.y;
				return mdx * mdx + mdy * mdy < MINION_SHOT_HIT_RADIUS_SQ;
			});
		}
	}

	private resolveTracerDamage(player: PlayerService): void {
		const tracers = this.weapons.tracerList;
		for (const tracer of tracers) {
			if (this.processedTracers.has(tracer)) {
				continue;
			}
			this.processedTracers.add(tracer);
			if (
				!this.ballHitBossValue &&
				this.tileInTracer(this.boss.tile.x, this.boss.tile.y, tracer)
			) {
				this.boss.takeDamage(BFG_TRACER_DAMAGE);
			}
			this.boss.killMinionsWhere((minion) => {
				const pos = minionPosition(minion);
				return this.tileInTracer(Math.floor(pos.x), Math.floor(pos.y), tracer);
			});
			this.detonateBarrelsInTracer(tracer, player);
		}
		const active = new Set(tracers);
		for (const processed of this.processedTracers) {
			if (!active.has(processed)) {
				this.processedTracers.delete(processed);
			}
		}
	}

	private resolveBarrelBossCollision(player: PlayerService): void {
		const bossTile = this.boss.tile;
		const barrels = this.weapons.barrelList;
		for (let i = barrels.length - 1; i >= 0; i -= 1) {
			if (barrels[i].x === bossTile.x && barrels[i].y === bossTile.y) {
				this.detonateBarrel(i, player);
			}
		}
	}

	private detonateBarrelsInTracer(tracer: DoomBfgTracer, player: PlayerService): void {
		const barrels = this.weapons.barrelList;
		for (let i = barrels.length - 1; i >= 0; i -= 1) {
			if (this.tileInTracer(barrels[i].x, barrels[i].y, tracer)) {
				this.detonateBarrel(i, player);
			}
		}
	}

	private detonateBarrel(index: number, player: PlayerService): void {
		const barrels = this.weapons.barrelList;
		if (index < 0 || index >= barrels.length) {
			return;
		}
		const barrel = barrels[index];
		const affectedKeys = new Set<string>();
		affectedKeys.add(`${barrel.x},${barrel.y}`);
		for (const neighbor of this.grid.walkableNeighbors(barrel.x, barrel.y)) {
			affectedKeys.add(`${neighbor.x},${neighbor.y}`);
		}
		this.weapons.pushFx({ kind: 'barrel-blast', x: barrel.x + 0.5, y: barrel.y + 0.5 });
		const bossTile = this.boss.tile;
		if (affectedKeys.has(`${bossTile.x},${bossTile.y}`)) {
			this.boss.takeDamage(BARREL_DAMAGE);
			this.boss.applyStun(BARREL_STUN);
		}
		this.boss.killMinionsWhere((minion) => {
			const pos = minionPosition(minion);
			return affectedKeys.has(`${Math.floor(pos.x)},${Math.floor(pos.y)}`);
		});
		const playerTileX = Math.floor(player.position.x);
		const playerTileY = Math.floor(player.position.y);
		if (affectedKeys.has(`${playerTileX},${playerTileY}`)) {
			this.damagePlayer(1, player);
		}
		this.weapons.removeBarrel(index);
	}

	private tileInTracer(tx: number, ty: number, tracer: DoomBfgTracer): boolean {
		if (tracer.dx !== 0) {
			const startX = Math.floor(tracer.x);
			const lineY = Math.floor(tracer.y);
			if (ty !== lineY) {
				return false;
			}
			const endX = startX + tracer.dx * tracer.length;
			const minX = Math.min(startX, endX);
			const maxX = Math.max(startX, endX);
			return tx >= minX && tx <= maxX;
		}
		const startY = Math.floor(tracer.y);
		const lineX = Math.floor(tracer.x);
		if (tx !== lineX) {
			return false;
		}
		const endY = startY + tracer.dy * tracer.length;
		const minY = Math.min(startY, endY);
		const maxY = Math.max(startY, endY);
		return ty >= minY && ty <= maxY;
	}
}