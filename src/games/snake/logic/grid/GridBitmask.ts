import type { GridModel } from './GridModel.js';
import type { GridCollision } from './GridCollision.js';
import type { GridWriter } from './GridWriter.js';
import type { GridSpawner } from './GridSpawner.js';

/**
 * GridBitmask — фасад для совместимости.
 * Публичный интерфейс не меняется.
 * Все методы делегируют в GridModel / GridCollision / GridWriter / GridSpawner.
 */
export class GridBitmask {
	private readonly model: GridModel;
	private readonly collision: GridCollision;
	private readonly writer: GridWriter;
	private readonly spawner: GridSpawner;

	constructor(
		model: GridModel,
		collision: GridCollision,
		writer: GridWriter,
		spawner: GridSpawner
	) {
		this.model = model;
		this.collision = collision;
		this.writer = writer;
		this.spawner = spawner;
	}

	public get cols(): number {
		return this.model.cols;
	}

	public get rows(): number {
		return this.model.rows;
	}

	public get walls(): Uint32Array {
		return this.model.walls;
	}

	public get foodBits(): Uint32Array {
		return this.model.foodBits;
	}

	public get foodExists(): Uint32Array {
		return this.model.foodExists;
	}

	public get occupancy(): Uint32Array {
		return this.model.occupancy;
	}

	public get exit(): Uint32Array {
		return this.model.exit;
	}

	// === Чтение (делегирование в GridCollision) ===

	public withinBounds(col: number, row: number): boolean {
		return this.collision.withinBounds(col, row);
	}

	public isWall(col: number, row: number): boolean {
		return this.collision.isWall(col, row);
	}

	public isOccupied(col: number, row: number): boolean {
		return this.collision.isOccupied(col, row);
	}

	public isFood(col: number, row: number): boolean {
		return this.collision.isFood(col, row);
	}

	public getFoodBit(col: number, row: number): 0 | 1 {
		return this.collision.getFoodBit(col, row);
	}

	public isExit(col: number, row: number): boolean {
		return this.collision.isExit(col, row);
	}

	// === Запись (делегирование в GridWriter) ===

	public setWall(col: number, row: number): void {
		this.writer.setWall(col, row);
	}

	public setFood(col: number, row: number, bit: 0 | 1): void {
		this.writer.setFood(col, row, bit);
	}

	public clearFood(col: number, row: number): void {
		this.writer.clearFood(col, row);
	}

	public setOccupied(col: number, row: number): void {
		this.writer.setOccupied(col, row);
	}

	public clearOccupied(col: number, row: number): void {
		this.writer.clearOccupied(col, row);
	}

	public setExit(col: number, row: number): void {
		this.writer.setExit(col, row);
	}

	public clearExit(col: number, row: number): void {
		this.writer.clearExit(col, row);
	}

	public buildPerimeter(): void {
		this.writer.buildPerimeter();
	}

	// === Подсчёт / очистка ===

	public countFood(): number {
		return this.spawner.countFood();
	}

	public clearAll(): void {
		this.model.clearAll();
	}

	public clearAllFood(): void {
		this.model.clearAllFood();
	}
}