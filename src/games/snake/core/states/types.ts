import type { GameLoop } from '../GameLoop.js';
import type { EventBus } from '../EventBus.js';
import type { SnakeEventMap } from '../Events.js';

export interface DirectorContext {
	readonly gameLoop: GameLoop;
	readonly events: EventBus<SnakeEventMap>;
}