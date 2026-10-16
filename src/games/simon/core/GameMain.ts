import type { GameModule } from '../../../shared/core/types';
import { SimonAudioPlayer } from '../audio/SimonAudioPlayer';
import { SimonModel } from '../logic/SimonModel';
import { EventBus } from './EventBus';
import { Director } from './Director';
import {
	SimonConsoleKind,
	SimonEvent,
	type SimonEventPayloads,
	type SimonUiSnapshot
} from './Events';
import { InputController, type SimonInputTarget } from './InputController';
import { RenderPipeline } from './RenderPipeline';
import { MenuState } from './states/MenuState';
import {
	SimonDifficulty,
	SimonMode,
	SimonPadList,
	SimonState,
	type SimonDifficultyId,
	type SimonModeId,
	type SimonPadId,
	type SimonStateId
} from './SimonTypes';

export class SimonGame implements GameModule, SimonInputTarget {
	private readonly events = new EventBus<SimonEventPayloads>();
	private readonly input = new InputController();
	private readonly model = new SimonModel();
	private readonly director: Director;
	private readonly renderPipeline: RenderPipeline;
	private readonly audio: SimonAudioPlayer;

	private destroyed = false;
	private rafId: number | null = null;
	private lastTimeMs: number | null = null;

	constructor() {
		this.director = new Director(this.events, this.input);
		this.renderPipeline = new RenderPipeline(this.events, this.model, this.director);
		this.audio = new SimonAudioPlayer(this);
	}

	async init(container: HTMLDivElement): Promise<void> {
		this.assertNotDestroyed();
		if (!container) {
			throw new Error('[SimonGame] Container is required');
		}
		if (this.director.getCurrentState() !== null) {
			throw new Error('[SimonGame] Game is already initialized');
		}

		this.model.best = this.loadBest();
		this.director.setState(new MenuState(this.model));
		this.input.attach(this);
		this.renderPipeline.render();
		this.startLoop();
	}

	destroy(): void {
		if (this.destroyed) {
			return;
		}
		this.destroyed = true;
		this.stopLoop();
		this.input.detach();
		this.input.clear();
		this.events.clear();
		this.audio.destroy();
	}

	get state(): SimonStateId {
		return this.director.getCurrentState()?.view ?? SimonState.Boot;
	}

	get selectedDifficulty(): SimonDifficultyId {
		return this.model.difficulty;
	}

	get selectedMode(): SimonModeId {
		return this.model.mode;
	}

	get uiSnapshot(): SimonUiSnapshot {
		return this.renderPipeline.buildSnapshot();
	}

	on<K extends keyof SimonEventPayloads>(
		event: K,
		listener: (payload: SimonEventPayloads[K]) => void
	): () => void {
		this.assertNotDestroyed();
		return this.events.on(event, listener);
	}

	selectDifficulty(difficulty: SimonDifficultyId): void {
		this.assertNotDestroyed();
		if (this.state !== SimonState.Menu) {
			return;
		}
		if (
			difficulty !== SimonDifficulty.Easy &&
			difficulty !== SimonDifficulty.Normal &&
			difficulty !== SimonDifficulty.Hard
		) {
			return;
		}
		this.model.difficulty = difficulty;
		this.renderPipeline.render();
	}

	selectMode(mode: SimonModeId): void {
		this.assertNotDestroyed();
		if (this.state !== SimonState.Menu) {
			return;
		}
		if (mode !== SimonMode.Orders && mode !== SimonMode.Classic) {
			return;
		}
		if (this.model.mode === mode) {
			return;
		}

		this.model.mode = mode;
		this.model.statusText = 'Готово';

		this.events.emit(SimonEvent.ConsoleMessageReceived, {
			text:
				mode === SimonMode.Orders
					? 'Режим «Подчинённость»: выполняйте только приказы 1С.'
					: 'Режим «Симон»: запоминайте последовательность и повторяйте её.',
			kind: SimonConsoleKind.Command
		});

		this.renderPipeline.render();
	}

	requestStart(): void {
		this.assertNotDestroyed();
		this.input.triggerStart();
	}

	requestStartMode(mode: SimonModeId): void {
		this.assertNotDestroyed();
		if (this.state !== SimonState.Menu) {
			return;
		}
		if (mode !== SimonMode.Orders && mode !== SimonMode.Classic) {
			return;
		}
		this.model.mode = mode;
		this.input.triggerStart();
	}

	requestRestart(): void {
		this.assertNotDestroyed();
		if (this.director.getCurrentState() === null) {
			return;
		}
		this.director.setState(new MenuState(this.model));
		this.renderPipeline.render();
	}

	pressPad(pad: SimonPadId): void {
		this.assertNotDestroyed();
		if (!SimonPadList.includes(pad)) {
			return;
		}
		this.input.triggerPadPress(pad);
	}

	skip(): void {
		this.assertNotDestroyed();
		this.input.triggerSkip();
	}

	acknowledgeFailure(): void {
		this.assertNotDestroyed();
		this.input.triggerAcknowledge();
	}

	handleEnter(): void {
		this.assertNotDestroyed();
		const state = this.state;

		if (state === SimonState.FailureOrders || state === SimonState.FailureClassic) {
			this.acknowledgeFailure();
			return;
		}

		if (state === SimonState.GameOver) {
			this.requestRestart();
			this.requestStart();
			return;
		}

		if (state === SimonState.Menu) {
			this.requestStart();
		}
	}

	handleEscape(): void {
		this.assertNotDestroyed();
		const state = this.state;

		if (state === SimonState.FailureOrders || state === SimonState.FailureClassic) {
			this.acknowledgeFailure();
		}
	}

	private startLoop(): void {
		if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
			return;
		}

		this.lastTimeMs = null;
		const tick = (timeMs: number): void => {
			if (this.destroyed) {
				return;
			}

			if (this.lastTimeMs === null) {
				this.lastTimeMs = timeMs;
				this.rafId = window.requestAnimationFrame(tick);
				return;
			}

			let deltaMs = timeMs - this.lastTimeMs;
			this.lastTimeMs = timeMs;

			if (!Number.isFinite(deltaMs) || deltaMs < 0) {
				deltaMs = 0;
			}
			if (deltaMs > 250) {
				deltaMs = 250;
			}

			this.director.update(deltaMs);
			this.renderPipeline.render();

			this.rafId = window.requestAnimationFrame(tick);
		};

		this.rafId = window.requestAnimationFrame(tick);
	}

	private stopLoop(): void {
		if (this.rafId !== null && typeof window !== 'undefined') {
			window.cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}
		this.lastTimeMs = null;
	}

	private loadBest(): number {
		if (typeof window === 'undefined') {
			return 0;
		}

		try {
			const raw = window.localStorage.getItem('simon1c_best');
			if (raw === null) {
				return 0;
			}
			const parsed = Number.parseInt(raw, 10);
			if (!Number.isFinite(parsed) || parsed <= 0) {
				return 0;
			}
			return parsed;
		} catch {
			return 0;
		}
	}

	private assertNotDestroyed(): void {
		if (this.destroyed) {
			throw new Error('[SimonGame] Game is destroyed');
		}
	}
}