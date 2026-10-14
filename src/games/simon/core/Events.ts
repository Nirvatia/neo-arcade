import type {
	SimonDifficultyId,
	SimonFailureReasonId,
	SimonModeId,
	SimonPadId,
	SimonStateId
} from './SimonTypes';

export const SimonConsoleKind = {
	Info: 'INFO',
	Ok: 'OK',
	Error: 'ERROR',
	Command: 'COMMAND'
} as const;

export type SimonConsoleKindId = (typeof SimonConsoleKind)[keyof typeof SimonConsoleKind];

export const SimonEvent = {
	StateChanged: 'simon/state-changed',
	DifficultySelected: 'simon/difficulty-selected',
	ModeSelected: 'simon/mode-selected',
	BootCompleted: 'simon/boot-completed',
	StartRequested: 'simon/start-requested',
	StartOrdersRequested: 'simon/start-orders-requested',
	StartClassicRequested: 'simon/start-classic-requested',
	PatternPlaybackCompleted: 'simon/pattern-playback-completed',
	InputStepAccepted: 'simon/input-step-accepted',
	InputSequenceCompleted: 'simon/input-sequence-completed',
	InputRejected: 'simon/input-rejected',
	ClassicInputRejected: 'simon/classic-input-rejected',
	RoundTransitionCompleted: 'simon/round-transition-completed',
	FailureSequenceCompleted: 'simon/failure-sequence-completed',
	FailureRecoveredOrders: 'simon/failure-recovered-orders',
	FailureRecoveredClassic: 'simon/failure-recovered-classic',
	FailureGameOver: 'simon/failure-game-over',
	RestartRequested: 'simon/restart-requested',
	PadPressed: 'simon/pad-pressed',
	PlaybackStepTriggered: 'simon/playback-step-triggered',
	OrderIssued: 'simon/order-issued',
	OrderAccepted: 'simon/order-accepted',
	OrderRejected: 'simon/order-rejected',
	OrderSkipped: 'simon/order-skipped',
	OrderTimeout: 'simon/order-timeout',
	SkipRequested: 'simon/skip-requested',
	ConsoleMessageReceived: 'simon/console-message-received',
	UiSync: 'simon/ui-sync'
} as const;

export type SimonEventId = (typeof SimonEvent)[keyof typeof SimonEvent];

export type SimonTransitionEventId =
	| (typeof SimonEvent.BootCompleted)
	| (typeof SimonEvent.StartRequested)
	| (typeof SimonEvent.StartOrdersRequested)
	| (typeof SimonEvent.StartClassicRequested)
	| (typeof SimonEvent.PatternPlaybackCompleted)
	| (typeof SimonEvent.InputSequenceCompleted)
	| (typeof SimonEvent.InputRejected)
	| (typeof SimonEvent.ClassicInputRejected)
	| (typeof SimonEvent.RoundTransitionCompleted)
	| (typeof SimonEvent.FailureSequenceCompleted)
	| (typeof SimonEvent.FailureRecoveredOrders)
	| (typeof SimonEvent.FailureRecoveredClassic)
	| (typeof SimonEvent.FailureGameOver)
	| (typeof SimonEvent.RestartRequested)
	| (typeof SimonEvent.OrderIssued)
	| (typeof SimonEvent.OrderAccepted)
	| (typeof SimonEvent.OrderRejected);

export interface SimonUiSnapshot {
	state: SimonStateId;
	difficulty: SimonDifficultyId;
	round: number;
	clicksTotal: number;
	activePad: SimonPadId | null;
	inputLocked: boolean;
	failureReason: SimonFailureReasonId | null;
	mode?: SimonModeId;
	score?: number;
	combo?: number;
	lives?: number;
	level?: number;
	best?: number;
	orderText?: string;
	orderSay?: boolean;
	orderPad?: SimonPadId | null;
	timerProgress?: number;
	statusText?: string;
	failureMessage?: string | null;
}

export type SimonEventPayloads = {
	[SimonEvent.StateChanged]: { from: SimonStateId; to: SimonStateId };
	[SimonEvent.DifficultySelected]: { difficulty: SimonDifficultyId };
	[SimonEvent.ModeSelected]: { mode: SimonModeId };
	[SimonEvent.BootCompleted]: null;
	[SimonEvent.StartRequested]: { difficulty: SimonDifficultyId };
	[SimonEvent.StartOrdersRequested]: null;
	[SimonEvent.StartClassicRequested]: null;
	[SimonEvent.PatternPlaybackCompleted]: { round: number };
	[SimonEvent.InputStepAccepted]: { round: number; step: number; pad: SimonPadId };
	[SimonEvent.InputSequenceCompleted]: { round: number };
	[SimonEvent.InputRejected]: {
		round: number;
		step: number;
		pad: SimonPadId;
		reason: SimonFailureReasonId;
	};
	[SimonEvent.ClassicInputRejected]: {
		round: number;
		step: number;
		pad: SimonPadId;
		reason: SimonFailureReasonId;
	};
	[SimonEvent.RoundTransitionCompleted]: { round: number };
	[SimonEvent.FailureSequenceCompleted]: null;
	[SimonEvent.FailureRecoveredOrders]: null;
	[SimonEvent.FailureRecoveredClassic]: null;
	[SimonEvent.FailureGameOver]: null;
	[SimonEvent.RestartRequested]: null;
	[SimonEvent.PadPressed]: { pad: SimonPadId };
	[SimonEvent.PlaybackStepTriggered]: { pad: SimonPadId; round: number };
	[SimonEvent.OrderIssued]: {
		round: number;
		pad: SimonPadId;
		say: boolean;
		durationMs: number;
	};
	[SimonEvent.OrderAccepted]: {
		round: number;
		scoreDelta: number;
		message: string;
	};
	[SimonEvent.OrderRejected]: {
		round: number;
		reason: SimonFailureReasonId;
		message: string;
	};
	[SimonEvent.OrderSkipped]: {
		round: number;
		correct: boolean;
	};
	[SimonEvent.OrderTimeout]: {
		round: number;
		say: boolean;
	};
	[SimonEvent.SkipRequested]: null;
	[SimonEvent.ConsoleMessageReceived]: {
		text: string;
		kind: SimonConsoleKindId;
	};
	[SimonEvent.UiSync]: SimonUiSnapshot;
};