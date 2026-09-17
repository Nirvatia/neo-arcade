import { SystemBase } from '../core/ecs/SystemBase.js';
import type { World } from '../core/ecs/World.js';
import type { EntityId } from '../core/ecs/types.js';
import type { GridHolder } from '../logic/GridHolder.js';
import type { GridBitmask } from '../logic/GridBitmask.js';
import type { SeededRNG } from '../logic/SeededRNG.js';
import { BitOp } from '../components/index.js';
import { findHead } from '../logic/SnakeFactory.js';

const MAX_SPAWN_ATTEMPTS = 200;

export class BitTokenSystem extends SystemBase {
	public readonly name = 'BitTokenSystem';

	private readonly holder: GridHolder;
	private readonly rng: SeededRNG;
	private readonly snakeId: EntityId;
	private readonly maxActiveTokens: number;

	constructor(
		world: World,
		holder: GridHolder,
		rng: SeededRNG,
		snakeId: EntityId,
		maxActiveTokens: number
	) {
		super(world);
		this.holder = holder;
		this.rng = rng;
		this.snakeId = snakeId;
		this.maxActiveTokens = maxActiveTokens;
	}

	private get grid(): GridBitmask {
		return this.holder.grid;
	}

	public update(_deltaMS: number): void {
		this.ensureTokens();
		this.checkPickup();
	}

	private ensureTokens(): void {
		const tokens = this.world.query(['bitPowerUp']).entities;

		if (tokens.length >= this.maxActiveTokens) {
			return;
		}

		this.spawnToken();
	}

	private spawnToken(): void {
		for (let attempt = 0; attempt < MAX_SPAWN_ATTEMPTS; attempt++) {
			const col = this.rng.nextInt(this.grid.cols);
			const row = this.rng.nextInt(this.grid.rows);

			if (!this.grid.withinBounds(col, row)) {
				continue;
			}

			if (this.grid.isWall(col, row)) {
				continue;
			}

			if (this.grid.isOccupied(col, row)) {
				continue;
			}

			if (this.grid.isFood(col, row)) {
				continue;
			}

			if (this.grid.isExit(col, row)) {
				continue;
			}

			const tokenId = this.world.createEntity();

			this.world.addComponent(tokenId, 'gridPosition', {
				col,
				row
			});

			this.world.addComponent(tokenId, 'bitPowerUp', {
				op: this.randomOp()
			});

			return;
		}
	}

	private randomOp(): BitOp {
		const value = this.rng.nextInt(4);

		if (value === 0) {
			return BitOp.SHL;
		}

		if (value === 1) {
			return BitOp.SHR;
		}

		if (value === 2) {
			return BitOp.SHL3;
		}

		return BitOp.SHR3;
	}

	private checkPickup(): void {
		const headId = findHead(this.world, this.snakeId);
		const headPos = this.world.getComponent(headId, 'gridPosition');

		if (headPos === undefined) {
			return;
		}

		const tokens = this.world.query(['bitPowerUp', 'gridPosition']).entities;

		for (const tokenId of tokens) {
			const tokenPos = this.world.getComponent(tokenId, 'gridPosition');
			const token = this.world.getComponent(tokenId, 'bitPowerUp');

			if (tokenPos === undefined || token === undefined) {
				continue;
			}

			if (tokenPos.col === headPos.col && tokenPos.row === headPos.row) {
				this.world.events.emit('collision:bitop', {
					entity: headId,
					op: token.op
				});

				this.world.destroyEntity(tokenId);
				return;
			}
		}
	}
}
