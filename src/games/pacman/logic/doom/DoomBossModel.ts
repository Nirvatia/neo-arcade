import type { GridPoint } from '../GridModel';
import type { DoomDirection } from './DoomGraph';
import { adjacentTile } from './DoomGraph';
import type { DoomAttackKind } from './DoomAttackCore';
import {
	BOSS_HP,
	PHASE_THRESHOLDS,
	INTRO_DURATION,
	TRANSITION_DURATION,
	STUN_IMMUNITY,
	baseChaosForPhase,
	attackCooldownForPhase
} from './DoomBalance';

export type DoomStateName =
	'INTRO' | 'CHASE' | 'TELEGRAPH' | 'ACTIVE' | 'RECOVER' | 'STUNNED' | 'TRANSITION' | 'DEAD';

export type DoomShape = 'normal' | 'wedge' | 'cross' | 'shrink' | 'lobes' | 'cast' | 'stunned';

export interface DoomRenderState {
	x: number;
	y: number;
	chaos: number;
	shape: DoomShape;
	dir: DoomDirection;
	progress: number;
	scale: number;
	alpha: number;
}

export class DoomBossModel {
	public hp = BOSS_HP;
	public phase = 1;
	public state: DoomStateName = 'INTRO';
	public stateTimer = 0;
	public chaos = 1.0;
	public shape: DoomShape = 'normal';
	public attackKind: DoomAttackKind | null = null;
	public attackCooldown = 0;
	public telegraphDuration = 1.0;
	public activeDuration = 0;
	public recoverDuration = 0;
	public recoverDamageMultiplier = 1.0;
	public dashDirection: DoomDirection | null = null;
	public dashTilesRemaining = 0;
	public dashCompleted = false;
	public blinkTarget: GridPoint | null = null;
	public voidTrailActive = false;
	public voidTrailTimer = 0;

	private readonly spawnTile: GridPoint;
	private _tile: GridPoint;
	private _target: GridPoint | null = null;
	private _facing: DoomDirection | null = null;
	private _moveProgress = 0;
	public reverseLocked = false;
	public stunTimer = 0;
	public stunImmunityTimer = 0;
	public introTimer = INTRO_DURATION;
	public transitionTimer = 0;
	public telegraphProgress = 0;

	constructor(spawn: GridPoint) {
		if (!spawn || !Number.isFinite(spawn.x) || !Number.isFinite(spawn.y)) {
			console.error('DoomBossModel.constructor', 'invalid spawn', spawn);
			throw new Error('DoomBossModel.constructor: invalid spawn');
		}
		this.spawnTile = { x: spawn.x, y: spawn.y };
		this._tile = { x: spawn.x, y: spawn.y };
	}

	get tile(): GridPoint {
		return this._tile;
	}

	get target(): GridPoint | null {
		return this._target;
	}

	get facing(): DoomDirection | null {
		return this._facing;
	}

	get isMoving(): boolean {
		return this._target !== null;
	}

	get defeated(): boolean {
		return this.state === 'DEAD';
	}

	get position(): { x: number; y: number } {
		// Tile-center coordinates, same convention as PlayerService.position.
		let renderX = this._tile.x + 0.5;
		let renderY = this._tile.y + 0.5;
		if (this._target) {
			renderX = this._tile.x + 0.5 + (this._target.x - this._tile.x) * this._moveProgress;
			renderY = this._tile.y + 0.5 + (this._target.y - this._tile.y) * this._moveProgress;
		}
		return { x: renderX, y: renderY };
	}

	get renderState(): DoomRenderState {
		const pos = this.position;
		const blinkVanish = this.state === 'ACTIVE' && this.attackKind === 'blink';
		return {
			x: pos.x,
			y: pos.y,
			chaos: this.chaos,
			shape: this.shape,
			dir: this._facing ?? 'DOWN',
			progress: this.telegraphProgress,
			scale: this.shape === 'shrink' ? 0.8 : 1.0,
			alpha: this.state === 'TRANSITION' ? 0.5 : blinkVanish ? 0.0 : 1.0
		};
	}

	/** 0..1 while the boss materialises at the start of the fight. */
	get introProgress(): number {
		if (this.state !== 'INTRO') {
			return 1;
		}
		return Math.min(1, Math.max(0, 1 - this.introTimer / INTRO_DURATION));
	}

	get inRecoverWindow(): boolean {
		return this.state === 'RECOVER' && this.recoverDamageMultiplier > 1;
	}

