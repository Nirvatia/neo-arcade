export type DoomSlotItem = 'bfg' | 'barrel' | null;

export interface DoomBerserkState {
	readonly active: boolean;
	readonly timer: number;
}

export interface DoomBfgChargeState {
	readonly charging: boolean;
	readonly progress: number;
}

const BERSERK_DURATION = 7.0;
const BERSERK_MAX_DURATION = 10.0;
const BFG_CHARGE_TIME = 0.8;
const BFG_RECOIL_LOCK = 0.3;

export class DoomWeaponModel {
	public slot: DoomSlotItem = null;
	public berserkTimer = 0;
	public bfgCharging = false;
	public bfgChargeTimer = 0;
	public bfgRecoilTimer = 0;
	private chargeCompletedValue = false;

	get berserkActive(): boolean {
		return this.berserkTimer > 0;
	}

	get berserkState(): DoomBerserkState {
		return {
			active: this.berserkActive,
			timer: this.berserkTimer
		};
	}

	get bfgChargeState(): DoomBfgChargeState {
		return {
			charging: this.bfgCharging,
			progress: BFG_CHARGE_TIME > 0 ? Math.min(1, this.bfgChargeTimer / BFG_CHARGE_TIME) : 0
		};
	}

	activateBerserk(): void {
		this.berserkTimer = BERSERK_DURATION;
	}

	extendBerserk(seconds: number): void {
		if (!Number.isFinite(seconds) || seconds <= 0) {
			return;
		}
		this.berserkTimer = Math.min(BERSERK_MAX_DURATION, this.berserkTimer + seconds);
	}

	startBfgCharge(): boolean {
		if (this.slot !== 'bfg') {
			return false;
		}
		if (this.bfgCharging) {
			return false;
		}
		if (this.bfgRecoilTimer > 0) {
			return false;
		}
		this.bfgCharging = true;
		this.bfgChargeTimer = 0;
		return true;
	}

	cancelBfgCharge(): void {
		if (!this.bfgCharging) {
			return;
		}
		this.bfgCharging = false;
		this.bfgChargeTimer = 0;
	}

	completeBfgCharge(): void {
		this.bfgCharging = false;
		this.bfgChargeTimer = 0;
		this.bfgRecoilTimer = BFG_RECOIL_LOCK;
		this.slot = null;
		this.chargeCompletedValue = true;
	}

	consumeChargeCompleted(): boolean {
		const value = this.chargeCompletedValue;
		this.chargeCompletedValue = false;
		return value;
	}

	consumeBarrel(): boolean {
		if (this.slot !== 'barrel') {
			return false;
		}
		this.slot = null;
		return true;
	}

	update(dt: number): void {
		if (!Number.isFinite(dt) || dt < 0) {
			return;
		}
		if (this.berserkTimer > 0) {
			this.berserkTimer = Math.max(0, this.berserkTimer - dt);
		}
		if (this.bfgCharging) {
			this.bfgChargeTimer = Math.min(BFG_CHARGE_TIME, this.bfgChargeTimer + dt);
			if (this.bfgChargeTimer >= BFG_CHARGE_TIME) {
				this.completeBfgCharge();
			}
		}
		if (this.bfgRecoilTimer > 0) {
			this.bfgRecoilTimer = Math.max(0, this.bfgRecoilTimer - dt);
		}
	}

	reset(): void {
		this.slot = null;
		this.berserkTimer = 0;
		this.bfgCharging = false;
		this.bfgChargeTimer = 0;
		this.bfgRecoilTimer = 0;
		this.chargeCompletedValue = false;
	}
}
