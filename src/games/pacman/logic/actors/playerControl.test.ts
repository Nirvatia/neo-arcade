import { describe, expect, it } from 'vitest';
import { GRID_01 } from '../../config/gridConfig';
import { EventBus } from '../../engine/EventBus';
import type { PacmanEventMap } from '../../core/Events';
import { GridModel } from '../maze/GridModel';
import { GridService } from '../maze/GridService';
import { LevelProgress } from '../level/LevelProgress';
import { ScoreModel } from '../level/ScoreModel';
import { PlayerService } from './PlayerService';
import type { PlayerDirection } from './PlayerModel';

const STEP = 1 / 60;

function makePlayer() {
	const grid = new GridService(new GridModel(GRID_01));
	const events = new EventBus<PacmanEventMap>();
	const progress = new LevelProgress(grid, new ScoreModel(), events);
	return { grid, player: new PlayerService(grid, progress, events) };
}

/** Runs until the player stands exactly on a tile centre. */
function settle(player: PlayerService): void {
	for (let i = 0; i < 120; i++) {
		const p = player.position;
		if (
			Math.abs(p.x - Math.floor(p.x) - 0.5) < 1e-6 &&
			Math.abs(p.y - Math.floor(p.y) - 0.5) < 1e-6
		) {
			return;
		}
		player.update(STEP / 4);
	}
}

describe('player control', () => {
	it('reverses on the spot, without waiting for the next tile and without a jump', () => {
		const { player } = makePlayer();
		player.setDesiredDirection('LEFT');
		player.update(0.05);
		const before = player.position;
		expect(player.facing).toBe('LEFT');
		player.setDesiredDirection('RIGHT');
		expect(player.facing).toBe('RIGHT');
		expect(player.position.x).toBeCloseTo(before.x, 9);
		expect(player.position.y).toBeCloseTo(before.y, 9);
		player.update(STEP);
		expect(player.position.x).toBeGreaterThan(before.x);
	});

	it('takes a turn pressed a moment after passing the junction', () => {
		const { grid } = makePlayer();
		const dirs: PlayerDirection[] = ['LEFT', 'RIGHT'];
		const side: PlayerDirection[] = ['UP', 'DOWN'];
		// find a junction along the spawn corridor
		for (const dir of dirs) {
			const { player: p } = makePlayer();
			p.setDesiredDirection(dir);
			for (let i = 0; i < 400; i++) {
				p.update(STEP / 4);
				const t = p.tile;
				const open = side.find((s) => grid.isPlayerWalkable(t.x, t.y + (s === 'UP' ? -1 : 1)));
				const pos = p.position;
				const onCentre = Math.abs(pos.x - t.x - 0.5) < 1e-9 && Math.abs(pos.y - t.y - 0.5) < 1e-9;
				if (!open || onCentre) continue;
				// already moving on past the junction tile, by less than the grace
				const past = Math.abs(pos.x - t.x - 0.5);
				if (past > 0.12) continue;
				p.setDesiredDirection(open);
				p.update(STEP);
				expect(p.facing).toBe(open);
				expect(Math.abs(p.position.x - t.x - 0.5)).toBeLessThan(1e-9);
				return;
			}
		}
		expect.unreachable('no junction found on the spawn corridor');
	});

	it('keeps running straight when a turn is pressed well past the junction', () => {
		const { player } = makePlayer();
		player.setDesiredDirection('LEFT');
		settle(player);
		player.update(0.1); // 0.6 tile into the next move
		const y = player.position.y;
		player.setDesiredDirection('UP');
		player.update(STEP);
		expect(player.position.y).toBeCloseTo(y, 9);
	});
});
