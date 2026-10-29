import type { MazeColors } from './MazePalette';
import type { GridLayout } from '../GridView';

export type GhostSpawnToken = 'BY' | 'PY' | 'IY' | 'CE';

export interface RenderBoard {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

export interface SceneView {
	draw(
		ctx: CanvasRenderingContext2D,
		width: number,
		height: number,
		seed: number,
		board: RenderBoard | null
	): void;
}

export interface MazeView {
	drawWall(
		ctx: CanvasRenderingContext2D,
		px: number,
		py: number,
		tileSize: number,
		colors: MazeColors,
		tx: number,
		ty: number
	): void;

	drawFloor(
		ctx: CanvasRenderingContext2D,
		px: number,
		py: number,
		tileSize: number,
		colors: MazeColors,
		tx: number,
		ty: number
	): void;

	drawGate(
		ctx: CanvasRenderingContext2D,
		px: number,
		py: number,
		tileSize: number,
		colors: MazeColors,
		tx: number,
		ty: number
	): void;

	drawLairFloor(
		ctx: CanvasRenderingContext2D,
		px: number,
		py: number,
		tileSize: number,
		colors: MazeColors,
		tx: number,
		ty: number
	): void;

	drawPlayerSpawn(
		ctx: CanvasRenderingContext2D,
		px: number,
		py: number,
		tileSize: number,
		colors: MazeColors,
		tx: number,
		ty: number
	): void;

	drawGhostSpawn(
		ctx: CanvasRenderingContext2D,
		px: number,
		py: number,
		tileSize: number,
		token: GhostSpawnToken,
		colors: MazeColors,
		tx: number,
		ty: number
	): void;
}

export interface PelletView {
	draw(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		tileSize: number,
		colors: MazeColors,
		tx: number,
		ty: number
	): void;
}

export interface EnergizerView {
	draw(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		tileSize: number,
		colors: MazeColors,
		time: number,
		tx: number,
		ty: number
	): void;
}

export interface TeleportView {
	draw(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		tileSize: number,
		token: string
	): void;
}

export interface WeatherView {
	draw(
		ctx: CanvasRenderingContext2D,
		layout: GridLayout,
		viewportWidth: number,
		viewportHeight: number,
		dt: number,
		time: number
	): void;
}

export interface SeasonRenderBundle {
	readonly scene: SceneView;
	readonly maze: MazeView;
	readonly pellet: PelletView;
	readonly energizer: EnergizerView;
	readonly teleport: TeleportView;
	readonly weather: WeatherView;
}