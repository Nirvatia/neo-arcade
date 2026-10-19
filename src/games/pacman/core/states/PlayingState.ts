import type { GameState, GameStateContext } from '../Director';
import type { PacmanStateName } from '../Events';

export class PlayingState implements GameState {
	readonly name: PacmanStateName = 'playing';
	private readonly resume: boolean;
	private lastHudKey = '';

	constructor(resume: boolean) {
		this.resume = resume;
	}

	enter(ctx: GameStateContext): void {
		ctx.level.ensure();

		if (!this.resume) {
			ctx.level.resetGameplay();
		}
	}

	update(ctx: GameStateContext, dt: number): void {
		const player = ctx.level.player;
		const fruit = ctx.level.fruit;
		const egg = ctx.level.egg;
		const ultra = ctx.level.ultra;
		const ghosts = ctx.level.ghosts;
		const combat = ctx.level.combat;
		const progress = ctx.level.progress;
		const profile = ctx.level.profile;

		if (!player) {
			console.error('PlayingState.update', 'player is not initialized');
			return;
		}

		if (!fruit) {
			console.error('PlayingState.update', 'fruit is not initialized');
			return;
		}

		if (!egg) {
			console.error('PlayingState.update', 'golden egg is not initialized');
			return;
		}

		if (!ultra) {
			console.error('PlayingState.update', 'ultra ghost is not initialized');
			return;
		}

		if (!ghosts) {
			console.error('PlayingState.update', 'ghosts are not initialized');
			return;
		}

		if (!combat) {
			console.error('PlayingState.update', 'combat is not initialized');
			return;
		}

		if (!progress) {
			console.error('PlayingState.update', 'progress is not initialized');
			return;
		}

		player.update(dt);
		fruit.update(dt, player);
		egg.update(dt, player);

		if (profile === 'pacman') {
			ultra.update(dt, player);
		}

		const ultraActive = profile === 'pacman' && ultra.contractActive;

		ghosts.setContractActive(ultraActive);
		combat.setContractActive(ultraActive);

		if (!ultraActive) {
			ghosts.update(dt);
		}

		if (egg.consumeExitReached()) {
			combat.completeViaGoldenExit();
		}

		if (!combat.endRequested && profile === 'pacman' && ultra.consumePlayerCaught()) {
			ultra.abortContract();
			ghosts.setContractActive(false);
			combat.setContractActive(false);
			combat.killPlayerByUltra();
		}

		if (!combat.endRequested && profile === 'pacman' && ultra.consumeSealed()) {
			ghosts.setContractActive(false);
			combat.setContractActive(false);
			ghosts.reset();
		}

		combat.update(dt);

		if (combat.endRequested && profile === 'pacman' && ultra.contractActive) {
			ultra.cancelContract();
			ghosts.setContractActive(false);
			combat.setContractActive(false);
		}

		const hud = {
			score: combat.score,
			lives: combat.lives,
			dots: progress.remainingDots,
			power: Math.ceil(combat.powerTimer * 10) / 10,
			result: combat.result
		};

		const hudKey = `${hud.score}:${hud.lives}:${hud.dots}:${hud.power}:${hud.result}`;

		if (hudKey !== this.lastHudKey) {
			this.lastHudKey = hudKey;
			ctx.events.emit('ui:hudChanged', hud);
		}

		if (combat.endRequested) {
			ctx.director.showGameOver();
		}
	}

	exit(): void {
		this.lastHudKey = '';
	}
}