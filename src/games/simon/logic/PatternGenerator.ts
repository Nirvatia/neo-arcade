import { SimonPadList, type SimonPadId } from '../core/SimonTypes';

export function generateSimonPattern(round: number): SimonPadId[] {
  if (!Number.isFinite(round)) {
    throw new Error('[PatternGenerator] Round must be finite');
  }

  const safeRound = Math.max(1, Math.floor(round));

  if (SimonPadList.length === 0) {
    throw new Error('[PatternGenerator] Pad list is empty');
  }

  const sequence: SimonPadId[] = [];
  let lastPad: SimonPadId | null = null;

  for (let i = 0; i < safeRound; i += 1) {
    let nextPad = getRandomSimonPad();

    while (nextPad === lastPad && SimonPadList.length > 1) {
      nextPad = getRandomSimonPad();
    }

    sequence.push(nextPad);
    lastPad = nextPad;
  }

  return sequence;
}

function getRandomSimonPad(): SimonPadId {
  const index = Math.floor(Math.random() * SimonPadList.length);
  const pad = SimonPadList[index];

  if (!pad) {
    throw new Error(`[PatternGenerator] No pad at index ${index}`);
  }

  return pad;
}