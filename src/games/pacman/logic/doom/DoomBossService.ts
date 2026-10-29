import type { GridService } from '../GridService';
import type { GridPoint } from '../GridModel';
import type { PlayerService } from '../PlayerService';
import type { DoomDirection } from './DoomGraph';
import { adjacentTile, doomTileKey, bfsDistanceFrom } from './DoomGraph';
import { chooseChaseDirection } from './DoomMovement';
import { DoomBossModel } from './DoomBossModel';
import type { DoomAttackKind } from './DoomAttackCore';
import {
	attackWeightsForPhase,
	chooseWeightedAttack,
	tileDistance
} from './DoomAttackCore';
import {
	bossChaseSpeed,
	bossDashSpeed,
	minionChaseSpeed,
	phaseIndex,
	DASH_TELEGRAPH,
	DASH_RECOVER,
	DASH_MAX_TILES,
	CROSS_TELEGRAPH,
	CROSS_ACTIVE,
	CROSS_RECOVER,
	CROSS_MAX_PATH_DIST,
	CROSS_COOLDOWN,
	VOID_TELEGRAPH,
	VOID_DURATION,
	VOID_CELL_LIFETIME,
	VOID_MAX_CELLS,
	VOID_NO_SPAWN_NEAR_PLAYER,
	VOID_COOLDOWN,
	BLINK_TELEGRAPH,
	BLINK_VANISH,
	BLINK_RECOVER,
	BLINK_DEST_MIN_DIST,
	BLINK_DEST_MAX_DIST,
	BLINK_COOLDOWN,
	BROOD_TELEGRAPH,
	BROOD_RECOVER,
	BROOD_COUNT,
	BROOD_COUNT_LOW_HP,
	BROOD_LOW_HP_THRESHOLD,
	BROOD_MAX_ALIVE,
	BROOD_COOLDOWN,
	RECOVER_DAMAGE_MUL,
	ATTACK_RETRY_INTERVAL,
	PHASE_THRESHOLDS,
	CONTACT_DISTANCE
} from './DoomBalance';
import { isDashFair, isCrossFair } from './DoomFairness';
import { canStartDash } from './DoomDash';
import type { DoomMinion, DoomMinionKind } from './DoomMinions';
import { createMinion, minionPosition } from './DoomMinions';
import type { DoomRenderState } from './DoomBossModel';

interface VoidCell {
	x: number;
	y: number;
	timer: number;
}

export class DoomBossService {
	private readonly model: DoomBossModel;
	private readonly grid: GridService;
	private readonly minions: DoomMinion[] = [];
	private readonly voidCells: VoidCell[] = [];
	private readonly protectedTileKeys = new Set<string>();
	private barrelLocatorValue: (() => GridPoint | null) | null = null;
	private attackRetryTimer = 0;
	private personalCooldowns: Record<DoomAttackKind, number> = {
		dash: 0,
		cross: 0,
		voidTrail: 0,
		blink: 0,
		brood: 0
	};
	private lastAttackKind: DoomAttackKind | null = null;
	private playerBaseSpeed = 6;
	private bossContactHitValue = false;
	private minionContactHitValue = false;
	private crossHitValue = false;
	private phaseTransitionValue = false;

	constructor(grid: GridService, spawn: GridPoint) {
		if (!grid) {
			console.error('DoomBossService.constructor', 'missing grid service');
			throw new Error('DoomBossService.constructor: missing grid service');
		}
		if (!spawn) {
			console.error('DoomBossService.constructor', 'missing spawn');
			throw new Error('DoomBossService.constructor: missing spawn');
		}
		this.grid = grid;
		this.model = new DoomBossModel(spawn);
	}

	get hp(): number {
		return this.model.hp;
	}

	get phase(): number {
		return this.model.phase;
	}

	get state(): string {
		return this.model.state;
	}

	get tile(): GridPoint {
		return this.model.tile;
	}

	get facing(): DoomDirection | null {
		return this.model.facing;
	}

	get isMoving(): boolean {
		return this.model.isMoving;
	}

