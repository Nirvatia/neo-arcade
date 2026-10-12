import { CanvasManager } from './CanvasManager';
import { GridService } from '../logic/grid/GridService';
import { GRID_COLS, GRID_ROWS, HIDDEN_ROWS } from '../config/GridConfig';
import {
	CANVAS_WIDTH,
	CANVAS_HEIGHT,
	PLAYFIELD_X,
	PLAYFIELD_Y,
	PLAYFIELD_WIDTH,
	PLAYFIELD_HEIGHT,
	CELL_SIZE
} from '../config/CanvasConfig';
import { THEME } from '../config/ThemeConfig';
import { GamePhase } from '../core/types';
import type { GamePhase as GamePhaseType } from '../core/types';
import type { GridModel } from '../logic/grid/GridModel';
import type { PieceModel } from '../logic/piece/PieceModel';
import { drawCell } from './drawPiece';

export interface TetrisRenderData {
	phase: GamePhaseType;
	grid: GridModel;
	currentPiece: PieceModel | null;
	clearingRows: number[];
	clearProgress: number;
	score: number;
	lines: number;
	level: number;
}

export class TetrisRenderer {
	constructor(private readonly canvasManager: CanvasManager) {}

	render(data: TetrisRenderData): void {
		this.drawBackground();
		this.drawGridLines();
		this.drawLockedCells(data);
		if ((data.phase === GamePhase.PLAYING || data.phase === GamePhase.PAUSED) && data.currentPiece) {
			this.drawGhost(data);
			this.drawCurrentPiece(data);
		}
	}

	private drawBackground(): void {
		const ctx = this.canvasManager.ctx;
		ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
		ctx.fillStyle = THEME.frame;
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
		ctx.fillStyle = THEME.playfield;
		ctx.fillRect(PLAYFIELD_X, PLAYFIELD_Y, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
	}

	private drawGridLines(): void {
		const ctx = this.canvasManager.ctx;
		ctx.strokeStyle = THEME.gridLine;
		ctx.lineWidth = 1;
		ctx.beginPath();
		for (let x = 1; x < GRID_COLS; x++) {
			const px = PLAYFIELD_X + x * CELL_SIZE;
			ctx.moveTo(px + 0.5, PLAYFIELD_Y);
			ctx.lineTo(px + 0.5, PLAYFIELD_Y + PLAYFIELD_HEIGHT);
		}
		for (let y = 1; y < GRID_ROWS - HIDDEN_ROWS; y++) {
			const py = PLAYFIELD_Y + y * CELL_SIZE;
			ctx.moveTo(PLAYFIELD_X, py + 0.5);
			ctx.lineTo(PLAYFIELD_X + PLAYFIELD_WIDTH, py + 0.5);
		}
		ctx.stroke();
	}

	private drawLockedCells(data: TetrisRenderData): void {
		const cells = data.grid.cells;
		for (let y = HIDDEN_ROWS; y < cells.length; y++) {
			const isClearingRow = data.clearingRows.includes(y);
			const row = cells[y];
			for (let x = 0; x < row.length; x++) {
				if (isClearingRow) {
					this.drawClearingCell(y, x, data.clearProgress);
					continue;
				}
				const value = row[x];
				if (value !== 0) {
					this.drawCell(y, x, value);
				}
			}
		}
	}

	private drawCurrentPiece(data: TetrisRenderData): void {
		if (!data.currentPiece) return;
		const piece = data.currentPiece;
		const matrix = piece.matrix;
		for (let row = 0; row < matrix.length; row++) {
			const matrixRow = matrix[row];
			for (let col = 0; col < matrixRow.length; col++) {
				const value = matrixRow[col];
				if (value === 0) continue;
				const boardY = piece.y + row;
				const boardX = piece.x + col;
				if (boardY < HIDDEN_ROWS || boardX < 0 || boardX >= GRID_COLS || boardY >= GRID_ROWS) continue;
				this.drawCell(boardY, boardX, value);
			}
		}
	}

	private drawGhost(data: TetrisRenderData): void {
		if (!data.currentPiece) return;
		const piece = data.currentPiece;
		const ghostY = GridService.getGhostY(data.grid, piece);
		if (ghostY <= piece.y) return;
		const matrix = piece.matrix;
		for (let row = 0; row < matrix.length; row++) {
			const matrixRow = matrix[row];
			for (let col = 0; col < matrixRow.length; col++) {
				const value = matrixRow[col];
				if (value === 0) continue;
				const boardY = ghostY + row;
				const boardX = piece.x + col;
				if (boardY < HIDDEN_ROWS || boardX < 0 || boardX >= GRID_COLS || boardY >= GRID_ROWS) continue;
				this.drawGhostCell(boardY, boardX, value);
			}
		}
	}

	private drawCell(row: number, col: number, value: number): void {
		const ctx = this.canvasManager.ctx;
		const x = PLAYFIELD_X + col * CELL_SIZE;
		const y = PLAYFIELD_Y + (row - HIDDEN_ROWS) * CELL_SIZE;
		drawCell(ctx, x, y, CELL_SIZE, value, false);
	}

	private drawGhostCell(row: number, col: number, value: number): void {
		const ctx = this.canvasManager.ctx;
		const x = PLAYFIELD_X + col * CELL_SIZE;
		const y = PLAYFIELD_Y + (row - HIDDEN_ROWS) * CELL_SIZE;
		drawCell(ctx, x, y, CELL_SIZE, value, true);
	}

	private drawClearingCell(row: number, col: number, clearProgress: number): void {
		const ctx = this.canvasManager.ctx;
		const progress = Math.min(1, Math.max(0, clearProgress));
		const a = (Math.sin(progress * Math.PI * 3) * 0.5 + 0.5) * 0.9;
		const x = PLAYFIELD_X + col * CELL_SIZE;
		const y = PLAYFIELD_Y + (row - HIDDEN_ROWS) * CELL_SIZE;
		ctx.fillStyle = `rgba(255, 244, 214, ${a})`;
		ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
	}
}