import { describe, expect, it } from 'vitest';
import {
	isRenderQuality,
	MOOD_UPDATE_INTERVAL_MS,
	pixelRatioFor,
	RENDER_QUALITY_DPR_CAP
} from './renderQuality';

describe('render quality', () => {
	it('caps the display ratio by the quality level', () => {
		expect(pixelRatioFor(2, 'low')).toBe(1);
		expect(pixelRatioFor(2, 'medium')).toBe(1.5);
		expect(pixelRatioFor(2, 'high')).toBe(2);
	});

	it('keeps a display ratio below the cap', () => {
		expect(pixelRatioFor(1, 'low')).toBe(1);
		expect(pixelRatioFor(1.25, 'medium')).toBe(1.25);
		expect(pixelRatioFor(1.25, 'high')).toBe(1.25);
	});

	it('falls back to 1 for an invalid display ratio', () => {
		expect(pixelRatioFor(0, 'high')).toBe(1);
		expect(pixelRatioFor(Number.NaN, 'medium')).toBe(1);
		expect(pixelRatioFor(Number.POSITIVE_INFINITY, 'low')).toBe(1);
	});

	it('recognizes quality names and falls back to the high cap otherwise', () => {
		expect(isRenderQuality('low')).toBe(true);
		expect(isRenderQuality('medium')).toBe(true);
		expect(isRenderQuality('high')).toBe(true);
		expect(isRenderQuality('ultra')).toBe(false);
		expect(RENDER_QUALITY_DPR_CAP.high).toBe(2);
	});
});

describe('atmosphere update intervals', () => {
	it('repaints every frame only at High quality', () => {
		expect(MOOD_UPDATE_INTERVAL_MS.high).toBe(0);
		expect(MOOD_UPDATE_INTERVAL_MS.medium).toBeGreaterThan(0);
		expect(MOOD_UPDATE_INTERVAL_MS.low).toBeGreaterThan(MOOD_UPDATE_INTERVAL_MS.medium);
	});
});
