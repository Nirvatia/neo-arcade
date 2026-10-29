import type { ScoreModel } from './ScoreModel';
import type { GhostService } from './GhostService';
import type { GhostKind } from './GhostModel';
import type { LairCodeService } from './LairCodeService';
import { SCORE_TABLE } from '../config/scoreConfig';

export type GameProfile = 'pacman' | 'ms-pacman';

const OVERDRIVE_DURATION = 5;
const HYPNOSIS_DURATION = 4;
const ENRAGED_DURATION = 2;

export class HypnosisService {
	private readonly scoreModel: ScoreModel;
	private readonly lairCode: LairCodeService | null;
	private overdriveActiveValue = false;
	private overdriveTimerValue = 0;
	private hypnotizedKindValue: GhostKind | null = null;
	private hypnosisTimerValue = 0;
	private readonly enragedTimers = new Map<GhostKind, number>();

	constructor(scoreModel: ScoreModel, lairCode: LairCodeService | null = null) {
		if (!scoreModel) {
			console.error('HypnosisService.constructor', 'missing score model');
			throw new Error('HypnosisService.constructor: missing score model');
		}
		this.scoreModel = scoreModel;
		this.lairCode = lairCode;
	}

	get overdriveActive(): boolean {
		return this.overdriveActiveValue;
	}

	get overdriveTimer(): number {
		return this.overdriveTimerValue;
	}

	get hypnotizedKind(): GhostKind | null {
		return this.hypnotizedKindValue;
	}

	reset(): void {
		this.overdriveActiveValue = false;
		this.overdriveTimerValue = 0;
		this.hypnotizedKindValue = null;
		this.hypnosisTimerValue = 0;
		this.enragedTimers.clear();
	}

	startOverdrive(ghosts: GhostService): void {
		if (!ghosts) {
			console.error('HypnosisService.startOverdrive', 'missing ghost service');
			return;
		}
		this.overdriveActiveValue = true;
		this.overdriveTimerValue = OVERDRIVE_DURATION;
		ghosts.setMsOverdrive(true);
	}

	update(dt: number, ghosts: GhostService): void {
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('HypnosisService.update', 'invalid delta time', dt);
			return;
		}
		if (!ghosts) {
			console.error('HypnosisService.update', 'missing ghost service');
			return;
		}
		if (this.overdriveActiveValue) {
			this.overdriveTimerValue = Math.max(0, this.overdriveTimerValue - dt);
			if (this.overdriveTimerValue <= 0) {
				this.overdriveActiveValue = false;
				this.overdriveTimerValue = 0;
				ghosts.setMsOverdrive(false);
			}
		}
		if (this.hypnotizedKindValue) {
			this.hypnosisTimerValue = Math.max(0, this.hypnosisTimerValue - dt);
			if (this.hypnosisTimerValue <= 0) {
				this.wakeHypnotized(ghosts, true);
			}
		}
		for (const [kind, timer] of Array.from(this.enragedTimers.entries())) {
			const nextTimer = Math.max(0, timer - dt);
			if (nextTimer <= 0) {
				this.enragedTimers.delete(kind);
				ghosts.setGhostState(kind, 'active');
			} else {
				this.enragedTimers.set(kind, nextTimer);
			}
		}
	}

	handleContact(kind: GhostKind, ghosts: GhostService): void {
		if (!this.overdriveActiveValue) {
			return;
		}
		if (!ghosts) {
			console.error('HypnosisService.handleContact', 'missing ghost service');
			return;
		}
		if (this.hypnotizedKindValue === kind) {
			return;
		}
		if (!this.hypnotizedKindValue) {
			this.hypnotizedKindValue = kind;
			this.hypnosisTimerValue = HYPNOSIS_DURATION;
			this.scoreModel.add(SCORE_TABLE.hypnosis);
			ghosts.setGhostState(kind, 'hypnotized');
			if (this.lairCode) {
				this.lairCode.register(kind);
			}
			return;
		}
		const previous = this.hypnotizedKindValue;
		ghosts.setGhostState(previous, 'frightened');
		this.hypnotizedKindValue = kind;
		this.hypnosisTimerValue = HYPNOSIS_DURATION;
		this.scoreModel.add(SCORE_TABLE.hypnosisTransfer);
		ghosts.setGhostState(kind, 'hypnotized');
		if (this.lairCode) {
			this.lairCode.register(kind);
		}
	}

	private wakeHypnotized(ghosts: GhostService, enraged: boolean): void {
		const kind = this.hypnotizedKindValue;
		if (!kind) {
			return;
		}
		this.hypnotizedKindValue = null;
		this.hypnosisTimerValue = 0;
		if (enraged) {
			ghosts.setGhostState(kind, 'enraged');
			this.enragedTimers.set(kind, ENRAGED_DURATION);
			return;
		}
		ghosts.setGhostState(kind, this.overdriveActiveValue ? 'frightened' : 'active');
	}
}
