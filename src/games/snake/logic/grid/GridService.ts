import { GridModel } from './GridModel.js';
import { GridCollision } from './GridCollision.js';
import { GridWriter } from './GridWriter.js';
import { GridSpawner } from './GridSpawner.js';
import { GridBitmask } from './GridBitmask.js';

/**
 * GridService — замена GridHolder.
 * Объединяет GridModel, GridCollision, GridWriter, GridSpawner
 * и предоставляет фасад GridBitmask для совместимости.
 */
export class GridService {
	public model: GridModel;
	public readonly collision: GridCollision;
	public readonly writer: GridWriter;
	public readonly spawner: GridSpawner;
	/** Фасад для совместимости с SnakeFactory, биомами, RenderSystem. */
	public grid: GridBitmask;

	constructor(cols: number, rows: number) {
		this.model = new GridModel(cols, rows);
		this.collision = new GridCollision(this.model);
		this.writer = new GridWriter(this.model);
		this.spawner = new GridSpawner(this.model, this.collision);
		this.grid = new GridBitmask(
			this.model,
			this.collision,
			this.writer,
			this.spawner
		);
	}

	/**
	 * Подмена поля при расширении уровня.
	 * Обновляет все подкомпоненты и фасад.
	 */
	public replaceModel(newModel: GridModel): void {
		this.model = newModel;
		this.collision.setModel(newModel);
		this.writer.setModel(newModel);
		this.spawner.setModel(newModel);
		this.grid = new GridBitmask(
			newModel,
			this.collision,
			this.writer,
			this.spawner
		);
	}
}   