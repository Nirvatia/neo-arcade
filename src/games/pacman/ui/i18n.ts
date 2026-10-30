import { derived, writable } from 'svelte/store';

export type Lang = 'en' | 'ru';

const STORAGE_KEY = 'pacman.lang';

const EN = {
	score: 'SCORE',
	high: 'HIGH',
	level: 'LEVEL',
	lives: 'LIVES',
	weapon: 'WEAPON',
	boss: 'BOSS',
	phase: 'PHASE',
	hp: 'HP',
	power: 'POWER',
	overdrive: 'OVERDRIVE',
	echo: 'ECHO',
	berserk: 'BERSERK',
	bfg: 'BFG',
	barrel: 'BARREL',
	none: '—',
	charge: 'CHARGE',
	rewardHint: 'Take the heart (+1 life) or the exit',
	weather: 'weather',
	night: 'night',
	start: 'START',
	playAgain: 'PLAY AGAIN',
	resume: 'RESUME',
	restart: 'RESTART',
	menu: 'MENU',
	skip: 'SKIP',
	ready: 'READY!',
	paused: 'PAUSED',
	gameOver: 'GAME OVER',
	newRecord: 'NEW RECORD',
	livesLeft: 'lives left',
	lastLife: 'last life',
	pressEnter: 'Enter to start · Arrows / WASD to move · Space to pause',
	fire: 'F / Shift — fire (hell)',
	language: 'РУССКИЙ',
	world_spring: 'Spring',
	world_summer: 'Summer',
	world_autumn: 'Autumn',
	world_winter: 'Winter',
	world_hell: 'Hell',
	world_secret: 'Secret',
	boss_hell: 'LORD OF HELL',
	oneUp: '1UP',
	highScore: 'HIGH SCORE',
	round: 'ROUND'
} as const;

export type I18nKey = keyof typeof EN;

const RU: Record<I18nKey, string> = {
	score: 'ОЧКИ',
	high: 'РЕКОРД',
	level: 'УРОВЕНЬ',
	lives: 'ЖИЗНИ',
	weapon: 'ОРУЖИЕ',
	boss: 'БОСС',
	phase: 'ФАЗА',
	hp: 'ЗДОРОВЬЕ',
	power: 'СИЛА',
	overdrive: 'ОВЕРДРАЙВ',
	echo: 'ЭХО',
	berserk: 'БЕРСЕРК',
	bfg: 'BFG',
	barrel: 'БОЧКА',
	none: '—',
	charge: 'ЗАРЯД',
	rewardHint: 'Возьми сердце (+1 жизнь) или выход',
	weather: 'непогода',
	night: 'ночь',
	start: 'СТАРТ',
	playAgain: 'ЕЩЁ РАЗ',
	resume: 'ПРОДОЛЖИТЬ',
	restart: 'ЗАНОВО',
	menu: 'МЕНЮ',
	skip: 'ПРОПУСТИТЬ',
	ready: 'ГОТОВЬСЯ!',
	paused: 'ПАУЗА',
	gameOver: 'ИГРА ОКОНЧЕНА',
	newRecord: 'НОВЫЙ РЕКОРД',
	livesLeft: 'жизней осталось',
	lastLife: 'последняя жизнь',
	pressEnter: 'Enter — старт · Стрелки / WASD — движение · Пробел — пауза',
	fire: 'F / Shift — выстрел (ад)',
	language: 'ENGLISH',
	world_spring: 'Весна',
	world_summer: 'Лето',
	world_autumn: 'Осень',
	world_winter: 'Зима',
	world_hell: 'Ад',
	world_secret: 'Секрет',
	boss_hell: 'ПОВЕЛИТЕЛЬ АДА',
	oneUp: '1UP',
	highScore: 'HIGH SCORE',
	round: 'РАУНД'
};

function initial(): Lang {
	try {
		return localStorage.getItem(STORAGE_KEY) === 'ru' ? 'ru' : 'en';
	} catch {
		return 'en';
	}
}

/** Interface language: English by default, Russian on request, remembered per viewer. */
export const lang = writable<Lang>(typeof window === 'undefined' ? 'en' : initial());

lang.subscribe((value) => {
	try {
		localStorage.setItem(STORAGE_KEY, value);
	} catch {
		// storage blocked: the choice lasts for this page only
	}
});

export function toggleLang(): void {
	lang.update((value) => (value === 'en' ? 'ru' : 'en'));
}

/** `$t('score')` in components. */
export const t = derived(
	lang,
	(value) =>
		(key: I18nKey): string =>
			value === 'ru' ? RU[key] : EN[key]
);
