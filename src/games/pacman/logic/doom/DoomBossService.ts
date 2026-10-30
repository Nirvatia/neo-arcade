import type { GridService } from '../maze/GridService';
import type { GridPoint } from '../maze/GridModel';
import type { PlayerService } from '../actors/PlayerService';
import type { DoomDirection } from './DoomGraph';
import { adjacentTile, doomTileKey, bfsDistanceFrom } from './DoomGraph';
import { chooseChaseDirection } from './DoomMovement';
import { DoomBossModel } from './DoomBossModel';
import type { DoomAttackKind } from './DoomAttackCore';
import {
	DOOM_ATTACK_KINDS,
	attackWeightsForPhase,
	chooseWeightedAttack,
	tileDistance
} from './DoomAttackCore';
import type { DoomHazard, DoomSegment } from './DoomHazards';
import { DoomHazardField, canEscape, distanceRings, straightSegment } from './DoomHazards';
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
	CONTACT_DISTANCE,
	RIFT_TELEGRAPH,
	RIFT_ACTIVE,
	RIFT_RECOVER,
	RIFT_MIN_LENGTH,
	RIFT_MAX_RANGE,
	RIFT_COOLDOWN,
	SEAL_TELEGRAPH,
	SEAL_DURATION,
	SEAL_COUNT,
	SEAL_MIN_DIST,
	SEAL_MAX_DIST,
	SEAL_COOLDOWN,
	PULL_TELEGRAPH,
	PULL_DURATION,
	PULL_SLOW,
	PULL_COOLDOWN,
	SPLIT_TELEGRAPH,
	SPLIT_RECOVER,
	SPLIT_MIN_LENGTH,
	SPLIT_MIN_END_DIST,
	SPLIT_COOLDOWN,
	ERUPTION_TELEGRAPH,
	ERUPTION_WAVE_GAP,
	ERUPTION_ACTIVE,
	ERUPTION_RADIUS,
	ERUPTION_COOLDOWN,
	CORRUPTION_RATE,
	CORRUPTION_MAX,
	CORRUPTION_SLOW,
	CORRUPTION_BAND,
	SHAKE_HAZARD,
	SHAKE_TRANSITION,
	SHAKE_SPLIT
} from './DoomBalance';
import { isDashFair, isCrossFair } from './DoomFairness';
import { canStartDash } from './DoomDash';
import type { DoomMinion, DoomMinionKind } from './DoomMinions';
import { createMinion, minionPosition } from './DoomMinions';
import type { DoomRenderState, DoomStateName } from './DoomBossModel';
import type { DebugSink } from '../debug/debugLog';
import { NO_DEBUG } from '../debug/debugLog';

export interface VoidCell {
	x: number;
	y: number;
	timer: number;
	/** trail: left behind while moving; seal: an intersection locked on purpose. */
	kind: 'trail' | 'seal';
}

export interface PendingSeal {
	x: number;
	y: number;
	warn: number;
	readonly total: number;
}

/** The phase-3 decoy that closes in from the far end of the player's corridor. */
export interface DoomEcho {
	tile: GridPoint;
	target: GridPoint | null;
	progress: number;
	readonly dir: DoomDirection;
	remaining: number;
	/** 0..1, fades in during the telegraph and out after the run. */
	presence: number;
	running: boolean;
	done: boolean;
}

function noCooldowns(): Record<DoomAttackKind, number> {
	const result = {} as Record<DoomAttackKind, number>;
	for (const kind of DOOM_ATTACK_KINDS) {
		result[kind] = 0;
	}
	return result;
}

function segmentKeys(segment: DoomSegment): Set<string> {
	return new Set(segment.tiles.map(doomTileKey));
}

function hash01(x: number, y: number): number {
	const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
	return v - Math.floor(v);
}