	get defeated(): boolean {
		return this.model.defeated;
	}

	get position(): { x: number; y: number } {
		return this.model.position;
	}

	get renderState(): DoomRenderState {
		return this.model.renderState;
	}

	get minionList(): readonly DoomMinion[] {
		return this.minions;
	}

	get voidCellList(): readonly VoidCell[] {
		return this.voidCells;
	}

	get isStunned(): boolean {
		return this.model.state === 'STUNNED';
	}

	get isStunImmune(): boolean {
		return this.model.stunImmunityTimer > 0;
	}

	consumeBossContactHit(): boolean {
		const hit = this.bossContactHitValue;
		this.bossContactHitValue = false;
		return hit;
	}

	consumeMinionContactHit(): boolean {
		const hit = this.minionContactHitValue;
		this.minionContactHitValue = false;
		return hit;
	}

	consumeCrossHit(): boolean {
		const hit = this.crossHitValue;
		this.crossHitValue = false;
		return hit;
	}

	consumePhaseTransition(): boolean {
		const value = this.phaseTransitionValue;
		this.phaseTransitionValue = false;
		return value;
	}

	setProtectedTiles(tiles: ReadonlyArray<GridPoint>): void {
		if (!tiles) {
			console.error('DoomBossService.setProtectedTiles', 'missing tiles');
			return;
		}
		this.protectedTileKeys.clear();
		for (const tile of tiles) {
			if (!Number.isFinite(tile.x) || !Number.isFinite(tile.y)) {
				console.error('DoomBossService.setProtectedTiles', 'invalid tile', tile);
				continue;
			}
			this.protectedTileKeys.add(`${tile.x},${tile.y}`);
		}
	}

	setBarrelLocator(locator: () => GridPoint | null): void {
		if (typeof locator !== 'function') {
			console.error('DoomBossService.setBarrelLocator', 'missing locator');
			return;
		}
		this.barrelLocatorValue = locator;
	}

	killMinionsWhere(shouldKill: (minion: DoomMinion) => boolean): number {
		if (typeof shouldKill !== 'function') {
			console.error('DoomBossService.killMinionsWhere', 'missing predicate');
			return 0;
		}
		let killed = 0;
		for (let i = this.minions.length - 1; i >= 0; i -= 1) {
			if (shouldKill(this.minions[i])) {
				this.minions.splice(i, 1);
				killed += 1;
			}
		}
		return killed;
	}

