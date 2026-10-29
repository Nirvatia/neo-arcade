import type { SeasonRenderBundle } from '../../contracts/SeasonRenderBundle';
import type { SeasonPalette } from '../../../logic/SeasonCatalog';
import { SummerScene } from './SummerScene';
import { SummerMaze } from './SummerMaze';
import { SummerPellet } from './SummerPellet';
import { SummerEnergizer } from './SummerEnergizer';
import { SummerTeleport } from './SummerTeleport';
import { SummerWeather } from './SummerWeather';

export class SummerRenderBundle implements SeasonRenderBundle {
	readonly scene: SummerScene;
	readonly maze: SummerMaze;
	readonly pellet: SummerPellet;
	readonly energizer: SummerEnergizer;
	readonly teleport: SummerTeleport;
	readonly weather: SummerWeather;

	constructor(_palette: SeasonPalette) {
		this.scene = new SummerScene();
		this.maze = new SummerMaze();
		this.pellet = new SummerPellet();
		this.energizer = new SummerEnergizer();
		this.teleport = new SummerTeleport();
		this.weather = new SummerWeather();
	}
}