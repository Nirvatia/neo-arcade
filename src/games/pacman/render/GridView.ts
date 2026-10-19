import type { GridService } from '../logic/GridService';
import type { LevelProgress } from '../logic/LevelProgress';

export interface GridLayout {
	readonly tileSize: number;
	readonly offsetX: number;
	readonly offsetY: number;
}

export class GridView {
	draw(
		ctx: CanvasRenderingContext2D,
		grid: GridService,
		progress: LevelProgress,
		width: number,
		height: number
	): GridLayout {
		if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
			console.error('GridView.draw', 'invalid view size', { width, height });
			return { tileSize: 1, offsetX: 0, offsetY: 0 };
		}

		if (!Number.isFinite(grid.width) || grid.width <= 0 || !Number.isFinite(grid.height) || grid.height <= 0) {
			console.error('GridView.draw', 'invalid grid size', {
				width: grid.width,
				height: grid.height
			});
			return { tileSize: 1, offsetX: 0, offsetY: 0 };
		}

		const tileSize = Math.max(1, Math.floor(Math.min(width / grid.width, height / grid.height)));
		const gridWidth = tileSize * grid.width;
		const gridHeight = tileSize * grid.height;
		const offsetX = Math.max(0, Math.floor((width - gridWidth) / 2));
		const offsetY = Math.max(0, Math.floor((height - gridHeight) / 2));

		for (let y = 0; y < grid.height; y += 1) {
			for (let x = 0; x < grid.width; x += 1) {
				const tile = grid.tileAt(x, y);
				const px = offsetX + x * tileSize;
				const py = offsetY + y * tileSize;
				const cx = px + tileSize / 2;
				const cy = py + tileSize / 2;

				if (tile === 'WL') {
					const wallInset = tileSize >= 3 ? 1 : 0;
					const wallSize = Math.max(1, tileSize - wallInset * 2);
					ctx.fillStyle = '#1d2c5c';
					ctx.fillRect(px + wallInset, py + wallInset, wallSize, wallSize);
					continue;
				}

				ctx.fillStyle = '#060a14';
				ctx.fillRect(px, py, tileSize, tileSize);

				switch (tile) {
					case 'DT': {
						if (progress.isCollected(x, y)) {
							break;
						}

						const radius = Math.max(1, Math.min(tileSize * 0.5, tileSize * 0.12));
						ctx.fillStyle = '#c9d4ff';
						ctx.beginPath();
						ctx.arc(cx, cy, radius, 0, Math.PI * 2);
						ctx.fill();
						break;
					}
					case 'EU': {
						if (progress.isCollected(x, y)) {
							break;
						}

						const radius = Math.max(1, Math.min(tileSize * 0.5, tileSize * 0.28));
						ctx.fillStyle = '#ffcf4d';
						ctx.beginPath();
						ctx.arc(cx, cy, radius, 0, Math.PI * 2);
						ctx.fill();
						break;
					}
					case 'LE': {
						const gateInset = tileSize >= 3 ? 1 : 0;
						const gateWidth = Math.max(1, tileSize - gateInset * 2);
						const gateHeight = Math.max(2, Math.floor(tileSize * 0.28));
						const gateY = py + Math.max(0, Math.floor((tileSize - gateHeight) / 2));
						ctx.fillStyle = '#ff69b4';
						ctx.fillRect(px + gateInset, gateY, gateWidth, gateHeight);
						break;
					}
					case 'LT': {
						ctx.fillStyle = '#30173d';
						ctx.fillRect(px + 1, py + 1, Math.max(1, tileSize - 2), Math.max(1, tileSize - 2));
						break;
					}
					case 'PM': {
						const radius = Math.max(1, Math.min(tileSize * 0.5, tileSize * 0.26));
						ctx.strokeStyle = '#ffe24b';
						ctx.lineWidth = Math.max(1, Math.floor(tileSize * 0.08));
						ctx.beginPath();
						ctx.arc(cx, cy, radius, 0, Math.PI * 2);
						ctx.stroke();
						break;
					}
					case 'BY':
					case 'PY':
					case 'IY':
					case 'CE': {
						const markerSize = Math.min(tileSize, Math.max(1, Math.floor(tileSize * 0.45)));
						const markerOffset = Math.max(0, Math.floor((tileSize - markerSize) / 2));

						if (tile === 'BY') {
							ctx.fillStyle = '#ff4d4d';
						} else if (tile === 'PY') {
							ctx.fillStyle = '#ff9de2';
						} else if (tile === 'IY') {
							ctx.fillStyle = '#59f0ff';
						} else {
							ctx.fillStyle = '#ffb14d';
						}

						ctx.fillRect(px + markerOffset, py + markerOffset, markerSize, markerSize);
						break;
					}
					case '0A':
					case '0B':
					case '0C': {
						const radius = Math.max(1, Math.min(tileSize * 0.5, tileSize * 0.3));

						if (tile === '0A') {
							ctx.strokeStyle = '#56d9ff';
						} else if (tile === '0B') {
							ctx.strokeStyle = '#79ff6f';
						} else {
							ctx.strokeStyle = '#ff69d8';
						}

						ctx.fillStyle = '#041018';
						ctx.lineWidth = Math.max(1, Math.floor(tileSize * 0.1));
						ctx.beginPath();
						ctx.arc(cx, cy, radius, 0, Math.PI * 2);
						ctx.fill();
						ctx.stroke();
						break;
					}
					case 'RT': {
						const trapSize = Math.min(tileSize, Math.max(2, Math.floor(tileSize * 0.55)));
						const trapOffset = Math.max(0, Math.floor((tileSize - trapSize) / 2));
						ctx.fillStyle = '#7f1818';
						ctx.fillRect(px + trapOffset, py + trapOffset, trapSize, trapSize);

						const coreSize = Math.max(1, Math.floor(trapSize * 0.45));
						const coreOffset = Math.max(0, Math.floor((trapSize - coreSize) / 2));
						ctx.fillStyle = '#200404';
						ctx.fillRect(
							px + trapOffset + coreOffset,
							py + trapOffset + coreOffset,
							coreSize,
							coreSize
						);
						break;
					}
					case 'ES': {
						break;
					}
					default: {
						console.error('GridView.draw', 'unsupported tile', { tile, x, y });
						break;
					}
				}
			}
		}

		return { tileSize, offsetX, offsetY };
	}
}