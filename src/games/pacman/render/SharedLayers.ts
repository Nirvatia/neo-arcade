import type { GridLayout } from './maze/GridView';
import { PlayerView } from './actors/PlayerView';
import { MsPacmanView } from './actors/MsPacmanView';
import type { PacmanAudioCue } from '../core/Events';
import type { PlayerDrawOptions } from './actors/PlayerView';
import { EchoCloneView } from './actors/EchoCloneView';
import { FruitView } from './items/fruit/FruitView';
import { EasterEggView } from './items/EasterEggView';
import { drawBonusLife } from './items/BonusLifeView';
import { drawExit } from './items/ExitView';
import type { RenderFrame } from './RenderFrame';

/**
 * Layers drawn the same way on every level: Pac-Man and the bonuses. Level renderers place
 * the bonuses in their draw order; the pipeline draws Pac-Man over the level decay and the
 * season turn. The HUD and the screens are Svelte (`ui/PacmanUi`), not canvas.
 */
export class SharedLayers {
	readonly playerView = new PlayerView();
	private readonly msPacmanView = new MsPacmanView();
	private readonly fruitView = new FruitView();
	private readonly easterEggView = new EasterEggView();
	private readonly echoCloneView = new EchoCloneView();

	drawCollectibles(frame: RenderFrame, layout: GridLayout): void {
		const { ctx, level } = frame;
		const fruit = level.fruit;
		if (fruit && fruit.active !== null) {
			this.fruitView.draw(ctx, fruit, layout, frame.time);
		}

		const egg = level.egg;
		if (egg && egg.phase === 'egg') {
			this.easterEggView.draw(ctx, egg, layout, frame.time);
		}

		const echo = level.echo;
		if (echo && (echo.phase === 'token' || echo.phase === 'clone')) {
			this.echoCloneView.draw(ctx, echo, layout);
		}

		const reward = level.bossReward;
		const heart = reward?.offered ? reward.heart : null;
		const exit = reward?.offered ? reward.exit : null;
		const S = layout.tileSize;
		if (exit) {
			drawExit(ctx, layout.offsetX + exit.x * S, layout.offsetY + exit.y * S, S, frame.time);
		}
		if (heart) {
			drawBonusLife(ctx, layout.offsetX + heart.x * S, layout.offsetY + heart.y * S, S, frame.time);
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
