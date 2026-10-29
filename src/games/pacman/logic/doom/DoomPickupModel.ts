export type DoomPickupKind = 'berserk' | 'bfg' | 'barrel' | 'medkit';

export interface DoomPickupTile {
	readonly x: number;
	readonly y: number;
}

export class DoomPickupModel {
	private kindValue: DoomPickupKind | null = null;
	private respawnTimerValue = 0;
	private respawnDelayValue = 0;
	private pendingKindValue: DoomPickupKind | null = null;
	private readonly tileValue: DoomPickupTile;

	constructor(tile: DoomPickupTile) {
		if (!tile || !Number.isFinite(tile.x) || !Number.isFinite(tile.y)) {
			console.error('DoomPickupModel.constructor', 'invalid tile', tile);
			throw new Error('DoomPickupModel.constructor: invalid tile');
		}
		this.tileValue = tile;
	}

	get tile(): DoomPickupTile {
		return this.tileValue;
	}

	get kind(): DoomPickupKind | null {
		return this.kindValue;
	}

	get visible(): boolean {
		return this.kindValue !== null;
	}

	get respawnTimer(): number {
		return this.respawnTimerValue;
	}

	get respawnDelay(): number {
		return this.respawnDelayValue;
	}

	get pendingKind(): DoomPickupKind | null {
		return this.pendingKindValue;
	}

	get respawnProgress(): number {
		if (this.respawnDelayValue <= 0) {
			return 0;
		}
		return Math.max(0, Math.min(1, 1 - this.respawnTimerValue / this.respawnDelayValue));
	}

	spawn(kind: DoomPickupKind): void {
		this.kindValue = kind;
		this.respawnTimerValue = 0;
		this.respawnDelayValue = 0;
		this.pendingKindValue = null;
	}

	consume(): void {
		this.kindValue = null;
	}

	startRespawn(delay: number, kind: DoomPickupKind): void {
		this.kindValue = null;
		this.respawnTimerValue = Math.max(0, delay);
		this.respawnDelayValue = Math.max(0, delay);
		this.pendingKindValue = kind;
	}

	update(dt: number): void {
		if (!Number.isFinite(dt) || dt < 0) {
			return;
		}
		if (this.respawnTimerValue <= 0) {
			return;
		}
		this.respawnTimerValue = Math.max(0, this.respawnTimerValue - dt);
		if (this.respawnTimerValue <= 0 && this.pendingKindValue) {
			this.spawn(this.pendingKindValue);
		}
	}

	reset(): void {
		this.kindValue = null;
		this.respawnTimerValue = 0;
		this.respawnDelayValue = 0;
		this.pendingKindValue = null;
	}
}
