import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../config/CanvasConfig';
import {
	LINE_CLEAR_DURATION_MS,
	LINES_PER_LEVEL,
	tempoMultiplier
} from '../config/GameplayConfig';
import { getSavedScore } from '$shared/utils/scoreStore';
import { CanvasManager } from '../render/CanvasManager';
import { TetrisRenderer } from '../render/TetrisRenderer';
import { SvelteHudAdapter } from '../ui/hud/SvelteHudAdapter';
import { SvelteOverlayAdapter } from '../ui/overlay/SvelteOverlayAdapter';
import { GamePhase } from './types';
import type { TetrisRenderData } from '../render/TetrisRenderer';
import type { OverlayActions } from '../ui/overlay/SvelteOverlayAdapter';
import type { GameModel } from './GameModel';

export class RenderPipeline {
	private readonly canvasManager: CanvasManager;
	private readonly renderer: TetrisRenderer;
	private readonly hudAdapter = new SvelteHudAdapter();
	private readonly overlayAdapter = new SvelteOverlayAdapter();

	constructor(canvasParent: HTMLDivElement) {
		this.canvasManager = new CanvasManager(CANVAS_WIDTH, CANVAS_HEIGHT);
		this.canvasManager.mount(canvasParent);
		this.renderer = new TetrisRenderer(this.canvasManager);
	}

	render(model: GameModel): void {
		this.renderer.render(this.collectRenderData(model));
		this.syncHud(model);
		this.syncOverlay(model);
	}

	setActions(actions: OverlayActions): void {
		this.overlayAdapter.setActions(actions);
	}

	clearActions(): void {
		this.overlayAdapter.clearActions();
	}

	destroy(): void {
		this.clearActions();
		this.canvasManager.destroy();
	}

	private collectRenderData(model: GameModel): TetrisRenderData {
		return {
			phase: model.phase,
			grid: model.grid,
			currentPiece: model.queue.current,
			clearingRows: model.clearingRows,
			clearProgress: this.getClearProgress(model),
			score: model.score.score,
			lines: model.score.lines,
			level: model.score.level
		};
	}

	private getClearProgress(model: GameModel): number {
		if (model.phase !== GamePhase.CLEARING) {
			return 0;
		}
		const progress = model.clearAccumulator / LINE_CLEAR_DURATION_MS;
		return Math.min(1, Math.max(0, progress));
	}

	private syncHud(model: GameModel): void {
		const hiRaw = getSavedScore('tetris', 0);
		const hi = parseInt(hiRaw, 10) || 0;
		this.hudAdapter.update({
			score: model.score.score,
			lines: model.score.lines,
			level: model.score.level,
			highScore: hi,
			nextQueue: model.queue.next,
			heldPiece: model.queue.held,
			holdUsed: !model.queue.canHold,
			planProgress: model.score.lines % LINES_PER_LEVEL,
			tempo: tempoMultiplier(model.score.level),
			hall: []
		});
	}

	private syncOverlay(model: GameModel): void {
		this.overlayAdapter.update({
			phase: model.phase,
			score: model.score.score,
			lines: model.score.lines,
			level: model.score.level
		});
	}
}