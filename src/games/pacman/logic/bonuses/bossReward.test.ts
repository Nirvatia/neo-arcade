import { describe, expect, it } from 'vitest';
import { EventBus } from '../../engine/EventBus';
import type { PacmanAudioCue, PacmanEventMap } from '../../core/Events';
import type { PlayerService } from '../actors/PlayerService';
import { bfsDistanceFrom } from '../doom/DoomGraph';
import { INTRO_DURATION, BOSS_HP } from '../doom/DoomBalance';
import { buildLevelSession } from '../level/LevelSession';
import { hellSeason } from '../level/SeasonCatalog';

const STEP = 1 / 60;

function hellLevel() {
	const events = new EventBus<PacmanEventMap>();
	const cues: PacmanAudioCue[] = [];
	events.on('audio:cue', ({ cue }) => cues.push(cue));
	const session = buildLevelSession({
		events,
		level: 5,
		profile: 'pacman',
		season: hellSeason(),
		hell: true,
		secret: false,
		godMode: false
	});
	const reward = session.bossReward;
	const doom = session.doom;
	if (!reward || !doom) {
		throw new Error('the hell level has no boss reward');
	}
	return { session, reward, boss: doom.boss, cues };
}

/** A stand-in player standing on a tile centre. */
const at = (p: { x: number; y: number } | null) =>
	({ position: { x: p?.x ?? -9, y: p?.y ?? -9 } }) as unknown as PlayerService;

describe('boss reward', () => {
	it('is built for boss levels only', () => {
		const events = new EventBus<PacmanEventMap>();
		const season = buildLevelSession({
			events,
			level: 1,
			profile: 'pacman',
			season: hellSeason(),
			hell: false,
			secret: false,
			godMode: false
		});
		expect(season.bossReward).toBeNull();
		expect(hellLevel().session.bossReward).not.toBeNull();
	});

	it('puts the heart where the boss fell and the exit at the far end of the maze', () => {
		const { session, reward, boss } = hellLevel();
		reward.offer(boss.tile);
		const heart = reward.heart;
		const exit = reward.exit;
		expect(heart).toEqual({ x: boss.tile.x + 0.5, y: boss.tile.y + 0.5 });
		expect(exit).not.toBeNull();
		const grid = session.grid;
		const distances = bfsDistanceFrom(grid, boss.tile);
		const far = Math.max(...distances.values());
		const exitDistance = distances.get(`${Math.floor(exit!.x)},${Math.floor(exit!.y)}`) ?? -1;
		expect(exitDistance).toBeGreaterThan(far * 0.7);
		expect(grid.isPlayerWalkable(Math.floor(exit!.x), Math.floor(exit!.y))).toBe(true);
		expect(grid.isTeleport(Math.floor(exit!.x), Math.floor(exit!.y))).toBe(false);
	});

	it('waits for the player: nothing ends the level until the heart or the exit is taken', () => {
		const { reward, boss } = hellLevel();
		reward.offer(boss.tile);
		reward.update(at({ x: -5, y: -5 }));
		expect(reward.offered).toBe(true);
		expect(reward.consumeChoice()).toBeNull();
	});

	it('taking the heart ends the level with a bonus life', () => {
		const { session, reward, boss, cues } = hellLevel();
		const lives = session.combat.lives;
		reward.offer(boss.tile);
		reward.update(at(reward.heart));
		const choice = reward.consumeChoice();
		expect(choice).toBe('life');
		expect(reward.consumeChoice()).toBeNull();
		expect(reward.offered).toBe(false);
		expect(cues).toContain('bonus-life');
		session.combat.completeHellLevel(choice === 'life');
		expect(session.combat.lives).toBe(lives + 1);
		expect(session.combat.result).toBe('win');
	});

	it('the exit ends the level without the life', () => {
		const { session, reward, boss, cues } = hellLevel();
		const lives = session.combat.lives;
		reward.offer(boss.tile);
		reward.update(at(reward.exit));
		const choice = reward.consumeChoice();
		expect(choice).toBe('exit');
		expect(cues).toContain('exit-enter');
		session.combat.completeHellLevel(choice === 'life');
		expect(session.combat.lives).toBe(lives);
		expect(session.combat.result).toBe('win');
	});

	it('offers once, after a real boss death', () => {
		const { session, reward, boss } = hellLevel();
		for (let t = 0; t < INTRO_DURATION + 0.1; t += STEP) {
			boss.update(STEP, session.player);
		}
		// three phases, each with its transition
		for (let hit = 0; hit < 6 && !boss.defeated; hit++) {
			boss.takeDamage(BOSS_HP);
			for (let t = 0; t < 3; t += STEP) {
				boss.update(STEP, session.player);
				boss.consumeBossContactHit();
				boss.consumeHazardHit();
			}
		}
		expect(boss.defeated).toBe(true);
		reward.offer(boss.tile);
		const first = reward.heart;
		reward.offer({ x: 1, y: 1 });
		expect(reward.heart).toEqual(first);
	});
});
