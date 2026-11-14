/** Manual render quality: the DPR cap now; the layer budget comes with the scene pass. */
export type RenderQuality = 'low' | 'medium' | 'high';

export const RENDER_QUALITY_DPR_CAP: Readonly<Record<RenderQuality, number>> = {
	low: 1,
	medium: 1.5,
	high: 2
};

export function isRenderQuality(value: unknown): value is RenderQuality {
	return value === 'low' || value === 'medium' || value === 'high';
}

/** The physical pixel ratio the canvas may use at this quality (never above the display's own). */
export function pixelRatioFor(deviceRatio: number, quality: RenderQuality): number {
	const display = Number.isFinite(deviceRatio) && deviceRatio > 0 ? deviceRatio : 1;
	const cap = RENDER_QUALITY_DPR_CAP[quality] ?? RENDER_QUALITY_DPR_CAP.high;
	return Math.min(display, cap);
}
