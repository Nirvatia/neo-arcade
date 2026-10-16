import { SimonPad, type SimonPadId } from '../core/SimonTypes';

export interface SimonOrder {
	pad: SimonPadId;
	say: boolean;
	durationMs: number;
}

const ORDER_PADS: readonly SimonPadId[] = [
	SimonPad.Provesti,
	SimonPad.Zapisat,
	SimonPad.Udalit,
	SimonPad.Eshche
];

const SUCCESS_MESSAGES: readonly string[] = [
	'Документ «Реализация товаров №{n}» проведён.',
	'Проводки сформированы автоматически.',
	'Партии пересчитаны. Расхождения отправлены в архив.',
	'Записано в журнал регистрации. Надеемся, вы ничего не нарушили.',
	'Отчётность сдана. Проверяющие уведомлены.'
];

function randomInt(maxExclusive: number): number {
	const safe = Math.max(1, Math.floor(maxExclusive));
	return Math.floor(Math.random() * safe);
}

export function generateOrder(round: number, level: number): SimonOrder {
	const pad = ORDER_PADS[randomInt(ORDER_PADS.length)] ?? SimonPad.Provesti;
	const say = Math.random() < 0.62;
	const safeRound = Math.max(1, Math.floor(Number.isFinite(round) ? round : 1));
	const safeLevel = Math.max(1, Math.floor(Number.isFinite(level) ? level : 1));
	const durationMs = Math.max(1200, 2700 - safeLevel * 130 - safeRound * 8);

	return {
		pad,
		say,
		durationMs
	};
}

export function createSuccessMessage(): string {
	const template = SUCCESS_MESSAGES[randomInt(SUCCESS_MESSAGES.length)] ?? 'Документ проведён.';
	return template.replace('{n}', String(1000 + randomInt(9000)));
}

export function getPadLabel(pad: SimonPadId): string {
	if (pad === SimonPad.Provesti) {
		return 'Провести';
	}
	if (pad === SimonPad.Zapisat) {
		return 'Записать';
	}
	if (pad === SimonPad.Udalit) {
		return 'Пометить на удаление';
	}
	return 'Ещё…';
}