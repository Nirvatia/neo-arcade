import { afterEach, describe, expect, it, vi } from 'vitest';
import { GRID_DOOM } from '../../config/gridConfig';
import { EventBus } from '../../engine/EventBus';
import type { PacmanEventMap } from '../../core/Events';
import { GridModel } from '../GridModel';
import { GridService } from '../GridService';
import { LevelProgress } from '../LevelProgress';
import { PlayerService } from '../PlayerService';
import type { PlayerDirection } from '../PlayerModel';
import { ScoreModel } from '../ScoreModel';
import { DoomAbilityService } from './DoomAbilityService';
import { BFG_ORB_DAMAGE, BOSS_HP, INTRO_DURATION } from './DoomBalance';
import { bfsDistanceFrom } from './DoomGraph';
import { canEscape, distanceRings, straightSegment } from './DoomHazards';
import type { DoomAttackKind } from './DoomAttackCore';
import { DoomBossService } from './DoomBossService';
import { createMinion, minionPosition } from './DoomMinions';
import { DoomPickupService } from './DoomPickupService';
import { findDoomCorners } from './DoomMapValidation';

const STEP = 1 / 60;

function makeWorld() {
	const grid = new GridService(new GridModel(GRID_DOOM));
	grid.setLairOpen(true);
	const events = new EventBus<PacmanEventMap>();
	const progress = new LevelProgress(grid, new ScoreModel(), events);
	const player = new PlayerService(grid, progress, events);
	const spawn = grid.bossSpawn();
	if (!spawn) {
		throw new Error('missing boss spawn');
	}
	const boss = new DoomBossService(grid, spawn);
	return { grid, player, boss, events, progress };
}

function pathTo(
	grid: GridService,
	from: { x: number; y: number },
	to: { x: number; y: number },
	avoid?: { x: number; y: number }
): PlayerDirection[] {
	const key = (x: number, y: number) => `${x},${y}`;
	const prev = new Map<string, { x: number; y: number; dir: PlayerDirection } | null>();
	prev.set(key(from.x, from.y), null);
	const queue = [from];
	const moves: Array<[PlayerDirection, number, number]> = [
		['UP', 0, -1],
		['DOWN', 0, 1],
		['LEFT', -1, 0],
		['RIGHT', 1, 0]
	];
	while (queue.length > 0) {
		const cur = queue.shift()!;
		if (cur.x === to.x && cur.y === to.y) {
			break;
		}
		for (const [dir, dx, dy] of moves) {
			const nx = cur.x + dx;
			const ny = cur.y + dy;
			const avoided = avoid !== undefined && avoid.x === nx && avoid.y === ny;
			if (
				avoided ||
				!grid.isPlayerWalkable(nx, ny) ||
				grid.isTeleport(nx, ny) ||
				prev.has(key(nx, ny))
			) {
				continue;
			}
			prev.set(key(nx, ny), { x: cur.x, y: cur.y, dir });
			queue.push({ x: nx, y: ny });
		}
	}
	const dirs: PlayerDirection[] = [];
	let node = prev.get(key(to.x, to.y));
	while (node) {
		dirs.unshift(node.dir);
		node = prev.get(key(node.x, node.y));
	}
	return dirs;
}

const VEC: Record<PlayerDirection, [number, number]> = {
	UP: [0, -1],
	DOWN: [0, 1],
	LEFT: [-1, 0],
	RIGHT: [1, 0]
};

// Steers like a player holding the next key early: the desired direction is always the
// turn to take from the tile the player is currently heading into.
function walk(player: PlayerService, dirs: PlayerDirection[], onStep?: () => void): void {
	const tiles: Array<{ x: number; y: number }> = [{ ...player.tile }];
	for (const dir of dirs) {
		const last = tiles[tiles.length - 1];
		tiles.push({ x: last.x + VEC[dir][0], y: last.y + VEC[dir][1] });
	}
	const goal = tiles[tiles.length - 1];
	for (let i = 0; i < 6000; i += 1) {
		const pos = player.position;
		const facing = player.facing;
		const moving = facing !== null && (pos.x % 1 !== 0.5 || pos.y % 1 !== 0.5);
		const from = moving
			? { x: player.tile.x + VEC[facing][0], y: player.tile.y + VEC[facing][1] }
			: { x: Math.floor(pos.x), y: Math.floor(pos.y) };
		const idx = tiles.findIndex((t) => t.x === from.x && t.y === from.y);
		if (idx >= 0 && idx < dirs.length) {
			player.setDesiredDirection(dirs[idx]);
		}
		if (from.x === goal.x && from.y === goal.y && !moving) {
			break;
		}
		player.update(STEP);
		onStep?.();
	}
	for (let i = 0; i < 10; i += 1) {
		onStep?.();
	}
}

