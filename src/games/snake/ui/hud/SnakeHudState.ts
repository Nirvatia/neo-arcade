export interface SnakeHudState {
	// Прогрессия биомов.
	biomeIndex: number;
	biomeLevel: number;
	infinite: boolean;

	score: number;

	// Головоломка последовательности.
	movesLeft: number;
	targetBits: (0 | 1)[];
	activeBits: (0 | 1)[];

	// Комбо.
	comboMultiplier: number;

	width: number;
}

export function createDefaultSnakeHudState(): SnakeHudState {
	return {
		biomeIndex: 0,
		biomeLevel: 1,
		infinite: false,
		score: 0,
		movesLeft: 0,
		targetBits: [],
		activeBits: [],
		comboMultiplier: 1,
		width: 0
	};
}