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

/** One row of the live timer table: a name and seconds (or 0..1 for charges). */
export interface DebugWatch {
	readonly group: string;
	readonly label: string;
	readonly value: number;
	readonly unit: 's' | '%' | '';
}

/** What the dev panel shows live, read once per animation frame. */
export interface DebugSnapshot {
	readonly state: string;
	readonly phase: string;
	readonly phaseRemaining: number;
	readonly remaining: number;
	readonly paused: boolean;
	readonly frozen: boolean;
	readonly scale: number;
	readonly level: number;
	readonly hell: boolean;
	readonly secret: boolean;
	readonly profile: string;
	readonly lives: number;
	readonly score: number;
	readonly godMode: boolean;
	readonly boss: {
		readonly hp: number;
		readonly phase: number;
		readonly state: string;
		readonly forced: string | null;
		readonly defeated: boolean;
	} | null;
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

	snapshot(): DebugSnapshot {
		const flow = this.director.flow;
		const boss = this.loader.doomBoss;
		return {
			state: flow.state,
			phase: flow.phase,
			phaseRemaining: flow.phaseRemaining,
			remaining: flow.remaining,
			paused: flow.paused,
			frozen: this.time.frozen,
			scale: this.time.scale,
			level: this.loader.level,
			hell: this.loader.hellMode,
			secret: this.loader.secretMode,
			profile: this.loader.profile,
			lives: this.loader.combat?.lives ?? 0,
			score: this.loader.score,
			godMode: this.loader.godMode,
			boss: boss
				? {
						hp: boss.hp,
						phase: boss.phase,
						state: boss.state,
						forced: boss.debugForcedAttack,
						defeated: boss.defeated
					}
				: null
		};
	}

	/** Live timers for the watch table: only what the current level has, zeros included. */
	watches(): DebugWatch[] {
		const rows: DebugWatch[] = [];
		const add = (group: string, label: string, value: number, unit: DebugWatch['unit'] = 's') =>
			rows.push({ group, label, value, unit });
		const flow = this.director.flow;
		add('flow', `${flow.state} · ${flow.phase}`, flow.phaseRemaining);
		const player = this.loader.player;
		if (player) {
			add('player', 'invulnerable', player.invulnerableTimer);
		}
		const combat = this.loader.combat;
		const hypnosis = this.loader.hypnosis;
		if (combat && !this.loader.hellMode) {
			if (this.loader.profile === 'ms-pacman') {
				add('player', 'overdrive', hypnosis?.overdriveTimer ?? 0);
			} else {
				add('player', 'power', combat.powerTimer);
			}
		}
		const fruit = this.loader.fruit;
		if (fruit?.active) {
			add('bonus', `fruit ${fruit.active.toLowerCase()}`, fruit.timer);
		}
		const doom = this.loader.doom;
		const boss = this.loader.doomBoss;
		if (doom) {
			add('player', 'hell HP', doom.playerHp, '');
			add('player', 'berserk', doom.berserkTimer);
			add('player', 'BFG charge', doom.bfgChargeProgress * 100, '%');
		}
		if (boss && !boss.defeated) {
			add('boss', 'pull on player', boss.pullRemaining);
			for (const [kind, seconds] of Object.entries(boss.debugCooldowns)) {
				add('boss', `cooldown ${kind}`, seconds);
			}
		}
		return rows;
	}

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
		this.loader.doomBoss?.takeDamage(amount, 'dev');
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
