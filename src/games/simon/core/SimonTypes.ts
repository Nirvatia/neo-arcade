export const SimonState = {
	Boot: 'BOOT',
	Menu: 'MENU',
	Paused: 'PAUSED',
	ShowingPattern: 'SHOWING_PATTERN',
	AwaitingInput: 'AWAITING_INPUT',
	RoundTransition: 'ROUND_TRANSITION',
	GameOver: 'GAME_OVER',
	OrdersIssuing: 'ORDERS_ISSUING',
	OrdersAwaiting: 'ORDERS_AWAITING',
	OrdersFeedback: 'ORDERS_FEEDBACK',
	FailureOrders: 'FAILURE_ORDERS',
	FailureClassic: 'FAILURE_CLASSIC'
} as const;

export type SimonStateId = (typeof SimonState)[keyof typeof SimonState];

export const SimonMode = {
	Orders: 'ORDERS',
	Classic: 'CLASSIC'
} as const;

export type SimonModeId = (typeof SimonMode)[keyof typeof SimonMode];

export const SimonDifficulty = {
	Easy: 'EASY',
	Normal: 'NORMAL',
	Hard: 'HARD'
} as const;

export type SimonDifficultyId =
	(typeof SimonDifficulty)[keyof typeof SimonDifficulty];

export interface SimonDifficultySettings {
	startDelayMs: number;
	stepIntervalMs: number;
	highlightMs: number;
	postPatternDelayMs: number;
}

export const SimonDifficultySettings: Readonly<
	Record<SimonDifficultyId, SimonDifficultySettings>
> = {
	[SimonDifficulty.Easy]: {
		startDelayMs: 1000,
		stepIntervalMs: 1500,
		highlightMs: 500,
		postPatternDelayMs: 1000
	},
	[SimonDifficulty.Normal]: {
		startDelayMs: 1000,
		stepIntervalMs: 1000,
		highlightMs: 500,
		postPatternDelayMs: 1000
	},
	[SimonDifficulty.Hard]: {
		startDelayMs: 1000,
		stepIntervalMs: 400,
		highlightMs: 500,
		postPatternDelayMs: 1000
	}
};

export const SimonPad = {
	Provesti: 'PROVESTI',
	Zapisat: 'ZAPISAT',
	Udalit: 'UDALIT',
	Eshche: 'ESHCHE'
} as const;

export type SimonPadId = (typeof SimonPad)[keyof typeof SimonPad];

export type SimonPadIndex = 0 | 1 | 2 | 3;

export const SimonPadList = [
	SimonPad.Provesti,
	SimonPad.Zapisat,
	SimonPad.Udalit,
	SimonPad.Eshche
] as const;

export const SimonFailureReason = {
	WrongPad: 'WRONG_PAD',
	IncompleteSequence: 'INCOMPLETE_SEQUENCE',
	Timeout: 'TIMEOUT',
	WrongOrderButton: 'WRONG_ORDER_BUTTON',
	ExecutedForeignOrder: 'EXECUTED_FOREIGN_ORDER',
	SkippedRequiredOrder: 'SKIPPED_REQUIRED_ORDER',
	BreakViolation: 'BREAK_VIOLATION'
} as const;

export type SimonFailureReasonId =
	(typeof SimonFailureReason)[keyof typeof SimonFailureReason];

export type SimonMascotMood =
	| 'normal'
	| 'happy'
	| 'shock'
	| 'angry'
	| 'coffee'
	| 'shout';