import type { GridLayout } from './maze/GridView';
import { PlayerView } from './actors/PlayerView';
import { MsPacmanView } from './actors/MsPacmanView';
import type { PacmanAudioCue } from '../core/Events';
import type { PlayerDrawOptions } from './actors/PlayerView';
import { EchoCloneView } from './actors/EchoCloneView';
import { FruitView } from './items/fruit/FruitView';
import { GoldenEggView } from './items/GoldenEggView';
import { OverlayView } from './overlay/OverlayView';
import { buildOverlaySnapshot } from './overlay/overlaySnapshot';
import type { RenderFrame } from './RenderFrame';

/**
 * Layers drawn the same way on every level: Pac-Man, the bonuses and the canvas overlay.
 * Level renderers place the bonuses in their draw order; the pipeline draws Pac-Man over
 * the level decay and the season turn, and the overlay last.
 */
export class SharedLayers {
	readonly playerView = new PlayerView();
	private readonly msPacmanView = new MsPacmanView();
	private readonly fruitView = new FruitView();
	private readonly goldenEggView = new GoldenEggView();
	private readonly echoCloneView = new EchoCloneView();
	private readonly overlayView = new OverlayView();

	drawCollectibles(frame: RenderFrame, layout: GridLayout): void {
		const { ctx, level } = frame;
		const fruit = level.fruit;
		if (fruit && fruit.active !== null) {
			this.fruitView.draw(ctx, fruit, layout, frame.time);
		}

		const egg = level.egg;
		if (egg && egg.phase === 'egg') {
			this.goldenEggView.draw(ctx, egg, layout);
		}

		const echo = level.echo;
		if (echo && (echo.phase === 'token' || echo.phase === 'clone')) {
			this.echoCloneView.draw(ctx, echo, layout);
		}
	}

	/** Eating, power-ups, teleports: both players react, only the one on screen shows it. */
	trigger(cue: PacmanAudioCue): void {
		this.playerView.trigger(cue);
		this.msPacmanView.trigger(cue);
	}

	drawPlayer(frame: RenderFrame, layout: GridLayout): void {
		const player = frame.level.player;
		if (!player) {
			return;
		}
		if (frame.level.profile === 'ms-pacman') {
			this.msPacmanView.draw(frame.ctx, player, layout, frame.time, this.playerOptions(frame));
		} else {
			this.playerView.draw(frame.ctx, player, layout, frame.time, this.playerOptions(frame));
		}
	}

	drawOverlay(frame: RenderFrame, layout: GridLayout): void {
		const snapshot = buildOverlaySnapshot(frame.director, frame.level);
		if (snapshot.mode === 'none') {
			return;
		}
		this.overlayView.draw(
			frame.ctx,
			snapshot,
			layout,
			frame.grid.width * layout.tileSize,
			frame.grid.height * layout.tileSize,
			!frame.level.hellMode
		);
	}

	private playerOptions(frame: RenderFrame): PlayerDrawOptions {
		const { level } = frame;
		const dying = frame.state === 'death';
		if (level.hellMode) {
			const doom = level.doom;
			return {
				look: doom && doom.berserkActive ? 'berserk' : 'normal',
				charge: doom && doom.bfgCharging ? doom.bfgChargeProgress : 0,
				dying
			};
		}
		const combat = level.combat;
		const hypnosis = level.hypnosis;
		const powered =
			level.profile === 'ms-pacman'
				? Boolean(hypnosis && hypnosis.overdriveActive)
				: Boolean(combat && combat.isPowerActive);
		return { look: powered ? 'energized' : 'normal', charge: 0, dying };
	}
}
