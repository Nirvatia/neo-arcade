import { StateMachine, type StateTransition } from '../engine/StateMachine';
import { SimonEvent, type SimonTransitionEventId } from './Events';
import { SimonState, type SimonStateId } from './SimonTypes';

const transitions: ReadonlyArray<StateTransition<SimonStateId, SimonTransitionEventId>> = [
	{
		from: SimonState.Boot,
		event: SimonEvent.BootCompleted,
		to: SimonState.Menu
	},
	{
		from: SimonState.Menu,
		event: SimonEvent.StartRequested,
		to: SimonState.ShowingPattern
	},
	{
		from: SimonState.Menu,
		event: SimonEvent.StartClassicRequested,
		to: SimonState.ShowingPattern
	},
	{
		from: SimonState.Menu,
		event: SimonEvent.StartOrdersRequested,
		to: SimonState.OrdersIssuing
	},
	{
		from: SimonState.ShowingPattern,
		event: SimonEvent.PatternPlaybackCompleted,
		to: SimonState.AwaitingInput
	},
	{
		from: SimonState.AwaitingInput,
		event: SimonEvent.InputSequenceCompleted,
		to: SimonState.RoundTransition
	},
	{
		from: SimonState.AwaitingInput,
		event: SimonEvent.InputRejected,
		to: SimonState.Failure
	},
	{
		from: SimonState.AwaitingInput,
		event: SimonEvent.ClassicInputRejected,
		to: SimonState.FailureClassic
	},
	{
		from: SimonState.RoundTransition,
		event: SimonEvent.RoundTransitionCompleted,
		to: SimonState.ShowingPattern
	},
	{
		from: SimonState.Failure,
		event: SimonEvent.FailureSequenceCompleted,
		to: SimonState.GameOver
	},
	{
		from: SimonState.FailureClassic,
		event: SimonEvent.FailureRecoveredClassic,
		to: SimonState.ShowingPattern
	},
	{
		from: SimonState.FailureClassic,
		event: SimonEvent.FailureGameOver,
		to: SimonState.GameOver
	},
	{
		from: SimonState.OrdersIssuing,
		event: SimonEvent.OrderIssued,
		to: SimonState.OrdersAwaiting
	},
	{
		from: SimonState.OrdersAwaiting,
		event: SimonEvent.OrderAccepted,
		to: SimonState.OrdersFeedback
	},
	{
		from: SimonState.OrdersAwaiting,
		event: SimonEvent.OrderRejected,
		to: SimonState.FailureOrders
	},
	{
		from: SimonState.OrdersFeedback,
		event: SimonEvent.RoundTransitionCompleted,
		to: SimonState.OrdersIssuing
	},
	{
		from: SimonState.FailureOrders,
		event: SimonEvent.FailureRecoveredOrders,
		to: SimonState.OrdersIssuing
	},
	{
		from: SimonState.FailureOrders,
		event: SimonEvent.FailureGameOver,
		to: SimonState.GameOver
	},
	{
		from: SimonState.GameOver,
		event: SimonEvent.RestartRequested,
		to: SimonState.Menu
	},
	{
		from: SimonState.ShowingPattern,
		event: SimonEvent.RestartRequested,
		to: SimonState.Menu
	},
	{
		from: SimonState.AwaitingInput,
		event: SimonEvent.RestartRequested,
		to: SimonState.Menu
	},
	{
		from: SimonState.RoundTransition,
		event: SimonEvent.RestartRequested,
		to: SimonState.Menu
	},
	{
		from: SimonState.OrdersIssuing,
		event: SimonEvent.RestartRequested,
		to: SimonState.Menu
	},
	{
		from: SimonState.OrdersAwaiting,
		event: SimonEvent.RestartRequested,
		to: SimonState.Menu
	},
	{
		from: SimonState.OrdersFeedback,
		event: SimonEvent.RestartRequested,
		to: SimonState.Menu
	},
	{
		from: SimonState.Failure,
		event: SimonEvent.RestartRequested,
		to: SimonState.Menu
	},
	{
		from: SimonState.FailureOrders,
		event: SimonEvent.RestartRequested,
		to: SimonState.Menu
	},
	{
		from: SimonState.FailureClassic,
		event: SimonEvent.RestartRequested,
		to: SimonState.Menu
	}
];

export function createSimonStateMachine(): StateMachine<SimonStateId, SimonTransitionEventId> {
	return new StateMachine(SimonState.Boot, transitions);
}