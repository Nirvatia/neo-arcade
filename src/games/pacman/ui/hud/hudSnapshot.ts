import type { Director } from '../../core/Director';
import type { PacmanStateName, PacmanProfile } from '../../core/Events';
import type { LevelLoader } from '../../logic/level/LevelLoader';
import type { FruitKind } from '../../logic/bonuses/fruitCatalog';
import { fruitForLevel } from '../../logic/bonuses/fruitCatalog';
import { BOSS_HP, PHASE_THRESHOLDS, PLAYER_MAX_HP } from '../../logic/doom/DoomBalance';
import { arcadeRound } from '../../config/arcadeConfig';

export type HudWorld = 'spring' | 'summer' | 'autumn' | 'winter' | 'hell' | 'secret';

/** A running timer the HUD shows as a draining bar. */
export interface HudTimer {
	readonly kind: 'power' | 'overdrive' | 'echo';
	readonly remaining: number;
	readonly duration: number;
}

export interface HudBoss {
	readonly name: 'hell';
	readonly phase: number;
	readonly hp: number;
	readonly hpMax: number;
	/** Phase boundaries as fractions of the HP bar. */
	readonly marks: readonly number[];
	readonly playerHp: number;
	readonly playerHpMax: number;
	readonly weapon: 'bfg' | 'barrel' | 'berserk' | '';
	readonly berserk: number;
	/** 0..1 while the BFG charges. */
	readonly charge: number;
	readonly defeated: boolean;
	/** The heart and the exit are on the board. */
	readonly rewardOffered: boolean;
}

/** Everything the HUD and the screens show, read once per frame. Plain data. */
export interface HudSnapshot {
	readonly state: PacmanStateName;
	/** The state under the pause screen. */
	readonly underPause: PacmanStateName;
	readonly paused: boolean;
	/** Screen fade cover, 0 (clear) to 1 (black). */
	readonly fade: number;
	readonly phase: string;
	readonly remaining: number;
	readonly duration: number;
	readonly profile: PacmanProfile;
	readonly world: HudWorld;
	/** The level number; on the secret level the arcade round. */
	readonly level: number;
	readonly score: number;
	readonly highScore: number;
	/** Lives; on the secret level the arcade's tries. */
	readonly lives: number;
	/** 0..1 of the dots eaten (weather at 0.5, night at 0.75). */
	readonly dots: number;
	readonly timer: HudTimer | null;
	/** The fruits of the last levels up to this one, oldest first (arcade style). */
	readonly fruits: readonly FruitKind[];
	readonly boss: HudBoss | null;
}

const FRUIT_ROW = 7;

/** The snapshot of the running game. */
export function buildHudSnapshot(
	director: Director,
	level: LevelLoader,
	highScore: number
): HudSnapshot {
	const flow = director.flow;
	const combat = level.combat;
	const season = level.season;
	const world: HudWorld = level.secretMode
		? 'secret'
		: level.hellMode
			? 'hell'
			: ((season?.name ?? 'spring') as HudWorld);
	let timer: HudTimer | null = null;
	const echo = level.echo;
	const hypnosis = level.hypnosis;
	if (echo && echo.phase === 'clone') {
		timer = { kind: 'echo', remaining: echo.timer, duration: Math.max(echo.timer, 8) };
	} else if (hypnosis?.overdriveActive) {
		timer = { kind: 'overdrive', remaining: hypnosis.overdriveTimer, duration: 5 };
	} else if (combat?.isPowerActive) {
		timer = { kind: 'power', remaining: combat.powerTimer, duration: combat.powerDuration };
	}
	const doom = level.doom;
	const bossService = level.doomBoss;
	const boss: HudBoss | null =
		doom && bossService
			? {
					name: 'hell',
					phase: bossService.phase,
					hp: bossService.hp,
					hpMax: BOSS_HP,
					marks: PHASE_THRESHOLDS.map((t) => t / BOSS_HP),
					playerHp: doom.playerHp,
					playerHpMax: PLAYER_MAX_HP,
					weapon: (doom.armed as HudBoss['weapon']) || '',
					berserk: doom.berserkTimer,
					charge: doom.bfgCharging ? doom.bfgChargeProgress : 0,
					defeated: bossService.defeated,
					rewardOffered: Boolean(level.bossReward?.offered)
				}
			: null;
	const secret = level.secretMode;
	const fruits: FruitKind[] = [];
	if (secret) {
		for (let r = 1; r <= level.arcadeRound; r++) {
			fruits.push(arcadeRound(r).fruit);
		}
	} else {
		const n = Math.max(1, level.level);
		for (let i = Math.max(1, n - FRUIT_ROW + 1); i <= n; i++) {
			fruits.push(fruitForLevel(i));
		}
	}
	const score = level.score;
	return {
		state: flow.state,
		underPause: flow.state,
		paused: flow.paused,
		fade: flow.fade,
		phase: flow.phase,
		remaining: flow.remaining,
		duration: flow.duration,
		profile: level.profile,
		world,
		level: secret ? level.arcadeRound : level.level,
		score,
		highScore: Math.max(highScore, score),
		lives: (secret ? combat?.tries : combat?.lives) ?? 0,
		dots: level.progress?.collectionRatio ?? 0,
		timer,
		fruits,
		boss
	};
}
