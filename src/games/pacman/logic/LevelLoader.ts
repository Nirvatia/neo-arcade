import { GridModel } from './GridModel';
import { GridService } from './GridService';
import { PlayerService } from './PlayerService';
import { GhostService } from './GhostService';
import { ScoreModel } from './ScoreModel';
import { LevelProgress } from './LevelProgress';
import { CombatService } from './CombatService';
import { FruitService } from './FruitService';
import { GoldenEggService } from './GoldenEggService';
import { HypnosisService } from './HypnosisService';
import { SpawnLocator } from './SpawnLocator';
import { LairCodeService } from './LairCodeService';
import { EchoCloneService } from './EchoCloneService';
import { DoomBossService } from './doom/DoomBossService';
import { DoomAbilityService } from './doom/DoomAbilityService';
import { SECRET_LEVEL_NUMBER, HELL_LEVEL_INTERVAL } from '../config/gridConfig';
import type { GameProfile } from './HypnosisService';
import type { PlayerDirection } from './PlayerModel';
import type { EventBus } from '../engine/EventBus';
import type {
	PacmanEventMap,
	PacmanHellHud,
	PacmanHellWeapon,
	PacmanHudPayload
} from '../core/Events';
import { BOSS_HP, PLAYER_MAX_HP } from './doom/DoomBalance';
import { seasonForLevel, secretSeason, hellSeason } from './SeasonCatalog';
import type { SeasonData, SeasonName } from './SeasonCatalog';

interface SeasonModifiers {
	readonly powerDuration: number;
	readonly fruitDuration: number;
	readonly ghostSpeedModifier: number;
	readonly playerSpeedModifier: number;
}

const MAZE_SCALE_DEFAULT = 0.8;
const MAZE_SCALE_MIN = 0.3;
const MAZE_SCALE_MAX = 1.5;

export class LevelLoader {
	private readonly events: EventBus<PacmanEventMap>;
	private profileValue: GameProfile = 'pacman';
	private levelNumber = 1;
	private pendingStartLevelValue = 1;
	private secretModeValue = false;
	private hellModeValue = false;
	private fireRequestedValue = false;
	private secretReturnLevelValue = 1;
	private mazeScaleValue = MAZE_SCALE_DEFAULT;
	private seasonValue: SeasonData | null = null;
	private gridValue: GridService | null = null;
	private playerValue: PlayerService | null = null;
	private ghostsValue: GhostService | null = null;
	private scoreValue: ScoreModel | null = null;
	private progressValue: LevelProgress | null = null;
	private combatValue: CombatService | null = null;
	private fruitValue: FruitService | null = null;
	private eggValue: GoldenEggService | null = null;
	private hypnosisValue: HypnosisService | null = null;
	private echoValue: EchoCloneService | null = null;
	private doomBossValue: DoomBossService | null = null;
	private doomValue: DoomAbilityService | null = null;
	private lairCodeValue: LairCodeService | null = null;

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

	get level(): number {
		return this.levelNumber;
	}

	get pendingStartLevel(): number {
		return this.pendingStartLevelValue;
	}

	get secretMode(): boolean {
		return this.secretModeValue;
	}

	get hellMode(): boolean {
		return this.hellModeValue;
	}

	get mazeScale(): number {
		return this.mazeScaleValue;
	}

	get season(): SeasonData | null {
		return this.seasonValue;
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

	get hypnosis(): HypnosisService | null {
		return this.hypnosisValue;
	}

	get echo(): EchoCloneService | null {
		return this.echoValue;
	}

	get doomBoss(): DoomBossService | null {
		return this.doomBossValue;
	}

	get doom(): DoomAbilityService | null {
		return this.doomValue;
	}

	get lairCode(): LairCodeService | null {
		return this.lairCodeValue;
	}

	get score(): number {
		return this.scoreValue ? this.scoreValue.score : 0;
	}

	setPendingStartLevel(level: number): void {
		if (!Number.isFinite(level) || level < 1) {
			console.error('LevelLoader.setPendingStartLevel', 'invalid level', level);
			return;
		}
		this.pendingStartLevelValue = Math.floor(level);
	}

	setMazeScale(value: number): void {
		if (!Number.isFinite(value) || value <= 0) {
			console.error('LevelLoader.setMazeScale', 'invalid maze scale', value);
			return;
		}
		this.mazeScaleValue = Math.min(MAZE_SCALE_MAX, Math.max(MAZE_SCALE_MIN, value));
	}

	requestFire(): void {
		this.fireRequestedValue = true;
	}

	consumeFireRequest(): boolean {
		const requested = this.fireRequestedValue;
		this.fireRequestedValue = false;
		return requested;
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
		this.emitHud();
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
			this.hypnosisValue &&
			this.echoValue &&
			this.lairCodeValue &&
			(!this.hellModeValue || (this.doomBossValue && this.doomValue))
		) {
			return;
		}
		this.buildLevel();
	}

