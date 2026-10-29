import { GRIDS, GRID_01, GRID_DOOM } from '../config/gridConfig';
import type { GridMatrix } from '../config/gridConfig';

export type SeasonName = 'spring' | 'summer' | 'autumn' | 'winter';

export interface SeasonPalette {
	readonly background: string;
	readonly backgroundNight: string;
	readonly wall: string;
	readonly wallNight: string;
	readonly floor: string;
	readonly floorNight: string;
	readonly dot: string;
	readonly dotNight: string;
	readonly energizer: string;
	readonly energizerNight: string;
}

export interface SeasonData {
	readonly name: SeasonName;
	readonly palette: SeasonPalette;
	readonly grid: GridMatrix;
}

interface SeasonDefinition {
	readonly name: SeasonName;
	readonly palette: SeasonPalette;
}

const SEASONS: readonly SeasonDefinition[] = [
	{
		name: 'summer',
		palette: {
			background: '#0d0a04',
			backgroundNight: '#030201',
			wall: '#5c4a1d',
			wallNight: '#171208',
			floor: '#12100a',
			floorNight: '#050403',
			dot: '#ffe8c9',
			dotNight: '#8a7346',
			energizer: '#ffcf4d',
			energizerNight: '#775f1c'
		}
	},
	{
		name: 'autumn',
		palette: {
			background: '#0d0604',
			backgroundNight: '#030101',
			wall: '#5c2a1d',
			wallNight: '#170b06',
			floor: '#120c0a',
			floorNight: '#050303',
			dot: '#ffd4c9',
			dotNight: '#8a5a46',
			energizer: '#ff6b4d',
			energizerNight: '#77301c'
		}
	},
	{
		name: 'winter',
		palette: {
			background: '#04080d',
			backgroundNight: '#010204',
			wall: '#1d3a5c',
			wallNight: '#081018',
			floor: '#0a1012',
			floorNight: '#030506',
			dot: '#c9e8ff',
			dotNight: '#46648a',
			energizer: '#59f0ff',
			energizerNight: '#1c5f77'
		}
	},
	{
		name: 'spring',
		palette: {
			background: '#060d08',
			backgroundNight: '#010302',
			wall: '#2a5c3a',
			wallNight: '#0b1710',
			floor: '#081208',
			floorNight: '#030503',
			dot: '#c9ffd4',
			dotNight: '#468a5a',
			energizer: '#ff9de2',
			energizerNight: '#774666'
		}
	}
];

const SECRET_PALETTE: SeasonPalette = {
	background: '#02040a',
	backgroundNight: '#010204',
	wall: '#3b2a5c',
	wallNight: '#120b1e',
	floor: '#080612',
	floorNight: '#030206',
	dot: '#d9c9ff',
	dotNight: '#5c468a',
	energizer: '#b98fff',
	energizerNight: '#4b2f77'
};

const HELL_PALETTE: SeasonPalette = {
	background: '#120303',
	backgroundNight: '#050101',
	wall: '#5c1d1d',
	wallNight: '#1e0808',
	floor: '#140808',
	floorNight: '#060202',
	dot: '#ffc9c9',
	dotNight: '#8a4646',
	energizer: '#ff4d4d',
	energizerNight: '#771c1c'
};

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
	return {
		name: season.name,
		palette: season.palette,
		grid
	};
}

export function secretSeason(): SeasonData {
	return {
		name: 'winter',
		palette: SECRET_PALETTE,
		grid: GRID_01
	};
}

export function hellSeason(): SeasonData {
	return {
		name: 'autumn',
		palette: HELL_PALETTE,
		grid: GRID_DOOM
	};
}