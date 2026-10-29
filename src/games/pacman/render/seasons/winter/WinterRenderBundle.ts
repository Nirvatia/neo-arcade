import type { SeasonRenderBundle } from '../../contracts/SeasonRenderBundle';
import type { SeasonPalette } from '../../../logic/SeasonCatalog';
import { WinterScene } from './WinterScene';
import { WinterMaze } from './WinterMaze';
import { WinterPellet } from './WinterPellet';
import { WinterEnergizer } from './WinterEnergizer';
import { WinterTeleport } from './WinterTeleport';
import { WinterWeather } from './WinterWeather';

export class WinterRenderBundle implements SeasonRenderBundle {
	readonly scene: WinterScene;
	readonly maze: WinterMaze;
	readonly pellet: WinterPellet;
	readonly energizer: WinterEnergizer;
	readonly teleport: WinterTeleport;
	readonly weather: WinterWeather;

	constructor(_palette: SeasonPalette) {
		this.scene = new WinterScene();
		this.maze = new WinterMaze();
		this.pellet = new WinterPellet();
		this.energizer = new WinterEnergizer();
		this.teleport = new WinterTeleport();
		this.weather = new WinterWeather();
	}
}
