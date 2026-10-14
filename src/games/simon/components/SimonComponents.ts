import type {
	SimonDifficultyId,
	SimonFailureReasonId,
	SimonModeId,
	SimonPadId
} from '../core/SimonTypes';

export const SimonComponent = {
	Difficulty: 'simon.Difficulty',
	Mode: 'simon.Mode',
	Round: 'simon.Round',
	Pattern: 'simon.Pattern',
	Playback: 'simon.Playback',
	Input: 'simon.Input',
	InputQueue: 'simon.InputQueue',
	Stats: 'simon.Stats',
	Score: 'simon.Score',
	Lives: 'simon.Lives',
	Combo: 'simon.Combo',
	Level: 'simon.Level',
	Order: 'simon.Order',
	OrderTimer: 'simon.OrderTimer',
	InputTimer: 'simon.InputTimer',
	FeedbackTimer: 'simon.FeedbackTimer',
	RoundStartRequest: 'simon.RoundStartRequest',
	OrderGenerationRequest: 'simon.OrderGenerationRequest',
	PlaybackCompleted: 'simon.PlaybackCompleted',
	RoundCompleted: 'simon.RoundCompleted',
	FailureOccurred: 'simon.FailureOccurred',
	OrderAccepted: 'simon.OrderAccepted',
	OrderRejected: 'simon.OrderRejected',
	OrderTimeout: 'simon.OrderTimeout',
	SkipRequested: 'simon.SkipRequested'
} as const;

export type SimonComponentId = (typeof SimonComponent)[keyof typeof SimonComponent];

export interface SimonDifficultyComponent {
	difficulty: SimonDifficultyId;
}

export interface SimonModeComponent {
	mode: SimonModeId;
}

export interface SimonRoundComponent {
	round: number;
}

export interface SimonPatternComponent {
	sequence: readonly SimonPadId[];
}

export interface SimonPlaybackComponent {
	timeMs: number;
	lastTriggeredIndex: number;
	completed: boolean;
	activePad: SimonPadId | null;
	activeIndex: number;
	startDelayMs: number;
	stepIntervalMs: number;
	highlightMs: number;
	postPatternDelayMs: number;
}

export interface SimonInputComponent {
	expectedIndex: number;
	locked: boolean;
}

export interface SimonInputQueueComponent {
	commands: SimonPadId[];
}

export interface SimonStatsComponent {
	clicksTotal: number;
	clicksRound: number;
}

export interface SimonScoreComponent {
	score: number;
	best: number;
}

export interface SimonLivesComponent {
	lives: number;
}

export interface SimonComboComponent {
	combo: number;
}

export interface SimonLevelComponent {
	level: number;
}

export interface SimonOrderComponent {
	round: number;
	pad: SimonPadId;
	say: boolean;
}

export interface SimonOrderTimerComponent {
	elapsedMs: number;
	durationMs: number;
	expired: boolean;
}

export interface SimonInputTimerComponent {
	elapsedMs: number;
	durationMs: number;
	expired: boolean;
}

export interface SimonFeedbackTimerComponent {
	elapsedMs: number;
	durationMs: number;
	completed: boolean;
}

export interface SimonRoundStartRequestComponent {
	round: number;
}

export interface SimonOrderGenerationRequestComponent {
	round: number;
}

export interface SimonPlaybackCompletedComponent {
	round: number;
}

export interface SimonRoundCompletedComponent {
	round: number;
}

export interface SimonFailureOccurredComponent {
	round: number;
	step: number;
	pad: SimonPadId;
	reason: SimonFailureReasonId;
}

export interface SimonOrderAcceptedComponent {
	round: number;
	scoreDelta: number;
	message: string;
}

export interface SimonOrderRejectedComponent {
	round: number;
	reason: SimonFailureReasonId;
	message: string;
}

export interface SimonOrderTimeoutComponent {
	round: number;
	say: boolean;
}

export interface SimonSkipRequestedComponent {
	round: number;
}