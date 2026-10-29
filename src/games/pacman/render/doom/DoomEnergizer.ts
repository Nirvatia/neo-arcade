import type { EnergizerView } from '../contracts/SeasonRenderBundle';
import type { MazeColors } from '../contracts/MazePalette';

const PALETTE = [
	{ core: '#40ff50', rim: '#0a6a1a', glow: 'rgba(64,255,80,.35)' },
	{ core: '#b8ff30', rim: '#3a5a10', glow: 'rgba(184,255,48,.35)' },
	{ core: '#ff3a2a', rim: '#6a0a06', glow: 'rgba(255,58,42,.35)' },
	{ core: '#40d0ff', rim: '#0a3a90', glow: 'rgba(64,208,255,.35)' }
];

export class DoomEnergizer implements EnergizerView {
	draw(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		tileSize: number,
		_colors: MazeColors,
		time: number,
		tx: number,
		ty: number
	): void {
		if (!(tileSize > 0)) {
			return;
		}
		const safeTime = Number.isFinite(time) && time >= 0 ? time : 0;
		const index = ((ty >= 12 ? 2 : 0) + (tx >= 12 ? 1 : 0)) % PALETTE.length;
		const palette = PALETTE[index] ?? PALETTE[0];
		const pulse = 1 + 0.08 * Math.sin(safeTime * 2.6 + tx * 1.3 + ty * 0.7);
		const radius = Math.max(4, tileSize * 0.42) * pulse;
		const glowRadius = radius * 2.2;
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
		glow.addColorStop(0, palette.glow);
		glow.addColorStop(1, 'rgba(0,0,0,0)');
		ctx.fillStyle = glow;
		ctx.beginPath();
		ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
		const coreGradient = ctx.createRadialGradient(
			cx - radius * 0.35,
			cy - radius * 0.35,
			1,
			cx,
			cy,
			radius
		);
		coreGradient.addColorStop(0, '#ffffff');
		coreGradient.addColorStop(0.35, palette.core);
		coreGradient.addColorStop(1, palette.rim);
		ctx.fillStyle = coreGradient;
		ctx.beginPath();
		ctx.arc(cx, cy, radius, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = '#d8ffff';
		ctx.lineWidth = 1.1;
		ctx.stroke();
		ctx.strokeStyle = 'rgba(255,255,255,.45)';
		ctx.lineWidth = 0.9;
		ctx.beginPath();
		ctx.ellipse(cx, cy, radius, radius * 0.36, 0, 0, Math.PI * 2);
		ctx.stroke();
	}
}