	startNewGame(): void {
		this.levelNumber = this.pendingStartLevelValue;
		this.pendingStartLevelValue = 1;
		this.secretModeValue = false;
		this.secretReturnLevelValue = 1;
		this.buildLevel();
		this.resetGameplay();
		this.emitHud();
	}

	resetGameplay(): void {
		if (
			!this.playerValue ||
			!this.progressValue ||
			!this.ghostsValue ||
			!this.combatValue ||
			!this.fruitValue ||
			!this.eggValue ||
			!this.hypnosisValue ||
			!this.echoValue ||
			!this.lairCodeValue
		) {
			console.error('LevelLoader.resetGameplay', 'level is not initialized');
			return;
		}
		if (this.hellModeValue && (!this.doomBossValue || !this.doomValue)) {
			console.error('LevelLoader.resetGameplay', 'doom services are not initialized');
			return;
		}
		this.playerValue.reset();
		this.progressValue.reset();
		this.ghostsValue.reset();
		this.combatValue.reset();
		this.fruitValue.reset();
		this.eggValue.reset();
		this.hypnosisValue.reset();
		this.echoValue.reset();
		if (this.doomBossValue) {
			this.doomBossValue.reset();
		}
		if (this.doomValue) {
			this.doomValue.reset();
		}
		this.lairCodeValue.reset();
	}

	prepareAfterDeath(): void {
		this.ensure();
		if (!this.combatValue) {
			console.error('LevelLoader.prepareAfterDeath', 'level is not initialized');
			return;
		}
		this.combatValue.finishDeath();
		if (this.hellModeValue) {
			if (this.doomBossValue) {
				this.doomBossValue.reset();
			}
			if (this.doomValue) {
				this.doomValue.reset();
			}
		}
		this.emitHud();
	}

	syncLairOpen(): void {
		if (this.gridValue && this.lairCodeValue) {
			this.gridValue.setLairOpen(this.lairCodeValue.open);
		}
	}

	enterSecretLevel(): void {
		if (this.secretModeValue) {
			return;
		}
		this.ensure();
		if (!this.scoreValue || !this.combatValue) {
			console.error('LevelLoader.enterSecretLevel', 'level is not initialized');
			return;
		}
		const keptScore = this.scoreValue.score;
		const keptLives = this.combatValue.lives;
		const keptLifeThreshold = this.combatValue.nextLifeThreshold;
		this.secretModeValue = true;
		this.secretReturnLevelValue = this.levelNumber + 1;
		this.levelNumber = SECRET_LEVEL_NUMBER;
		this.buildLevel();
		if (
			!this.playerValue ||
			!this.progressValue ||
			!this.ghostsValue ||
			!this.scoreValue ||
			!this.combatValue ||
			!this.fruitValue ||
			!this.eggValue ||
			!this.hypnosisValue ||
			!this.echoValue ||
			!this.lairCodeValue
		) {
			console.error('LevelLoader.enterSecretLevel', 'level is not initialized after build');
			return;
		}
		this.scoreValue.add(keptScore);
		this.combatValue.setLives(keptLives);
		this.combatValue.setNextLifeThreshold(keptLifeThreshold);
		this.resetNextLevel();
		this.emitHud();
	}

	advanceLevel(): void {
		this.ensure();
		if (!this.scoreValue || !this.combatValue) {
			console.error('LevelLoader.advanceLevel', 'level is not initialized');
			return;
		}
		const keptScore = this.scoreValue.score;
		const keptLives = this.combatValue.lives;
		const keptLifeThreshold = this.combatValue.nextLifeThreshold;
		if (this.secretModeValue) {
			this.secretModeValue = false;
			this.levelNumber =
				Number.isFinite(this.secretReturnLevelValue) && this.secretReturnLevelValue >= 1
					? Math.floor(this.secretReturnLevelValue)
					: 1;
		} else {
			this.levelNumber += 1;
		}
		this.buildLevel();
		if (
			!this.playerValue ||
			!this.progressValue ||
			!this.ghostsValue ||
			!this.scoreValue ||
			!this.combatValue ||
			!this.fruitValue ||
			!this.eggValue ||
			!this.hypnosisValue ||
			!this.echoValue ||
			!this.lairCodeValue
		) {
			console.error('LevelLoader.advanceLevel', 'level is not initialized after build');
			return;
		}
		if (this.hellModeValue && (!this.doomBossValue || !this.doomValue)) {
			console.error('LevelLoader.advanceLevel', 'doom services are not initialized');
			return;
		}
		this.scoreValue.add(keptScore);
		this.combatValue.setLives(keptLives);
		this.combatValue.setNextLifeThreshold(keptLifeThreshold);
		this.resetNextLevel();
		this.emitHud();
	}