	update(dt: number, player: PlayerService): void {
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('DoomBossService.update', 'invalid delta time', dt);
			return;
		}
		this.playerBaseSpeed = player.baseSpeed;
		this.model.update(dt);
		this.updateCooldowns(dt);
		this.updateVoidCells(dt);
		if (this.model.defeated) {
			return;
		}
		this.updateBoss(dt, player);
		this.updateMinions(dt, player);
	}

	private updateBoss(dt: number, player: PlayerService): void {
		if (
			this.model.state === 'INTRO' ||
			this.model.state === 'TRANSITION' ||
			this.model.state === 'STUNNED'
		) {
			return;
		}
		if (this.model.state === 'TELEGRAPH') {
			if (this.model.stateTimer >= this.model.telegraphDuration) {
				this.enterActivePhase();
			} else {
				this.checkPlayerContact(player);
			}
			return;
		}
		if (this.model.state === 'ACTIVE') {
			this.updateActivePhase(dt, player);
			return;
		}
		if (this.model.state === 'RECOVER') {
			this.checkPlayerContact(player);
			return;
		}
		if (this.model.state === 'CHASE') {
			this.attackRetryTimer -= dt;
			if (this.model.voidTrailActive) {
				this.model.voidTrailTimer -= dt;
				if (this.model.voidTrailTimer <= 0) {
					this.model.voidTrailActive = false;
				} else if (!this.model.isMoving) {
					this.placeVoidAtCurrentTile(player);
				}
			}
			if (!this.model.isMoving) {
				if (
					this.model.attackCooldown <= 0 &&
					this.attackRetryTimer <= 0 &&
					!player.isInvulnerable &&
					!this.model.voidTrailActive
				) {
					this.attackRetryTimer = ATTACK_RETRY_INTERVAL;
					if (this.tryStartAttack(player)) {
						return;
					}
				}
				const target = this.currentTargetTile(player);
				const direction = chooseChaseDirection(
					this.grid,
					this.model.tile,
					this.model.facing,
					target,
					this.model.reverseLocked
				);
				if (direction) {
					this.model.beginMove(direction);
					this.model.reverseLocked = true;
				}
			}
			this.model.updateMovement(dt, bossChaseSpeed(this.playerBaseSpeed, this.model.phase));
			if (this.model.voidTrailActive && !this.model.isMoving) {
				this.placeVoidAtCurrentTile(player);
			}
			this.checkPlayerContact(player);
		}
	}

	takeDamage(amount: number): void {
		if (!Number.isFinite(amount) || amount <= 0) {
			return;
		}
		this.model.takeDamage(amount);
		if (this.model.hp <= PHASE_THRESHOLDS[0] && this.model.phase === 1) {
			this.model.startTransition();
			this.clearVoidAndMinions();
			this.phaseTransitionValue = true;
		}
		if (this.model.hp <= PHASE_THRESHOLDS[1] && this.model.phase === 2) {
			this.model.startTransition();
			this.clearVoidAndMinions();
			this.phaseTransitionValue = true;
		}
	}

	applyStun(duration: number): void {
		this.model.applyStun(duration);
	}

	reset(): void {
		this.model.reset();
		this.minions.length = 0;
		this.clearVoidAndMinions();
		this.attackRetryTimer = 0;
		this.lastAttackKind = null;
		this.bossContactHitValue = false;
		this.minionContactHitValue = false;
		this.crossHitValue = false;
		this.phaseTransitionValue = false;
		this.personalCooldowns = { dash: 0, cross: 0, voidTrail: 0, blink: 0, brood: 0 };
	}

	private updateCooldowns(dt: number): void {
		const keys: DoomAttackKind[] = ['dash', 'cross', 'voidTrail', 'blink', 'brood'];
		for (const key of keys) {
			if (this.personalCooldowns[key] > 0) {
				this.personalCooldowns[key] = Math.max(0, this.personalCooldowns[key] - dt);
			}
		}
	}

	private updateVoidCells(dt: number): void {
		for (let i = this.voidCells.length - 1; i >= 0; i--) {
			this.voidCells[i].timer -= dt;
			if (this.voidCells[i].timer <= 0) {
				this.grid.setVoidBlocked(this.voidCells[i].x, this.voidCells[i].y, false);
				this.voidCells.splice(i, 1);
			}
		}
	}

	private enterActivePhase(): void {
		const kind = this.model.attackKind;
		const pi = phaseIndex(this.model.phase);
		if (kind === 'dash') {
			this.model.beginActive(999);
			this.model.dashDirection = this.model.facing;
			this.model.dashTilesRemaining = DASH_MAX_TILES;
			this.model.dashCompleted = false;
		} else if (kind === 'cross') {
			this.model.beginActive(CROSS_ACTIVE);
		} else if (kind === 'voidTrail') {
			this.model.beginActive(0.1);
			this.model.voidTrailActive = true;
			this.model.voidTrailTimer = VOID_DURATION[pi];
		} else if (kind === 'blink') {
			this.model.beginActive(BLINK_VANISH);
		} else if (kind === 'brood') {
			this.model.beginActive(0.1);
			this.spawnBrood();
		}
	}

	private updateActivePhase(dt: number, player: PlayerService): void {
		const kind = this.model.attackKind;
		const pi = phaseIndex(this.model.phase);
		if (kind !== 'dash' && kind !== 'blink') {
			this.checkPlayerContact(player);
		}
		if (kind === 'dash') {
			const direction = this.model.dashDirection;
			if (!direction) {
				this.finishAttack(DASH_RECOVER[pi], RECOVER_DAMAGE_MUL);
				return;
			}
			if (!this.model.isMoving) {
				const next = adjacentTile(this.model.tile, direction);
				if (
					!this.grid.isInside(next.x, next.y) ||
					!this.grid.isWalkable(next.x, next.y) ||
					this.model.dashTilesRemaining <= 0
				) {
					this.finishAttack(DASH_RECOVER[pi], RECOVER_DAMAGE_MUL);
					return;
				}
				this.model.beginMove(direction);
			}
			this.model.updateMovement(dt, bossDashSpeed(this.playerBaseSpeed, this.model.phase));
			this.checkPlayerContact(player);
			if (this.model.consumeDashCompleted()) {
				this.finishAttack(DASH_RECOVER[pi], RECOVER_DAMAGE_MUL);
			}
		} else if (kind === 'cross') {
			if (this.model.stateTimer >= this.model.activeDuration) {
				this.applyCrossDamage(player);
				this.finishAttack(CROSS_RECOVER, RECOVER_DAMAGE_MUL);
			}
		} else if (kind === 'voidTrail') {
			if (this.model.stateTimer >= this.model.activeDuration) {
				this.model.state = 'CHASE';
				this.model.shape = 'normal';
				this.model.attackKind = null;
			}
		} else if (kind === 'blink') {
			if (this.model.stateTimer >= this.model.activeDuration) {
				if (this.model.blinkTarget) {
					this.model.teleportTo(this.model.blinkTarget);
					this.model.blinkTarget = null;
				}
				this.model.beginRecover(BLINK_RECOVER, 1.0);
				this.model.unlockReverse();
			}
		} else if (kind === 'brood') {
			if (this.model.stateTimer >= this.model.activeDuration) {
				this.finishAttack(BROOD_RECOVER, 1.0);
			}
		}
	}

	private finishAttack(recoverDuration: number, damageMultiplier: number): void {
		this.model.beginRecover(recoverDuration, damageMultiplier);
		if (this.model.attackKind) {
			this.lastAttackKind = this.model.attackKind;
			this.setPersonalCooldown(this.model.attackKind);
		}
	}

	private setPersonalCooldown(kind: DoomAttackKind): void {
		if (kind === 'cross') {
			this.personalCooldowns.cross = CROSS_COOLDOWN;
		} else if (kind === 'voidTrail') {
			this.personalCooldowns.voidTrail = VOID_COOLDOWN;
		} else if (kind === 'blink') {
			this.personalCooldowns.blink = BLINK_COOLDOWN;
		} else if (kind === 'brood') {
			this.personalCooldowns.brood = BROOD_COOLDOWN;
		}
	}

	private tryStartAttack(player: PlayerService): boolean {
		const playerTile = this.currentTargetTile(player);
		const pi = phaseIndex(this.model.phase);
		const available = new Set<DoomAttackKind>();
		const dashCheck = canStartDash(this.grid, this.model.tile, playerTile);
		if (
			dashCheck.canStart &&
			dashCheck.direction &&
			this.personalCooldowns.dash <= 0 &&
			this.lastAttackKind !== 'dash' &&
			isDashFair(
				this.grid, this.model.tile, playerTile, dashCheck.direction,
				DASH_TELEGRAPH[pi], this.playerBaseSpeed, DASH_MAX_TILES
			)
		) {
			available.add('dash');
			this.model.aim(dashCheck.direction);
		}
		if (this.model.phase >= 2 && this.personalCooldowns.cross <= 0 && this.lastAttackKind !== 'cross') {
			const exits = this.grid.exitsCount(this.model.tile.x, this.model.tile.y);
			const dist = tileDistance(this.model.tile, playerTile);
			if (
				exits >= 3 &&
				dist <= CROSS_MAX_PATH_DIST &&
				isCrossFair(this.grid, this.model.tile, playerTile, CROSS_TELEGRAPH[pi], this.playerBaseSpeed)
			) {
				available.add('cross');
			}
		}
		if (this.model.phase >= 2 && this.personalCooldowns.voidTrail <= 0 && this.lastAttackKind !== 'voidTrail') {
			available.add('voidTrail');
		}
		if (this.model.phase >= 3 && this.personalCooldowns.blink <= 0 && this.lastAttackKind !== 'blink') {
			const blinkTarget = this.findBlinkTarget(playerTile);
			if (blinkTarget) {
				this.model.blinkTarget = blinkTarget;
				available.add('blink');
			}
		}
		if (this.model.phase >= 3 && this.personalCooldowns.brood <= 0 && this.lastAttackKind !== 'brood') {
			if (this.minions.length < BROOD_MAX_ALIVE) {
				available.add('brood');
			}
		}
		if (available.size === 0) {
			return false;
		}
		const weights = attackWeightsForPhase(this.model.phase);
		const chosen = chooseWeightedAttack(weights, available, Math.random());
		if (!chosen) {
			return false;
		}
		if (chosen === 'dash') {
			this.model.beginTelegraph('dash', DASH_TELEGRAPH[pi]);
		} else if (chosen === 'cross') {
			this.model.beginTelegraph('cross', CROSS_TELEGRAPH[pi]);
		} else if (chosen === 'voidTrail') {
			this.model.beginTelegraph('voidTrail', VOID_TELEGRAPH);
		} else if (chosen === 'blink') {
			this.model.beginTelegraph('blink', BLINK_TELEGRAPH);
		} else if (chosen === 'brood') {
			this.model.beginTelegraph('brood', BROOD_TELEGRAPH);
		}
		return true;
	}

	private findBlinkTarget(playerTile: GridPoint): GridPoint | null {
		const barrel = this.barrelLocatorValue ? this.barrelLocatorValue() : null;
		const candidates: GridPoint[] = [];
		for (let y = 0; y < this.grid.height; y += 1) {
			for (let x = 0; x < this.grid.width; x += 1) {
				if (!this.grid.isWalkable(x, y)) {
					continue;
				}
				if (this.grid.isVoidBlocked(x, y)) {
					continue;
				}
				if (this.grid.exitsCount(x, y) < 3) {
					continue;
				}
				const dist = tileDistance({ x, y }, playerTile);
				if (dist < BLINK_DEST_MIN_DIST || dist > BLINK_DEST_MAX_DIST) {
					continue;
				}
				if (barrel && barrel.x === x && barrel.y === y) {
					continue;
				}
				if (this.blinkSeesPlayer({ x, y }, playerTile)) {
					continue;
				}
				candidates.push({ x, y });
			}
		}
		if (candidates.length === 0) {
			return null;
		}
		const bossDist = tileDistance(this.model.tile, playerTile);
		const closer = candidates.filter((c) => tileDistance(c, playerTile) < bossDist);
		const pool = closer.length > 0 ? closer : candidates;
		return pool[Math.floor(Math.random() * pool.length)];
	}

	private blinkSeesPlayer(candidate: GridPoint, playerTile: GridPoint): boolean {
		if (candidate.x !== playerTile.x && candidate.y !== playerTile.y) {
			return false;
		}
		const stepX = Math.sign(playerTile.x - candidate.x);
		const stepY = Math.sign(playerTile.y - candidate.y);
		let x = candidate.x + stepX;
		let y = candidate.y + stepY;
		while (x !== playerTile.x || y !== playerTile.y) {
			if (!this.grid.isInside(x, y) || !this.grid.isWalkable(x, y)) {
				return false;
			}
			x += stepX;
			y += stepY;
		}
		return true;
	}

	private spawnBrood(): void {
		const count = this.model.hp < BROOD_LOW_HP_THRESHOLD ? BROOD_COUNT_LOW_HP : BROOD_COUNT;
		const kinds: DoomMinionKind[] = ['pinky', 'inky', 'clyde'];
		for (let i = 0; i < count; i += 1) {
			if (this.minions.length >= BROOD_MAX_ALIVE) {
				break;
			}
			const kind = kinds[i % kinds.length];
			this.minions.push(createMinion(kind, this.model.tile));
		}
	}

	private updateMinions(dt: number, player: PlayerService): void {
		const speed = minionChaseSpeed(this.playerBaseSpeed);
		for (let i = this.minions.length - 1; i >= 0; i -= 1) {
			const minion = this.minions[i];
			minion.lifetime = Math.max(0, minion.lifetime - dt);
			if (minion.lifetime <= 0) {
				this.minions.splice(i, 1);
				continue;
			}
			this.updateMinionMovement(minion, dt, speed, player);
			this.checkMinionContact(minion, player);
		}
	}

	private updateMinionMovement(
		minion: DoomMinion,
		dt: number,
		speed: number,
		player: PlayerService
	): void {
		if (minion.target) {
			minion.moveProgress = Math.min(1, minion.moveProgress + dt * speed);
			if (minion.moveProgress >= 1) {
				minion.tile = minion.target;
				minion.target = null;
				minion.moveProgress = 0;
			}
		}
		if (!minion.target) {
			const targetTile = this.walkableOr(
				this.minionTargetTile(minion.kind, player),
				this.currentTargetTile(player)
			);
			const distances = bfsDistanceFrom(this.grid, targetTile);
			const directions: DoomDirection[] = ['UP', 'LEFT', 'DOWN', 'RIGHT'];
			let bestDir: DoomDirection | null = null;
			let bestDist = Number.POSITIVE_INFINITY;
			let bestPriority = Number.POSITIVE_INFINITY;
			for (let i = 0; i < directions.length; i += 1) {
				const dir = directions[i];
				const next = adjacentTile(minion.tile, dir);
				if (!this.grid.isInside(next.x, next.y)) {
					continue;
				}
				if (!this.grid.isWalkable(next.x, next.y)) {
					continue;
				}
				const dist = distances.get(doomTileKey(next)) ?? Number.POSITIVE_INFINITY;
				const priority = minion.facing === dir ? 0 : i;
				if (dist < bestDist || (dist === bestDist && priority < bestPriority)) {
					bestDist = dist;
					bestPriority = priority;
					bestDir = dir;
				}
			}
			if (bestDir) {
				minion.facing = bestDir;
				minion.target = adjacentTile(minion.tile, bestDir);
				minion.moveProgress = 0;
			}
		}
	}

	private minionTargetTile(kind: DoomMinionKind, player: PlayerService): GridPoint {
		const playerTile = this.currentTargetTile(player);
		const facing = player.facing;
		if (kind === 'pinky') {
			return this.aheadTile(playerTile, facing, 4);
		}
		if (kind === 'inky') {
			const pivot = this.aheadTile(playerTile, facing, 2);
			return {
				x: pivot.x * 2 - this.model.tile.x,
				y: pivot.y * 2 - this.model.tile.y
			};
		}
		const dist = tileDistance(playerTile, this.model.tile);
		if (dist > 8) {
			return playerTile;
		}
		return this.nearestCorner();
	}

	private walkableOr(tile: GridPoint, fallback: GridPoint): GridPoint {
		return this.grid.isWalkable(tile.x, tile.y) ? tile : fallback;
	}

	private aheadTile(tile: GridPoint, direction: DoomDirection | null, steps: number): GridPoint {
		if (!direction) {
			return tile;
		}
		let result = tile;
		for (let i = 0; i < steps; i += 1) {
			result = adjacentTile(result, direction);
		}
		return result;
	}

	private nearestCorner(): GridPoint {
		const corners: GridPoint[] = [
			{ x: 2, y: 2 },
			{ x: 2, y: this.grid.height - 3 },
			{ x: this.grid.width - 3, y: 2 },
			{ x: this.grid.width - 3, y: this.grid.height - 3 }
		];
		let best = corners[0];
		let bestDist = Number.POSITIVE_INFINITY;
		for (const corner of corners) {
			const d = tileDistance(corner, this.model.tile);
			if (d < bestDist) {
				bestDist = d;
				best = corner;
			}
		}
		return best;
	}

	private checkMinionContact(minion: DoomMinion, player: PlayerService): void {
		if (player.isInvulnerable) {
			return;
		}
		const minionPos = minionPosition(minion);
		const playerPos = player.position;
		const dx = playerPos.x - minionPos.x;
		const dy = playerPos.y - minionPos.y;
		if (dx * dx + dy * dy < CONTACT_DISTANCE * CONTACT_DISTANCE) {
			minion.lifetime = 0;
			this.minionContactHitValue = true;
		}
	}

	private checkPlayerContact(player: PlayerService): void {
		if (player.isInvulnerable) {
			return;
		}
		if (this.model.state === 'INTRO' || this.model.state === 'TRANSITION' || this.model.state === 'DEAD') {
			return;
		}
		if (this.model.state === 'STUNNED') {
			return;
		}
		const bossPos = this.model.position;
		const playerPos = player.position;
		const dx = playerPos.x - bossPos.x;
		const dy = playerPos.y - bossPos.y;
		if (dx * dx + dy * dy < CONTACT_DISTANCE * CONTACT_DISTANCE) {
			this.bossContactHitValue = true;
		}
	}

	private applyCrossDamage(player: PlayerService): void {
		if (player.isInvulnerable) {
			return;
		}
		const playerTile = this.currentTargetTile(player);
		const bossTile = this.model.tile;
		if (playerTile.x === bossTile.x || playerTile.y === bossTile.y) {
			this.crossHitValue = true;
		}
	}

	private placeVoidAtCurrentTile(player: PlayerService): void {
		const pi = phaseIndex(this.model.phase);
		const tile = this.model.tile;
		const playerTile = this.currentTargetTile(player);
		if (tileDistance(tile, playerTile) <= VOID_NO_SPAWN_NEAR_PLAYER) {
			return;
		}
		if (this.voidCells.length >= VOID_MAX_CELLS[pi]) {
			return;
		}
		if (this.grid.isVoidBlocked(tile.x, tile.y)) {
			return;
		}
		if (this.protectedTileKeys.has(`${tile.x},${tile.y}`)) {
			return;
		}
		const barrel = this.barrelLocatorValue ? this.barrelLocatorValue() : null;
		if (barrel && barrel.x === tile.x && barrel.y === tile.y) {
			return;
		}
		if (!this.keepsPlayerGraphConnected(tile, playerTile)) {
			return;
		}
		this.grid.setVoidBlocked(tile.x, tile.y, true);
		this.voidCells.push({ x: tile.x, y: tile.y, timer: VOID_CELL_LIFETIME[pi] });
	}

	private keepsPlayerGraphConnected(candidate: GridPoint, playerTile: GridPoint): boolean {
		if (!this.grid.isPlayerWalkable(playerTile.x, playerTile.y)) {
			return false;
		}
		let total = 0;
		for (let y = 0; y < this.grid.height; y += 1) {
			for (let x = 0; x < this.grid.width; x += 1) {
				if (x === candidate.x && y === candidate.y) {
					continue;
				}
				if (this.grid.isPlayerWalkable(x, y)) {
					total += 1;
				}
			}
		}
		const visited = new Set<string>();
		const queue: GridPoint[] = [playerTile];
		visited.add(`${playerTile.x},${playerTile.y}`);
		let head = 0;
		while (head < queue.length) {
			const current = queue[head];
			head += 1;
			const neighbors = this.grid.walkableNeighbors(current.x, current.y);
			for (const neighbor of neighbors) {
				if (neighbor.x === candidate.x && neighbor.y === candidate.y) {
					continue;
				}
				if (!this.grid.isPlayerWalkable(neighbor.x, neighbor.y)) {
					continue;
				}
				const key = `${neighbor.x},${neighbor.y}`;
				if (!visited.has(key)) {
					visited.add(key);
					queue.push(neighbor);
				}
			}
		}
		return visited.size >= total;
	}

	private clearVoidAndMinions(): void {
		for (const cell of this.voidCells) {
			this.grid.setVoidBlocked(cell.x, cell.y, false);
		}
		this.voidCells.length = 0;
		this.minions.length = 0;
		this.grid.clearVoidBlocked();
	}

	private currentTargetTile(player: PlayerService): GridPoint {
		const pos = player.position;
		return { x: Math.floor(pos.x), y: Math.floor(pos.y) };
	}
}