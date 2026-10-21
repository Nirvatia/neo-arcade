import type { GridService } from './GridService';
import type { LevelProgress } from './LevelProgress';
import type { ScoreModel } from './ScoreModel';
import type { PlayerService } from './PlayerService';

export type UltraPhase = 'inactive' | 'armed' | 'contract' | 'sealed' | 'spent';

type UltraDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

interface UltraTile {
	readonly x: number;
	readonly y: number;
}

const VECTORS: Record<UltraDirection, { x: number; y: number }> = {
	UP: { x: 0, y: -1 },
	DOWN: { x: 0, y: 1 },
	LEFT: { x: -1, y: 0 },
	RIGHT: { x: 1, y: 0 }
};
const DIRECTIONS: readonly UltraDirection[] = ['UP', 'LEFT', 'DOWN', 'RIGHT'];
const FALLBACK_SWITCH_TILE: UltraTile = { x: 8, y: 12 };
const FALLBACK_TRAP_TILE: UltraTile = { x: 16, y: 12 };
const ULTRA_SPEED = 6.3;
const TRAP_DELAY = 5;
const SPAWN_GRACE = 1;
const CONTACT_DISTANCE_SQ = 0.36;
const ULTRA_REWARD = 3000;
const DOT_LIMIT = 12;
const EPSILON = 1e-6;

export class UltraGhostService {
	private readonly grid: GridService;
	private readonly progressModel: LevelProgress;
	private readonly scoreModel: ScoreModel;
	private readonly levelValue: number;
	private phaseValue: UltraPhase = 'inactive';
	private tileValue: UltraTile = FALLBACK_SWITCH_TILE;
	private targetValue: UltraTile | null = null;
	private facingValue: UltraDirection | null = null;
	private moveProgressValue = 0;
	private trapTimerValue = TRAP_DELAY;
	private trapActiveValue = false;
	private graceValue = 0;
	private playerCaughtValue = false;
	private sealedValue = false;

	constructor(grid: GridService, progress: LevelProgress, score: ScoreModel, level: number) {
		if (!grid) {
			console.error('UltraGhostService.constructor', 'missing grid service');
			throw new Error('UltraGhostService.constructor: missing grid service');
		}
		if (!progress) {
			console.error('UltraGhostService.constructor', 'missing level progress');
			throw new Error('UltraGhostService.constructor: missing level progress');
		}
		if (!score) {
			console.error('UltraGhostService.constructor', 'missing score model');
			throw new Error('UltraGhostService.constructor: missing score model');
		}
		if (!Number.isFinite(level) || level < 1) {
			console.error('UltraGhostService.constructor', 'invalid level', level);
			throw new Error('UltraGhostService.constructor: level must be positive');
		}
		this.grid = grid;
		this.progressModel = progress;
		this.scoreModel = score;
		this.levelValue = Math.floor(level);
	}

	get phase(): UltraPhase {
		return this.phaseValue;
	}

	get contractActive(): boolean {
		return this.phaseValue === 'contract';
	}

	get trapActive(): boolean {
		return this.trapActiveValue;
	}

	get switchPosition(): { x: number; y: number } {
		const tile = this.switchTile();
		return { x: tile.x + 0.5, y: tile.y + 0.5 };
	}

	get trapPosition(): { x: number; y: number } {
		const tile = this.trapTile();
		return { x: tile.x + 0.5, y: tile.y + 0.5 };
	}

	get position(): { x: number; y: number } {
		const baseX = this.tileValue.x + 0.5;
		const baseY = this.tileValue.y + 0.5;
		if (!this.targetValue) {
			return { x: baseX, y: baseY };
		}
		const t = Math.min(1, Math.max(0, this.moveProgressValue));
		const dx = this.targetValue.x - this.tileValue.x;
		const dy = this.targetValue.y - this.tileValue.y;
		return { x: baseX + dx * t, y: baseY + dy * t };
	}

	reset(): void {
		this.phaseValue = 'inactive';
		this.tileValue = this.switchTile();
		this.targetValue = null;
		this.facingValue = null;
		this.moveProgressValue = 0;
		this.trapTimerValue = TRAP_DELAY;
		this.trapActiveValue = false;
		this.graceValue = 0;
		this.playerCaughtValue = false;
		this.sealedValue = false;
	}

