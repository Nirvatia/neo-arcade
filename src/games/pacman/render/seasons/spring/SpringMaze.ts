import type { MazeView, GhostSpawnToken } from '../../contracts/SeasonRenderBundle';
import type { MazeColors } from '../../contracts/MazePalette';
import { tileHash } from '../../contracts/MazePalette';

export class SpringMaze implements MazeView {
	drawWall(
		ctx: CanvasRenderingContext2D,
		px: number,
		py: number,
		tileSize: number,
		colors: MazeColors,
		tx: number,
		ty: number
	): void {
		if (!(tileSize > 0)) {
			return;
		}

		const hash = tileHash(tx, ty, 7);
		const inset = Math.max(0, Math.floor(tileSize * 0.05));
		const size = Math.max(1, tileSize - inset * 2);

		ctx.fillStyle = '#4f6b45';
		ctx.fillRect(px + inset, py + inset, size, size);

		ctx.fillStyle = '#628254';
		ctx.fillRect(px + inset, py + inset, size, Math.max(1, Math.floor(size * 0.65)));

		ctx.fillStyle = 'rgba(244,251,239,.35)';
		ctx.fillRect(px + inset, py + inset, size, Math.max(1, Math.floor(size * 0.2)));

		if (hash > 0.68) {
			const flowerColor = hash > 0.85 ? '#ffd7ea' : hash > 0.75 ? '#fff4f9' : '#e8ffd8';
			ctx.fillStyle = flowerColor;
			ctx.fillRect(
				px + inset + Math.floor(size * 0.15),
				py + inset + Math.floor(size * 0.55),
				Math.max(1, Math.floor(size * 0.14)),
				Math.max(1, Math.floor(size * 0.14))
			);
		}

		if (hash < 0.2) {
			ctx.fillStyle = 'rgba(214,255,214,.4)';
			ctx.fillRect(
				px + inset + Math.floor(size * 0.6),
				py + inset + Math.floor(size * 0.15),
				Math.max(1, Math.floor(size * 0.2)),
				Math.max(1, Math.floor(size * 0.1))
			);
		}
	}

	drawFloor(
		ctx: CanvasRenderingContext2D,
		px: number,
		py: number,
		tileSize: number,
		colors: MazeColors,
		tx: number,
		ty: number
	): void {
		if (!(tileSize > 0)) {
			return;
		}

		ctx.fillStyle = '#87a06a';
		ctx.fillRect(px, py, tileSize, tileSize);

		const hash = tileHash(tx, ty, 11);

		if (hash > 0.35) {
			ctx.strokeStyle = '#6f8d55';
			ctx.lineWidth = 1;
			const x = px + hash * tileSize;
			ctx.beginPath();
			ctx.moveTo(x, py + tileSize * 0.8);
			ctx.lineTo(x + 1, py + tileSize * 0.55);
			ctx.stroke();
		}

		if (hash < 0.18) {
			ctx.fillStyle = '#cfe8b8';
			ctx.fillRect(
				px + Math.floor(tileSize * 0.3),
				py + Math.floor(tileSize * 0.3),
				Math.max(1, Math.floor(tileSize * 0.1)),
				Math.max(1, Math.floor(tileSize * 0.1))
			);
		}
	}

	drawGate(
		ctx: CanvasRenderingContext2D,
		px: number,
		py: number,
		tileSize: number,
		colors: MazeColors,
		tx: number,
		ty: number
	): void {
		if (!(tileSize > 0)) {
			return;
		}

		const gateHeight = Math.max(3, Math.floor(tileSize * 0.34));
		const gateY = py + Math.floor((tileSize - gateHeight) / 2);

		ctx.fillStyle = '#5b3b25';
		ctx.fillRect(px, gateY - 1, tileSize, gateHeight + 2);

		ctx.fillStyle = '#8a5a34';
		ctx.fillRect(px, gateY, tileSize, gateHeight);

		ctx.fillStyle = '#ffb7d9';

		for (let i = 0; i < 3; i += 1) {
			ctx.beginPath();
			ctx.arc(
				px + ((i + 0.5) * tileSize) / 3,
				gateY + gateHeight / 2,
				Math.max(1, tileSize * 0.07),
				0,
				Math.PI * 2
			);
			ctx.fill();
		}
	}

	drawLairFloor(
		ctx: CanvasRenderingContext2D,
		px: number,
		py: number,
		tileSize: number,
		colors: MazeColors,
		tx: number,
		ty: number
	): void {
		if (!(tileSize > 0)) {
			return;
		}

		ctx.fillStyle = '#5f7161';
		ctx.fillRect(px - 0.5, py - 0.5, tileSize + 1, tileSize + 1);

		const half = tileSize / 2;

		for (let row = 0; row < 2; row += 1) {
			for (let col = 0; col < 2; col += 1) {
				const variant = tileHash(tx + row, ty + col, 13);
				ctx.fillStyle =
					variant > 0.66 ? '#8fa28d' : variant > 0.33 ? '#7d8f7c' : '#71836f';
				ctx.fillRect(
					px + col * half + 1,
					py + row * half + 1,
					Math.max(1, half - 2),
					Math.max(1, half - 2)
				);
			}
		}
	}

	drawPlayerSpawn(
		ctx: CanvasRenderingContext2D,
		px: number,
		py: number,
		tileSize: number,
		colors: MazeColors,
		tx: number,
		ty: number
	): void {
		if (!(tileSize > 0)) {
			return;
		}

		const cx = px + tileSize / 2;
		const cy = py + tileSize / 2;
		const radius = Math.max(2, tileSize * 0.4);

		ctx.strokeStyle = '#f7fff2';
		ctx.lineWidth = Math.max(1, tileSize * 0.09);
		ctx.beginPath();
		ctx.arc(cx, cy, radius, 0, Math.PI * 2);
		ctx.stroke();

		ctx.fillStyle = '#ffd7ea';

		for (let i = 0; i < 5; i += 1) {
			const angle = i * ((Math.PI * 2) / 5);
			ctx.beginPath();
			ctx.arc(
				cx + Math.cos(angle) * radius * 0.55,
				cy + Math.sin(angle) * radius * 0.55,
				Math.max(1, tileSize * 0.06),
				0,
				Math.PI * 2
			);
			ctx.fill();
		}
	}

	drawGhostSpawn(
		ctx: CanvasRenderingContext2D,
		px: number,
		py: number,
		tileSize: number,
		token: GhostSpawnToken,
		colors: MazeColors,
		tx: number,
		ty: number
	): void {
		if (!(tileSize > 0)) {
			return;
		}

		const color =
			token === 'BY'
				? '#ff5a5f'
				: token === 'PY'
					? '#ff9de2'
					: token === 'IY'
						? '#59f0ff'
						: '#ffb14d';

		const cx = px + tileSize / 2;
		const cy = py + tileSize / 2;
		const radius = Math.max(2, tileSize * 0.28);

		ctx.fillStyle = 'rgba(35,55,35,.3)';
		ctx.beginPath();
		ctx.ellipse(cx + 1, cy + 2, radius, radius * 0.8, 0, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.ellipse(cx, cy, radius, radius * 0.85, 0, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = 'rgba(255,255,255,.55)';
		ctx.beginPath();
		ctx.ellipse(cx - radius * 0.3, cy - radius * 0.3, radius * 0.35, radius * 0.2, 0, 0, Math.PI * 2);
		ctx.fill();
	}
}