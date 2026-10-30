// Painting kit for the collectibles' textures (stage 10.1): every item is designed on a
// 256-unit square around its centre, with a wide dark outline under all its parts (the fills
// cover the inner lines, so only the silhouette keeps it) and a few white glints. The
// outline is what keeps an item readable once it is shrunk to a tile on a busy season.

/** Units across the design square. */
export const ITEM_UNITS = 256;

/** The outline's width in design units: wide enough to survive the downscale to a tile. */
export const ITEM_OUTLINE = 14;

/** Starts a design on a size × size texture: origin at the centre, 256 units across. */
export function beginItem(ctx: CanvasRenderingContext2D, size: number): void {
	ctx.save();
	ctx.translate(size / 2, size / 2);
	ctx.scale(size / ITEM_UNITS, size / ITEM_UNITS);
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';
}

/** Strokes every part wide in `color`: the silhouette's outline once the parts are filled. */
export function outline(
	ctx: CanvasRenderingContext2D,
	parts: ReadonlyArray<() => void>,
	color: string,
	width: number = ITEM_OUTLINE
): void {
	ctx.strokeStyle = color;
	ctx.lineWidth = width;
	for (const part of parts) {
		part();
		ctx.stroke();
	}
}

/** A soft white highlight: an ellipse fading out from its centre. */
export function gloss(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	rx: number,
	ry: number,
	rotation = 0,
	alpha = 0.9
): void {
	const r = Math.max(rx, ry);
	const g = ctx.createRadialGradient(x, y, 0, x, y, r);
	g.addColorStop(0, `rgba(255,255,255,${alpha})`);
	g.addColorStop(1, 'rgba(255,255,255,0)');
	ctx.fillStyle = g;
	ctx.beginPath();
	ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
	ctx.fill();
}

/** A four-pointed white glint, `r` the core size (the points reach 3r). */
export function sparkle(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	r: number,
	glow: string
): void {
	ctx.save();
	ctx.fillStyle = 'rgba(255,255,255,0.95)';
	ctx.shadowBlur = 6;
	ctx.shadowColor = glow;
	ctx.beginPath();
	ctx.moveTo(x, y - r * 3);
	ctx.lineTo(x + r * 0.7, y - r * 0.7);
	ctx.lineTo(x + r * 3, y);
	ctx.lineTo(x + r * 0.7, y + r * 0.7);
	ctx.lineTo(x, y + r * 3);
	ctx.lineTo(x - r * 0.7, y + r * 0.7);
	ctx.lineTo(x - r * 3, y);
	ctx.lineTo(x - r * 0.7, y - r * 0.7);
	ctx.closePath();
	ctx.fill();
	ctx.restore();
}
