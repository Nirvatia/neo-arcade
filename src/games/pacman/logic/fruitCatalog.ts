export const FRUIT = {
	CHERRY: 'CHERRY',
	STRAWBERRY: 'STRAWBERRY',
	ORANGE: 'ORANGE',
	PRETZEL: 'PRETZEL',
	APPLE: 'APPLE',
	PEAR: 'PEAR',
	MELON: 'MELON',
	GALAXIAN: 'GALAXIAN',
	BELL: 'BELL',
	KEY: 'KEY'
} as const;

export type FruitKind = (typeof FRUIT)[keyof typeof FRUIT];

export const FRUIT_ORDER: readonly FruitKind[] = [
	FRUIT.CHERRY,
	FRUIT.STRAWBERRY,
	FRUIT.ORANGE,
	FRUIT.PRETZEL,
	FRUIT.APPLE,
	FRUIT.PEAR,
	FRUIT.MELON,
	FRUIT.GALAXIAN,
	FRUIT.BELL,
	FRUIT.KEY
];

export interface FruitInfo {
	readonly kind: FruitKind;
	readonly name: string;
	readonly description: string;
}

export const FRUIT_CATALOG: readonly FruitInfo[] = [
	{
		kind: FRUIT.CHERRY,
		name: 'Cherry',
		description: 'Ранний низкорисковый бонус.'
	},
	{
		kind: FRUIT.STRAWBERRY,
		name: 'Strawberry',
		description: 'Ранний/средний рисковый бонус.'
	},
	{
		kind: FRUIT.ORANGE,
		name: 'Orange',
		description: 'Средний бонус рядом с маршрутами призраков.'
	},
	{
		kind: FRUIT.PRETZEL,
		name: 'Pretzel',
		description: 'Средний бонус на пересечении маршрутов призраков.'
	},
	{
		kind: FRUIT.APPLE,
		name: 'Apple',
		description: 'Повышенный бонус в более опасной зоне.'
	},
	{
		kind: FRUIT.PEAR,
		name: 'Pear',
		description: 'Повышенный бонус, требует короткого отклонения от маршрута.'
	},
	{
		kind: FRUIT.MELON,
		name: 'Melon',
		description: 'Высокий бонус, требует отклонения от безопасного маршрута.'
	},
	{
		kind: FRUIT.GALAXIAN,
		name: 'Galaxian',
		description: 'Редкий бонус, часто рядом с телепортом или логовом.'
	},
	{
		kind: FRUIT.BELL,
		name: 'Bell',
		description: 'Премиальный бонус в зоне высокого давления.'
	},
	{
		kind: FRUIT.KEY,
		name: 'Key',
		description: 'Максимальный фруктовый бонус, самая рискованная цель.'
	}
];

export function fruitForLevel(level: number): FruitKind {
	if (!Number.isFinite(level) || level < 1) {
		console.error('fruitCatalog.fruitForLevel', 'invalid level', level);
	}
	const safeLevel = Number.isFinite(level) && level >= 1 ? Math.floor(level) : 1;
	const index = Math.min(safeLevel - 1, FRUIT_ORDER.length - 1);
	const kind = FRUIT_ORDER[Math.max(0, index)];
	if (!kind) {
		console.error('fruitCatalog.fruitForLevel', 'missing fruit kind', { level, index });
		return FRUIT.KEY;
	}
	return kind;
}

export function randomFruitKind(): FruitKind {
	const index = Math.floor(Math.random() * FRUIT_ORDER.length);
	const clamped = Math.min(Math.max(0, index), FRUIT_ORDER.length - 1);
	const kind = FRUIT_ORDER[clamped];
	if (!kind) {
		console.error('fruitCatalog.randomFruitKind', 'missing fruit kind', { index });
		return FRUIT.KEY;
	}
	return kind;
}