	aim(direction: DoomDirection): void {
		this._facing = direction;
	}

	beginMove(direction: DoomDirection): void {
		this._facing = direction;
		this._target = adjacentTile(this._tile, direction);
		this._moveProgress = 0;
	}

	teleportTo(destination: GridPoint): void {
		this._tile = { x: destination.x, y: destination.y };
		this._target = null;
		this._moveProgress = 0;
		this._facing = null;
		this.reverseLocked = false;
	}

	updateMovement(dt: number, speed: number): void {
		if (!this._target) {
			return;
		}
		if (!Number.isFinite(dt) || dt < 0 || !Number.isFinite(speed) || speed <= 0) {
			return;
		}
		this._moveProgress = Math.min(1, this._moveProgress + dt * speed);
		if (this._moveProgress >= 1) {
			this._tile = this._target;
			this._target = null;
			this._moveProgress = 0;
			if (this.state === 'ACTIVE' && this.attackKind === 'dash' && this.dashTilesRemaining > 0) {
				this.dashTilesRemaining -= 1;
				if (this.dashTilesRemaining <= 0) {
					this.dashCompleted = true;
				}
			}
		}
	}

	beginTelegraph(kind: DoomAttackKind, duration: number): void {
		this.state = 'TELEGRAPH';
		this.attackKind = kind;
		this.telegraphDuration = Math.max(0.01, duration);
		this.stateTimer = 0;
		this.telegraphProgress = 0;
		if (kind === 'dash') {
			this.shape = 'wedge';
		} else if (kind === 'cross') {
			this.shape = 'cross';
		} else if (kind === 'voidTrail') {
			this.shape = 'shrink';
		} else if (kind === 'blink') {
			this.shape = 'shrink';
		} else if (kind === 'brood') {
			this.shape = 'lobes';
		} else if (kind === 'split') {
			this.shape = 'wedge';
		} else {
			// rift, seal, pull, eruption: spells cast from a distance
			this.shape = 'cast';
		}
	}

	beginActive(duration: number): void {
		this.state = 'ACTIVE';
		this.stateTimer = 0;
		this.activeDuration = Math.max(0.01, duration);
		this.chaos = 1.0;
	}

	beginRecover(duration: number, damageMultiplier: number): void {
		this.state = 'RECOVER';
		this.stateTimer = 0;
		this.recoverDuration = Math.max(0.01, duration);
		this.recoverDamageMultiplier = damageMultiplier;
		this.shape = 'normal';
	}

	consumeDashCompleted(): boolean {
		const value = this.dashCompleted;
		this.dashCompleted = false;
		return value;
	}

	unlockReverse(): void {
		this.reverseLocked = false;
	}

	takeDamage(amount: number): void {
		if (this.state === 'TRANSITION' || this.state === 'INTRO' || this.state === 'DEAD') {
			return;
		}
		if (!Number.isFinite(amount) || amount <= 0) {
			return;
		}
		let actualDamage = amount * this.recoverDamageMultiplier;
		const threshold1 = PHASE_THRESHOLDS[0];
		const threshold2 = PHASE_THRESHOLDS[1];
		if (this.hp > threshold1 && this.hp - actualDamage < threshold1) {
			actualDamage = this.hp - threshold1;
		} else if (
			this.hp > threshold2 &&
			this.hp <= threshold1 &&
			this.hp - actualDamage < threshold2
		) {
			actualDamage = this.hp - threshold2;
		}
		this.hp = Math.max(0, this.hp - actualDamage);
		if (this.hp <= 0) {
			this.state = 'DEAD';
			this.stateTimer = 0;
		}
	}

	applyStun(duration: number): void {
		// A stun must never overwrite death, the phase transition or the intro: damage and
		// stun arrive together, and a killing blow would otherwise revive the boss at 0 HP.
		if (this.state === 'DEAD' || this.state === 'TRANSITION' || this.state === 'INTRO') {
			return;
		}
		if (this.stunImmunityTimer > 0) {
			return;
		}
		if (!Number.isFinite(duration) || duration <= 0) {
			return;
		}
		if (this.state === 'STUNNED') {
			this.stateTimer = Math.max(this.stateTimer, duration);
		} else {
			this.state = 'STUNNED';
			this.stateTimer = duration;
			this.shape = 'stunned';
			this.chaos = 0.95;
			this.attackKind = null;
		}
	}

