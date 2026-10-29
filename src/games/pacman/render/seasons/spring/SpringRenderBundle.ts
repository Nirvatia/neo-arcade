import type { SeasonRenderBundle } from '../../contracts/SeasonRenderBundle';
import type { SeasonPalette } from '../../../logic/SeasonCatalog';
import { SpringScene } from './SpringScene';
import { SpringMaze } from './SpringMaze';
import { SpringPellet } from './SpringPellet';
import { SpringEnergizer } from './SpringEnergizer';
import { SpringTeleport } from './SpringTeleport';
import { SpringWeather } from './SpringWeather';

export class SpringRenderBundle implements SeasonRenderBundle {
	readonly scene: SpringScene;
	readonly maze: SpringMaze;
	readonly pellet: SpringPellet;
	readonly energizer: SpringEnergizer;
	readonly teleport: SpringTeleport;
	readonly weather: SpringWeather;

	constructor(_palette: SeasonPalette) {
		this.scene = new SpringScene();
		this.maze = new SpringMaze();
		this.pellet = new SpringPellet();
		this.energizer = new SpringEnergizer();
		this.teleport = new SpringTeleport();
		this.weather = new SpringWeather();
	}
}