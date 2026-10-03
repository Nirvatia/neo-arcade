import { SystemBase } from '../core/ecs/SystemBase.js';
import type { World } from '../core/ecs/World.js';
import type { EntityId } from '../core/ecs/types.js';
import type { GridService } from '../logic/grid/GridService.js';
import type { SeededRNG } from '../logic/SeededRNG.js';
import type { BitRegisterSystem } from './BitRegisterSystem.js';
import { BitOp } from '../components/index.js';
import { findHead } from '../logic/SnakeFactory.js';
import { GameplayConfig, getLevelTuning } from '../config/index.js';

export class BitTokenSystem extends SystemBase {
	public readonly name = 'BitTokenSystem';
	private readonly service: GridService;
	private readonly rng: SeededRNG;
	private readonly snakeId: EntityId;
	private bitRegister: BitRegisterSystem | null = null;
	private maxActiveTokens: number;
	private respawnCooldownMS = 0;
	private suppressed = false;

	constructor(
		world: World, service: GridService, rng: SeededRNG,
		snakeId: EntityId, maxActiveTokens: number
	) {
		super(world);
		this.service = service;
		this.rng = rng;
		this.snakeId = snakeId;
		this.maxActiveTokens = maxActiveTokens;
	}

	public setBitRegister(bitRegister: BitRegisterSystem): void {
		this.bitRegister = bitRegister;
	}

	public suppress(): void {
		this.suppressed = true;
	}

	public unsuppress(): void {
		this.suppressed = false;
	}

	public onLevelExpanded(level: number): void {
		this.suppressed = false;
		this.maxActiveTokens = getLevelTuning(level).maxActiveTokens;
	}

	public update(deltaMS: number): void {
		if (this.respawnCooldownMS > 0) {
			this.respawnCooldownMS = this.respawnCooldownMS - deltaMS;
		}
		this.ensureTokens();
		this.checkPickup();
	}

	private ensureTokens(): void {
		if (this.suppressed) return;
		const tokens = this.world.query(['bitPowerUp']).entities;
		if (tokens.length >= this.maxActiveTokens) return;
		if (this.respawnCooldownMS > 0) return;
		this.spawnToken();
	}

	private spawnToken(): void {
		const cell = this.service.spawner.findFreeCell(this.rng);
		if (cell === null) return;
		const tokenId = this.world.createEntity();
		this.world.addComponent(tokenId, 'gridPosition', { col: cell.col, row: cell.row });
		this.world.addComponent(tokenId, 'bitPowerUp', { op: this.randomOp() });
	}

	private randomOp(): BitOp {
		if (this.rng.nextInt(10) < 3) {
			return BitOp.BOOST;
		}
		return BitOp.UNDO;
	}

	private checkPickup(): void {
		if (this.bitRegister === null) return;
		const headId = findHead(this.world, this.snakeId);
		const headPos = this.world.getComponent(headId, 'gridPosition');
		if (headPos === undefined) return;
		const tokens = this.world.query(['bitPowerUp', 'gridPosition']).entities;
		for (const tokenId of tokens) {
			const tokenPos = this.world.getComponent(tokenId, 'gridPosition');
			const token = this.world.getComponent(tokenId, 'bitPowerUp');
			if (tokenPos === undefined || token === undefined) continue;
			if (tokenPos.col === headPos.col && tokenPos.row === headPos.row) {
				const op = token.op;
				this.world.destroyEntity(tokenId);
				this.respawnCooldownMS = GameplayConfig.TOKEN_RESPAWN_COOLDOWN_MS;
				this.bitRegister.onBitOperation(op);
				return;
			}
		}
	}
}