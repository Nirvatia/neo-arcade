import { GRIDS, GRID_01, GRID_DOOM } from '../../config/gridConfig';
import type { GridMatrix } from '../../config/gridConfig';

export type SeasonName = 'spring' | 'summer' | 'autumn' | 'winter';

export interface SeasonData {
	readonly name: SeasonName;
	readonly grid: GridMatrix;
}

/** Seasons in level order: level 1 is summer, then autumn, winter, spring, and again. */
const SEASONS: readonly SeasonName[] = ['summer', 'autumn', 'winter', 'spring'];

export function seasonForLevel(level: number): SeasonData {
	if (!Number.isFinite(level) || level < 1) {
		console.error('SeasonCatalog.seasonForLevel', 'invalid level', level);
	}
	const safeLevel = Number.isFinite(level) && level >= 1 ? Math.floor(level) : 1;
	const seasonIndex = (safeLevel - 1) % SEASONS.length;
	const gridIndex = (safeLevel - 1) % GRIDS.length;
	const season = SEASONS[seasonIndex];
	const grid = GRIDS[gridIndex];
	if (!season || !grid) {
		console.error('SeasonCatalog.seasonForLevel', 'missing season or grid', {
			level,
			seasonIndex,
			gridIndex
		});
		throw new Error('SeasonCatalog.seasonForLevel: missing season or grid');
	}
	return { name: season, grid };
}

export function secretSeason(): SeasonData {
	return { name: 'winter', grid: GRID_01 };
}

export function hellSeason(): SeasonData {
	return { name: 'autumn', grid: GRID_DOOM };
}

/** Per-season gameplay tuning (durations in seconds, speeds as multipliers). */
export interface SeasonModifiers {
	readonly powerDuration: number;
	readonly fruitDuration: number;
	readonly ghostSpeedModifier: number;
	readonly playerSpeedModifier: number;
}

const SEASON_MODIFIERS: Record<SeasonName, SeasonModifiers> = {
	spring: { powerDuration: 6.5, fruitDuration: 12, ghostSpeedModifier: 1, playerSpeedModifier: 1 },
	summer: { powerDuration: 6, fruitDuration: 14, ghostSpeedModifier: 1, playerSpeedModifier: 1 },
	autumn: { powerDuration: 6, fruitDuration: 12, ghostSpeedModifier: 0.97, playerSpeedModifier: 1 },
	winter: { powerDuration: 6, fruitDuration: 12, ghostSpeedModifier: 1, playerSpeedModifier: 0.97 }
};

export function seasonModifiers(season: SeasonName): SeasonModifiers {
	return SEASON_MODIFIERS[season];
}
