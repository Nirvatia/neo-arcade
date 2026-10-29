import type { FruitKind } from '../logic/fruitCatalog';

export interface ScoreTable {
	readonly dot: number;
	readonly energizer: number;
	readonly ghostChain: readonly number[];
	readonly hypnosis: number;
	readonly hypnosisTransfer: number;
	readonly fruit: Record<FruitKind, number>;
	readonly goldenEgg: number;
	readonly goldenExitDotValue: number;
	readonly levelClear: number;
	readonly perfectClear: number;
	readonly hellBossDefeated: number;
	readonly firstLifeThreshold: number;
	readonly lifeThresholdStep: number;
}

export const SCORE_TABLE: ScoreTable = {
	dot: 10,
	energizer: 50,
	ghostChain: [200, 400, 800, 1600],
	hypnosis: 200,
	hypnosisTransfer: 200,
	fruit: {
		CHERRY: 100,
		STRAWBERRY: 300,
		ORANGE: 500,
		PRETZEL: 500,
		APPLE: 700,
		PEAR: 1000,
		MELON: 1000,
		GALAXIAN: 2000,
		BELL: 3000,
		KEY: 5000
	},
	goldenEgg: 500,
	goldenExitDotValue: 20,
	levelClear: 1000,
	perfectClear: 2000,
	hellBossDefeated: 5000,
	firstLifeThreshold: 10000,
	lifeThresholdStep: 30000
};
