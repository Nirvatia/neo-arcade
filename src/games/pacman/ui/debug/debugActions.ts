export interface PacmanDebugActions {
	gotoLevel: (level: number) => void;
	spawnBonus: () => void;
	completeLevel: () => void;
	killPlayer: () => void;
	enterHell: () => void;
	enterSecret: () => void;
	toggleProfile: () => void;
	setMazeScale: (value: number) => void;
}

let actions: PacmanDebugActions | null = null;

export function setDebugActions(next: PacmanDebugActions): void {
	if (!next) {
		console.error('debugActions.setDebugActions', 'missing actions');
		throw new Error('debugActions.setDebugActions: missing actions');
	}
	actions = next;
}

export function clearDebugActions(): void {
	actions = null;
}

export function debugGotoLevel(level: number): void {
	if (!actions) {
		console.error('debugActions.debugGotoLevel', 'actions are not initialized');
		return;
	}
	actions.gotoLevel(level);
}

export function debugSpawnBonus(): void {
	if (!actions) {
		console.error('debugActions.debugSpawnBonus', 'actions are not initialized');
		return;
	}
	actions.spawnBonus();
}

export function debugCompleteLevel(): void {
	if (!actions) {
		console.error('debugActions.debugCompleteLevel', 'actions are not initialized');
		return;
	}
	actions.completeLevel();
}

export function debugKillPlayer(): void {
	if (!actions) {
		console.error('debugActions.debugKillPlayer', 'actions are not initialized');
		return;
	}
	actions.killPlayer();
}

export function debugEnterHell(): void {
	if (!actions) {
		console.error('debugActions.debugEnterHell', 'actions are not initialized');
		return;
	}
	actions.enterHell();
}

export function debugEnterSecret(): void {
	if (!actions) {
		console.error('debugActions.debugEnterSecret', 'actions are not initialized');
		return;
	}
	actions.enterSecret();
}

export function debugToggleProfile(): void {
	if (!actions) {
		console.error('debugActions.debugToggleProfile', 'actions are not initialized');
		return;
	}
	actions.toggleProfile();
}

export function debugSetMazeScale(value: number): void {
	if (!actions) {
		console.error('debugActions.debugSetMazeScale', 'actions are not initialized');
		return;
	}
	if (!Number.isFinite(value) || value <= 0) {
		console.error('debugActions.debugSetMazeScale', 'invalid maze scale', value);
		return;
	}
	actions.setMazeScale(value);
}