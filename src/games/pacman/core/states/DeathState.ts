// src/games/pacman/core/states/DeathState.ts
import type { GameState, GameStateContext } from '../Director';
import type { PacmanStateName } from '../Events';

export interface DeathWaveSnapshot {
	readonly x: number;
	readonly y: number;
	readonly progress: number;
}

const DEATH_TIME = 1.35;
const WAVE_DURATION = 1.15;

export class DeathState implements GameState {
	readonly name: PacmanStateName = 'death';
	private timer = DEATH_TIME;
	private centerX = 0;
	private centerY = 0;
	private hasCenter = false;

	get overlayTimer(): number {
		return this.timer;
	}

	get deathWave(): DeathWaveSnapshot | null {
		if (!this.hasCenter) {
			return null;
		}
		const elapsed = DEATH_TIME - this.timer;
		const progress = Math.min(1, Math.max(0, elapsed / WAVE_DURATION));
		return {
			x: this.centerX,
			y: this.centerY,
			progress
		};
	}

	enter(ctx: GameStateContext): void {
		ctx.level.ensure();
		this.timer = DEATH_TIME;
		this.hasCenter = false;

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
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('DeathState.update', 'invalid delta time', dt);
			return;
		}
		this.timer = Math.max(0, this.timer - dt);
		if (this.timer > 0) {
			return;
		}

		const combat = ctx.level.combat;
		if (!combat) {
			console.error('DeathState.update', 'combat is not initialized');
			ctx.director.showGameOver();
			return;
		}

		if (combat.lives > 0) {
			ctx.level.prepareAfterDeath();
			ctx.director.showReady();
			return;
		}

		ctx.director.showGameOver();
	}

	exit(): void {
		this.timer = DEATH_TIME;
		this.centerX = 0;
		this.centerY = 0;
		this.hasCenter = false;
	}
}