import type { GridLayout, DisintegrationMask } from './maze/GridView';
import { PlayerView } from './actors/PlayerView';
import type { PlayerDrawOptions } from './actors/PlayerView';
import { EchoCloneView } from './actors/EchoCloneView';
import { FruitView } from './items/fruit/FruitView';
import { GoldenEggView } from './items/GoldenEggView';
import { DeathWaveView, deathWaveEase, deathWaveMaxRadius } from './transitions/DeathWaveView';
import { LevelClearView } from './transitions/LevelClearView';
import { OverlayView } from './overlay/OverlayView';
import { buildOverlaySnapshot } from './overlay/overlaySnapshot';
import type { RenderFrame } from './RenderFrame';

/** True when `position` (tile-center coordinates) is inside the death-wave mask. */
export function erased(
	position: { x: number; y: number },
	mask: DisintegrationMask | null
): boolean {
	if (!mask) {
		return false;
	}
	const dx = position.x - mask.centerX;
	const dy = position.y - mask.centerY;
	return dx * dx + dy * dy <= mask.radius * mask.radius;
}

/**
 * Layers drawn the same way on every level: Pac-Man, the bonuses, the death wave, the
 * level-clear cutscene and the canvas overlay. Level renderers decide where in their
 * draw order each layer goes.
 */
export class SharedLayers {
	readonly playerView = new PlayerView();
	private readonly fruitView = new FruitView();
	private readonly goldenEggView = new GoldenEggView();
	private readonly echoCloneView = new EchoCloneView();
	private readonly deathWaveView = new DeathWaveView();
	private readonly levelClearView = new LevelClearView();
	private readonly overlayView = new OverlayView();

	/** The death wave as a mask over the maze, or null outside the death state. */
	disintegrationMask(frame: RenderFrame): DisintegrationMask | null {
		if (frame.state !== 'death') {
			return null;
		}
		const wave = frame.director.deathWave;
		if (!wave || !Number.isFinite(wave.progress) || wave.progress <= 0) {
			return null;
		}
		const radius =
			deathWaveEase(wave.progress) * deathWaveMaxRadius(frame.grid.width, frame.grid.height);
		if (!Number.isFinite(radius) || radius <= 0) {
			return null;
		}
		return { centerX: wave.x, centerY: wave.y, radius };
	}

	drawCollectibles(frame: RenderFrame, layout: GridLayout, mask: DisintegrationMask | null): void {
		const { ctx, level } = frame;
		const fruit = level.fruit;
		if (fruit && fruit.active !== null && !erased(fruit.position, mask)) {
			this.fruitView.draw(ctx, fruit, layout);
		}

		const egg = level.egg;
		if (egg && egg.phase === 'egg' && !erased(egg.eggPosition, mask)) {
			this.goldenEggView.draw(ctx, egg, layout);
		}

		const echo = level.echo;
		if (
			echo &&
			(echo.phase === 'token' || echo.phase === 'clone') &&
			!erased(echo.position, mask)
		) {
			this.echoCloneView.draw(ctx, echo, layout);
		}
	}

	drawPlayer(frame: RenderFrame, layout: GridLayout): void {
		const player = frame.level.player;
		if (player) {
			this.playerView.draw(
				frame.ctx,
				player,
				layout,
				frame.level.profile,
				frame.time,
				this.playerOptions(frame)
			);
		}
	}

	drawDeathWave(frame: RenderFrame, layout: GridLayout): void {
		const wave = frame.director.deathWave;
		if (wave) {
			this.deathWaveView.draw(
				frame.ctx,
				layout,
				frame.grid.width,
				frame.grid.height,
				wave.x,
				wave.y,
				wave.progress
			);
		}
	}

	drawLevelClear(frame: RenderFrame, layout: GridLayout): void {
		const clear = frame.director.levelClear;
		if (clear && clear.phase === 'cutscene') {
			this.levelClearView.draw(frame.ctx, clear, frame.grid, layout, frame.level.profile);
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
