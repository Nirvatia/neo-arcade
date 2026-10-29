import { describe, expect, it } from 'vitest';
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
			if (avoided || !grid.isPlayerWalkable(nx, ny) || grid.isTeleport(nx, ny) || prev.has(key(nx, ny))) {
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
});
