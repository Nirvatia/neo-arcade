import type { SeasonRenderBundle } from '../../contracts/SeasonRenderBundle';
import { AutumnScene } from './AutumnScene';
import { AutumnMaze } from './AutumnMaze';
import { AutumnPellet } from './AutumnPellet';
import { AutumnEnergizer } from './AutumnEnergizer';
import { AutumnTeleport } from './AutumnTeleport';
import { AutumnWeather } from './AutumnWeather';

export class AutumnRenderBundle implements SeasonRenderBundle {
	readonly scene: AutumnScene;
	readonly maze: AutumnMaze;
	readonly pellet: AutumnPellet;
	readonly energizer: AutumnEnergizer;
	readonly teleport: AutumnTeleport;
	readonly weather: AutumnWeather;

	constructor() {
		this.scene = new AutumnScene();
		this.maze = new AutumnMaze();
		this.pellet = new AutumnPellet();
		this.energizer = new AutumnEnergizer();
		this.teleport = new AutumnTeleport();
		this.weather = new AutumnWeather();
	}
}
