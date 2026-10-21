export interface PacmanActions {
	confirm: () => void;
	pause: () => void;
	menu: () => void;
	profile: () => void;
}

let actions: PacmanActions | null = null;

export function setPacmanActions(next: PacmanActions): void {
	if (!next) {
		console.error('pacmanActions.setPacmanActions', 'missing actions');
		throw new Error('pacmanActions.setPacmanActions: missing actions');
	}

	actions = next;
}

export function clearPacmanActions(): void {
	actions = null;
}

export function pressConfirm(): void {
	if (!actions) {
		console.error('pacmanActions.pressConfirm', 'actions are not initialized');
		return;
	}

	actions.confirm();
}

export function pressPause(): void {
	if (!actions) {
		console.error('pacmanActions.pressPause', 'actions are not initialized');
		return;
	}

	actions.pause();
}

export function pressMenu(): void {
	if (!actions) {
		console.error('pacmanActions.pressMenu', 'actions are not initialized');
		return;
	}

	actions.menu();
}

export function pressProfile(): void {
	if (!actions) {
		console.error('pacmanActions.pressProfile', 'actions are not initialized');
		return;
	}

	actions.profile();
}