	debugSpawnBonus(): void {
		if (this.hellModeValue) {
			if (this.doomValue) {
				this.doomValue.debugSpawn();
			}
			return;
		}
		if (this.echoValue) {
			this.echoValue.debugSpawn();
		}
	}

	debugEnterHell(): void {
		if (this.secretModeValue) {
			return;
		}
		this.profileValue = 'pacman';
		this.ensure();
		if (!this.scoreValue || !this.combatValue) {
			console.error('LevelLoader.debugEnterHell', 'level is not initialized');
			return;
		}
		const keptScore = this.scoreValue.score;
		const keptLives = this.combatValue.lives;
		const keptLifeThreshold = this.combatValue.nextLifeThreshold;
		this.levelNumber = HELL_LEVEL_INTERVAL;
		this.buildLevel();
		if (
			!this.playerValue ||
			!this.progressValue ||
			!this.ghostsValue ||
			!this.scoreValue ||
			!this.combatValue ||
			!this.fruitValue ||
			!this.eggValue ||
			!this.hypnosisValue ||
			!this.echoValue ||
			!this.lairCodeValue ||
			!this.doomBossValue ||
			!this.doomValue
		) {
			console.error('LevelLoader.debugEnterHell', 'level is not initialized after build');
			return;
		}
		this.scoreValue.add(keptScore);
		this.combatValue.setLives(keptLives);
		this.combatValue.setNextLifeThreshold(keptLifeThreshold);
		this.resetNextLevel();
		this.emitHud();
	}

	debugEnterSecret(): void {
		this.enterSecretLevel();
	}

	setDesiredDirection(direction: PlayerDirection): void {
		if (!this.playerValue) {
			return;
		}
		this.playerValue.setDesiredDirection(direction);
	}

	emitHud(): void {
		this.events.emit('ui:hudChanged', this.hudPayload());
	}

	hudPayload(): PacmanHudPayload {
		const result: PacmanHudPayload['result'] = this.combatValue ? this.combatValue.result : 'none';
		return {
			score: this.scoreValue ? this.scoreValue.score : 0,
			lives: this.combatValue ? this.combatValue.lives : 3,
			dots: this.progressValue ? this.progressValue.remainingDots : 0,
			power: this.currentPower(),
			mode: this.profileValue,
			result,
			level: this.levelNumber,
			hell: this.hellHud()
		};
	}

	private godModeValue = false;

	debugToggleGodMode(): boolean {
		this.godModeValue = !this.godModeValue;
		this.doomValue?.setGodMode(this.godModeValue);
		return this.godModeValue;
	}

	debugDamageBoss(): void {
		if (this.hellModeValue && this.doomBossValue) {
			this.doomBossValue.takeDamage(250);
		}
	}

	private hellHud(): PacmanHellHud | null {
		const boss = this.doomBossValue;
		const doom = this.doomValue;
		if (!this.hellModeValue || !boss || !doom) {
			return null;
		}
		const armed = doom.armed;
		const weapon: PacmanHellWeapon =
			armed === 'bfg' || armed === 'barrel' || armed === 'berserk' ? armed : '';
		return {
			hp: doom.playerHp,
			hpMax: PLAYER_MAX_HP,
			bossHp: Math.max(0, Math.round(boss.hp)),
			bossHpMax: BOSS_HP,
			bossPhase: boss.phase,
			weapon,
			berserk: weapon === 'berserk' ? Math.ceil(doom.berserkTimer * 10) / 10 : 0
		};
	}

