import type { MazeView, GhostSpawnToken } from '../../contracts/SeasonRenderBundle';
import type { MazeColors } from '../../contracts/MazePalette';
import { tileHash } from '../../contracts/MazePalette';

export class AutumnMaze implements MazeView {
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

		const hash = tileHash(tx, ty, 3);
		const inset = Math.max(0, Math.floor(tileSize * 0.05));
		const size = Math.max(1, tileSize - inset * 2);

		ctx.fillStyle = '#6f4a2a';
		ctx.fillRect(px + inset, py + inset, size, size);

		ctx.fillStyle = '#8a5a34';
		ctx.fillRect(px + inset, py + inset, size, Math.max(1, Math.floor(size * 0.65)));

		ctx.fillStyle = 'rgba(255,224,168,.35)';
		ctx.fillRect(px + inset, py + inset, size, Math.max(1, Math.floor(size * 0.2)));

		if (hash > 0.68) {
			ctx.fillStyle = '#ff6b4d';
			ctx.fillRect(
				px + inset + Math.floor(size * 0.15),
				py + inset + Math.floor(size * 0.55),
				Math.max(1, Math.floor(size * 0.14)),
				Math.max(1, Math.floor(size * 0.14))
			);
		}

		if (hash < 0.2) {
			ctx.fillStyle = 'rgba(168,160,79,.45)';
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

		ctx.fillStyle = '#b98a4f';
		ctx.fillRect(px, py, tileSize, tileSize);

		const hash = tileHash(tx, ty, 7);

		if (hash > 0.35) {
			ctx.strokeStyle = '#8a5a2f';
			ctx.lineWidth = 1;
			const x = px + hash * tileSize;
			ctx.beginPath();
			ctx.moveTo(x, py + tileSize * 0.8);
			ctx.lineTo(x + 1, py + tileSize * 0.55);
			ctx.stroke();
		}

		if (hash < 0.18) {
			ctx.fillStyle = '#ffd34d';
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

		ctx.fillStyle = '#ff6b4d';

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

		ctx.fillStyle = '#5f4630';
		ctx.fillRect(px - 0.5, py - 0.5, tileSize + 1, tileSize + 1);

		const half = tileSize / 2;

		for (let row = 0; row < 2; row += 1) {
			for (let col = 0; col < 2; col += 1) {
				const variant = tileHash(tx + row, ty + col, 11);
				ctx.fillStyle =
					variant > 0.66 ? '#7a5a3d' : variant > 0.33 ? '#6f5138' : '#654930';
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

		ctx.strokeStyle = '#ffe9b8';
		ctx.lineWidth = Math.max(1, tileSize * 0.09);
		ctx.beginPath();
		ctx.arc(cx, cy, radius, 0, Math.PI * 2);
		ctx.stroke();

		ctx.fillStyle = '#ff6b4d';

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
				? '#ff4d4d'
				: token === 'PY'
					? '#ff9de2'
					: token === 'IY'
						? '#59f0ff'
						: '#ffb14d';

		const cx = px + tileSize / 2;
		const cy = py + tileSize / 2;
		const radius = Math.max(2, tileSize * 0.28);

		ctx.fillStyle = 'rgba(50,30,15,.3)';
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