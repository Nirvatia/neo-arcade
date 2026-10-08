import type { BitOp } from '$games/snake/components/index.js';
import type { GridBitmask } from '$games/snake/logic/grid/GridBitmask.js';
import type {
	FoodRender,
	SnakeChainPoint,
	SnakeHeadRender,
	SnakeZoneStyle
} from './renderData.js';
import type { ParticleRenderer } from './renderers.js';

export interface BiomeTheme {
	pageBackground: string;
	cssVariables: Record<string, string>;
}

export interface BiomePalette {
	screenBackground: number;
	field: number;
	grid: number;
	wall: number;
	wallEdge: number;
	form: number;
	formDim: number;
	accent: number;
	warn: number;
	bitOne: number;
	bitZero: number;
}

export interface Biome {
	readonly id: string;
	readonly palette: BiomePalette;
	readonly theme: BiomeTheme;
	readonly particleRenderer: ParticleRenderer;
	
	renderField(
		ctx: CanvasRenderingContext2D,
		grid: GridBitmask,
		cellSize: number
	): void;
	
	renderExit(
		ctx: CanvasRenderingContext2D,
		grid: GridBitmask,
		timeMS: number,
		cellSize: number
	): void;
	
	renderFood(
		ctx: CanvasRenderingContext2D,
		foods: FoodRender[],
		count: number,
		timeMS: number,
		cellSize: number
	): void;
	
	renderSnake(
		ctx: CanvasRenderingContext2D,
		chain: SnakeChainPoint[],
		start: number,
		end: number,
		zones: SnakeZoneStyle[],
		head: SnakeHeadRender,
		timeMS: number,
		cellSize: number
	): void;
	
	renderToken(
		ctx: CanvasRenderingContext2D,
		op: BitOp,
		x: number,
		y: number,
		cellSize: number,
		timeMS: number
	): void;
	
	updateAmbient(
		deltaMS: number,
		timeMS: number,
		cellSize: number,
		cols: number,
		rows: number
	): void;
	renderAmbient(ctx: CanvasRenderingContext2D): void;
	renderAmbientForeground?(ctx: CanvasRenderingContext2D): void;
	destroy(): void;
}