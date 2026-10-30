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
import { debugLog } from '../debug/debugLog';
import { ARCADE } from '../../config/arcadeConfig';

const DEFAULT_POWER_DURATION = 6;
/** Gameplay freezes this long when a ghost is eaten, so the bite lands. */
const HIT_STOP = 0.12;
/** A ghost this close (tiles²) without touching, then this far again, is a near miss. */
const NEAR_MISS_SQ = 0.95 * 0.95;
const NEAR_MISS_CLEAR_SQ = 1.6 * 1.6;
/** One near miss per ghost per this many seconds. */
const NEAR_MISS_COOLDOWN = 3;

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
	/** The arcade's own tries (secret level); the main game's lives are left alone. */
	private triesValue: number = ARCADE.tries;
	private finalRoundValue = false;
	private arcadeLostValue = false;
	private hitStopValue = 0;
	/** Ghosts brushing past Pac-Man right now, and each ghost's near-miss cooldown. */
	private readonly closeGhosts = new Set<GhostKind>();
	private readonly nearMissCooldown = new Map<GhostKind, number>();

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

	/** How long an energizer lasts on this level (season-tuned). */
	get powerDuration(): number {
		return this.powerDurationValue;
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

	/** Seconds of hit-stop asked for since the last call (a ghost was eaten). */
	consumeHitStop(): number {
		const value = this.hitStopValue;
		this.hitStopValue = 0;
		return value;
	}

	/** Arcade tries left (secret level). */
	get tries(): number {
		return this.triesValue;
	}

	/** Every arcade try is used up: back to the main game, no penalty. */
	get arcadeLost(): boolean {
		return this.arcadeLostValue;
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

	/**
	 * The secret level's arcade: classic rules whatever the profile (energizers scare the
	 * ghosts), deaths use the arcade's tries, a cleared round pays `ARCADE.roundBonus`
	 * and the last one `ARCADE.finalBonus` on top.
	 */
	setSecretMode(value: boolean, tries: number = ARCADE.tries, finalRound = false): void {
		this.secretModeValue = value;
		this.triesValue = Math.max(0, Math.floor(tries));
		this.finalRoundValue = finalRound;
		this.arcadeLostValue = false;
	}

	/** The rules in force: the arcade is always plain Pac-Man. */
	private get rulesProfile(): GameProfile {
		return this.secretModeValue ? 'pacman' : this.profileValue;
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

		if (this.progress.consumePendingEnergizer()) {
			this.activatePower();
		}

		if (this.rulesProfile === 'ms-pacman') {
			this.hypnosis.update(dt, this.ghosts);
		} else if (this.powerTimerValue > 0) {
			this.powerTimerValue = Math.max(0, this.powerTimerValue - dt);

			if (this.powerTimerValue <= 0) {
				this.ghosts.endFrightened();
				this.events.emit('audio:cue', { cue: 'power-end' });
				debugLog(this.events, 'state', 'power ends');
			}
		}

		this.ghosts.setPowerActive(this.powerTimerValue > 0);
		for (const [kind, left] of this.nearMissCooldown) {
			this.nearMissCooldown.set(kind, Math.max(0, left - dt));
		}
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
		debugLog(this.events, 'damage', 'player falls into the abyss');

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

		if (this.secretModeValue ? this.triesValue > 0 : this.livesValue > 0) {
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

	/** Dev: adds (or removes) lives; never below one. */
	debugAddLives(delta: number): void {
		if (!Number.isFinite(delta)) {
			return;
		}
		this.livesValue = Math.max(1, this.livesValue + Math.trunc(delta));
	}

	/** Dev: the energizer effect (or the Ms. Pac-Man overdrive) now. */
	debugPower(): void {
		if (this.hellModeValue) {
			return;
		}
		this.activatePower();
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
		const p = this.player.position;
		this.events.emit('fx:event', { kind: 'extra-life', x: p.x, y: p.y });
		debugLog(this.events, 'spawn', 'extra life', this.livesValue);
	}

	private activatePower(): void {
		if (this.rulesProfile === 'ms-pacman') {
			this.hypnosis.startOverdrive(this.ghosts);
			this.events.emit('audio:cue', { cue: 'power-start' });
			debugLog(this.events, 'state', 'power starts', this.powerDurationValue);
			return;
		}

		this.powerTimerValue = this.powerDurationValue;
		this.chainValue = 0;
		this.ghosts.frightenActive();
		this.ghosts.setPowerActive(true);
		this.events.emit('audio:cue', { cue: 'power-start' });
		debugLog(this.events, 'state', 'power starts', this.powerDurationValue);
	}

	private checkCollisions(): void {
		if (this.rulesProfile === 'ms-pacman') {
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
			const d2 = dx * dx + dy * dy;

			if (d2 > ACTOR_CONTACT_DISTANCE_SQ) {
				if (ghost.state === 'active') {
					this.trackNearMiss(ghost, d2);
				}
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

	/** A ghost came within a whisker and Pac-Man got away: one `near-miss` effect. */
	private trackNearMiss(ghost: GhostModel, d2: number): void {
		if (d2 <= NEAR_MISS_SQ) {
			this.closeGhosts.add(ghost.kind);
			return;
		}
		if (d2 < NEAR_MISS_CLEAR_SQ || !this.closeGhosts.delete(ghost.kind)) {
			return;
		}
		if ((this.nearMissCooldown.get(ghost.kind) ?? 0) > 0) {
			return;
		}
		this.nearMissCooldown.set(ghost.kind, NEAR_MISS_COOLDOWN);
		const p = this.player.position;
		const g = ghost.position;
		this.events.emit('fx:event', {
			kind: 'near-miss',
			x: p.x,
			y: p.y,
			gx: g.x,
			gy: g.y,
			ghost: ghost.kind
		});
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
		const points = this.chainPoints();
		this.scoreModel.add(points);
		debugLog(this.events, 'damage', `ghost ${ghost.kind} eaten`, points);
		this.chainValue = Math.min(3, this.chainValue + 1);
		const at = ghost.position;
		this.events.emit('fx:event', {
			kind: 'ghost-eaten',
			x: at.x,
			y: at.y,
			points,
			ghost: ghost.kind
		});
		this.hitStopValue = HIT_STOP;
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
			this.scoreModel.add(ARCADE.roundBonus + (this.finalRoundValue ? ARCADE.finalBonus : 0));
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
		if (this.deathActiveValue || this.gameOverValue || this.completedValue) {
			return;
		}

		const safeReason = typeof reason === 'string' && reason.length > 0 ? reason : 'unknown';
		this.lastDeathReasonValue = safeReason;

		if (this.secretModeValue) {
			// the arcade spends its own tries; the last one sends the player back
			this.deathsValue += 1;
			this.triesValue = Math.max(0, this.triesValue - 1);
			debugLog(this.events, 'damage', `arcade try lost (${safeReason})`, this.triesValue);
			this.clearPower();
			this.deathActiveValue = true;
			this.events.emit('audio:cue', { cue: 'death' });
			this.arcadeLostValue = this.triesValue <= 0;
			return;
		}

		console.warn('CombatService.handleDeath', 'player death', {
			reason: safeReason,
			lives: this.livesValue
		});

		this.closeGhosts.clear();
		this.deathsValue += 1;
		this.livesValue = Math.max(0, this.livesValue - 1);
		debugLog(this.events, 'damage', `player died (${safeReason})`, this.livesValue);
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
		if (this.rulesProfile !== 'ms-pacman') {
			return;
		}

		this.hypnosis.reset();
		this.ghosts.setMsOverdrive(false);
	}
}
