import { afterEach, describe, expect, it, vi } from 'vitest';
import { GRID_DOOM } from '../../config/mazes';
import { EventBus } from '../../engine/EventBus';
import { FRAME_STEP, TimeControl } from '../../engine/TimeControl';
import type { PacmanDebugLogPayload, PacmanEventMap } from '../Events';
import { GridModel } from '../../logic/maze/GridModel';
import { GridService } from '../../logic/maze/GridService';
import { LevelProgress } from '../../logic/level/LevelProgress';
import { ScoreModel } from '../../logic/level/ScoreModel';
import { PlayerService } from '../../logic/actors/PlayerService';
import { DoomBossService } from '../../logic/doom/DoomBossService';
import { INTRO_DURATION } from '../../logic/doom/DoomBalance';
import { debugLog } from '../../logic/debug/debugLog';
import { FrameMeter } from './FrameMeter';

const STEP = 1 / 60;

function hell() {
	const grid = new GridService(new GridModel(GRID_DOOM));
	grid.setLairOpen(true);
	const events = new EventBus<PacmanEventMap>();
	const player = new PlayerService(grid, new LevelProgress(grid, new ScoreModel(), events), events);
	const spawn = grid.bossSpawn();
	if (!spawn) throw new Error('missing boss spawn');
	const boss = new DoomBossService(grid, spawn);
	const run = (seconds: number) => {
		for (let t = 0; t < seconds; t += STEP) {
			boss.update(STEP, player);
			boss.consumeBossContactHit();
			boss.consumeHazardHit();
		}
	};
	return { boss, player, run };
}

describe('time control', () => {
	it('scales, freezes and steps one frame at a time', () => {
		const time = new TimeControl();
		expect(time.advance(0.02)).toBeCloseTo(0.02);
		time.setScale(0.5);
		expect(time.advance(0.02)).toBeCloseTo(0.01);
		time.setScale(10);
		expect(time.scale).toBe(2);
		time.setFrozen(true);
		expect(time.advance(0.02)).toBe(0);
		time.step();
		time.step();
		expect(time.advance(0.02)).toBe(FRAME_STEP);
		expect(time.advance(0.02)).toBe(FRAME_STEP);
		expect(time.advance(0.02)).toBe(0);
		time.setFrozen(false);
		time.setScale(1);
		expect(time.advance(0.02)).toBeCloseTo(0.02);
	});

	it('a step from a running game freezes it', () => {
		const time = new TimeControl();
		time.step();
		expect(time.frozen).toBe(true);
		expect(time.advance(0.5)).toBe(FRAME_STEP);
	});
});

describe('boss debug commands', () => {
	it('jumps to a phase through the usual transition', () => {
		const { boss, run } = hell();
		run(INTRO_DURATION + 0.1);
		boss.debugSetPhase(3);
		expect(boss.phase).toBe(3);
		run(3);
		expect(boss.phase).toBe(3);
		expect(boss.defeated).toBe(false);
	});

	it('makes the requested attack next, once the rules allow it', () => {
		const { boss, run } = hell();
		run(INTRO_DURATION + 0.1);
		boss.debugSetPhase(3);
		run(3);
		boss.debugForceAttack('eruption');
		const seen = new Set<string>();
		for (let t = 0; t < 8 && boss.debugForcedAttack; t += STEP) {
			run(STEP);
			const kind = (boss as unknown as { model: { attackKind: string | null } }).model.attackKind;
			if (kind) seen.add(kind);
		}
		expect(boss.debugForcedAttack).toBeNull();
		expect([...seen][0]).toBe('eruption');
	});

	it('kills the boss at once', () => {
		const { boss, run } = hell();
		run(0.5); // still in the intro, where damage does not count
		boss.debugKill();
		expect(boss.defeated).toBe(true);
	});
});

describe('dev log', () => {
	afterEach(() => vi.unstubAllEnvs());

	it('emits in dev and is silent in production', () => {
		const events = new EventBus<PacmanEventMap>();
		const lines: PacmanDebugLogPayload[] = [];
		events.on('debug:log', (line) => lines.push(line));
		debugLog(events, 'damage', 'boss hit', 250);
		expect(lines).toEqual([{ channel: 'damage', text: 'boss hit', value: 250 }]);
		vi.stubEnv('DEV', false);
		debugLog(events, 'damage', 'boss hit', 250);
		expect(lines).toHaveLength(1);
	});
});

describe('frame meter', () => {
	function metrics(overrides: Partial<Parameters<FrameMeter['recordFrame']>[0]> = {}) {
		return {
			frameMs: 16.7,
			updateMs: 0.4,
			renderMs: 1.2,
			rafLagMs: 0.3,
			width: 1600,
			height: 900,
			pixelRatio: 2,
			...overrides
		};
	}

	it('summarizes frame, update and render times with the canvas size', () => {
		const meter = new FrameMeter();
		for (let i = 0; i < 5; i += 1) {
			meter.recordFrame(metrics({ frameMs: 16, updateMs: 1, renderMs: 2, rafLagMs: 0.5 }), 1000);
		}
		const perf = meter.snapshot();
		expect(perf.fps).toBeCloseTo(62.5);
		expect(perf.frameAvg).toBeCloseTo(16);
		expect(perf.updateAvg).toBeCloseTo(1);
		expect(perf.renderAvg).toBeCloseTo(2);
		expect(perf.rafLagAvg).toBeCloseTo(0.5);
		expect(perf.width).toBe(1600);
		expect(perf.height).toBe(900);
		expect(perf.pixelRatio).toBe(2);
		expect(perf.sampleCount).toBe(5);
	});

	it('reports the 95th percentile and the worst frame separately', () => {
		const meter = new FrameMeter();
		for (let frameMs = 1; frameMs <= 100; frameMs += 1) {
			meter.recordFrame(metrics({ frameMs }), 1000);
		}
		const perf = meter.snapshot();
		expect(perf.frameP95).toBe(95);
		expect(perf.frameWorst).toBe(100);
		expect(perf.fps).toBeLessThan(1000 / 50);
	});

	it('measures only the latest input before the next rendered frame', () => {
		const meter = new FrameMeter();
		meter.observeInput(100);
		meter.recordFrame(metrics(), 106);
		meter.observeInput(108);
		meter.observeInput(109);
		meter.recordFrame(metrics(), 112);
		const perf = meter.snapshot();
		expect(perf.inputCount).toBe(2);
		expect(perf.inputAvg).toBeCloseTo(4.5);
		expect(perf.inputP95).toBeCloseTo(6);
		expect(perf.inputMax).toBe(6);
	});

	it('keeps the last samples and ignores invalid timings', () => {
		const meter = new FrameMeter();
		meter.recordFrame(metrics({ frameMs: Number.NaN }), 1000);
		meter.recordFrame(metrics({ frameMs: -1 }), 1000);
		for (let i = 0; i < 250; i += 1) {
			meter.recordFrame(metrics({ frameMs: i + 1 }), 1000);
		}
		const perf = meter.snapshot();
		expect(perf.sampleCount).toBe(240);
		expect(perf.frameAvg).toBeCloseTo((11 + 250) / 2);
		expect(perf.frameWorst).toBe(250);
	});

	it('clears its history on reset', () => {
		const meter = new FrameMeter();
		meter.recordFrame(metrics(), 1000);
		meter.observeInput(1001);
		meter.reset();
		const perf = meter.snapshot();
		expect(perf.sampleCount).toBe(0);
		expect(perf.inputCount).toBe(0);
		expect(perf.fps).toBe(0);
	});
});
