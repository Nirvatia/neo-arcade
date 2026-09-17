import type { GridBitmask } from './GridBitmask.js';

// Системы читают поле отсюда. При расширении уровня поле подменяется внутри.
export class GridHolder {
	public grid: GridBitmask;

	constructor(grid: GridBitmask) {
		this.grid = grid;
	}
}
