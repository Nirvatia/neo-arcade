/** What the screens' buttons do (the game wires them to its input). */
export interface ScreenActions {
	confirm: () => void;
	pause: () => void;
	menu: () => void;
	profile: () => void;
	restart: () => void;
}
