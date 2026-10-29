import type { GridService } from '../GridService';
import type { PlayerService } from '../PlayerService';
import { DoomPickupModel } from './DoomPickupModel';
import type { DoomPickupKind, DoomPickupTile } from './DoomPickupModel';
import { findDoomCorners } from './DoomMapValidation';

const RESPAWN_MIN = 15;
const RESPAWN_MAX = 20;
const PICKUP_KINDS: readonly DoomPickupKind[] = ['berserk', 'bfg', 'barrel', 'medkit'];
const BASE_WEIGHTS: Record<DoomPickupKind, number> = {
	berserk: 3,
	bfg: 3,
	barrel: 3,
	medkit: 2
};
const MEDKIT_WEIGHT_HURT = 4;
const PICKUP_CONTACT_RADIUS_SQ = 0.49;

export class DoomPickupService {
	private readonly pickups: DoomPickupModel[] = [];
	private readonly grid: GridService;

	constructor(grid: GridService) {
		if (!grid) {
			console.error('DoomPickupService.constructor', 'missing grid service');
			throw new Error('DoomPickupService.constructor: missing grid service');
		}
		this.grid = grid;
		const corners = this.findCorners();
		if (corners.length < 4) {
			console.error('DoomPickupService.constructor', 'not enough corner tiles for pickups', {
				found: corners.length
			});
			throw new Error('DoomPickupService.constructor: not enough corner tiles for pickups');
		}
		for (const corner of corners) {
			this.pickups.push(new DoomPickupModel(corner));
		}
		this.initialSpawn();
	}

	get list(): readonly DoomPickupModel[] {
		return this.pickups;
	}

	update(
		dt: number,
		player: PlayerService,
		playerHp: number,
		slotOccupied: boolean
	): DoomPickupKind | null {
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('DoomPickupService.update', 'invalid delta time', dt);
			return null;
		}
		for (const pickup of this.pickups) {
			pickup.update(dt);
		}
		let collected: DoomPickupKind | null = null;
		for (const pickup of this.pickups) {
			if (!pickup.visible) {
				continue;
			}
			if (!this.touchesPlayer(pickup.tile, player)) {
				continue;
			}
			const kind = pickup.kind;
			if (!kind) {
				continue;
			}
			if (!this.isCollectible(kind, playerHp, slotOccupied)) {
				continue;
			}
			collected = kind;
			pickup.consume();
			const delay = RESPAWN_MIN + Math.random() * (RESPAWN_MAX - RESPAWN_MIN);
			const respawnKind = this.chooseKind(playerHp);
			if (respawnKind) {
				pickup.startRespawn(delay, respawnKind);
			}
			break;
		}
		return collected;
	}

	fillEmpty(playerHp: number): void {
		for (const pickup of this.pickups) {
			if (pickup.visible) {
				continue;
			}
			const kind = this.chooseKind(playerHp);
			if (kind) {
				pickup.spawn(kind);
			}
		}
	}

	reset(): void {
		for (const pickup of this.pickups) {
			pickup.reset();
		}
		this.initialSpawn();
	}

	isCollectible(kind: DoomPickupKind, playerHp: number, slotOccupied: boolean): boolean {
		if (kind === 'medkit') {
			return playerHp < 3;
		}
		if (kind === 'bfg' || kind === 'barrel') {
			return !slotOccupied;
		}
		return true;
	}

	private findCorners(): DoomPickupTile[] {
		return findDoomCorners(this.grid);
	}

	private initialSpawn(): void {
		const kinds: DoomPickupKind[] = ['berserk', 'bfg', 'barrel', 'medkit'];
		for (let i = kinds.length - 1; i > 0; i -= 1) {
			const j = Math.floor(Math.random() * (i + 1));
			const tmp = kinds[i];
			kinds[i] = kinds[j];
			kinds[j] = tmp;
		}
		const count = Math.min(kinds.length, this.pickups.length);
		for (let i = 0; i < count; i += 1) {
			this.pickups[i].spawn(kinds[i]);
		}
	}

	private chooseKind(playerHp: number): DoomPickupKind | null {
		const available: Array<{ kind: DoomPickupKind; weight: number }> = [];
		for (const kind of PICKUP_KINDS) {
			if (this.isKindOnMap(kind)) {
				continue;
			}
			let weight = BASE_WEIGHTS[kind];
			if (kind === 'medkit') {
				weight = playerHp < 3 ? MEDKIT_WEIGHT_HURT : 0;
			}
			if (weight > 0) {
				available.push({ kind, weight });
			}
		}
		if (available.length === 0) {
			return null;
		}
		let total = 0;
		for (const item of available) {
			total += item.weight;
		}
		let roll = Math.random() * total;
		for (const item of available) {
			roll -= item.weight;
			if (roll <= 0) {
				return item.kind;
			}
		}
		return available[available.length - 1].kind;
	}

	private isKindOnMap(kind: DoomPickupKind): boolean {
		for (const pickup of this.pickups) {
			if (pickup.kind === kind) {
				return true;
			}
			if (pickup.pendingKind === kind) {
				return true;
			}
		}
		return false;
	}

	private touchesPlayer(tile: DoomPickupTile, player: PlayerService): boolean {
		const pos = player.position;
		if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) {
			return false;
		}
		const dx = pos.x - (tile.x + 0.5);
		const dy = pos.y - (tile.y + 0.5);
		return dx * dx + dy * dy < PICKUP_CONTACT_RADIUS_SQ;
	}
}
