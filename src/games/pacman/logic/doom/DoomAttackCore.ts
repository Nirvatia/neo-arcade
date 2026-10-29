import type { DoomTile, DoomDirection } from './DoomGraph';
import { adjacentTile } from './DoomGraph';

export type DoomAttackKind = 'dash' | 'cross' | 'voidTrail' | 'blink' | 'brood';

export interface DoomAttackWeights {
	readonly dash: number;
	readonly cross: number;
	readonly voidTrail: number;
	readonly blink: number;
	readonly brood: number;
}

export function attackWeightsForPhase(phase: number): DoomAttackWeights {
	if (phase === 1) return { dash: 100, cross: 0, voidTrail: 0, blink: 0, brood: 0 };
	if (phase === 2) return { dash: 40, cross: 35, voidTrail: 25, blink: 0, brood: 0 };
	return { dash: 25, cross: 25, voidTrail: 15, blink: 20, brood: 15 };
}

export function attackCooldownForPhase(phase: number): number {
	if (phase === 1) return 4.0;
	if (phase === 2) return 3.0;
	return 2.2;
}

export function sameRowOrCol(a: DoomTile, b: DoomTile): boolean {
	return a.x === b.x || a.y === b.y;
}

export function tileDistance(a: DoomTile, b: DoomTile): number {
	return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function directionBetween(from: DoomTile, to: DoomTile): DoomDirection | null {
	if (from.x === to.x) {
		if (to.y < from.y) return 'UP';
		if (to.y > from.y) return 'DOWN';
	}
	if (from.y === to.y) {
		if (to.x < from.x) return 'LEFT';
		if (to.x > from.x) return 'RIGHT';
	}
	return null;
}

export function aheadTile(tile: DoomTile, direction: DoomDirection | null, steps: number): DoomTile {
	if (!direction) return tile;
	let result = tile;
	for (let i = 0; i < steps; i++) {
		result = adjacentTile(result, direction);
	}
	return result;
}

export function chooseWeightedAttack(
	weights: DoomAttackWeights,
	available: ReadonlySet<DoomAttackKind>,
	random: number
): DoomAttackKind | null {
	const entries: Array<{ kind: DoomAttackKind; weight: number }> = [];
	let total = 0;
	if (available.has('dash') && weights.dash > 0) {
		entries.push({ kind: 'dash', weight: weights.dash });
		total += weights.dash;
	}
	if (available.has('cross') && weights.cross > 0) {
		entries.push({ kind: 'cross', weight: weights.cross });
		total += weights.cross;
	}
	if (available.has('voidTrail') && weights.voidTrail > 0) {
		entries.push({ kind: 'voidTrail', weight: weights.voidTrail });
		total += weights.voidTrail;
	}
	if (available.has('blink') && weights.blink > 0) {
		entries.push({ kind: 'blink', weight: weights.blink });
		total += weights.blink;
	}
	if (available.has('brood') && weights.brood > 0) {
		entries.push({ kind: 'brood', weight: weights.brood });
		total += weights.brood;
	}
	if (entries.length === 0 || total <= 0) return null;
	let roll = random * total;
	for (const entry of entries) {
		roll -= entry.weight;
		if (roll <= 0) return entry.kind;
	}
	return entries[entries.length - 1].kind;
}