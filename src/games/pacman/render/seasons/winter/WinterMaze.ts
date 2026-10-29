import type { MazeView, GhostSpawnToken } from '../../contracts/SeasonRenderBundle';
import type { MazeColors } from '../../contracts/MazePalette';
import { tileHash } from '../../contracts/MazePalette';

export class WinterMaze implements MazeView {
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
		const inset = Math.max(0, Math.floor(tileSize * 0.04));
		const size = Math.max(1, tileSize - inset * 2);

		ctx.fillStyle = 'rgba(30,40,70,.4)';
		ctx.fillRect(px + inset + 1, py + inset + 2, size, size);

		ctx.fillStyle = '#5d6a62';
		ctx.fillRect(px + inset, py + inset, size, size);

		ctx.fillStyle = hash > 0.5 ? '#6a766c' : '#566258';
		ctx.fillRect(px + inset, py + inset, size, Math.max(1, Math.floor(size * 0.65)));

		ctx.fillStyle = 'rgba(232,240,255,.55)';
		ctx.fillRect(px + inset, py + inset, size, Math.max(1, Math.floor(size * 0.2)));

		if (hash > 0.65) {
			ctx.fillStyle = 'rgba(255,255,255,.7)';
			ctx.fillRect(
				px + inset + Math.floor(size * 0.15),
				py + inset,
				Math.max(1, Math.floor(size * 0.4)),
				Math.max(1, Math.floor(size * 0.12))
			);
		}

		if (hash < 0.3) {
			ctx.fillStyle = 'rgba(120,140,110,.5)';
			ctx.fillRect(
				px + inset + Math.floor(size * 0.55),
				py + inset + Math.floor(size * 0.6),
				Math.max(1, Math.floor(size * 0.3)),
				Math.max(1, Math.floor(size * 0.2))
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

		ctx.fillStyle = '#8a9a7a';
		ctx.fillRect(px, py, tileSize, tileSize);

		const hash = tileHash(tx, ty, 11);

		if (hash > 0.45) {
			ctx.strokeStyle = hash > 0.7 ? '#b9c4a6' : '#7d8d6e';
			ctx.lineWidth = 1;
			const x = px + hash * tileSize;
			ctx.beginPath();
			ctx.moveTo(x, py + tileSize * 0.8);
			ctx.lineTo(x + 1, py + tileSize * 0.55);
			ctx.stroke();
		}
	}

	drawGate(ctx: CanvasRenderingContext2D, px: number, py: number, tileSize: number): void {
		if (!(tileSize > 0)) {
			return;
		}

		const gateHeight = Math.max(3, Math.floor(tileSize * 0.4));
		const gateY = py + Math.floor((tileSize - gateHeight) / 2);

		ctx.fillStyle = '#4f3622';
		ctx.fillRect(px, gateY - 1, tileSize, gateHeight + 2);
		ctx.fillStyle = '#7a5636';
		ctx.fillRect(px, gateY, tileSize, gateHeight);
		ctx.fillStyle = '#a07848';

		for (let i = 0; i < 3; i += 1) {
			ctx.fillRect(px, gateY + i * Math.max(1, gateHeight / 3), tileSize, 1);
		}

		ctx.fillStyle = '#2b1d12';
		ctx.fillRect(px, gateY - 1, Math.max(1, Math.floor(tileSize * 0.12)), gateHeight + 2);
		ctx.fillRect(
			px + tileSize - Math.max(1, Math.floor(tileSize * 0.12)),
			gateY - 1,
			Math.max(1, Math.floor(tileSize * 0.12)),
			gateHeight + 2
		);
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

		ctx.fillStyle = '#6a7688';
		ctx.fillRect(px - 0.5, py - 0.5, tileSize + 1, tileSize + 1);

		const half = tileSize / 2;
		const palette = ['#dbe6f0', '#cfdde9', '#c3d3e2'];

		for (let row = 0; row < 2; row += 1) {
			for (let col = 0; col < 2; col += 1) {
				ctx.fillStyle = palette[Math.floor(tileHash(tx + row, ty + col, 5) * 3)] ?? palette[0];
				ctx.fillRect(
					px + col * half + 1,
					py + row * half + 1,
					Math.max(1, half - 2),
					Math.max(1, half - 2)
				);
			}
		}
	}

	drawPlayerSpawn(ctx: CanvasRenderingContext2D, px: number, py: number, tileSize: number): void {
		if (!(tileSize > 0)) {
			return;
		}

		const cx = px + tileSize / 2;
		const cy = py + tileSize / 2;
		const radius = Math.max(2, tileSize * 0.4);

		ctx.strokeStyle = '#a8b3a6';
		ctx.lineWidth = Math.max(1, tileSize * 0.1);
		ctx.beginPath();
		ctx.arc(cx, cy, radius, 0, Math.PI * 2);
		ctx.stroke();

		ctx.strokeStyle = '#26352b';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.arc(cx, cy, radius * 0.72, 0, Math.PI * 2);
		ctx.stroke();

		for (let i = 0; i < 6; i += 1) {
			const angle = i * (Math.PI / 3);
			ctx.fillStyle = '#e8eef2';
			ctx.beginPath();
			ctx.arc(
				cx + Math.cos(angle) * radius * 0.5,
				cy + Math.sin(angle) * radius * 0.5,
				1,
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
		token: GhostSpawnToken
	): void {
		if (!(tileSize > 0)) {
			return;
		}

		const color =
			token === 'BY'
				? '#d9333a'
				: token === 'PY'
					? '#ff6b6b'
					: token === 'IY'
						? '#59f0ff'
						: '#ffb14d';

		const radius = Math.max(2, tileSize * 0.28);
		const cx = px + tileSize / 2;
		const cy = py + tileSize / 2;

		ctx.fillStyle = 'rgba(30,40,60,.35)';
		ctx.beginPath();
		ctx.ellipse(cx + 1, cy + 2, radius, radius * 0.8, 0, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.ellipse(cx, cy, radius, radius * 0.85, 0, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = 'rgba(255,255,255,.55)';
		ctx.beginPath();
		ctx.ellipse(
			cx - radius * 0.3,
			cy - radius * 0.3,
			radius * 0.35,
			radius * 0.2,
			0,
			0,
			Math.PI * 2
		);
		ctx.fill();
	}
}
