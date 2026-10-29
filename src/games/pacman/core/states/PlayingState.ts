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
		const session = ctx.level.session;
		if (!session) {
			console.error('PlayingState.update', 'level is not initialized');
			return;
		}
		const { player, fruit, egg, echo, ghosts, combat, lairCode } = session;
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
		if (session.doom) {
			const { boss: doomBoss, abilities: doom } = session.doom;
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
