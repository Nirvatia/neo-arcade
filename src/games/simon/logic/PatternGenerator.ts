import { SimonPadList, type SimonPadId } from '../core/SimonTypes';

export function generateSimonPattern(round: number): SimonPadId[] {
	const safeRound = Math.max(1, Math.floor(Number.isFinite(round) ? round : 1));
	const sequence: SimonPadId[] = [];
	let lastPad: SimonPadId | null = null;
	for (let i = 0; i < safeRound; i += 1) {
		let nextPad = getRandomPad();
		while (nextPad === lastPad) {
			nextPad = getRandomPad();
		}
		sequence.push(nextPad);
		lastPad = nextPad;
	}
	return sequence;
}

function getRandomPad(): SimonPadId {
	const index = Math.floor(Math.random() * SimonPadList.length);
	const pad = SimonPadList[index];
	if (!pad) {
		throw new Error(`[PatternGenerator] No pad at index ${index}`);
	}
	return pad;
}