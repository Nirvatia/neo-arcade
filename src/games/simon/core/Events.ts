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

export type SimonConsoleKindId =
	(typeof SimonConsoleKind)[keyof typeof SimonConsoleKind];

export type SimonMascotMood =
	| 'normal'
	| 'happy'
	| 'shock'
	| 'angry'
	| 'coffee'
	| 'shout';

export const SimonEvent = {
	UiSync: 'simon/ui-sync',
	ConsoleMessageReceived: 'simon/console-message-received',
	PadPressed: 'simon/pad-pressed',
	PlaybackStepTriggered: 'simon/playback-step-triggered',
	ClassicInputRejected: 'simon/classic-input-rejected',
	InputSequenceCompleted: 'simon/input-sequence-completed',
	OrderAccepted: 'simon/order-accepted',
	OrderRejected: 'simon/order-rejected'
} as const;

export type SimonEventId = (typeof SimonEvent)[keyof typeof SimonEvent];

export interface SimonUiSnapshot {
	state: SimonStateId;
	difficulty: SimonDifficultyId;
	round: number;
	activePad: SimonPadId | null;
	inputLocked: boolean;
	failureReason: SimonFailureReasonId | null;
	mode: SimonModeId;
	score: number;
	combo: number;
	lives: number;
	level: number;
	best: number;
	orderText: string;
	orderSay: boolean;
	orderPad: SimonPadId | null;
	timerProgress: number;
	statusText: string;
	failureMessage: string | null;

	mascotMood: SimonMascotMood;
	bossTag: string;
	flavorText: string;
	isBreak: boolean;
	ordersInLevel: number;
	ordersPerLevel: number;
}

export type SimonEventPayloads = {
	[SimonEvent.UiSync]: SimonUiSnapshot;
	[SimonEvent.ConsoleMessageReceived]: {
		text: string;
		kind: SimonConsoleKindId;
	};
	[SimonEvent.PadPressed]: {
		pad: SimonPadId;
	};
	[SimonEvent.PlaybackStepTriggered]: {
		pad: SimonPadId;
		round: number;
	};
	[SimonEvent.ClassicInputRejected]: {
		round: number;
		step: number;
		pad: SimonPadId;
		reason: SimonFailureReasonId;
	};
	[SimonEvent.InputSequenceCompleted]: {
		round: number;
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
};