export class DoomBossService {
	private readonly model: DoomBossModel;
	private readonly grid: GridService;
	private readonly minions: DoomMinion[] = [];
	private readonly voidCells: VoidCell[] = [];
	private readonly protectedTileKeys = new Set<string>();
	private barrelLocatorValue: (() => GridPoint | null) | null = null;
	private forcedAttack: DoomAttackKind | null = null;
	private debug: DebugSink = NO_DEBUG;
	private attackRetryTimer = 0;
	private personalCooldowns: Record<DoomAttackKind, number> = noCooldowns();
	private readonly hazards = new DoomHazardField();
	private readonly pendingSeals: PendingSeal[] = [];
	private pullTimer = 0;
	private corruptionValue = 0;
	private echoValue: DoomEcho | null = null;
	private shakeValue = 0;
	private splitSegment: DoomSegment | null = null;
	private lastAttackKind: DoomAttackKind | null = null;
	private playerBaseSpeed = 6;
	private bossContactHitValue = false;
	private minionContactHitValue = false;
	private hazardHitValue = false;
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

	get state(): DoomStateName {
		return this.model.state;
	}

	get introProgress(): number {
		return this.model.introProgress;
	}

	get hazardList(): readonly DoomHazard[] {
		return this.hazards.list;
	}

	get pendingSealList(): readonly PendingSeal[] {
		return this.pendingSeals;
	}

	/** Seconds until each attack may come again (dev watch table). */
	get debugCooldowns(): Readonly<Record<DoomAttackKind, number>> {
		return this.personalCooldowns;
	}

	get pullRemaining(): number {
		return this.pullTimer;
	}

	/** 0..CORRUPTION_MAX, grows during phase 3. */
	get corruption(): number {
		return this.corruptionValue;
	}

	get echo(): Readonly<DoomEcho> | null {
		return this.echoValue;
	}

	/** Camera shake strength 0..1, decays by itself. */
	get shake(): number {
		return this.shakeValue;
	}

	echoPosition(): { x: number; y: number } | null {
		const echo = this.echoValue;
		if (!echo) {
			return null;
		}
		const t = echo.target ? echo.progress : 0;
		const tx = echo.target ? echo.target.x - echo.tile.x : 0;
		const ty = echo.target ? echo.target.y - echo.tile.y : 0;
		return { x: echo.tile.x + 0.5 + tx * t, y: echo.tile.y + 0.5 + ty * t };
	}

	/** Outer corridors decay in phase 3; protected (pickup) tiles never do. */
	isCorrupted(x: number, y: number): boolean {
		if (this.corruptionValue <= 0 || !this.grid.isWalkable(x, y)) {
			return false;
		}
		const band = CORRUPTION_BAND;
		const outer =
			x <= band || y <= band || x >= this.grid.width - 1 - band || y >= this.grid.height - 1 - band;
		if (!outer || this.protectedTileKeys.has(`${x},${y}`)) {
			return false;
		}
		return hash01(x, y) < this.corruptionValue;
	}

