import type { Director, FlowSnapshot } from '../core/Director';
import type { PacmanStateName } from '../core/Events';
import type { LevelLoader } from '../logic/level/LevelLoader';
import type { LevelProgress } from '../logic/level/LevelProgress';
import type { SeasonData } from '../logic/level/SeasonCatalog';
import type { GridService } from '../logic/maze/GridService';
import type { GridLayout } from './maze/GridView';

/** Everything a level renderer needs for one frame. Built by `RenderPipeline`. */
export interface RenderFrame {
	readonly ctx: CanvasRenderingContext2D;
	/** Viewport size in CSS pixels. */
	readonly width: number;
	readonly height: number;
	readonly pixelRatio: number;
	/** Seconds since the previous frame (capped) and total render time. */
	readonly dt: number;
	readonly time: number;
	/** The state on screen; while paused, the suspended one (see `paused`). */
	readonly state: PacmanStateName;
	readonly paused: boolean;
	/** Phase and progress of the state on screen, for animations to hook into. */
	readonly flow: FlowSnapshot;
	readonly director: Director;
	readonly level: LevelLoader;
	readonly season: SeasonData;
	readonly grid: GridService;
	readonly progress: LevelProgress;
}

/**
 * Draws one kind of level into the frame and returns where the board went. In the death
 * state it leaves Pac-Man out (the pipeline draws him over the level decay); the canvas
 * overlay is always drawn by the pipeline.
 */
export interface LevelRenderer {
	render(frame: RenderFrame): GridLayout;
}
