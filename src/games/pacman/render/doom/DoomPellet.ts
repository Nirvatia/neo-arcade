import type { PelletView } from '../contracts/SeasonRenderBundle';
import type { MazeColors } from '../contracts/MazePalette';

export class DoomPellet implements PelletView {
	draw(
		_ctx: CanvasRenderingContext2D,
		_cx: number,
		_cy: number,
		_tileSize: number,
		_colors: MazeColors,
		_tx: number,
		_ty: number
	): void {
	}
}