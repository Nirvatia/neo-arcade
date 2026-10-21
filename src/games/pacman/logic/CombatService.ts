import type { PlayerService } from './PlayerService';
import type { GhostService } from './GhostService';
import type { LevelProgress } from './LevelProgress';
import type { ScoreModel } from './ScoreModel';
import type { GhostModel } from './GhostModel';
import type { PacmanGameResult, PacmanEventMap } from '../core/Events';
import type { EventBus } from '../engine/EventBus';
import type { GameProfile, HypnosisService } from './HypnosisService';

const DEFAULT_POWER_DURATION = 6;
const CONTACT_DISTANCE_SQ = 0.36;
const CLEAR_BONUS = 1000;
const PERFECT_BONUS = 2000;
const GOLDEN_EXIT_BONUS = 500;
const REMAINING_DOT_VALUE = 20;
const FIRST_LIFE_THRESHOLD = 10000;
const LIFE_THRESHOLD_STEP = 30000;

export class CombatService {
	private readonly player: PlayerService;
	private readonly ghosts: GhostService;
	private readonly progress: LevelProgress;
	private readonly scoreModel: ScoreModel;
	private readonly events: EventBus<PacmanEventMap>;
	private readonly hypnosis: HypnosisService;
	private livesValue = 3;
	private deathsValue = 0;
	private powerTimerValue = 0;
	private powerDurationValue = DEFAULT_POWER_DURATION;
	private chainValue = 0;
	private gameOverValue = false;
	private completedValue = false;
	private goldenExitValue = false;
	private contractActiveValue = false;
	private deathActiveValue = false;
	private profileValue: GameProfile = 'pacman';
	private resultValue: PacmanGameResult = 'none';
	private nextLifeThresholdValue = FIRST_LIFE_THRESHOLD;

	constructor(
		player: PlayerService,
		ghosts: GhostService,
		progress: LevelProgress,
		scoreModel: ScoreModel,
		events: EventBus<PacmanEventMap>,
		hypnosis: HypnosisService
	) {
		if (!player) {
			console.error('CombatService.constructor', 'missing player service');
			throw new Error('CombatService.constructor: missing player service');
		}
		if (!ghosts) {
			console.error('CombatService.constructor', 'missing ghost service');
			throw new Error('CombatService.constructor: missing ghost service');
		}
		if (!progress) {
			console.error('CombatService.constructor', 'missing level progress');
			throw new Error('CombatService.constructor: missing level progress');
		}
		if (!scoreModel) {
			console.error('CombatService.constructor', 'missing score model');
			throw new Error('CombatService.constructor: missing score model');
		}
		if (!events) {
			console.error('CombatService.constructor', 'missing event bus');
			throw new Error('CombatService.constructor: missing event bus');
		}
		if (!hypnosis) {
			console.error('CombatService.constructor', 'missing hypnosis service');
			throw new Error('CombatService.constructor: missing hypnosis service');
		}
		this.player = player;
		this.ghosts = ghosts;
		this.progress = progress;
		this.scoreModel = scoreModel;
		this.events = events;
		this.hypnosis = hypnosis;
	}

	get lives(): number {
		return this.livesValue;
	}

	get powerTimer(): number {
		return this.powerTimerValue;
	}

	get isPowerActive(): boolean {
		return this.powerTimerValue > 0;
	}

	get result(): PacmanGameResult {
		return this.resultValue;
	}

	get goldenExit(): boolean {
		return this.goldenExitValue;
	}

	get deathActive(): boolean {
		return this.deathActiveValue;
	}

	get endRequested(): boolean {
		return this.gameOverValue || this.completedValue;
	}

	get score(): number {
		return this.scoreModel.score;
	}

	setPowerDuration(value: number): void {
		if (!Number.isFinite(value) || value <= 0) {
			console.error('CombatService.setPowerDuration', 'invalid duration', value);
			return;
		}
		this.powerDurationValue = value;
	}

