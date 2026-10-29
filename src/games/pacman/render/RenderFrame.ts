import type { Director } from '../core/Director';
import type { PacmanStateName } from '../core/Events';
import type { LevelLoader } from '../logic/level/LevelLoader';
import type { LevelProgress } from '../logic/level/LevelProgress';
import type { SeasonData } from '../logic/level/SeasonCatalog';
import type { GridService } from '../logic/maze/GridService';

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
	readonly state: PacmanStateName;
	readonly director: Director;
	readonly level: LevelLoader;
	readonly season: SeasonData;
	readonly grid: GridService;
	readonly progress: LevelProgress;
}

/** Draws one kind of level (seasonal or hell) into the frame. */
export interface LevelRenderer {
	render(frame: RenderFrame): void;
}
