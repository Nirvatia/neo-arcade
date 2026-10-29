import type { SeasonRenderBundle } from '../../contracts/SeasonRenderBundle';
import type { SeasonPalette } from '../../../logic/SeasonCatalog';
import { SecretScene } from './SecretScene';
import { SecretMaze } from './SecretMaze';
import { SecretPellet } from './SecretPellet';
import { SecretEnergizer } from './SecretEnergizer';
import { SecretTeleport } from './SecretTeleport';
import { SecretWeather } from './SecretWeather';

export class SecretRenderBundle implements SeasonRenderBundle {
	readonly scene: SecretScene;
	readonly maze: SecretMaze;
	readonly pellet: SecretPellet;
	readonly energizer: SecretEnergizer;
	readonly teleport: SecretTeleport;
	readonly weather: SecretWeather;

	constructor(_palette: SeasonPalette) {
		this.scene = new SecretScene();
		this.maze = new SecretMaze();
		this.pellet = new SecretPellet();
		this.energizer = new SecretEnergizer();
		this.teleport = new SecretTeleport();
		this.weather = new SecretWeather();
	}
}