	reset(): void {
		this.livesValue = 3;
		this.deathsValue = 0;
		this.powerTimerValue = 0;
		this.chainValue = 0;
		this.gameOverValue = false;
		this.completedValue = false;
		this.goldenExitValue = false;
		this.contractActiveValue = false;
		this.deathActiveValue = false;
		this.resultValue = 'none';
		this.nextLifeThresholdValue = FIRST_LIFE_THRESHOLD;
		this.ghosts.setPowerActive(false);
	}

	setProfile(profile: GameProfile): void {
		this.profileValue = profile;
	}

	setContractActive(value: boolean): void {
		if (this.contractActiveValue === value) {
			return;
		}
		if (value) {
			this.clearPower();
		}
		this.contractActiveValue = value;
	}

	update(dt: number): void {
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('CombatService.update', 'invalid delta time', dt);
			return;
		}
		if (this.gameOverValue || this.completedValue || this.deathActiveValue) {
			return;
		}
		this.checkLifeRewards();
		if (this.progress.remainingDots <= 0) {
			this.completeLevel();
			return;
		}
		if (this.progress.consumePendingEnergizer()) {
			this.activatePower();
		}
		if (this.profileValue === 'ms-pacman') {
			this.hypnosis.update(dt, this.ghosts);
		} else if (this.powerTimerValue > 0) {
			this.powerTimerValue = Math.max(0, this.powerTimerValue - dt);
			if (this.powerTimerValue <= 0) {
				this.ghosts.endFrightened();
				this.events.emit('audio:cue', { cue: 'power-end' });
			}
		}
		this.ghosts.setPowerActive(this.powerTimerValue > 0);
		this.checkCollisions();
	}

	completeViaGoldenExit(): void {
		if (this.gameOverValue || this.completedValue || this.deathActiveValue) {
			return;
		}
		const converted = this.progress.convertRemainingDots();
		this.scoreModel.add(converted * REMAINING_DOT_VALUE);
		this.completedValue = true;
		this.resultValue = 'win';
		this.goldenExitValue = true;
		this.clearPower();
		this.clearMsMode();
		this.events.emit('audio:cue', { cue: 'win' });
	}

	killPlayerByUltra(): void {
		this.handleDeath();
	}

	finishDeath(): void {
		if (!this.deathActiveValue) {
			return;
		}
		this.deathActiveValue = false;
		if (this.livesValue > 0) {
			this.player.reset();
			this.ghosts.reset();
		}
	}

	nextLevel(): void {
		this.deathsValue = 0;
		this.powerTimerValue = 0;
		this.chainValue = 0;
		this.gameOverValue = false;
		this.completedValue = false;
		this.goldenExitValue = false;
		this.contractActiveValue = false;
		this.deathActiveValue = false;
		this.resultValue = 'none';
		this.ghosts.setPowerActive(false);
	}

	private checkLifeRewards(): void {
		if (this.progress.consumePendingExtraLife()) {
			this.awardExtraLife();
		}
		while (this.scoreModel.score >= this.nextLifeThresholdValue) {
			this.awardExtraLife();
			if (this.nextLifeThresholdValue === FIRST_LIFE_THRESHOLD) {
				this.nextLifeThresholdValue = LIFE_THRESHOLD_STEP;
			} else {
				this.nextLifeThresholdValue += LIFE_THRESHOLD_STEP;
			}
		}
	}

	private awardExtraLife(): void {
		this.livesValue += 1;
	}

	private activatePower(): void {
		if (this.profileValue === 'ms-pacman') {
			this.hypnosis.startOverdrive(this.ghosts);
			this.events.emit('audio:cue', { cue: 'power-start' });
			return;
		}
		this.powerTimerValue = this.powerDurationValue;
		this.chainValue = 0;
		this.ghosts.frightenActive();
		this.ghosts.setPowerActive(true);
		this.events.emit('audio:cue', { cue: 'power-start' });
	}

	private checkCollisions(): void {
		if (this.contractActiveValue) {
			return;
		}
		if (this.profileValue === 'ms-pacman') {
			this.checkMsCollisions();
			return;
		}
		if (this.player.isInvulnerable) {
			return;
		}
		const playerPosition = this.player.position;
		for (const ghost of this.ghosts.list) {
			if (ghost.state !== 'active' && ghost.state !== 'frightened') {
				continue;
			}
			const ghostPosition = ghost.position;
			const dx = playerPosition.x - ghostPosition.x;
			const dy = playerPosition.y - ghostPosition.y;
			if (dx * dx + dy * dy > CONTACT_DISTANCE_SQ) {
				continue;
			}
			if (ghost.state === 'frightened') {
				this.eatGhost(ghost);
			} else {
				this.killPlayer();
				break;
			}
		}
	}

	private checkMsCollisions(): void {
		const playerPosition = this.player.position;
		for (const ghost of this.ghosts.list) {
			const state = ghost.state;
			if (
				state === 'lair' ||
				state === 'exiting' ||
				state === 'eyes' ||
				state === 'hypnotized'
			) {
				continue;
			}
			const ghostPosition = ghost.position;
			const dx = playerPosition.x - ghostPosition.x;
			const dy = playerPosition.y - ghostPosition.y;
			if (dx * dx + dy * dy > CONTACT_DISTANCE_SQ) {
				continue;
			}
			if (state === 'enraged') {
				this.killPlayer();
				break;
			}
			if (this.hypnosis.overdriveActive) {
				this.hypnosis.handleContact(ghost.kind, this.ghosts);
				break;
			}
			if (this.player.isInvulnerable) {
				continue;
			}
			if (state === 'active' || state === 'frightened') {
				this.killPlayer();
				break;
			}
		}
	}

	private eatGhost(ghost: GhostModel): void {
		this.scoreModel.add(this.chainPoints());
		this.chainValue = Math.min(3, this.chainValue + 1);
		this.ghosts.toEyes(ghost);
		this.events.emit('audio:cue', { cue: 'ghost-eaten' });
	}

	private chainPoints(): number {
		if (this.chainValue <= 0) {
			return 200;
		}
		if (this.chainValue === 1) {
			return 400;
		}
		if (this.chainValue === 2) {
			return 800;
		}
		return 1600;
	}

	private completeLevel(): void {
		this.completedValue = true;
		this.resultValue = 'win';
		this.goldenExitValue = false;
		this.clearPower();
		this.clearMsMode();
		this.scoreModel.add(CLEAR_BONUS);
		if (this.deathsValue === 0 && this.progress.destroyedDots === 0) {
			this.scoreModel.add(PERFECT_BONUS);
		}
		this.events.emit('audio:cue', { cue: 'win' });
	}

	private killPlayer(): void {
		this.handleDeath();
	}

	private handleDeath(): void {
		this.deathsValue += 1;
		this.livesValue = Math.max(0, this.livesValue - 1);
		this.clearPower();
		this.clearMsMode();
		this.deathActiveValue = true;
		this.events.emit('audio:cue', { cue: 'death' });
		if (this.livesValue <= 0) {
			this.gameOverValue = true;
			this.resultValue = 'lose';
			this.events.emit('audio:cue', { cue: 'lose' });
		}
	}

	private clearPower(): void {
		if (this.powerTimerValue > 0) {
			this.events.emit('audio:cue', { cue: 'power-end' });
		}
		this.powerTimerValue = 0;
		this.chainValue = 0;
		this.ghosts.endFrightened();
		this.ghosts.setPowerActive(false);
	}

	private clearMsMode(): void {
		if (this.profileValue !== 'ms-pacman') {
			return;
		}
		this.hypnosis.reset();
		this.ghosts.setMsOverdrive(false);
	}
}