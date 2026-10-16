import { SimonPadList, type SimonPadId } from './SimonTypes';

export interface SimonInputTarget {
	pressPad(pad: SimonPadId): void;
	skip(): void;
	acknowledgeFailure(): void;
	requestStart(): void;
	requestRestart(): void;
	handleEnter(): void;
	handleEscape(): void;
}

type PadPressHandler = (pad: SimonPadId) => void;
type SkipHandler = () => void;
type AcknowledgeHandler = () => void;
type StartHandler = () => void;

export class InputController {
	private target: SimonInputTarget | null = null;

	private readonly padPressHandlers = new Set<PadPressHandler>();
	private readonly skipHandlers = new Set<SkipHandler>();
	private readonly acknowledgeHandlers = new Set<AcknowledgeHandler>();
	private readonly startHandlers = new Set<StartHandler>();

	private readonly keydownListener = (event: KeyboardEvent): void => {
		this.handleKeydown(event);
	};

	attach(target: SimonInputTarget): void {
		if (typeof window === 'undefined') {
			return;
		}
		this.detach();
		this.target = target;
		window.addEventListener('keydown', this.keydownListener, true);
	}

	detach(): void {
		if (typeof window !== 'undefined') {
			window.removeEventListener('keydown', this.keydownListener, true);
		}
		this.target = null;
	}

	onPadPress(handler: PadPressHandler): () => void {
		this.padPressHandlers.add(handler);
		return () => {
			this.padPressHandlers.delete(handler);
		};
	}

	onSkip(handler: SkipHandler): () => void {
		this.skipHandlers.add(handler);
		return () => {
			this.skipHandlers.delete(handler);
		};
	}

	onAcknowledge(handler: AcknowledgeHandler): () => void {
		this.acknowledgeHandlers.add(handler);
		return () => {
			this.acknowledgeHandlers.delete(handler);
		};
	}

	onStart(handler: StartHandler): () => void {
		this.startHandlers.add(handler);
		return () => {
			this.startHandlers.delete(handler);
		};
	}

	triggerPadPress(pad: SimonPadId): void {
		for (const handler of this.padPressHandlers) {
			handler(pad);
		}
	}

	triggerSkip(): void {
		for (const handler of this.skipHandlers) {
			handler();
		}
	}

	triggerAcknowledge(): void {
		for (const handler of this.acknowledgeHandlers) {
			handler();
		}
	}

	triggerStart(): void {
		for (const handler of this.startHandlers) {
			handler();
		}
	}

	clear(): void {
		this.padPressHandlers.clear();
		this.skipHandlers.clear();
		this.acknowledgeHandlers.clear();
		this.startHandlers.clear();
	}

	private handleKeydown(event: KeyboardEvent): void {
		const target = this.target;
		if (!target) {
			return;
		}
		if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) {
			return;
		}

		const source = event.target;
		if (
			source instanceof HTMLSelectElement ||
			source instanceof HTMLInputElement ||
			source instanceof HTMLTextAreaElement
		) {
			return;
		}
		if (source instanceof HTMLElement && source.isContentEditable) {
			return;
		}

		let handled = true;

		if (event.key >= '1' && event.key <= '4') {
			const pad = SimonPadList[Number(event.key) - 1];
			if (pad) {
				target.pressPad(pad);
			} else {
				handled = false;
			}
		} else if (event.key === ' ' || event.key === 'Spacebar') {
			target.skip();
		} else if (event.key === 'Enter') {
			target.handleEnter();
		} else if (event.key === 'Escape' || event.key === 'Esc') {
			target.handleEscape();
		} else {
			handled = false;
		}

		if (handled) {
			event.preventDefault();
			event.stopImmediatePropagation();
		}
	}
}