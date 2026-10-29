import type { SeasonPalette } from '../../logic/SeasonCatalog';
import type {
  EnergizerView,
  MazeView,
  PelletView,
  SceneView,
  SeasonRenderBundle,
  TeleportView,
  WeatherView
} from '../contracts/SeasonRenderBundle';
import { DoomScene } from './DoomScene';
import { DoomMaze } from './DoomMaze';
import { DoomPellet } from './DoomPellet';
import { DoomEnergizer } from './DoomEnergizer';
import { DoomTeleport } from './DoomTeleport';
import { DoomWeather } from './DoomWeather';

export class DoomRenderBundle implements SeasonRenderBundle {
  readonly scene: SceneView;
  readonly maze: MazeView;
  readonly pellet: PelletView;
  readonly energizer: EnergizerView;
  readonly teleport: TeleportView;
  readonly weather: WeatherView;

  constructor(_palette: SeasonPalette) {
    this.scene = new DoomScene();
    this.maze = new DoomMaze();
    this.pellet = new DoomPellet();
    this.energizer = new DoomEnergizer();
    this.teleport = new DoomTeleport();
    this.weather = new DoomWeather();
  }
}