describe('doom pickups', () => {
	it('every corner pickup can be collected from every side', () => {
		const { grid } = makeWorld();
		for (const corner of findDoomCorners(grid)) {
			const sides = grid
				.walkableNeighbors(corner.x, corner.y)
				.filter((n) => grid.isPlayerWalkable(n.x, n.y));
			expect(sides.length).toBeGreaterThan(0);
			for (const side of sides) {
				const world = makeWorld();
				const pickups = new DoomPickupService(world.grid);
				const pickup = pickups.list.find((p) => p.tile.x === corner.x && p.tile.y === corner.y)!;
				const route = [
					...pathTo(world.grid, world.player.tile, side, corner),
					...pathTo(world.grid, side, corner)
				];
				let collected = false;
				walk(world.player, route, () => {
					pickups.update(STEP, world.player, 2, false);
					collected = collected || !pickup.visible;
				});
				expect(collected, `corner ${corner.x},${corner.y} from ${side.x},${side.y}`).toBe(true);
			}
		}
	});
});

describe('doom boss', () => {
	it('a BFG orb fired along the boss row hits the boss', () => {
		const { grid, player, boss } = makeWorld();
		const ability = new DoomAbilityService(grid, boss);
		// same tile-center convention as the player, whose position is where shots start
		expect(boss.position).toEqual({ x: boss.tile.x + 0.5, y: boss.tile.y + 0.5 });
		expect(player.position).toEqual({ x: player.tile.x + 0.5, y: player.tile.y + 0.5 });
		for (let t = 0; t < INTRO_DURATION + 0.1; t += STEP) {
			boss.update(STEP, player);
		}
		const at = boss.position;
		const shots = (ability as unknown as { weapons: { shots: Array<unknown> } }).weapons.shots;
		// fired along the boss row from two cells to the left (positions are tile-center based)
		shots.push({ x: at.x - 2, y: at.y, vx: 14, vy: 0, life: 2 });
		for (let i = 0; i < 20; i += 1) {
			ability.update(STEP, player);
		}
		// the orb itself must connect (tracers alone would only deal BFG_TRACER_DAMAGE)
		expect(boss.hp).toBe(BOSS_HP - BFG_ORB_DAMAGE);
	});

	it('enemy pathing never routes through the empty border', () => {
		const { grid } = makeWorld();
		const distances = bfsDistanceFrom(grid, { x: 2, y: 12 });
		for (const key of distances.keys()) {
			const [x, y] = key.split(',').map(Number);
			expect(grid.tileAt(x, y), key).not.toBe('ES');
		}
	});

	it('boss and minions never leave the maze', () => {
		const { grid, player, boss } = makeWorld();
		const dirs: PlayerDirection[] = ['UP', 'LEFT', 'DOWN', 'RIGHT'];
		let r = 7;
		const rand = () => (r = (r * 16807) % 2147483647) / 2147483647;
		for (let t = 0; t < 90; t += STEP) {
			if (rand() < 0.02) {
				player.setDesiredDirection(dirs[Math.floor(rand() * 4)]);
			}
			player.update(STEP);
			boss.update(STEP, player);
			boss.consumeBossContactHit();
			boss.consumeMinionContactHit();
			expect(grid.isWalkable(boss.tile.x, boss.tile.y)).toBe(true);
			for (const m of boss.minionList) {
				expect(grid.isWalkable(m.tile.x, m.tile.y)).toBe(true);
			}
		}
	});

	it('minions keep moving while the boss telegraphs an attack', () => {
		const { player, boss } = makeWorld();
		for (let t = 0; t < INTRO_DURATION + 0.1; t += STEP) {
			boss.update(STEP, player);
		}
		const internals = boss as unknown as {
			minions: ReturnType<typeof createMinion>[];
			model: { beginTelegraph(kind: string, duration: number): void };
		};
		internals.minions.push(createMinion('clyde', boss.tile));
		internals.model.beginTelegraph('brood', 10);
		const before = minionPosition(internals.minions[0]);
		for (let i = 0; i < 60; i += 1) {
			boss.update(STEP, player);
		}
		const after = minionPosition(internals.minions[0]);
		expect(after).not.toEqual(before);
	});

	it('stunning weapons can finish the boss and do not skip phase transitions', () => {
		const { player, boss } = makeWorld();
		for (let t = 0; t < INTRO_DURATION + 0.1; t += STEP) {
			boss.update(STEP, player);
		}
		const states: string[] = [];
		for (let i = 0; i < 20 && !boss.defeated; i += 1) {
			// a BFG orb hit: damage first, then stun, exactly like DoomAbilityService
			const phase = boss.phase;
			boss.takeDamage(BFG_ORB_DAMAGE);
			boss.applyStun(0.5);
			if (boss.phase !== phase) {
				states.push(boss.state);
			}
			for (let t = 0; t < 4; t += STEP) {
				boss.update(STEP, player);
				boss.consumeBossContactHit();
				boss.consumeMinionContactHit();
				boss.consumeHazardHit();
			}
		}
		expect(boss.defeated).toBe(true);
		expect(states).toEqual(['TRANSITION', 'TRANSITION']);
	});
});

