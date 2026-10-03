export interface SnakeHudState {
	level: number;
	score: number;
	movesLeft: number;
	targetBits: (0 | 1)[];
	activeBits: (0 | 1)[];
	comboMultiplier: number;
	finalMode: boolean;
	width: number;
}

export function createDefaultSnakeHudState(): SnakeHudState {
	return {
		level: 1,
		score: 0,
		movesLeft: 0,
		targetBits: [],
		activeBits: [],
		comboMultiplier: 1,
		finalMode: false,
		width: 0
	};
}