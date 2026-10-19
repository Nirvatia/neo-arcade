import type { GameModule } from '../../../shared/core/types';
import type { PacmanEventMap } from './Events';
import { EventBus } from '../engine/EventBus';
import { GameLoop } from '../engine/GameLoop';
import { Director } from './Director';
import { InputController } from './InputController';
import { RenderPipeline } from './RenderPipeline';
import { LevelLoader } from '../logic/LevelLoader';
import { PacmanAudioPlayer } from '../audio/PacmanAudioPlayer';
import { SvelteHudAdapter } from '../ui/hud/SvelteHudAdapter';
import { pacmanHudStore } from '../ui/hud/hudStore';

export class GameMain implements GameModule {
	private events: EventBus<PacmanEventMap> | null = null;
	private level: LevelLoader | null = null;
	private director: Director | null = null;
	private loop: GameLoop | null = null;
	private input: InputController | null = null;
	private render: RenderPipeline | null = null;
	private hudAdapter: SvelteHudAdapter | null = null;
	private audio: PacmanAudioPlayer | null = null;

	async init(container: HTMLDivElement): Promise<void> {
		if (this.loop) {
			return;
		}

		const events = new EventBus<PacmanEventMap>();
		const level = new LevelLoader(events);
		const audio = new PacmanAudioPlayer(events);
		const director = new Director(events, level);
		const render = new RenderPipeline(container, director, level);
		const hudAdapter = new SvelteHudAdapter(events, pacmanHudStore);
		const loop = new GameLoop(
			(dt) => {
				director.update(dt);
			},
			() => {
				render.render();
			}
		);

		const input = new InputController({
			direction: (direction) => {
				director.startPlaying();
				level.setDesiredDirection(direction);
			},
			confirm: () => {
				director.startPlaying();
			},
			pause: () => {
				director.togglePause();
			},
			menu: () => {
				director.returnToMenu();
			},
			profile: () => {
				if (director.stateName === 'menu' || director.stateName === 'game-over') {
					level.toggleProfile();
				}
			}
		});

		input.attach();
		loop.start();

		this.events = events;
		this.level = level;
		this.audio = audio;
		this.director = director;
		this.render = render;
		this.loop = loop;
		this.input = input;
		this.hudAdapter = hudAdapter;
	}

	destroy(): void {
		this.loop?.stop();
		this.input?.detach();
		this.render?.destroy();
		this.hudAdapter?.destroy();
		this.audio?.destroy();
		this.events?.clear();

		this.events = null;
		this.level = null;
		this.director = null;
		this.loop = null;
		this.input = null;
		this.render = null;
		this.hudAdapter = null;
		this.audio = null;
	}
}