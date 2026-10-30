import type { GameState, GameStateContext } from '../flow/GameState';
import { StateClock } from '../flow/StateClock';
import type { FlowTiming } from '../flow/StateClock';
import type { PacmanStateName } from '../Events';
import { FLOW } from '../../config/flowConfig';

/** Where Pac-Man died, in tile-centre coordinates (tile (c, r) is centred at (c + .5, r + .5)). */
export interface DeathSnapshot {
	readonly x: number;
	readonly y: number;
}

/** The main game's decay phases, or the arcade's own (`fold`, `pause`). */
export type DeathPhase = 'shatter' | 'void' | 'rebuild' | 'fold' | 'pause';

export class DeathState implements GameState {
	readonly name: PacmanStateName = 'death';
	readonly pausable = true;
	private clock = new StateClock<DeathPhase>([
		{ name: 'shatter', duration: FLOW.death.shatter },
		{ name: 'void', duration: FLOW.death.void },
		{ name: 'rebuild', duration: FLOW.death.rebuild }
	]);
	private centerX = 0;
	private centerY = 0;
	private hasCenter = false;
	private resolved = false;

	get death(): DeathSnapshot | null {
		return this.hasCenter ? { x: this.centerX, y: this.centerY } : null;
	}

	enter(ctx: GameStateContext): void {
		ctx.level.ensure();
		if (ctx.level.secretMode) {
			this.clock = new StateClock<DeathPhase>([
				{ name: 'fold', duration: FLOW.arcade.death.fold },
				{ name: 'pause', duration: FLOW.arcade.death.pause }
			]);
		}
		const player = ctx.level.player;
		if (player) {
			const position = player.position;
			if (
				Number.isFinite(position.x) &&
				Number.isFinite(position.y) &&
				position.x >= 0 &&
				position.y >= 0
			) {
				this.centerX = position.x;
				this.centerY = position.y;
				this.hasCenter = true;
			} else {
				console.error('DeathState.enter', 'invalid player position', position);
			}
		} else {
			console.error('DeathState.enter', 'player is not initialized');
		}
		if (!this.hasCenter) {
			const grid = ctx.level.grid;
			if (grid) {
				this.centerX = grid.width / 2;
				this.centerY = grid.height / 2;
				this.hasCenter = true;
			} else {
				console.error('DeathState.enter', 'grid is not initialized');
			}
		}
		ctx.level.emitHud();
	}

	update(ctx: GameStateContext, dt: number): void {
		if (this.resolved || !this.clock.advance(dt)) {
			return;
		}
		this.resolved = true;
		const combat = ctx.level.ensure().combat;
		if (ctx.level.secretMode) {
			// the arcade's own tries: the last one returns to the main game, no penalty
			if (combat.arcadeLost) {
				ctx.director.changeLevel(() => ctx.level.leaveArcade());
				return;
			}
			ctx.level.prepareAfterDeath();
			ctx.director.showReady('short');
			return;
		}
		if (combat.hellDefeat) {
			// falling into the abyss ends the hell level, not the run
			ctx.director.changeLevel(() => ctx.level.advanceLevel());
			return;
		}
		if (combat.lives > 0) {
			ctx.level.prepareAfterDeath();
			ctx.director.showReady('short');
			return;
		}
		ctx.director.showGameOver();
	}

	exit(): void {}

	timing(): FlowTiming {
		return this.clock.timing;
	}
}
