import type { BitOp } from '../../components/index.js';
import type { BiomeManager } from '../../biomes/index.js';
import type { World } from '$games/snake/engine/ecs/World.js';

export interface TokenRender {
	col: number;
	row: number;
	op: BitOp;
}

export class TokenView {
	private readonly cellSize: number;
	private readonly biomes: BiomeManager;
	private readonly tokenBuffer: TokenRender[] = [];

	constructor(cellSize: number, biomes: BiomeManager) {
		this.cellSize = cellSize;
		this.biomes = biomes;
	}

	public render(ctx: CanvasRenderingContext2D, world: World, timeMS: number): void {
		let count = 0;
		const entities = world.query(['bitPowerUp', 'gridPosition']).entities;
		
		for (let e = 0; e < entities.length; e++) {
			const entity = entities[e];
			if (entity === undefined) continue;
			
			const tokenPos = world.getComponent(entity, 'gridPosition');
			const token = world.getComponent(entity, 'bitPowerUp');
			if (tokenPos === undefined || token === undefined) continue;
			
			if (count >= this.tokenBuffer.length) {
				this.tokenBuffer.push({ col: 0, row: 0, op: '<<' });
			}
			
			const t = this.tokenBuffer[count];
			if (t !== undefined) {
				t.col = tokenPos.col;
				t.row = tokenPos.row;
				t.op = token.op;
			}
			count++;
		}
		
		const cs = this.cellSize;
		for (let i = 0; i < count; i++) {
			const t = this.tokenBuffer[i];
			if (t === undefined) continue;
			this.biomes.biome.renderToken(ctx, t.op, t.col * cs, t.row * cs, cs, timeMS);
		}
	}

	public destroy(): void {
		// Ресурсов нет
	}
}