	update(dt: number, player: PlayerService): void {
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('UltraGhostService.update', 'invalid delta time', dt);
			return;
		}
		if (!player) {
			console.error('UltraGhostService.update', 'missing player service');
			return;
		}
		if (this.phaseValue === 'inactive') {
			if (this.levelValue < 2) {
				return;
			}
			if (this.progressModel.collectedDots >= Math.floor(this.grid.dotCount / 2)) {
				this.phaseValue = 'armed';
			}
			return;
		}
		if (this.phaseValue === 'armed') {
			const tile = player.tile;
			const switchPos = this.switchTile();
			if (tile.x === switchPos.x && tile.y === switchPos.y) {
				this.startContract();
			}
			return;
		}
		if (this.phaseValue === 'contract') {
			this.updateContract(dt, player);
		}
	}

	consumePlayerCaught(): boolean {
		const caught = this.playerCaughtValue;
		this.playerCaughtValue = false;
		return caught;
	}

	consumeSealed(): boolean {
		const sealed = this.sealedValue;
		this.sealedValue = false;
		return sealed;
	}

	abortContract(): void {
		if (this.phaseValue !== 'contract') {
			return;
		}
		this.phaseValue = 'armed';
		this.targetValue = null;
		this.moveProgressValue = 0;
		this.trapTimerValue = TRAP_DELAY;
		this.trapActiveValue = false;
		this.graceValue = 0;
		this.playerCaughtValue = false;
	}

	cancelContract(): void {
		if (this.phaseValue !== 'contract') {
			return;
		}
		this.phaseValue = 'spent';
		this.targetValue = null;
		this.moveProgressValue = 0;
		this.trapTimerValue = TRAP_DELAY;
		this.trapActiveValue = false;
		this.graceValue = 0;
		this.playerCaughtValue = false;
	}

	private switchTile(): UltraTile {
		const spawn = this.grid.switchSpawn;
		if (spawn) {
			return { x: spawn.x, y: spawn.y };
		}
		return FALLBACK_SWITCH_TILE;
	}

	private trapTile(): UltraTile {
		const spawn = this.grid.trapSpawn;
		if (spawn) {
			return { x: spawn.x, y: spawn.y };
		}
		return FALLBACK_TRAP_TILE;
	}

	private startContract(): void {
		this.phaseValue = 'contract';
		this.tileValue = this.switchTile();
		this.targetValue = null;
		this.facingValue = null;
		this.moveProgressValue = 0;
		this.trapTimerValue = TRAP_DELAY;
		this.trapActiveValue = false;
		this.graceValue = SPAWN_GRACE;
		this.playerCaughtValue = false;
		this.sealedValue = false;
	}

	private updateContract(dt: number, player: PlayerService): void {
		if (this.progressModel.remainingDots <= 0) {
			this.cancelContract();
			return;
		}
		if (this.graceValue > 0) {
			this.graceValue = Math.max(0, this.graceValue - dt);
		}
		if (this.trapTimerValue > 0) {
			this.trapTimerValue = Math.max(0, this.trapTimerValue - dt);
			if (this.trapTimerValue <= 0) {
				this.trapActiveValue = true;
				const trap = this.trapTile();
				if (this.tileValue.x === trap.x && this.tileValue.y === trap.y) {
					this.seal();
					return;
				}
			}
		}
		this.move(dt, player);
		if (this.phaseValue !== 'contract') {
			return;
		}
		const trap = this.trapTile();
		if (this.trapActiveValue && this.tileValue.x === trap.x && this.tileValue.y === trap.y) {
			this.seal();
			return;
		}
		if (this.graceValue <= 0) {
			const playerPosition = player.position;
			const ultraPosition = this.position;
			const dx = playerPosition.x - ultraPosition.x;
			const dy = playerPosition.y - ultraPosition.y;
			if (dx * dx + dy * dy <= CONTACT_DISTANCE_SQ) {
				this.playerCaughtValue = true;
			}
		}
	}

	private move(dt: number, player: PlayerService): void {
		let remaining = Math.min(0.25, Math.max(0, dt));
		let guard = 0;
		while (remaining > EPSILON && guard < 512 && this.phaseValue === 'contract') {
			guard += 1;
			if (!this.targetValue) {
				const direction = this.chooseDirection(player.tile);
				if (!direction) {
					break;
				}
				const target = this.targetFor(this.tileValue, direction);
				if (!this.grid.isUltraWalkable(target.x, target.y)) {
					break;
				}
				this.facingValue = direction;
				this.targetValue = target;
				this.moveProgressValue = 0;
			}
			const needed = Math.max(0, 1 - this.moveProgressValue);
			if (needed <= EPSILON) {
				this.completeMove();
				if (this.handleArrival()) {
					break;
				}
				if (this.progressModel.remainingDots <= 0) {
					this.cancelContract();
					break;
				}
				continue;
			}
			const step = ULTRA_SPEED * remaining;
			if (step < needed) {
				this.moveProgressValue = Math.min(1, this.moveProgressValue + step);
				remaining = 0;
			} else {
				remaining -= needed / ULTRA_SPEED;
				this.completeMove();
				if (this.handleArrival()) {
					break;
				}
				if (this.progressModel.remainingDots <= 0) {
					this.cancelContract();
					break;
				}
			}
		}
		if (guard >= 512) {
			console.error('UltraGhostService.move', 'movement guard exhausted');
		}
	}

	private completeMove(): void {
		if (!this.targetValue) {
			return;
		}
		this.tileValue = this.targetValue;
		this.targetValue = null;
		this.moveProgressValue = 0;
	}

	private handleArrival(): boolean {
		if (this.progressModel.destroyedDots < DOT_LIMIT) {
			this.progressModel.destroyDotAt(this.tileValue.x, this.tileValue.y);
		}
		const trap = this.trapTile();
		if (this.trapActiveValue && this.tileValue.x === trap.x && this.tileValue.y === trap.y) {
			this.seal();
			return true;
		}
		return false;
	}

	private seal(): void {
		this.phaseValue = 'sealed';
		this.scoreModel.add(ULTRA_REWARD);
		this.sealedValue = true;
		this.trapActiveValue = false;
		this.targetValue = null;
		this.moveProgressValue = 0;
		this.graceValue = 0;
		this.playerCaughtValue = false;
	}

	private chooseDirection(playerTile: UltraTile): UltraDirection | null {
		const candidates: UltraDirection[] = [];
		for (const direction of DIRECTIONS) {
			const target = this.targetFor(this.tileValue, direction);
			if (this.grid.isUltraWalkable(target.x, target.y)) {
				candidates.push(direction);
			}
		}
		if (candidates.length === 0) {
			return null;
		}
		if (candidates.length === 1) {
			return candidates[0];
		}
		const opposite = this.facingValue ? this.oppositeDirection(this.facingValue) : null;
		let choices = candidates;
		if (opposite) {
			const filtered = candidates.filter((direction) => direction !== opposite);
			if (filtered.length > 0) {
				choices = filtered;
			}
		}
		let best: UltraDirection | null = null;
		let bestScore = Number.POSITIVE_INFINITY;
		for (const direction of choices) {
			const candidate = this.targetFor(this.tileValue, direction);
			const score = this.distanceSq(candidate, playerTile);
			if (score < bestScore) {
				bestScore = score;
				best = direction;
			}
		}
		return best ?? choices[0];
	}

	private targetFor(tile: UltraTile, direction: UltraDirection): UltraTile {
		const vector = VECTORS[direction];
		return {
			x: tile.x + vector.x,
			y: tile.y + vector.y
		};
	}

	private oppositeDirection(direction: UltraDirection): UltraDirection {
		if (direction === 'UP') {
			return 'DOWN';
		}
		if (direction === 'DOWN') {
			return 'UP';
		}
		if (direction === 'LEFT') {
			return 'RIGHT';
		}
		return 'LEFT';
	}

	private distanceSq(a: UltraTile, b: UltraTile): number {
		const dx = a.x - b.x;
		const dy = a.y - b.y;
		return dx * dx + dy * dy;
	}
}