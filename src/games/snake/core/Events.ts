import type { EntityId } from './ecs/types.js';
import type { BitOp } from '../components/index.js';

export type SnakeEventMap = {
	'collision:food': { entity: EntityId; bit: 0 | 1 };
	'collision:wall': { entity: EntityId };
	'collision:self': { entity: EntityId };
	'collision:exit': { entity: EntityId };
	'collision:bitop': { entity: EntityId; op: BitOp };
	'snake:grown': { entity: EntityId; newLength: number };
	'snake:died': { entity: EntityId };
	'food:spawned': { entity: EntityId };
	'food:eaten': { entity: EntityId };
	'exit:opened': { entity: EntityId };
	'exit:entered': { entity: EntityId };
	'level:expanded': { level: number };
	'score:changed': { score: number };
	'score:add': { points: number };
	'director:stateChanged': {
		previous: DirectorStateType;
		current: DirectorStateType;
	};
	'sequence:completed': {};
	'sequence:failed': {};
};

export const DirectorState = {
	MENU: 'MENU',
	PLAYING: 'PLAYING',
	PAUSED: 'PAUSED',
	GAME_OVER: 'GAME_OVER'
} as const;

export type DirectorStateType = (typeof DirectorState)[keyof typeof DirectorState];
