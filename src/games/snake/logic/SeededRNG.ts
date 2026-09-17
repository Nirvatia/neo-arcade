export class SeededRNG {
	private state: number;

	constructor(seed: number) {
		this.state = seed >>> 0;
	}

	// Следующее число в [0, 1).
	public next(): number {
		this.state = (this.state + 0x6d2b79f5) | 0;
		let t = this.state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	}

	// Целое в [0, max).
	public nextInt(max: number): number {
		return Math.floor(this.next() * max);
	}

	// Целое в [min, max].
	public nextRange(min: number, max: number): number {
		return min + Math.floor(this.next() * (max - min + 1));
	}
}
