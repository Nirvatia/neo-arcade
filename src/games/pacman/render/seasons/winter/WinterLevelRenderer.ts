import { GhostView } from '../../actors/GhostView';
import type { GridLayout } from '../../maze/GridView';
import type { SharedLayers } from '../../SharedLayers';
import type { LevelRenderer, RenderFrame } from '../../RenderFrame';
import type { GridService } from '../../../logic/maze/GridService';
import { WinterWorld } from './WinterWorld';

/** Share of eaten dots at which the blizzard rises, then the night falls. */
const STORM_AT = 0.5;
const NIGHT_AT = 0.75;

/**
 * Winter levels, from the owner's CLAUDE_GRID_WINTER mock-up: the baked snowy world and
 * its live layer, the atmosphere under the actors (so they stay readable), then the
 * blizzard and the vignette on top. Blizzard and night follow the level's progress.
 */
export class WinterLevelRenderer implements LevelRenderer {
	private readonly shared: SharedLayers;
	private readonly ghostView = new GhostView();
	private world: WinterWorld | null = null;
	private worldGrid: GridService | null = null;

	constructor(shared: SharedLayers) {
		this.shared = shared;
	}

	render(frame: RenderFrame): GridLayout {
		const { ctx, state, level, progress } = frame;
		const world = this.worldFor(frame);
		world.resize(frame.width, frame.height, frame.pixelRatio);
		const ratio = progress.collectionRatio;
		world.setMood(ratio >= STORM_AT ? 1 : 0, ratio >= NIGHT_AT ? 1 : 0);
		if (!frame.paused) {
			world.update(frame.dt);
		}
		const layout = world.layout;

		world.drawWorld(ctx, (x, y) => progress.isCollected(x, y));
		world.drawMood(ctx);
		if (state === 'level-clear') {
			this.shared.drawLevelClear(frame, layout);
		} else {
			this.shared.drawCollectibles(frame, layout);
			const ghosts = level.ghosts;
			if (ghosts) {
				const isMs = level.profile === 'ms-pacman';
				const hypnosis = level.hypnosis;
				const combat = level.combat;
				const ghostTimer = isMs
					? hypnosis
						? hypnosis.overdriveTimer
						: 0
					: combat
						? combat.powerTimer
						: 0;
				const overdrive = Boolean(isMs && hypnosis && hypnosis.overdriveActive);
				this.ghostView.draw(ctx, ghosts, layout, ghostTimer, overdrive);
			}
			if (state !== 'death') {
				// while dying, the pipeline draws Pac-Man over the level decay
				this.shared.drawPlayer(frame, layout);
			}
		}
		world.drawOverlay(ctx);
		return layout;
	}

	/** The baked world is rebuilt only when a new winter level (a new grid) starts. */
	private worldFor(frame: RenderFrame): WinterWorld {
		if (!this.world || this.worldGrid !== frame.grid) {
			this.world = new WinterWorld(frame.season.grid);
			this.worldGrid = frame.grid;
		}
		return this.world;
	}
}
