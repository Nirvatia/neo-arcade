import type { GameState, GameStateContext } from '../flow/GameState';
import { StateClock } from '../flow/StateClock';
import type { FlowTiming } from '../flow/StateClock';
import type { PacmanStateName } from '../Events';
import { FLOW } from '../../config/flowConfig';

export interface DeathWaveSnapshot {
	readonly x: number;
	readonly y: number;
	readonly progress: number;
	readonly timer: number;
	readonly duration: number;
}

export type DeathPhase = 'dying';

export class DeathState implements GameState {
	readonly name: PacmanStateName = 'death';
	readonly pausable = true;
	private readonly clock = new StateClock<DeathPhase>([{ name: 'dying', duration: FLOW.death }]);
	private centerX = 0;
	private centerY = 0;
	private hasCenter = false;
	private resolved = false;

	get deathWave(): DeathWaveSnapshot | null {
		if (!this.hasCenter) {
			return null;
		}
		const timing = this.clock.timing;
		return {
			x: this.centerX,
			y: this.centerY,
			progress: timing.progress,
			timer: timing.remaining,
			duration: timing.duration
		};
	}

	enter(ctx: GameStateContext): void {
		ctx.level.ensure();
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
