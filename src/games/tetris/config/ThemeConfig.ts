export interface PieceThemeColor {
	base: string;
	glow: string;
}

export interface TetrisTheme {
	frame: string;
	playfield: string;
	gridLine: string;
	overlay: string;
	textPrimary: string;
	textDim: string;
	ghostFillAlpha: number;
	ghostLineAlpha: number;
	clearFlash: string;
	pieceColors: Record<number, PieceThemeColor>;
}

export const THEME: TetrisTheme = {
	frame: '#150505',
	playfield: '#230909',
	gridLine: 'rgba(238, 220, 180, 0.07)',
	overlay: 'rgba(22, 11, 8, 0.84)',
	textPrimary: '#EDE3CB',
	textDim: 'rgba(237, 227, 203, 0.6)',
	ghostFillAlpha: 0.22,
	ghostLineAlpha: 0.75,
	clearFlash: '#FFF4D6',
	pieceColors: {
		1: { base: '#E9DFC6', glow: '#E9DFC6' },
		2: { base: '#E3A72F', glow: '#E3A72F' },
		3: { base: '#C8322B', glow: '#C8322B' },
		4: { base: '#7D9C55', glow: '#7D9C55' },
		5: { base: '#DB6A2B', glow: '#DB6A2B' },
		6: { base: '#4E86A6', glow: '#4E86A6' },
		7: { base: '#B0527D', glow: '#B0527D' }
	}
};
