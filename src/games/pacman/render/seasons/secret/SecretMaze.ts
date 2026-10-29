import type { MazeView, GhostSpawnToken } from '../../contracts/SeasonRenderBundle';
import type { MazeColors } from '../../contracts/MazePalette';
import { tileHash } from '../../contracts/MazePalette';

export class SecretMaze implements MazeView {
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

		const hash = tileHash(tx, ty, 5);
		const inset = Math.max(0, Math.floor(tileSize * 0.05));
		const size = Math.max(1, tileSize - inset * 2);

		ctx.fillStyle = '#2a1a4a';
		ctx.fillRect(px + inset, py + inset, size, size);

		ctx.fillStyle = '#3b2a5c';
		ctx.fillRect(px + inset, py + inset, size, Math.max(1, Math.floor(size * 0.65)));

		ctx.fillStyle = 'rgba(185,143,255,.28)';
		ctx.fillRect(px + inset, py + inset, size, Math.max(1, Math.floor(size * 0.2)));

		if (hash > 0.72) {
			ctx.globalAlpha = 0.7;
			ctx.fillStyle = colors.energizer;
			ctx.fillRect(
				px + inset + Math.floor(size * 0.2),
				py + inset + Math.floor(size * 0.55),
				Math.max(1, Math.floor(size * 0.14)),
				Math.max(1, Math.floor(size * 0.14))
			);
			ctx.globalAlpha = 1;
		}

		if (hash < 0.16) {
			ctx.strokeStyle = 'rgba(18,11,30,.8)';
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(px + size * 0.25, py + inset);
			ctx.lineTo(px + size * 0.45, py + inset + size * 0.7);
			ctx.stroke();
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

		ctx.fillStyle = '#0b0716';
		ctx.fillRect(px, py, tileSize, tileSize);

		const hash = tileHash(tx, ty, 11);

		if (hash > 0.42) {
			ctx.fillStyle = 'rgba(217,201,255,.25)';
			ctx.fillRect(
				px + Math.floor(tileSize * hash * 0.8),
				py + Math.floor(tileSize * ((hash * 7) % 1) * 0.8),
				Math.max(1, Math.floor(tileSize * 0.08)),
				Math.max(1, Math.floor(tileSize * 0.08))
			);
		}

		if (hash < 0.12) {
			ctx.fillStyle = 'rgba(122,92,255,.16)';
			ctx.fillRect(px, py, tileSize, Math.max(1, Math.floor(tileSize * 0.2)));
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

		ctx.fillStyle = '#120b1e';
		ctx.fillRect(px, gateY - 1, tileSize, gateHeight + 2);

		ctx.globalAlpha = 0.8;
		ctx.fillStyle = colors.energizer;
		ctx.fillRect(px, gateY, tileSize, gateHeight);
		ctx.globalAlpha = 1;

		ctx.fillStyle = 'rgba(255,255,255,.45)';
		ctx.fillRect(px, gateY, tileSize, Math.max(1, Math.floor(gateHeight * 0.25)));

		ctx.fillStyle = '#050213';
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

		ctx.fillStyle = '#120b1e';
		ctx.fillRect(px - 0.5, py - 0.5, tileSize + 1, tileSize + 1);

		const half = tileSize / 2;

		for (let row = 0; row < 2; row += 1) {
			for (let col = 0; col < 2; col += 1) {
				const variant = tileHash(tx + row, ty + col, 17);
				ctx.fillStyle = variant > 0.66 ? '#201438' : variant > 0.33 ? '#1a1030' : '#170d26';
				ctx.fillRect(
					px + col * half + 1,
					py + row * half + 1,
					Math.max(1, half - 2),
					Math.max(1, half - 2)
				);
			}
		}

		const glow = tileHash(tx, ty, 23);

		if (glow > 0.78) {
			ctx.globalAlpha = 0.25;
			ctx.fillStyle = colors.energizer;
			ctx.fillRect(px + tileSize * 0.3, py + tileSize * 0.3, tileSize * 0.4, tileSize * 0.4);
			ctx.globalAlpha = 1;
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

		ctx.strokeStyle = '#e8d9ff';
		ctx.lineWidth = Math.max(1, tileSize * 0.09);
		ctx.beginPath();
		ctx.arc(cx, cy, radius, 0, Math.PI * 2);
		ctx.stroke();

		ctx.fillStyle = colors.energizer;

		for (let i = 0; i < 5; i += 1) {
			const angle = i * ((Math.PI * 2) / 5);
			ctx.beginPath();
			ctx.arc(
				cx + Math.cos(angle) * radius * 0.55,
				cy + Math.sin(angle) * radius * 0.55,
				Math.max(1, tileSize * 0.05),
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

		ctx.fillStyle = 'rgba(5,2,19,.45)';
		ctx.beginPath();
		ctx.ellipse(cx + 1, cy + 2, radius, radius * 0.8, 0, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.ellipse(cx, cy, radius, radius * 0.85, 0, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = 'rgba(255,255,255,.6)';
		ctx.beginPath();
		ctx.ellipse(
			cx - radius * 0.3,
			cy - radius * 0.3,
			radius * 0.3,
			radius * 0.18,
			0,
			0,
			Math.PI * 2
		);
		ctx.fill();
	}
}
