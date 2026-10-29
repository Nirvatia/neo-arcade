import { CONTACT_DISTANCE, RECOVER_DAMAGE_MUL } from './DoomBalance';

export type DoomDamageSource = 'bfgOrb' | 'bfgTracer' | 'barrel' | 'bite';

export interface DoomPoint {
	readonly x: number;
	readonly y: number;
}

const CONTACT_DISTANCE_SQ = CONTACT_DISTANCE * CONTACT_DISTANCE;
const SWEEP_STEP = 0.2;

const DAMAGE: Record<DoomDamageSource, number> = {
	bfgOrb: 350,
	bfgTracer: 150,
	barrel: 200,
	bite: 80
};

const STUN: Record<DoomDamageSource, number> = {
	bfgOrb: 0.5,
	bfgTracer: 0,
	barrel: 0.6,
	bite: 1.0
};

export function damageForSource(source: DoomDamageSource): number {
	return DAMAGE[source];
}

export function stunForSource(source: DoomDamageSource): number {
	return STUN[source];
}

export function finalDamage(rawDamage: number, inRecoverWindow: boolean): number {
	if (!Number.isFinite(rawDamage) || rawDamage < 0) {
		console.error('DoomCombatRules.finalDamage', 'invalid raw damage', rawDamage);
		return 0;
	}
	return rawDamage * (inRecoverWindow ? RECOVER_DAMAGE_MUL : 1);
}

export function inContact(a: DoomPoint, b: DoomPoint): boolean {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	return dx * dx + dy * dy < CONTACT_DISTANCE_SQ;
}

export function sweptContact(
	playerFrom: DoomPoint,
	playerTo: DoomPoint,
	bossFrom: DoomPoint,
	bossTo: DoomPoint
): boolean {
	if (inContact(playerFrom, bossFrom)) return true;
	if (inContact(playerTo, bossTo)) return true;
	const dx = bossTo.x - bossFrom.x;
	const dy = bossTo.y - bossFrom.y;
	const length = Math.hypot(dx, dy);
	const steps = Math.max(1, Math.ceil(length / SWEEP_STEP));
	for (let i = 0; i <= steps; i++) {
		const t = i / steps;
		const point = {
			x: bossFrom.x + dx * t,
			y: bossFrom.y + dy * t
		};
		if (segmentPointDistanceSq(point, playerFrom, playerTo) < CONTACT_DISTANCE_SQ) {
			return true;
		}
	}
	return false;
}

function segmentPointDistanceSq(p: DoomPoint, a: DoomPoint, b: DoomPoint): number {
	const abx = b.x - a.x;
	const aby = b.y - a.y;
	const lengthSq = abx * abx + aby * aby;
	if (lengthSq <= 1e-9) {
		const dx = p.x - a.x;
		const dy = p.y - a.y;
		return dx * dx + dy * dy;
	}
	const projection = ((p.x - a.x) * abx + (p.y - a.y) * aby) / lengthSq;
	const t = Math.max(0, Math.min(1, projection));
	const dx = p.x - (a.x + abx * t);
	const dy = p.y - (a.y + aby * t);
	return dx * dx + dy * dy;
}