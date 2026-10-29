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
		ctx.level.emitHud();
	}

	update(ctx: GameStateContext, dt: number): void {
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('PlayingState.update', 'invalid delta time', dt);
			return;
		}
		const player = ctx.level.player;
		const fruit = ctx.level.fruit;
		const egg = ctx.level.egg;
		const echo = ctx.level.echo;
		const doomBoss = ctx.level.doomBoss;
		const doom = ctx.level.doom;
		const ghosts = ctx.level.ghosts;
		const combat = ctx.level.combat;
		const progress = ctx.level.progress;
		const lairCode = ctx.level.lairCode;
		const grid = ctx.level.grid;
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
		if (!echo) {
			console.error('PlayingState.update', 'echo clone is not initialized');
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
		if (!lairCode) {
			console.error('PlayingState.update', 'lair code is not initialized');
			return;
		}
		if (!grid) {
			console.error('PlayingState.update', 'grid is not initialized');
			return;
		}
		if (combat.deathActive) {
			ctx.director.showDeath();
			return;
		}
		if (combat.endRequested) {
			if (combat.result === 'win') {
				ctx.director.showLevelClear();
				return;
			}
			ctx.director.showGameOver();
			return;
		}
		lairCode.update(dt);
		ctx.level.syncLairOpen();
		player.update(dt);
		fruit.update(dt, player);
		egg.update(dt, player);
		if (!ctx.level.secretMode) {
			echo.update(dt, player);
		}
		if (egg.consumeSecretRequested()) {
			ctx.level.enterSecretLevel();
			ctx.director.showReady();
			return;
		}
		const fireRequested = ctx.level.consumeFireRequest();
		if (ctx.level.hellMode) {
			if (!doomBoss) {
				console.error('PlayingState.update', 'doom boss is not initialized');
				return;
			}
			if (!doom) {
				console.error('PlayingState.update', 'doom abilities are not initialized');
				return;
			}
			doomBoss.update(dt, player);
			doom.update(dt, player);
			if (!combat.endRequested && doom.consumePlayerDeath()) {
				combat.killPlayerInHell();
				if (combat.deathActive) {
					console.warn('PlayingState.update', 'death requested by doom damage', {
						reason: combat.lastDeathReason
					});
					ctx.director.showDeath();
					return;
				}
			}
			if (!combat.endRequested && doomBoss.defeated) {
				combat.completeHellLevel();
			}
			if (!combat.endRequested && fireRequested) {
				doom.fire(player);
			}
		} else {
			ghosts.update(dt);
		}
		combat.update(dt);
		if (combat.deathActive) {
			console.warn('PlayingState.update', 'death requested', {
				reason: combat.lastDeathReason
			});
			ctx.director.showDeath();
			return;
		}
		const hud = ctx.level.hudPayload();
		const hudKey = JSON.stringify(hud);
		if (hudKey !== this.lastHudKey) {
			this.lastHudKey = hudKey;
			ctx.events.emit('ui:hudChanged', hud);
		}
		if (combat.endRequested) {
			if (combat.result === 'win') {
				ctx.director.showLevelClear();
				return;
			}
			ctx.director.showGameOver();
		}
	}

	exit(): void {
		this.lastHudKey = '';
	}
}