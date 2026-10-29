import type { DoomTile, DoomDirection } from './DoomGraph';
import { adjacentTile } from './DoomGraph';
import {
	BLINK_WEIGHTS,
	BROOD_WEIGHTS,
	CROSS_WEIGHTS,
	DASH_WEIGHTS,
	ERUPTION_WEIGHTS,
	PULL_WEIGHTS,
	RIFT_WEIGHTS,
	SEAL_WEIGHTS,
	SPLIT_WEIGHTS,
	VOID_WEIGHTS,
	phaseIndex
} from './DoomBalance';

export type DoomAttackKind =
	| 'dash'
	| 'cross'
	| 'voidTrail'
	| 'blink'
	| 'brood'
	| 'rift'
	| 'seal'
	| 'pull'
	| 'split'
	| 'eruption';

export const DOOM_ATTACK_KINDS: readonly DoomAttackKind[] = [
	'dash',
	'cross',
	'voidTrail',
	'blink',
	'brood',
	'rift',
	'seal',
	'pull',
	'split',
	'eruption'
];

export type DoomAttackWeights = Readonly<Record<DoomAttackKind, number>>;

export function attackWeightsForPhase(phase: number): DoomAttackWeights {
	const i = phaseIndex(phase);
	return {
		dash: DASH_WEIGHTS[i],
		cross: CROSS_WEIGHTS[i],
		voidTrail: VOID_WEIGHTS[i],
		blink: BLINK_WEIGHTS[i],
		brood: BROOD_WEIGHTS[i],
		rift: RIFT_WEIGHTS[i],
		seal: SEAL_WEIGHTS[i],
		pull: PULL_WEIGHTS[i],
		split: SPLIT_WEIGHTS[i],
		eruption: ERUPTION_WEIGHTS[i]
	};
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

export function aheadTile(
	tile: DoomTile,
	direction: DoomDirection | null,
	steps: number
): DoomTile {
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
	for (const kind of DOOM_ATTACK_KINDS) {
		const weight = weights[kind];
		if (available.has(kind) && weight > 0) {
			entries.push({ kind, weight });
			total += weight;
		}
	}
	if (entries.length === 0 || total <= 0) return null;
	let roll = random * total;
	for (const entry of entries) {
		roll -= entry.weight;
		if (roll <= 0) return entry.kind;
	}
	return entries[entries.length - 1].kind;
}
