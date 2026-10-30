import { describe, expect, it } from 'vitest';
import { EventBus } from '../../engine/EventBus';
import type { PacmanEventMap, PacmanFx } from '../../core/Events';
import { SCORE_TABLE } from '../../config/scoreConfig';
import { buildLevelSession, resetLevelSession } from '../level/LevelSession';
import { seasonForLevel } from '../level/SeasonCatalog';

function world() {
	const events = new EventBus<PacmanEventMap>();
	const fx: PacmanFx[] = [];
	events.on('fx:event', (e) => fx.push(e));
	const session = buildLevelSession({
		events,
		level: 1,
		profile: 'pacman',
		season: seasonForLevel(1),
		hell: false,
		secret: false,
		godMode: false
	});
	resetLevelSession(session);
	// let the spawn protection run out without moving Pac-Man
	session.player.setMovementLocked(true);
	for (let i = 0; i < 40 && session.player.isInvulnerable; i += 1) {
		session.player.update(0.25);
	}
	session.player.setMovementLocked(false);
	return { session, fx };
}

describe('gameplay effects (fx:event)', () => {
	it('eating a scared ghost reports where, which ghost and the points, and asks for a hit-stop', () => {
		const { session, fx } = world();
		const blinky = session.ghosts.list.find((g) => g.kind === 'BLINKY')!;
		blinky.teleportTo(session.player.tile);
		blinky.setState('frightened');
		session.combat.update(1 / 60);
		const eaten = fx.find((e) => e.kind === 'ghost-eaten');
		expect(eaten).toMatchObject({
			kind: 'ghost-eaten',
			ghost: 'BLINKY',
			points: SCORE_TABLE.ghostChain[0]
		});
		expect(session.combat.consumeHitStop()).toBeGreaterThan(0);
		expect(session.combat.consumeHitStop()).toBe(0);
	});

	it('an energizer reports its tile', () => {
		const { session, fx } = world();
		session.progress.collectAt(2, 2);
		expect(fx).toContainEqual({ kind: 'energizer', x: 2.5, y: 2.5 });
	});

	it('a ghost brushing past and leaving is one near miss, then a cooldown', () => {
		const { session, fx } = world();
		const p = session.player.tile;
		const pinky = session.ghosts.list.find((g) => g.kind === 'PINKY')!;
		pinky.setState('active');
		const pass = () => {
			// a tile away and a fifth of the way in: 0.8 tiles off, close but no contact
			pinky.teleportTo({ x: p.x + 1, y: p.y });
			pinky.beginMove('LEFT', { x: p.x, y: p.y });
			pinky.addProgress(0.2);
			session.combat.update(1 / 60);
			pinky.teleportTo({ x: p.x + 2, y: p.y });
			session.combat.update(1 / 60);
		};
		pass();
		expect(session.combat.deathActive).toBe(false);
		expect(fx.filter((e) => e.kind === 'near-miss')).toHaveLength(1);
		pass();
		expect(fx.filter((e) => e.kind === 'near-miss')).toHaveLength(1);
		for (let t = 0; t < 3.1; t += 0.1) {
			session.combat.update(0.1);
		}
		pass();
		expect(fx.filter((e) => e.kind === 'near-miss')).toHaveLength(2);
	});
});
