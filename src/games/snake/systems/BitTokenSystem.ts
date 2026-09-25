import { SystemBase } from '../core/ecs/SystemBase.js';
import type { World } from '../core/ecs/World.js';
import type { EntityId } from '../core/ecs/types.js';
import type { GridHolder } from '../logic/GridHolder.js';
import type { GridBitmask } from '../logic/GridBitmask.js';
import type { SeededRNG } from '../logic/SeededRNG.js';
import { BitOp } from '../components/index.js';
import { findHead } from '../logic/SnakeFactory.js';
import { getLevelTuning } from '../config/index.js';

const MAX_SPAWN_ATTEMPTS = 200;
// Пауза после подбора токена: лечит «цикл бесконечных бустов».
const TOKEN_RESPAWN_COOLDOWN_MS = 4000;

export class BitTokenSystem extends SystemBase {
	public readonly name = 'BitTokenSystem';
	private readonly holder: GridHolder;
	private readonly rng: SeededRNG;
	private readonly snakeId: EntityId;
	private maxActiveTokens: number;
	private respawnCooldownMS = 0;
	// В фазе выхода и в финале токены не нужны.
	private suppressed = false;

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
		this.world.events.on('exit:opened', this.onExitOpened);
		this.world.events.on('final:started', this.onFinalStarted);
		this.world.events.on('level:expanded', this.onLevelExpanded);
		this.world.events.on('game:endless', this.onEndlessStarted);
	}

	private onExitOpened = (): void => {
		this.suppressed = true;
	};

	private onFinalStarted = (): void => {
		this.suppressed = true;
	};

	private onLevelExpanded = (payload: { level: number }): void => {
		this.suppressed = false;
		this.maxActiveTokens = getLevelTuning(payload.level).maxActiveTokens;
	};

	private onEndlessStarted = (): void => {
		this.suppressed = false;
	};

	private get grid(): GridBitmask {
		return this.holder.grid;
	}

	public update(deltaMS: number): void {
		if (this.respawnCooldownMS > 0) {
			this.respawnCooldownMS = this.respawnCooldownMS - deltaMS;
		}
		this.ensureTokens();
		this.checkPickup();
	}

	private ensureTokens(): void {
		if (this.suppressed) {
			return;
		}
		const tokens = this.world.query(['bitPowerUp']).entities;
		if (tokens.length >= this.maxActiveTokens) {
			return;
		}
		if (this.respawnCooldownMS > 0) {
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
		// Буст реже отката: 30/70.
		if (this.rng.nextInt(10) < 3) {
			return BitOp.BOOST;
		}
		return BitOp.UNDO;
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
				const op = token.op;
				// Сначала убираем токен из мира, потом применяем операцию.
				// Иначе цепочка событий может завершить последовательность,
				// открыть выход и очистить поле (clearFieldForExit удалит этот
				// же токен), и повторный destroyEntity упадёт
				// с ошибкой «entity is not alive».
				this.world.destroyEntity(tokenId);
				this.respawnCooldownMS = TOKEN_RESPAWN_COOLDOWN_MS;
				this.world.events.emit('collision:bitop', {
					entity: headId,
					op
				});
				return;
			}
		}
	}
}