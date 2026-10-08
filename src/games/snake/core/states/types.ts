import type { EventBus } from '$games/snake/engine/EventBus.js';
import type { GameLoop } from '$games/snake/engine/GameLoop.js';
import type { SnakeEventMap } from '../Events.js';

export interface DirectorContext {
	readonly gameLoop: GameLoop;
	readonly events: EventBus<SnakeEventMap>;
}