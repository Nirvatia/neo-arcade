import { GridModel } from './GridModel';
import { GridService } from './GridService';
import { PlayerService } from './PlayerService';
import { GhostService } from './GhostService';
import { ScoreModel } from './ScoreModel';
import { LevelProgress } from './LevelProgress';
import { CombatService } from './CombatService';
import { FruitService } from './FruitService';
import { GoldenEggService } from './GoldenEggService';
import { UltraGhostService } from './UltraGhostService';
import { HypnosisService } from './HypnosisService';
import type { GameProfile } from './HypnosisService';
import type { PlayerDirection } from './PlayerModel';
import type { EventBus } from '../engine/EventBus';
import type { PacmanEventMap } from '../core/Events';

export class LevelLoader {
	private readonly events: EventBus<PacmanEventMap>;
	private profileValue: GameProfile = 'pacman';
	private gridValue: GridService | null = null;
	private playerValue: PlayerService | null = null;
	private ghostsValue: GhostService | null = null;
	private scoreValue: ScoreModel | null = null;
	private progressValue: LevelProgress | null = null;
	private combatValue: CombatService | null = null;
	private fruitValue: FruitService | null = null;
	private eggValue: GoldenEggService | null = null;
	private ultraValue: UltraGhostService | null = null;
	private hypnosisValue: HypnosisService | null = null;

	constructor(events: EventBus<PacmanEventMap>) {
		if (!events) {
			console.error('LevelLoader.constructor', 'missing event bus');
			throw new Error('LevelLoader.constructor: missing event bus');
		}

		this.events = events;
	}

	get profile(): GameProfile {
		return this.profileValue;
	}

	get grid(): GridService | null {
		return this.gridValue;
	}

	get player(): PlayerService | null {
		return this.playerValue;
	}

	get ghosts(): GhostService | null {
		return this.ghostsValue;
	}

	get progress(): LevelProgress | null {
		return this.progressValue;
	}

	get combat(): CombatService | null {
		return this.combatValue;
	}

	get fruit(): FruitService | null {
		return this.fruitValue;
	}

	get egg(): GoldenEggService | null {
		return this.eggValue;
	}

	get ultra(): UltraGhostService | null {
		return this.ultraValue;
	}

	get hypnosis(): HypnosisService | null {
		return this.hypnosisValue;
	}

	get score(): number {
		return this.scoreValue ? this.scoreValue.score : 0;
	}

	toggleProfile(): void {
		this.profileValue = this.profileValue === 'pacman' ? 'ms-pacman' : 'pacman';

		if (this.combatValue) {
			this.combatValue.setProfile(this.profileValue);
		}

		if (this.hypnosisValue) {
			this.hypnosisValue.reset();
		}

		if (this.ghostsValue) {
			this.ghostsValue.setMsOverdrive(false);
		}
	}

	ensure(): void {
		if (
			this.gridValue &&
			this.playerValue &&
			this.ghostsValue &&
			this.scoreValue &&
			this.progressValue &&
			this.combatValue &&
			this.fruitValue &&
			this.eggValue &&
			this.ultraValue &&
			this.hypnosisValue
		) {
			return;
		}

		const grid = new GridService(new GridModel());
		const score = new ScoreModel();
		const progress = new LevelProgress(grid, score, this.events);
		const player = new PlayerService(grid, progress, this.events);
		const ghosts = new GhostService(grid, player, progress);
		const hypnosis = new HypnosisService(score);
		const combat = new CombatService(player, ghosts, progress, score, this.events, hypnosis);
		const fruit = new FruitService(progress, score, this.events);
		const egg = new GoldenEggService(progress, this.events);
		const ultra = new UltraGhostService(grid, progress, score);

		combat.setProfile(this.profileValue);

		this.gridValue = grid;
		this.scoreValue = score;
		this.progressValue = progress;
		this.playerValue = player;
		this.ghostsValue = ghosts;
		this.combatValue = combat;
		this.fruitValue = fruit;
		this.eggValue = egg;
		this.ultraValue = ultra;
		this.hypnosisValue = hypnosis;
	}

	resetGameplay(): void {
		if (
			!this.playerValue ||
			!this.progressValue ||
			!this.ghostsValue ||
			!this.combatValue ||
			!this.fruitValue ||
			!this.eggValue ||
			!this.ultraValue ||
			!this.hypnosisValue
		) {
			console.error('LevelLoader.resetGameplay', 'level is not initialized');
			return;
		}

		this.playerValue.reset();
		this.progressValue.reset();
		this.ghostsValue.reset();
		this.combatValue.reset();
		this.fruitValue.reset();
		this.eggValue.reset();
		this.ultraValue.reset();
		this.hypnosisValue.reset();
	}

	setDesiredDirection(direction: PlayerDirection): void {
		if (!this.playerValue) {
			return;
		}

		this.playerValue.setDesiredDirection(direction);
	}
}