	private buildLevel(): void {
		const hell =
			!this.secretModeValue &&
			this.profileValue === 'pacman' &&
			this.levelNumber % HELL_LEVEL_INTERVAL === 0;
		this.hellModeValue = hell;
		const season = this.secretModeValue
			? secretSeason()
			: hell
				? hellSeason()
				: seasonForLevel(this.levelNumber);
		this.seasonValue = season;
		const grid = new GridService(new GridModel(season.grid));
		if (hell) {
			grid.setLairOpen(true);
		}
		const score = new ScoreModel();
		const progress = new LevelProgress(grid, score, this.events);
		const locator = new SpawnLocator(grid, progress);
		const player = new PlayerService(grid, progress, this.events);
		const ghosts = new GhostService(grid, player, progress);
		const lairCode = new LairCodeService(this.levelNumber, this.events);
		const hypnosis = new HypnosisService(score, lairCode);
		const combat = new CombatService(
			player,
			ghosts,
			progress,
			score,
			this.events,
			hypnosis,
			lairCode
		);
		const fruit = new FruitService(
			this.profileValue,
			this.levelNumber,
			grid,
			locator,
			progress,
			score,
			this.events
		);
		const egg = new GoldenEggService(
			this.levelNumber,
			grid,
			lairCode,
			progress,
			this.events,
			score
		);
		const echo = new EchoCloneService(grid, progress, locator, this.events);
		let doomBoss: DoomBossService | null = null;
		let doom: DoomAbilityService | null = null;
		if (hell) {
			const bossSpawn = grid.bossSpawn();
			if (!bossSpawn) {
				console.error('LevelLoader.buildLevel', 'boss spawn tile DB is not found');
				throw new Error('LevelLoader.buildLevel: boss spawn tile DB is not found');
			}
			doomBoss = new DoomBossService(grid, bossSpawn);
			doom = new DoomAbilityService(grid, doomBoss);
			doom.setGodMode(this.godModeValue);
		}
		combat.setProfile(this.profileValue);
		combat.setHellMode(hell);
		player.setTrainMode(this.secretModeValue);
		ghosts.setTrainMode(this.secretModeValue);
		combat.setSecretMode(this.secretModeValue);
		const mods = this.modifiersFor(season.name);
		combat.setPowerDuration(mods.powerDuration);
		fruit.setFruitDuration(mods.fruitDuration);
		ghosts.setSpeedModifier(mods.ghostSpeedModifier);
		player.setSpeedModifier(mods.playerSpeedModifier);
		this.gridValue = grid;
		this.scoreValue = score;
		this.progressValue = progress;
		this.playerValue = player;
		this.ghostsValue = ghosts;
		this.combatValue = combat;
		this.fruitValue = fruit;
		this.eggValue = egg;
		this.hypnosisValue = hypnosis;
		this.echoValue = echo;
		this.doomBossValue = doomBoss;
		this.doomValue = doom;
		this.lairCodeValue = lairCode;
	}

	private resetNextLevel(): void {
		if (
			!this.playerValue ||
			!this.progressValue ||
			!this.ghostsValue ||
			!this.combatValue ||
			!this.fruitValue ||
			!this.eggValue ||
			!this.hypnosisValue ||
			!this.echoValue ||
			!this.lairCodeValue
		) {
			console.error('LevelLoader.resetNextLevel', 'level is not initialized');
			return;
		}
		if (this.hellModeValue && (!this.doomBossValue || !this.doomValue)) {
			console.error('LevelLoader.resetNextLevel', 'doom services are not initialized');
			return;
		}
		this.playerValue.reset();
		this.progressValue.resetDots();
		this.ghostsValue.reset();
		this.fruitValue.reset();
		this.eggValue.reset();
		this.hypnosisValue.reset();
		this.echoValue.reset();
		if (this.doomBossValue) {
			this.doomBossValue.reset();
		}
		if (this.doomValue) {
			this.doomValue.reset();
		}
		this.combatValue.nextLevel();
	}

	private modifiersFor(season: SeasonName): SeasonModifiers {
		if (season === 'spring') {
			return {
				powerDuration: 6.5,
				fruitDuration: 12,
				ghostSpeedModifier: 1,
				playerSpeedModifier: 1
			};
		}
		if (season === 'summer') {
			return { powerDuration: 6, fruitDuration: 14, ghostSpeedModifier: 1, playerSpeedModifier: 1 };
		}
		if (season === 'autumn') {
			return {
				powerDuration: 6,
				fruitDuration: 12,
				ghostSpeedModifier: 0.97,
				playerSpeedModifier: 1
			};
		}
		return {
			powerDuration: 6,
			fruitDuration: 12,
			ghostSpeedModifier: 1,
			playerSpeedModifier: 0.97
		};
	}

	private currentPower(): number {
		let timer = 0;
		if (this.profileValue === 'ms-pacman') {
			if (this.hypnosisValue && this.hypnosisValue.overdriveActive) {
				timer = this.hypnosisValue.overdriveTimer;
			}
		} else if (this.combatValue && this.combatValue.isPowerActive) {
			timer = this.combatValue.powerTimer;
		}
		if (!Number.isFinite(timer) || timer <= 0) {
			return 0;
		}
		return Math.ceil(timer * 10) / 10;
	}
}