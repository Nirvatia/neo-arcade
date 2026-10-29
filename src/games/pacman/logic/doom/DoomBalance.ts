export interface DoomPhaseTuning {
	readonly speedRatio: number;
	readonly baseChaos: number;
	readonly attackCooldown: number;
}

const PHASE_TUNING: readonly DoomPhaseTuning[] = [
	{ speedRatio: 0.8, baseChaos: 0.25, attackCooldown: 4.0 },
	{ speedRatio: 6 / 7, baseChaos: 0.45, attackCooldown: 3.0 },
	{ speedRatio: 32 / 35, baseChaos: 0.70, attackCooldown: 2.2 }
];

export const DASH_SPEED_MUL = 2;
export const DASH_MAX_TILES = 14;
export const DASH_MIN_DISTANCE = 3;
export const DASH_MAX_DISTANCE = 12;
export const DASH_TELEGRAPH = [0.7, 0.6, 0.5] as const;
export const DASH_RECOVER = [0.8, 0.7, 0.6] as const;
export const DASH_WEIGHTS = [100, 40, 25] as const;
export const CROSS_TELEGRAPH = [0, 1.0, 0.8] as const;
export const CROSS_ACTIVE = 0.35;
export const CROSS_RECOVER = 0.8;
export const CROSS_MAX_PATH_DIST = 10;
export const CROSS_COOLDOWN = 6;
export const CROSS_WEIGHTS = [0, 35, 25] as const;
export const VOID_TELEGRAPH = 0.6;
export const VOID_DURATION = [0, 6.0, 7.0] as const;
export const VOID_CELL_LIFETIME = [0, 7.0, 8.0] as const;
export const VOID_FLICKER = 1.5;
export const VOID_MAX_CELLS = [0, 10, 14] as const;
export const VOID_NO_SPAWN_NEAR_PLAYER = 2;
export const VOID_COOLDOWN = 10;
export const VOID_WEIGHTS = [0, 25, 15] as const;
export const BLINK_TELEGRAPH = 0.5;
export const BLINK_VANISH = 0.3;
export const BLINK_RECOVER = 0.4;
export const BLINK_DEST_MIN_DIST = 5;
export const BLINK_DEST_MAX_DIST = 9;
export const BLINK_COOLDOWN = 8;
export const BLINK_WEIGHTS = [0, 0, 20] as const;
export const BROOD_TELEGRAPH = 0.8;
export const BROOD_RECOVER = 0.5;
export const BROOD_COUNT = 2;
export const BROOD_COUNT_LOW_HP = 3;
export const BROOD_LOW_HP_THRESHOLD = 250;
export const BROOD_MAX_ALIVE = 3;
export const BROOD_MINION_LIFETIME = 14;
export const BROOD_COOLDOWN = 14;
export const BROOD_WEIGHTS = [0, 0, 15] as const;
export const MINION_SPEED_RATIO = 5.2 / 7;
export const CONTACT_DISTANCE = 0.75;
export const RECOVER_DAMAGE_MUL = 1.25;
export const PLAYER_IFRAMES = 1.5;
export const PLAYER_MAX_HP = 3;
export const STUN_IMMUNITY = 0.5;
export const INTRO_DURATION = 3.0;
export const TRANSITION_DURATION = 2.5;
export const ATTACK_RETRY_INTERVAL = 0.25;
export const BOSS_HP = 1500;
export const PHASE_THRESHOLDS = [1000, 500] as const;
export const BFG_ORB_DAMAGE = 350;
export const BFG_ORB_STUN = 0.5;
export const BFG_TRACER_DAMAGE = 150;
export const BARREL_DAMAGE = 200;
export const BARREL_STUN = 0.6;
export const BERSERK_BITE_DAMAGE = 80;
export const BERSERK_BITE_STUN = 1.0;
export const BERSERK_SPEED_MUL = 1.15;

export function tuningForPhase(phase: number): DoomPhaseTuning {
	const index = Math.min(2, Math.max(0, Math.floor(phase) - 1));
	return PHASE_TUNING[index];
}

export function bossChaseSpeed(playerBaseSpeed: number, phase: number): number {
	if (!Number.isFinite(playerBaseSpeed) || playerBaseSpeed <= 0) {
		console.error('DoomBalance.bossChaseSpeed', 'invalid player base speed', playerBaseSpeed);
		return 0;
	}
	return playerBaseSpeed * tuningForPhase(phase).speedRatio;
}

export function bossDashSpeed(playerBaseSpeed: number, phase: number): number {
	return bossChaseSpeed(playerBaseSpeed, phase) * DASH_SPEED_MUL;
}

export function minionChaseSpeed(playerBaseSpeed: number): number {
	if (!Number.isFinite(playerBaseSpeed) || playerBaseSpeed <= 0) {
		console.error('DoomBalance.minionChaseSpeed', 'invalid player base speed', playerBaseSpeed);
		return 0;
	}
	return playerBaseSpeed * MINION_SPEED_RATIO;
}

export function baseChaosForPhase(phase: number): number {
	return tuningForPhase(phase).baseChaos;
}

export function attackCooldownForPhase(phase: number): number {
	return tuningForPhase(phase).attackCooldown;
}

export function phaseIndex(phase: number): number {
	return Math.min(2, Math.max(0, Math.floor(phase) - 1));
}