	/** Speed multiplier for the player from pull and corruption. */
	playerSpeedFactor(player: PlayerService): number {
		let factor = 1;
		const pos = player.position;
		if (this.isCorrupted(Math.floor(pos.x), Math.floor(pos.y))) {
			factor *= CORRUPTION_SLOW;
		}
		if (this.pullTimer > 0 && player.facing) {
			const boss = this.model.position;
			const fx = player.facing === 'LEFT' ? -1 : player.facing === 'RIGHT' ? 1 : 0;
			const fy = player.facing === 'UP' ? -1 : player.facing === 'DOWN' ? 1 : 0;
			if (fx * (boss.x - pos.x) + fy * (boss.y - pos.y) < 0) {
				factor *= PULL_SLOW;
			}
		}
		return factor;
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

	/** Cross blast, rift, eruption or the echo caught the player. */
	consumeHazardHit(): boolean {
		const hit = this.hazardHitValue;
		this.hazardHitValue = false;
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
		this.shakeValue = Math.max(0, this.shakeValue - dt * 2.5);
		if (this.model.defeated) {
			this.clearArena();
			return;
		}
		this.updateArena(dt, player);
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
				const target = this.chaseTargetTile(player);
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

	/** Dev log lines (damage, stuns, attacks, phases) go here. */
	setDebugSink(sink: DebugSink): void {
		this.debug = sink;
	}

	takeDamage(amount: number, source = 'hit'): void {
		if (!Number.isFinite(amount) || amount <= 0) {
			return;
		}
		const before = this.model.hp;
		const phaseBefore = this.model.phase;
		this.model.takeDamage(amount);
		const dealt = before - this.model.hp;
		if (dealt > 0) {
			this.debug('damage', `boss −${Math.round(dealt)} (${source})`, Math.round(this.model.hp));
		} else {
			this.debug('damage', `boss ignores ${source} (${this.model.state})`);
		}
		if (this.model.defeated) {
			this.debug('boss', 'boss defeated');
		}
		if (this.model.hp <= PHASE_THRESHOLDS[0] && this.model.phase === 1) {
			this.model.startTransition();
			this.clearVoidAndMinions();
			this.phaseTransitionValue = true;
			this.shakeValue = Math.max(this.shakeValue, SHAKE_TRANSITION);
		}
		if (this.model.hp <= PHASE_THRESHOLDS[1] && this.model.phase === 2) {
			this.model.startTransition();
			this.clearVoidAndMinions();
			this.phaseTransitionValue = true;
			this.shakeValue = Math.max(this.shakeValue, SHAKE_TRANSITION);
		}
		if (this.model.phase !== phaseBefore) {
			this.debug('boss', `phase ${this.model.phase}`);
		}
	}

	/** Dev: jumps to phase 1–3 (see `DoomBossModel.debugSetPhase`). */
	debugSetPhase(phase: number): void {
		this.model.debugSetPhase(phase);
		this.debug('boss', `phase ${this.model.phase} (dev)`);
		this.clearVoidAndMinions();
		this.phaseTransitionValue = this.model.state === 'TRANSITION';
	}

	/**
	 * Dev: the next attack is `kind` as soon as the boss can make it here (phase, range and
	 * fairness rules still apply; the request waits until they do). Its cooldown is cleared.
	 */
	debugForceAttack(kind: DoomAttackKind): void {
		this.forcedAttack = kind;
		this.personalCooldowns[kind] = 0;
		this.attackRetryTimer = 0;
	}

	get debugForcedAttack(): DoomAttackKind | null {
		return this.forcedAttack;
	}

	debugKill(): void {
		this.model.debugKill();
		this.debug('boss', 'boss defeated (dev)');
	}

	applyStun(duration: number): void {
		this.model.applyStun(duration);
		if (this.model.state === 'STUNNED') {
			this.debug('debuff', `boss stunned ${duration}s`, duration);
		}
	}

	reset(): void {
		this.forcedAttack = null;
		this.model.reset();
		this.minions.length = 0;
		this.clearVoidAndMinions();
		this.attackRetryTimer = 0;
		this.lastAttackKind = null;
		this.bossContactHitValue = false;
		this.minionContactHitValue = false;
		this.hazardHitValue = false;
		this.phaseTransitionValue = false;
		this.personalCooldowns = noCooldowns();
		this.corruptionValue = 0;
		this.shakeValue = 0;
	}

	/** Timed hazards, seals, pull, corruption and the echo; all independent of the boss state. */
	private updateArena(dt: number, player: PlayerService): void {
		const playerTile = this.currentTargetTile(player);
		if (this.hazards.update(dt, playerTile, player.isInvulnerable)) {
			this.hazardHitValue = true;
		}
		if (this.hazards.consumeDetonations() > 0) {
			this.shakeValue = Math.max(this.shakeValue, SHAKE_HAZARD);
		}
		const pi = phaseIndex(this.model.phase);
		for (let i = this.pendingSeals.length - 1; i >= 0; i -= 1) {
			const seal = this.pendingSeals[i];
			seal.warn -= dt;
			if (seal.warn > 0) {
				continue;
			}
			this.pendingSeals.splice(i, 1);
			const here = this.currentTargetTile(player);
			if (
				(here.x !== seal.x || here.y !== seal.y) &&
				!this.grid.isVoidBlocked(seal.x, seal.y) &&
				this.keepsPlayerGraphConnected(seal, here)
			) {
				this.grid.setVoidBlocked(seal.x, seal.y, true);
				this.voidCells.push({ x: seal.x, y: seal.y, timer: SEAL_DURATION[pi], kind: 'seal' });
			}
		}
		this.pullTimer = Math.max(0, this.pullTimer - dt);
		if (this.model.phase >= 3 && this.model.state !== 'TRANSITION') {
			this.corruptionValue = Math.min(CORRUPTION_MAX, this.corruptionValue + CORRUPTION_RATE * dt);
		}
		this.updateEcho(dt, player);
	}

	private updateEcho(dt: number, player: PlayerService): void {
		const echo = this.echoValue;
		if (!echo) {
			return;
		}
		if (echo.done) {
			echo.presence -= dt / 0.3;
			if (echo.presence <= 0) {
				this.echoValue = null;
			}
			return;
		}
		if (!echo.running) {
			echo.presence = Math.min(1, echo.presence + dt / 0.4);
			return;
		}
		const speed = bossDashSpeed(this.playerBaseSpeed, this.model.phase);
		let remaining = dt;
		while (remaining > 1e-6 && !echo.done) {
			if (!echo.target) {
				const next = adjacentTile(echo.tile, echo.dir);
				if (echo.remaining <= 0 || !this.grid.isWalkable(next.x, next.y)) {
					echo.done = true;
					break;
				}
				echo.target = next;
				echo.progress = 0;
			}
			const need = (1 - echo.progress) / speed;
			if (need > remaining) {
				echo.progress += remaining * speed;
				remaining = 0;
			} else {
				remaining -= need;
				echo.tile = echo.target;
				echo.target = null;
				echo.progress = 0;
				echo.remaining -= 1;
			}
		}
		const pos = this.echoPosition();
		if (pos && !player.isInvulnerable) {
			const p = player.position;
			const dx = p.x - pos.x;
			const dy = p.y - pos.y;
			if (dx * dx + dy * dy < CONTACT_DISTANCE * CONTACT_DISTANCE) {
				this.hazardHitValue = true;
			}
		}
	}

	private clearArena(): void {
		this.hazards.clear();
		this.pendingSeals.length = 0;
		this.pullTimer = 0;
		if (this.echoValue) {
			this.echoValue.done = true;
		}
		this.splitSegment = null;
	}

	private updateCooldowns(dt: number): void {
		for (const key of DOOM_ATTACK_KINDS) {
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
		} else if (kind === 'split') {
			const segment = this.splitSegment;
			this.model.beginActive(999);
			this.model.dashDirection = this.model.facing;
			this.model.dashTilesRemaining = segment ? segment.tiles.length : DASH_MAX_TILES;
			this.model.dashCompleted = false;
			if (this.echoValue) {
				this.echoValue.running = true;
			}
			this.shakeValue = Math.max(this.shakeValue, SHAKE_SPLIT);
		} else {
			// spells: rift, seal and eruption were queued at cast time; pull starts now
			this.model.beginActive(0.1);
			if (kind === 'pull') {
				this.pullTimer = PULL_DURATION[pi];
				this.debug('debuff', `player pulled ${PULL_DURATION[pi]}s`, PULL_DURATION[pi]);
			}
		}
	}

	private updateActivePhase(dt: number, player: PlayerService): void {
		const kind = this.model.attackKind;
		const pi = phaseIndex(this.model.phase);
		if (kind !== 'dash' && kind !== 'blink') {
			this.checkPlayerContact(player);
		}
		if (kind === 'dash' || kind === 'split') {
			const recover = kind === 'split' ? SPLIT_RECOVER : DASH_RECOVER[pi];
			const direction = this.model.dashDirection;
			if (!direction) {
				this.finishAttack(recover, RECOVER_DAMAGE_MUL);
				return;
			}
			if (!this.model.isMoving) {
				const next = adjacentTile(this.model.tile, direction);
				if (
					!this.grid.isInside(next.x, next.y) ||
					!this.grid.isWalkable(next.x, next.y) ||
					this.model.dashTilesRemaining <= 0
				) {
					this.finishAttack(recover, RECOVER_DAMAGE_MUL);
					return;
				}
				this.model.beginMove(direction);
			}
			this.model.updateMovement(dt, bossDashSpeed(this.playerBaseSpeed, this.model.phase));
			this.checkPlayerContact(player);
			if (this.model.consumeDashCompleted()) {
				this.finishAttack(recover, RECOVER_DAMAGE_MUL);
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
		} else if (this.model.stateTimer >= this.model.activeDuration) {
			this.finishAttack(RIFT_RECOVER, RECOVER_DAMAGE_MUL);
		}
	}

	private finishAttack(recoverDuration: number, damageMultiplier: number): void {
		if (this.model.attackKind === 'split') {
			this.splitSegment = null;
		}
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
		} else if (kind === 'rift') {
			this.personalCooldowns.rift = RIFT_COOLDOWN;
		} else if (kind === 'seal') {
			this.personalCooldowns.seal = SEAL_COOLDOWN;
		} else if (kind === 'pull') {
			this.personalCooldowns.pull = PULL_COOLDOWN;
		} else if (kind === 'split') {
			this.personalCooldowns.split = SPLIT_COOLDOWN;
		} else if (kind === 'eruption') {
			this.personalCooldowns.eruption = ERUPTION_COOLDOWN;
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
			isDashFair(
				this.grid,
				this.model.tile,
				playerTile,
				dashCheck.direction,
				DASH_TELEGRAPH[pi],
				this.playerBaseSpeed,
				DASH_MAX_TILES
			)
		) {
			available.add('dash');
			this.model.aim(dashCheck.direction);
		}
		if (this.model.phase >= 2 && this.personalCooldowns.cross <= 0) {
			const exits = this.grid.exitsCount(this.model.tile.x, this.model.tile.y);
			const dist = tileDistance(this.model.tile, playerTile);
			if (
				exits >= 3 &&
				dist <= CROSS_MAX_PATH_DIST &&
				isCrossFair(
					this.grid,
					this.model.tile,
					playerTile,
					CROSS_TELEGRAPH[pi],
					this.playerBaseSpeed
				)
			) {
				available.add('cross');
			}
		}
		if (this.model.phase >= 2 && this.personalCooldowns.voidTrail <= 0) {
			available.add('voidTrail');
		}
		if (this.model.phase >= 3 && this.personalCooldowns.blink <= 0) {
			const blinkTarget = this.findBlinkTarget(playerTile);
			if (blinkTarget) {
				this.model.blinkTarget = blinkTarget;
				available.add('blink');
			}
		}
		if (this.model.phase >= 3 && this.personalCooldowns.brood <= 0) {
			if (this.minions.length < BROOD_MAX_ALIVE) {
				available.add('brood');
			}
		}
		const weights = attackWeightsForPhase(this.model.phase);
		const ready = (kind: DoomAttackKind): boolean =>
			weights[kind] > 0 && this.personalCooldowns[kind] <= 0;
		const speed = this.playerBaseSpeed;
		let rift: DoomSegment | null = null;
		if (ready('rift') && tileDistance(this.model.tile, playerTile) <= RIFT_MAX_RANGE) {
			rift = this.riftSegment(player, playerTile);
			if (rift && canEscape(this.grid, playerTile, segmentKeys(rift), RIFT_TELEGRAPH[pi], speed)) {
				available.add('rift');
			}
		}
		let seals: GridPoint[] = [];
		if (ready('seal')) {
			seals = this.pickSeals(playerTile, SEAL_COUNT[pi]);
			if (seals.length >= 2) {
				available.add('seal');
			}
		}
		if (ready('pull') && tileDistance(this.model.tile, playerTile) >= 4) {
			available.add('pull');
		}
		let split: DoomSegment | null = null;
		if (ready('split')) {
			split = this.splitSegmentFor(player, playerTile);
			if (split && canEscape(this.grid, playerTile, segmentKeys(split), SPLIT_TELEGRAPH, speed)) {
				available.add('split');
			}
		}
		if (
			ready('eruption') &&
			this.grid
				.walkableNeighbors(playerTile.x, playerTile.y)
				.some((n) => this.grid.isPlayerWalkable(n.x, n.y))
		) {
			available.add('eruption');
		}
		const forced = this.forcedAttack;
		if (forced) {
			if (!available.has(forced)) {
				return false;
			}
			available.clear();
			available.add(forced);
			this.forcedAttack = null;
		}
		// never the same attack twice in a row, unless it is the only option
		if (available.size > 1 && this.lastAttackKind) {
			available.delete(this.lastAttackKind);
		}
		if (available.size === 0) {
			return false;
		}
		const chosen = chooseWeightedAttack(weights, available, Math.random());
		if (!chosen) {
			return false;
		}
		this.debug('boss', `attack: ${chosen}`);
		if (chosen === 'rift' && rift) {
			this.hazards.add('rift', rift.tiles, RIFT_TELEGRAPH[pi], RIFT_ACTIVE, rift.axis);
			this.model.beginTelegraph('rift', RIFT_TELEGRAPH[pi]);
			return true;
		}
		if (chosen === 'seal') {
			for (const seal of seals) {
				this.pendingSeals.push({
					x: seal.x,
					y: seal.y,
					warn: SEAL_TELEGRAPH,
					total: SEAL_TELEGRAPH
				});
			}
			this.model.beginTelegraph('seal', SEAL_TELEGRAPH);
			return true;
		}
		if (chosen === 'pull') {
			this.model.beginTelegraph('pull', PULL_TELEGRAPH);
			return true;
		}
		if (chosen === 'split' && split) {
			this.beginSplit(split, playerTile);
			return true;
		}
		if (chosen === 'eruption') {
			const rings = distanceRings(this.grid, playerTile, ERUPTION_RADIUS);
			const even = rings.filter((_, d) => d % 2 === 0).flat();
			const odd = rings.filter((_, d) => d % 2 === 1).flat();
			this.hazards.add('eruption', even, ERUPTION_TELEGRAPH, ERUPTION_ACTIVE);
			this.hazards.add(
				'eruption',
				odd,
				ERUPTION_TELEGRAPH + ERUPTION_WAVE_GAP,
				ERUPTION_ACTIVE,
				null,
				ERUPTION_TELEGRAPH
			);
			this.model.beginTelegraph('eruption', ERUPTION_TELEGRAPH);
			return true;
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

	/** The corridor the player runs along (falls back to the other axis). */
	private riftSegment(player: PlayerService, playerTile: GridPoint): DoomSegment | null {
		const facing = player.facing;
		const first: 'x' | 'y' = facing === 'UP' || facing === 'DOWN' ? 'y' : 'x';
		const second: 'x' | 'y' = first === 'x' ? 'y' : 'x';
		for (const axis of [first, second]) {
			const segment = straightSegment(this.grid, playerTile, axis);
			if (segment.tiles.length >= RIFT_MIN_LENGTH) {
				return segment;
			}
		}
		return null;
	}

	/** A long corridor with the player well inside it, so both ends can close in. */
	private splitSegmentFor(player: PlayerService, playerTile: GridPoint): DoomSegment | null {
		const facing = player.facing;
		const first: 'x' | 'y' = facing === 'UP' || facing === 'DOWN' ? 'y' : 'x';
		const second: 'x' | 'y' = first === 'x' ? 'y' : 'x';
		for (const axis of [first, second]) {
			const segment = straightSegment(this.grid, playerTile, axis);
			const n = segment.tiles.length;
			if (n < SPLIT_MIN_LENGTH) {
				continue;
			}
			const i = segment.tiles.findIndex((t) => t.x === playerTile.x && t.y === playerTile.y);
			if (i >= SPLIT_MIN_END_DIST && n - 1 - i >= SPLIT_MIN_END_DIST) {
				return segment;
			}
		}
		return null;
	}

	private beginSplit(segment: DoomSegment, playerTile: GridPoint): void {
		const tiles = segment.tiles;
		const a = tiles[0];
		const b = tiles[tiles.length - 1];
		// the boss takes the end it is closer to, the echo the other one
		const bossAtA = tileDistance(this.model.tile, a) <= tileDistance(this.model.tile, b);
		const bossEnd = bossAtA ? a : b;
		const echoEnd = bossAtA ? b : a;
		const towardEcho: DoomDirection =
			segment.axis === 'x' ? (bossAtA ? 'RIGHT' : 'LEFT') : bossAtA ? 'DOWN' : 'UP';
		const towardBoss: DoomDirection =
			segment.axis === 'x' ? (bossAtA ? 'LEFT' : 'RIGHT') : bossAtA ? 'UP' : 'DOWN';
		this.model.teleportTo(bossEnd);
		this.model.aim(towardEcho);
		this.splitSegment = segment;
		this.echoValue = {
			tile: { x: echoEnd.x, y: echoEnd.y },
			target: null,
			progress: 0,
			dir: towardBoss,
			remaining: tiles.length - 1,
			presence: 0,
			running: false,
			done: false
		};
		void playerTile;
		this.model.beginTelegraph('split', SPLIT_TELEGRAPH);
	}

	/** Intersections around the player that can be sealed, spread apart. */
	private pickSeals(playerTile: GridPoint, count: number): GridPoint[] {
		if (count <= 0) {
			return [];
		}
		const rings = distanceRings(this.grid, playerTile, SEAL_MAX_DIST);
		const candidates: GridPoint[] = [];
		for (let d = SEAL_MIN_DIST; d < rings.length; d += 1) {
			for (const tile of rings[d]) {
				if (
					this.grid.exitsCount(tile.x, tile.y) >= 3 &&
					!this.protectedTileKeys.has(`${tile.x},${tile.y}`) &&
					!this.grid.isVoidBlocked(tile.x, tile.y) &&
					!(tile.x === this.model.tile.x && tile.y === this.model.tile.y)
				) {
					candidates.push(tile);
				}
			}
		}
		for (let i = candidates.length - 1; i > 0; i -= 1) {
			const j = Math.floor(Math.random() * (i + 1));
			[candidates[i], candidates[j]] = [candidates[j], candidates[i]];
		}
		const picked: GridPoint[] = [];
		for (const tile of candidates) {
			if (picked.length >= count) {
				break;
			}
			if (picked.every((p) => tileDistance(p, tile) >= 3)) {
				picked.push(tile);
			}
		}
		return picked;
	}

	/**
	 * Ambush pursuit: when the player is not close, head for the intersection the player
	 * is running into instead of the player's current tile.
	 */
	private chaseTargetTile(player: PlayerService): GridPoint {
		const playerTile = this.currentTargetTile(player);
		const facing = player.facing;
		if (!facing || tileDistance(this.model.tile, playerTile) <= 4) {
			return playerTile;
		}
		let tile = playerTile;
		for (let step = 0; step < 6; step += 1) {
			const next = adjacentTile(tile, facing);
			if (!this.grid.isWalkable(next.x, next.y)) {
				break;
			}
			tile = next;
			if (this.grid.exitsCount(tile.x, tile.y) >= 3) {
				return tile;
			}
		}
		return tile;
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
		if (
			this.model.state === 'INTRO' ||
			this.model.state === 'TRANSITION' ||
			this.model.state === 'DEAD'
		) {
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
			this.hazardHitValue = true;
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
		this.voidCells.push({ x: tile.x, y: tile.y, timer: VOID_CELL_LIFETIME[pi], kind: 'trail' });
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
		this.clearArena();
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
