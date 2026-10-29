import { describe, expect, it } from 'vitest';
import type { GridMatrix, TileType } from '../../../config/gridConfig';
import { GRID_01 } from '../../../config/gridConfig';
import { computeDecayField, DECAY_MARGIN, packDecayFields, sampleDecayField } from './decayField';
import { decayFronts, FRONT_OFF, REBUILD_BAND } from './decayTimeline';
import { FLOW } from '../../../config/flowConfig';

/** Rows of two-letter tokens separated by spaces. */
function grid(rows: string[]): GridMatrix {
	return rows.map((r) => r.split(' ') as TileType[]);
}

// A U-shaped corridor around a two-tile wall: the ends of the U are close in a straight
// line, but the decay should go round by the corridor.
const U = grid([
	'WL WL WL WL WL WL',
	'WL DT DT DT DT WL',
	'WL DT WL WL DT WL',
	'WL DT WL WL DT WL',
	'WL DT WL WL DT WL',
	'WL WL WL WL WL WL'
]);

const at = (field: ReturnType<typeof computeDecayField>, x: number, y: number) =>
	field.dist[(y + field.margin) * field.cols + x + field.margin];

describe('decay field', () => {
	it('is zero at the origin and finite everywhere', () => {
		const field = computeDecayField(GRID_01, 12, 19);
		expect(at(field, 12, 19)).toBe(0);
		expect(field.dist.every((v) => Number.isFinite(v))).toBe(true);
		expect(field.cols).toBe(GRID_01[0].length + 2 * DECAY_MARGIN);
	});

	it('runs along corridors instead of through walls', () => {
		const field = computeDecayField(U, 1, 4);
		// round the U: 3 up, 3 across, 3 down
		expect(at(field, 4, 4)).toBeCloseTo(9, 5);
		// straight through the two wall tiles would cost 3 + 5 + 3 = 11
		expect(at(field, 4, 4)).toBeLessThan(11);
		expect(at(field, 2, 4)).toBeGreaterThan(at(field, 1, 3));
	});

	it('does not cut diagonally through wall corners', () => {
		const field = computeDecayField(U, 1, 1);
		// (2, 2) is a wall: from (1, 1) the step to (2, 2) would cut its corner, so the wall
		// is entered straight from (1, 2) or (2, 1): 1 + (1 + 5) / 2
		expect(at(field, 2, 2)).toBeCloseTo(4, 5);
	});

	it('samples like the shader: tile centres, bilinear, growing past the ring', () => {
		const field = computeDecayField(GRID_01, 12, 19);
		expect(sampleDecayField(field, 12.5, 19.5)).toBeCloseTo(0, 5);
		const far = sampleDecayField(field, -200, -200);
		expect(far).toBeGreaterThan(field.max);
	});

	it('packs two 16-bit fields per texel', () => {
		const a = computeDecayField(U, 1, 1);
		const b = computeDecayField(U, 3, 4);
		const data = packDecayFields(a, b);
		const i = (1 + a.margin) * a.cols + 3 + a.margin;
		const decode = (hi: number, lo: number, max: number) => ((hi + lo / 255) / 255) * max;
		expect(decode(data[i * 4], data[i * 4 + 1], a.max)).toBeCloseTo(a.dist[i], 1);
		expect(decode(data[i * 4 + 2], data[i * 4 + 3], b.max)).toBeCloseTo(b.dist[i], 1);
	});
});

describe('decay timeline', () => {
	const { shatter, void: hold, rebuild } = FLOW.death;

	it('starts with the shock ring and no rebuild', () => {
		const f = decayFronts(0, 40, 30);
		expect(f.shock).toBe(0);
		expect(f.rebuild).toBe(FRONT_OFF);
		expect(f.front).toBeLessThan(0);
	});

	it('sweeps past the farthest point by the end of the shatter phase', () => {
		expect(decayFronts(shatter - 0.001, 40, 30).front).toBeGreaterThan(40);
		expect(decayFronts(shatter + hold / 2, 40, 30).cover).toBe(1);
	});

	it('rebuilds from the respawn point and ends fully restored', () => {
		const mid = decayFronts(shatter + hold + rebuild / 2, 40, 30);
		expect(mid.rebuild).toBeGreaterThan(0);
		expect(mid.rebuild).toBeLessThan(30 + REBUILD_BAND + 6);
		const end = decayFronts(shatter + hold + rebuild, 40, 30);
		expect(end.rebuild).toBeGreaterThan(1000);
		expect(end.cover).toBe(0);
	});
});
