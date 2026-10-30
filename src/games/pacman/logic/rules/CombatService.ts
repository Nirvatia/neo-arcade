import type { PlayerService } from '../actors/PlayerService';
import type { GhostService } from '../actors/GhostService';
import type { LevelProgress } from '../level/LevelProgress';
import type { ScoreModel } from '../level/ScoreModel';
import type { GhostModel, GhostKind } from '../actors/GhostModel';
import type { PacmanGameResult, PacmanEventMap } from '../../core/Events';
import type { EventBus } from '../../engine/EventBus';
import type { GameProfile, HypnosisService } from './HypnosisService';
import type { LairCodeService } from './LairCodeService';
import { SCORE_TABLE } from '../../config/scoreConfig';
import { ACTOR_CONTACT_DISTANCE_SQ } from '../../config/actorConfig';

const DEFAULT_POWER_DURATION = 6;
const SECRET_CLEAR_BONUS = 10000;

export class CombatService {
	private readonly player: PlayerService;
	private readonly ghosts: GhostService;
	private readonly progress: LevelProgress;
	private readonly scoreModel: ScoreModel;
	private readonly events: EventBus<PacmanEventMap>;
	private readonly hypnosis: HypnosisService;
	private readonly lairCode: LairCodeService | null;
	private livesValue = 3;
	private deathsValue = 0;
	private powerTimerValue = 0;
	private powerDurationValue = DEFAULT_POWER_DURATION;
	private chainValue = 0;
	private gameOverValue = false;
	private completedValue = false;
	private deathActiveValue = false;
	private hellModeValue = false;
	private hellDefeatValue = false;
	private profileValue: GameProfile = 'pacman';
	private resultValue: PacmanGameResult = 'none';
	private nextLifeThresholdValue = SCORE_TABLE.firstLifeThreshold;
	private lastDeathReasonValue = 'none';
	private secretModeValue = false;

