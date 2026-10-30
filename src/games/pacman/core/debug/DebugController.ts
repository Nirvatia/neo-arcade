import type { Director } from '../Director';
import type { LevelLoader } from '../../logic/level/LevelLoader';
import type { TimeControl } from '../../engine/TimeControl';
import type { FruitKind } from '../../logic/bonuses/fruitCatalog';
import type { DoomPickupKind } from '../../logic/doom/DoomPickupModel';
import type { DoomAttackKind } from '../../logic/doom/DoomAttackCore';

/** What the render overlays of the dev panel draw (read by the renderers each frame). */
export interface DebugRenderFlags {
	grid: boolean;
	ghostPaths: boolean;
	hitboxes: boolean;
	fronts: boolean;
}

/**
 * Every dev command in one place (dev build only). The dev panel and the hotkeys call it;
 * it reaches the game through the director (state changes) and the level loader (the
 * current level's services). Nothing here runs in production: `GameMain` builds it only
 * when `import.meta.env.DEV` is set.
 */
export class DebugController {
	readonly renderFlags: DebugRenderFlags = {
		grid: false,
		ghostPaths: false,
		hitboxes: false,
		fronts: false
	};

	constructor(
		private readonly director: Director,
		private readonly loader: LevelLoader,
		readonly time: TimeControl
	) {}

	// ── flow ────────────────────────────────────────────────────────────────

	togglePause(): void {
		this.director.togglePause();
	}

	toggleFreeze(): void {
		this.time.setFrozen(!this.time.frozen);
	}

	step(): void {
		this.time.step();
	}

	setTimeScale(value: number): void {
		this.time.setScale(value);
	}

	// ── level ───────────────────────────────────────────────────────────────

	/** The level a new game starts on. */
	setStartLevel(value: number): void {
		this.loader.setPendingStartLevel(value);
	}

	gotoLevel(value: number): void {
		this.director.debugGotoLevel(value);
	}

	restartLevel(): void {
		this.director.debugGotoLevel(this.loader.level);
	}

	enterHell(): void {
		this.director.debugEnterHell();
	}

	enterSecret(): void {
		this.director.debugEnterSecret();
	}

	completeLevel(): void {
		this.director.debugCompleteLevel();
	}

	die(): void {
		this.director.debugKillPlayer();
	}

	setMazeScale(value: number): void {
		this.loader.setMazeScale(value);
	}

	// ── player ──────────────────────────────────────────────────────────────

	/** Returns the new god-mode state. */
	toggleGodMode(): boolean {
		return this.loader.debugToggleGodMode();
	}

	addLives(delta: number): void {
		this.loader.combat?.debugAddLives(delta);
		this.loader.emitHud();
	}

	power(): void {
		this.loader.combat?.debugPower();
	}

	giveWeapon(kind: DoomPickupKind): void {
		this.loader.doom?.debugGiveWeapon(kind);
		this.loader.emitHud();
	}

	toggleProfile(): void {
		this.loader.toggleProfile();
	}

	// ── boss ────────────────────────────────────────────────────────────────

	damageBoss(amount = 250): void {
		this.loader.doomBoss?.takeDamage(amount);
		this.loader.emitHud();
	}

	setBossPhase(phase: number): void {
		this.loader.doomBoss?.debugSetPhase(phase);
		this.loader.emitHud();
	}

	forceAttack(kind: DoomAttackKind): void {
		this.loader.doomBoss?.debugForceAttack(kind);
	}

	killBoss(): void {
		this.loader.doomBoss?.debugKill();
		this.loader.emitHud();
	}

	// ── spawns ──────────────────────────────────────────────────────────────

	spawnFruit(kind: FruitKind): void {
		this.loader.fruit?.debugSpawn(kind);
	}

	spawnEgg(): void {
		this.loader.egg?.debugSpawn();
	}

	spawnEcho(): void {
		this.loader.echo?.debugSpawn();
	}

	/** Respawns every hell pickup at once. */
	spawnPickups(): void {
		this.loader.doom?.debugSpawn();
	}

	// ── render ──────────────────────────────────────────────────────────────

	setRenderFlag(flag: keyof DebugRenderFlags, value: boolean): void {
		this.renderFlags[flag] = value;
	}
}