	update(dt: number): void {
		if (!Number.isFinite(dt) || dt < 0) {
			return;
		}
		if (this.stunImmunityTimer > 0) {
			this.stunImmunityTimer = Math.max(0, this.stunImmunityTimer - dt);
		}
		if (this.attackCooldown > 0) {
			this.attackCooldown = Math.max(0, this.attackCooldown - dt);
		}
		if (this.state === 'INTRO') {
			this.introTimer -= dt;
			const t = Math.max(0, Math.min(1, 1 - this.introTimer / INTRO_DURATION));
			this.chaos = 1.0 - t * (1.0 - baseChaosForPhase(this.phase));
			if (this.introTimer <= 0) {
				this.state = 'CHASE';
				this.chaos = baseChaosForPhase(this.phase);
				this.attackCooldown = attackCooldownForPhase(this.phase);
			}
			return;
		}
		if (this.state === 'STUNNED') {
			this.stateTimer -= dt;
			this.chaos = 0.95;
			this.shape = 'stunned';
			if (this.stateTimer <= 0) {
				this.state = 'CHASE';
				this.stunImmunityTimer = STUN_IMMUNITY;
				this.shape = 'normal';
				this.chaos = baseChaosForPhase(this.phase);
				this.unlockReverse();
				this.attackCooldown = 0;
			}
			return;
		}
		if (this.state === 'TRANSITION') {
			this.transitionTimer -= dt;
			this.chaos = 1.0;
			if (this.transitionTimer <= 0) {
				this.state = 'CHASE';
				this.chaos = baseChaosForPhase(this.phase);
				this.unlockReverse();
				this.attackCooldown = attackCooldownForPhase(this.phase);
			}
			return;
		}
		if (this.state === 'DEAD') {
			this.stateTimer += dt;
			return;
		}
		if (this.state === 'TELEGRAPH') {
			this.stateTimer += dt;
			this.telegraphProgress = Math.min(1, this.stateTimer / this.telegraphDuration);
			this.chaos =
				baseChaosForPhase(this.phase) +
				(1.0 - baseChaosForPhase(this.phase)) * this.telegraphProgress;
			return;
		}
		if (this.state === 'ACTIVE') {
			this.stateTimer += dt;
			this.chaos = this.attackKind === 'voidTrail' ? 0.8 : 1.0;
			return;
		}
		if (this.state === 'RECOVER') {
			this.stateTimer += dt;
			const fadeT = Math.min(1, this.stateTimer / 0.6);
			this.chaos = 1.0 - fadeT * (1.0 - baseChaosForPhase(this.phase));
			if (this.stateTimer >= this.recoverDuration) {
				this.state = 'CHASE';
				this.shape = 'normal';
				this.recoverDamageMultiplier = 1.0;
				this.attackKind = null;
				this.attackCooldown = attackCooldownForPhase(this.phase);
			}
			return;
		}
		this.telegraphProgress = 0;
		this.chaos = baseChaosForPhase(this.phase);
	}

	startTransition(): void {
		const threshold1 = PHASE_THRESHOLDS[0];
		const threshold2 = PHASE_THRESHOLDS[1];
		if (this.phase === 1 && this.hp <= threshold1) {
			this.phase = 2;
		} else if (this.phase === 2 && this.hp <= threshold2) {
			this.phase = 3;
		}
		this.state = 'TRANSITION';
		this.transitionTimer = TRANSITION_DURATION;
		this.chaos = 1.0;
		this.attackKind = null;
		this.shape = 'normal';
		this.voidTrailActive = false;
		this.voidTrailTimer = 0;
	}

	reset(): void {
		this.hp = BOSS_HP;
		this.phase = 1;
		this.state = 'INTRO';
		this.introTimer = INTRO_DURATION;
		this.chaos = 1.0;
		this.shape = 'normal';
		this.attackKind = null;
		this.attackCooldown = 0;
		this.telegraphDuration = 1.0;
		this.activeDuration = 0;
		this.recoverDuration = 0;
		this.recoverDamageMultiplier = 1.0;
		this.dashDirection = null;
		this.dashTilesRemaining = 0;
		this.dashCompleted = false;
		this.blinkTarget = null;
		this.voidTrailActive = false;
		this.voidTrailTimer = 0;
		this._tile = { x: this.spawnTile.x, y: this.spawnTile.y };
		this._target = null;
		this._facing = null;
		this._moveProgress = 0;
		this.reverseLocked = false;
		this.stunTimer = 0;
		this.stunImmunityTimer = 0;
		this.stateTimer = 0;
		this.transitionTimer = 0;
		this.telegraphProgress = 0;
	}
}