	constructor(
		player: PlayerService,
		ghosts: GhostService,
		progress: LevelProgress,
		scoreModel: ScoreModel,
		events: EventBus<PacmanEventMap>,
		hypnosis: HypnosisService,
		lairCode: LairCodeService | null
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
		this.lairCode = lairCode ?? null;
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

	get deathActive(): boolean {
		return this.deathActiveValue;
	}

	get endRequested(): boolean {
		return this.gameOverValue || this.completedValue;
	}

	get score(): number {
		return this.scoreModel.score;
	}

	get nextLifeThreshold(): number {
		return this.nextLifeThresholdValue;
	}

	get lastDeathReason(): string {
		return this.lastDeathReasonValue;
	}

	get hellDefeat(): boolean {
		return this.hellDefeatValue;
	}

	setPowerDuration(value: number): void {
		if (!Number.isFinite(value) || value <= 0) {
			console.error('CombatService.setPowerDuration', 'invalid duration', value);
			return;
		}

		this.powerDurationValue = value;
	}

	setLives(value: number): void {
		if (!Number.isFinite(value) || value < 0) {
			console.error('CombatService.setLives', 'invalid lives value', value);
			this.livesValue = 0;
			return;
		}

		this.livesValue = Math.floor(value);
	}

	setNextLifeThreshold(value: number): void {
		if (!Number.isFinite(value) || value <= 0) {
			console.error('CombatService.setNextLifeThreshold', 'invalid threshold value', value);
			this.nextLifeThresholdValue = SCORE_TABLE.firstLifeThreshold;
			return;
		}

		this.nextLifeThresholdValue = Math.floor(value);
	}

	setSecretMode(value: boolean): void {
		this.secretModeValue = value;
	}

	setHellMode(value: boolean): void {
		this.hellModeValue = value;
		this.ghosts.setVisible(!value);
	}

	reset(): void {
		this.livesValue = 3;
		this.deathsValue = 0;
		this.powerTimerValue = 0;
		this.chainValue = 0;
		this.gameOverValue = false;
		this.completedValue = false;
		this.deathActiveValue = false;
		this.hellDefeatValue = false;
		this.resultValue = 'none';
		this.nextLifeThresholdValue = SCORE_TABLE.firstLifeThreshold;
		this.lastDeathReasonValue = 'none';
		this.ghosts.setPowerActive(false);
		this.ghosts.setVisible(!this.hellModeValue);
	}

	setProfile(profile: GameProfile): void {
		this.profileValue = profile;
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

		if (this.hellModeValue) {
			return;
		}

		if (this.progress.remainingDots <= 0) {
			this.completeLevel();
			return;
		}

		if (this.secretModeValue) {
			this.progress.consumePendingEnergizer();
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

	debugComplete(): void {
		if (this.completedValue || this.gameOverValue || this.deathActiveValue) {
			return;
		}

		if (this.hellModeValue) {
			this.completeHellLevel();
			return;
		}

		this.completeLevel();
	}

	debugKill(): void {
		if (this.deathActiveValue || this.gameOverValue || this.completedValue) {
			return;
		}

		if (this.hellModeValue) {
			this.killPlayerInHell();
			return;
		}

		this.handleDeath('debug');
	}

	killPlayerInHell(): void {
		if (this.deathActiveValue || this.gameOverValue || this.completedValue) {
			return;
		}

		this.lastDeathReasonValue = 'abyss';

		console.warn('CombatService.killPlayerInHell', 'player death in hell level', {
			lives: this.livesValue
		});

		this.deathsValue += 1;
		this.deathActiveValue = true;
		this.hellDefeatValue = true;
		this.events.emit('audio:cue', { cue: 'death' });
	}

	/** Ends the boss level as a win; `bonusLife` when the player took the boss's heart. */
	completeHellLevel(bonusLife = false): void {
		if (this.completedValue || this.gameOverValue || this.deathActiveValue) {
			return;
		}

		if (bonusLife) {
			this.awardExtraLife();
		}
		this.completedValue = true;
		this.resultValue = 'win';
		this.scoreModel.add(SCORE_TABLE.hellBossDefeated);
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
		this.deathActiveValue = false;
		this.hellDefeatValue = false;
		this.resultValue = 'none';
		this.lastDeathReasonValue = 'none';
		this.ghosts.setPowerActive(false);
		this.ghosts.setVisible(!this.hellModeValue);
	}

	private checkLifeRewards(): void {
		while (this.scoreModel.score >= this.nextLifeThresholdValue) {
			this.awardExtraLife();

			if (this.nextLifeThresholdValue === SCORE_TABLE.firstLifeThreshold) {
				this.nextLifeThresholdValue = SCORE_TABLE.lifeThresholdStep;
			} else {
				this.nextLifeThresholdValue += SCORE_TABLE.lifeThresholdStep;
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
		if (this.profileValue === 'ms-pacman') {
			this.checkMsCollisions();
			return;
		}

		if (this.player.isInvulnerable) {
			return;
		}

		const playerPosition = this.player.position;

		if (!Number.isFinite(playerPosition.x) || !Number.isFinite(playerPosition.y)) {
			console.error('CombatService.checkCollisions', 'invalid player position', playerPosition);
			return;
		}

		for (const ghost of this.ghosts.list) {
			if (ghost.state !== 'active' && ghost.state !== 'frightened') {
				continue;
			}

			const ghostPosition = ghost.position;

			if (!Number.isFinite(ghostPosition.x) || !Number.isFinite(ghostPosition.y)) {
				console.error('CombatService.checkCollisions', 'invalid ghost position', {
					kind: ghost.kind,
					position: ghostPosition
				});
				continue;
			}

			const dx = playerPosition.x - ghostPosition.x;
			const dy = playerPosition.y - ghostPosition.y;

			if (dx * dx + dy * dy > ACTOR_CONTACT_DISTANCE_SQ) {
				continue;
			}

			if (ghost.state === 'frightened') {
				this.eatGhost(ghost);
			} else {
				this.killPlayerByGhost(ghost.kind);
			}

			break;
		}
	}

	private checkMsCollisions(): void {
		const playerPosition = this.player.position;

		if (!Number.isFinite(playerPosition.x) || !Number.isFinite(playerPosition.y)) {
			console.error('CombatService.checkMsCollisions', 'invalid player position', playerPosition);
			return;
		}

		for (const ghost of this.ghosts.list) {
			const state = ghost.state;

			if (state === 'lair' || state === 'exiting' || state === 'eyes' || state === 'hypnotized') {
				continue;
			}

			const ghostPosition = ghost.position;

			if (!Number.isFinite(ghostPosition.x) || !Number.isFinite(ghostPosition.y)) {
				console.error('CombatService.checkMsCollisions', 'invalid ghost position', {
					kind: ghost.kind,
					position: ghostPosition
				});
				continue;
			}

			const dx = playerPosition.x - ghostPosition.x;
			const dy = playerPosition.y - ghostPosition.y;

			if (dx * dx + dy * dy > ACTOR_CONTACT_DISTANCE_SQ) {
				continue;
			}

			if (this.hypnosis.overdriveActive) {
				this.hypnosis.handleContact(ghost.kind, this.ghosts);
				break;
			}

			if (this.player.isInvulnerable) {
				continue;
			}

			if (state === 'enraged') {
				this.killPlayerByEnraged(ghost.kind);
				break;
			}

			if (state === 'active' || state === 'frightened') {
				this.killPlayerByGhost(ghost.kind);
				break;
			}
		}
	}

	private eatGhost(ghost: GhostModel): void {
		this.scoreModel.add(this.chainPoints());
		this.chainValue = Math.min(3, this.chainValue + 1);
		this.ghosts.toEyes(ghost);
		this.events.emit('audio:cue', { cue: 'ghost-eaten' });

		if (this.lairCode) {
			this.lairCode.register(ghost.kind);
		}
	}

	private chainPoints(): number {
		const points = SCORE_TABLE.ghostChain[this.chainValue];

		if (typeof points === 'number' && Number.isFinite(points) && points > 0) {
			return points;
		}

		console.error('CombatService.chainPoints', 'missing chain score', { chain: this.chainValue });

		const first = SCORE_TABLE.ghostChain[0];

		if (typeof first === 'number' && Number.isFinite(first) && first > 0) {
			return first;
		}

		return 0;
	}

	private completeLevel(): void {
		this.completedValue = true;
		this.resultValue = 'win';
		this.clearPower();
		this.clearMsMode();

		if (this.secretModeValue) {
			this.scoreModel.add(SECRET_CLEAR_BONUS);
		} else {
			this.scoreModel.add(SCORE_TABLE.levelClear);

			if (this.deathsValue === 0 && this.progress.destroyedDots === 0) {
				this.scoreModel.add(SCORE_TABLE.perfectClear);
			}
		}
	}

	private killPlayerByGhost(kind: GhostKind): void {
		this.handleDeath(`ghost:${kind}`);
	}

	private killPlayerByEnraged(kind: GhostKind): void {
		this.handleDeath(`ghost:${kind}:enraged`);
	}

	private handleDeath(reason: string): void {
		if (this.secretModeValue) {
			return;
		}

		if (this.deathActiveValue || this.gameOverValue || this.completedValue) {
			return;
		}

		const safeReason = typeof reason === 'string' && reason.length > 0 ? reason : 'unknown';
		this.lastDeathReasonValue = safeReason;

		console.warn('CombatService.handleDeath', 'player death', {
			reason: safeReason,
			lives: this.livesValue
		});

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
