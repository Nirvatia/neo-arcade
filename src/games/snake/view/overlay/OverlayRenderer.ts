import { DirectorState, type DirectorStateType } from '../../core/Events.js';
import { MonoFont } from '../Palette.js';
import { Graphics, Text, TextStyle, Container } from 'pixi.js';
import type { BiomeManager, OverlayPalette } from '../../biomes/index.js';

export class OverlayRenderer {
	private readonly overlay: Graphics;
	private readonly overlayLayer: Container;
	private readonly biomeManager: BiomeManager;

	private readonly mainText: Text;
	private readonly scoreText: Text;
	private readonly subText: Text;
	private readonly divider: Graphics;

	private state: DirectorStateType = DirectorState.MENU;
	private lastOverlayState: DirectorStateType | null = null;
	private time = 0;
	private score = 0;
	private isNewRecord = false;

	constructor(
		overlay: Graphics,
		overlayLayer: Container,
		biomeManager: BiomeManager
	) {
		this.overlay = overlay;
		this.overlayLayer = overlayLayer;
		this.biomeManager = biomeManager;

		this.divider = new Graphics();

		this.mainText = new Text({
			text: '',
			style: new TextStyle({
				fontFamily: MonoFont.FAMILY,
				fontSize: 32,
				fontWeight: '700',
				fill: 0xffffff,
				letterSpacing: 8
			})
		});

		this.scoreText = new Text({
			text: '',
			style: new TextStyle({
				fontFamily: MonoFont.FAMILY,
				fontSize: 16,
				fontWeight: '600',
				fill: 0xffffff,
				letterSpacing: 3
			})
		});

		this.subText = new Text({
			text: '',
			style: new TextStyle({
				fontFamily: MonoFont.FAMILY,
				fontSize: 13,
				fontWeight: '500',
				fill: 0xffffff,
				letterSpacing: 2
			})
		});

		this.mainText.anchor.set(0.5, 0.5);
		this.scoreText.anchor.set(0.5, 0.5);
		this.subText.anchor.set(0.5, 0.5);

		this.overlayLayer.addChild(this.divider);
		this.overlayLayer.addChild(this.mainText);
		this.overlayLayer.addChild(this.scoreText);
		this.overlayLayer.addChild(this.subText);
	}

	private get overlayPalette(): OverlayPalette {
		return this.biomeManager.biome.overlay;
	}

	public setState(state: DirectorStateType): void {
		this.state = state;
	}

	public setScore(score: number): void {
		this.score = score;
	}

	public setNewRecord(isNew: boolean): void {
		this.isNewRecord = isNew;
	}

	public invalidate(): void {
		this.lastOverlayState = null;
	}

	public update(
		deltaMS: number,
		width: number,
		height: number,
		cellSize: number
	): void {
		this.time = this.time + deltaMS;

		this.overlay.clear();
		this.divider.clear();

		if (
			this.state === DirectorState.PLAYING ||
			this.state === DirectorState.MENU
		) {
			this.overlayLayer.visible = false;
			this.lastOverlayState = this.state;
			return;
		}

		this.overlayLayer.visible = true;

		this.biomeManager.biome.renderOverlay(
			this.overlay,
			width,
			height,
			this.time,
			cellSize
		);

		if (this.lastOverlayState !== this.state) {
			this.lastOverlayState = this.state;
			this.rebuildContent();
		}

		this.layout(width, height);
	}

	private layout(width: number, height: number): void {
		const cx = width / 2;
		const cy = height / 2;
		const base = Math.min(width, height);

		const gap = Math.max(22, Math.min(42, base * 0.065));

		this.mainText.x = cx;
		this.mainText.y = cy - gap * 1.35;

		const lineW = Math.min(220, width * 0.3);
		const lineY = cy - gap * 0.55;

		this.divider
			.moveTo(cx - lineW / 2, lineY)
			.lineTo(cx + lineW / 2, lineY)
			.stroke({
				color: this.overlayPalette.accent,
				width: 1,
				alpha: 0.35
			});

		this.scoreText.x = cx;
		this.scoreText.y = cy + gap * 0.15;

		this.subText.x = cx;
		this.subText.y = cy + gap * 0.95;
	}

	private rebuildContent(): void {
		const op = this.overlayPalette;

		const scoreStr = String(this.score).padStart(6, '0');
		const recordLabel = this.isNewRecord ? ' · NEW RECORD' : '';

		const mainStyle = this.mainText.style as TextStyle;
		const scoreStyle = this.scoreText.style as TextStyle;
		const subStyle = this.subText.style as TextStyle;

		if (this.state === DirectorState.PAUSED) {
			this.mainText.text = 'PAUSED';
			mainStyle.fill = op.title;
			mainStyle.fontSize = 30;
			mainStyle.letterSpacing = 10;

			this.scoreText.visible = false;

			this.subText.text = 'PRESS SPACE OR ENTER';
			subStyle.fill = op.subtitle;
			subStyle.fontSize = 13;

			return;
		}

		if (this.state === DirectorState.GAME_OVER) {
			this.mainText.text = 'GAME OVER';
			mainStyle.fill = op.warn;
			mainStyle.fontSize = 32;
			mainStyle.letterSpacing = 8;

			this.scoreText.visible = true;
			this.scoreText.text = `SCORE ${scoreStr}${recordLabel}`;
			scoreStyle.fill = this.isNewRecord ? op.accent : op.subtitle;
			scoreStyle.fontSize = 16;

			this.subText.text = 'PRESS ENTER TO RESTART';
			subStyle.fill = op.subtitle;
			subStyle.fontSize = 13;

			return;
		}

		if (this.state === DirectorState.VICTORY) {
			this.mainText.text = 'MEMORY COMPLETE';
			mainStyle.fill = op.success;
			mainStyle.fontSize = 28;
			mainStyle.letterSpacing = 6;

			this.scoreText.visible = true;
			this.scoreText.text = `SCORE ${scoreStr}${recordLabel}`;
			scoreStyle.fill = this.isNewRecord ? op.accent : op.subtitle;
			scoreStyle.fontSize = 16;

			this.subText.text = 'PRESS ENTER FOR ENDLESS MODE';
			subStyle.fill = op.subtitle;
			subStyle.fontSize = 13;
		}
	}

	public dispose(): void {
		this.mainText.destroy();
		this.scoreText.destroy();
		this.subText.destroy();
		this.divider.destroy();
	}
}