function seededRandom(seed: number): () => number {
	let r = seed;
	return () => (r = (r * 16807) % 2147483647) / 2147483647;
}

function skipIntro(boss: DoomBossService, player: PlayerService): void {
	for (let t = 0; t < INTRO_DURATION + 0.1; t += STEP) {
		boss.update(STEP, player);
	}
}

/** Drive the boss into `phase` and wait for the transition to end. */
function enterPhase(boss: DoomBossService, player: PlayerService, phase: number): void {
	while (boss.phase < phase) {
		boss.takeDamage(BOSS_HP);
		for (let t = 0; t < 3; t += STEP) {
			boss.update(STEP, player);
			boss.consumeBossContactHit();
			boss.consumeHazardHit();
		}
	}
}

describe('doom boss attacks', () => {
	afterEach(() => vi.restoreAllMocks());

	it('every phase uses its own attack set', () => {
		const expected: Record<number, DoomAttackKind[]> = {
			1: ['dash', 'rift'],
			2: ['seal', 'pull', 'rift'],
			3: ['split', 'eruption']
		};
		for (const phase of [1, 2, 3]) {
			vi.spyOn(Math, 'random').mockImplementation(seededRandom(phase * 977));
			const { grid, player, boss } = makeWorld();
			skipIntro(boss, player);
			enterPhase(boss, player, phase);
			const seen = new Set<string>();
			const counts: Record<string, number> = {};
			let lastState = '';
			const dirs: PlayerDirection[] = ['UP', 'LEFT', 'DOWN', 'RIGHT'];
			const rand = seededRandom(phase * 31);
			for (let t = 0; t < 240; t += STEP) {
				if (rand() < 0.03) {
					player.setDesiredDirection(dirs[Math.floor(rand() * 4)]);
				}
				player.update(STEP);
				boss.update(STEP, player);
				boss.consumeBossContactHit();
				boss.consumeMinionContactHit();
				boss.consumeHazardHit();
				const internals = boss as unknown as { model: { attackKind: string | null } };
				if (boss.state === 'TELEGRAPH' && internals.model.attackKind) {
					if (!seen.has(internals.model.attackKind) || lastState !== 'TELEGRAPH') {
						counts[internals.model.attackKind] = (counts[internals.model.attackKind] ?? 0) + 1;
					}
					seen.add(internals.model.attackKind);
				}
				lastState = boss.state;
				expect(grid.isWalkable(boss.tile.x, boss.tile.y)).toBe(true);
				const echo = boss.echo;
				if (echo) {
					expect(grid.isWalkable(echo.tile.x, echo.tile.y)).toBe(true);
				}
			}
			if (process.env.DOOM_STATS) {
				process.stdout.write(`STATS phase ${phase} ${JSON.stringify(counts)}\n`);
			}
			for (const kind of expected[phase]) {
				expect([...seen], `phase ${phase}`).toContain(kind);
			}
			vi.restoreAllMocks();
		}
	});

	it('rift corridors can always be left in time', () => {
		const { grid } = makeWorld();
		const tile = { x: 6, y: 12 };
		const segment = straightSegment(grid, tile, 'x');
		expect(segment.tiles.length).toBeGreaterThanOrEqual(4);
		const keys = new Set(segment.tiles.map((t) => `${t.x},${t.y}`));
		expect(canEscape(grid, tile, keys, 0.9, 6)).toBe(true);
		expect(canEscape(grid, tile, keys, 0.05, 6)).toBe(false);
	});

	it('eruption waves alternate, so one step always dodges', () => {
		const { grid } = makeWorld();
		const rings = distanceRings(grid, { x: 12, y: 19 }, 6);
		for (let d = 1; d < rings.length; d += 1) {
			for (const tile of rings[d]) {
				// every tile has a neighbour in the other wave
				const neighbourInOther = rings[d - 1].some(
					(p) => Math.abs(p.x - tile.x) + Math.abs(p.y - tile.y) === 1
				);
				expect(neighbourInOther).toBe(true);
			}
		}
	});

	it('pull slows only running away, corruption spares pickups', () => {
		const { grid, player, boss } = makeWorld();
		const internals = boss as unknown as { pullTimer: number; corruptionValue: number };
		internals.pullTimer = 3;
		// player spawn is below the boss: running DOWN is running away
		player.setDesiredDirection('DOWN');
		player.update(0.05);
		if (player.facing === 'DOWN') {
			expect(boss.playerSpeedFactor(player)).toBeLessThan(1);
		}
		player.setDesiredDirection('UP');
		player.update(0.2);
		internals.pullTimer = 0;
		internals.corruptionValue = 1;
		const ability = new DoomAbilityService(grid, boss);
		for (const pickup of ability.pickupList) {
			expect(boss.isCorrupted(pickup.tile.x, pickup.tile.y)).toBe(false);
		}
		expect(boss.isCorrupted(12, 12)).toBe(false);
	});

	it('seals lock intersections without cutting the player off', () => {
		vi.spyOn(Math, 'random').mockImplementation(seededRandom(5));
		const { grid, player, boss } = makeWorld();
		skipIntro(boss, player);
		enterPhase(boss, player, 2);
		const internals = boss as unknown as {
			pickSeals(tile: { x: number; y: number }, n: number): Array<{ x: number; y: number }>;
			pendingSeals: Array<{ x: number; y: number; warn: number; total: number }>;
		};
		const seals = internals.pickSeals(player.tile, 3);
		expect(seals.length).toBeGreaterThanOrEqual(2);
		for (const seal of seals) {
			internals.pendingSeals.push({ ...seal, warn: 0.1, total: 0.1 });
		}
		for (let i = 0; i < 12; i += 1) {
			boss.update(STEP, player);
		}
		const locked = boss.voidCellList.filter((c) => c.kind === 'seal');
		expect(locked.length).toBeGreaterThan(0);
		// every tile the player may walk on is still reachable from the player
		const seen = new Set<string>([`${player.tile.x},${player.tile.y}`]);
		const queue = [player.tile];
		for (let head = 0; head < queue.length; head += 1) {
			for (const n of grid.walkableNeighbors(queue[head].x, queue[head].y)) {
				const key = `${n.x},${n.y}`;
				if (!seen.has(key) && grid.isPlayerWalkable(n.x, n.y)) {
					seen.add(key);
					queue.push(n);
				}
			}
		}
		let walkable = 0;
		for (let y = 0; y < grid.height; y += 1) {
			for (let x = 0; x < grid.width; x += 1) {
				if (grid.isPlayerWalkable(x, y)) {
					walkable += 1;
				}
			}
		}
		expect(seen.size).toBe(walkable);
		for (let t = 0; t < 8; t += STEP) {
			boss.update(STEP, player);
			boss.consumeHazardHit();
			boss.consumeBossContactHit();
		}
		expect(boss.voidCellList.filter((c) => c.kind === 'seal').length).toBe(0);
	});
});
