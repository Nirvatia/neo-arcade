import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { Direction } from '../components/index.js';
import { Palette, MonoFont } from './Palette.js';

export interface SnakeSegmentRender {
	col: number;
	row: number;
	bit: 0 | 1;
	order: number;
	active: boolean;
}

const INSET = 1;
const RADIUS = 3;
const FONT_SIZE = 17;

export class SnakeView {
	public readonly container: Container;
	private readonly graphics: Graphics;
	private readonly digitLayer: Container;
	private readonly texts: Text[] = [];
	private readonly styleInk: TextStyle;
	private readonly styleLight: TextStyle;
	private readonly styleHead: TextStyle;
	private readonly cellSize: number;

	constructor(cellSize: number) {
		this.cellSize = cellSize;
		this.container = new Container();
		this.graphics = new Graphics();
		this.digitLayer = new Container();
		this.styleInk = this.buildStyle(Palette.ink);
		this.styleLight = this.buildStyle(Palette.light);
		this.styleHead = this.buildStyle(Palette.headInk);
		this.container.addChild(this.graphics);
		this.container.addChild(this.digitLayer);
	}

	public render(segments: SnakeSegmentRender[], _headDir?: Direction): void {
		this.graphics.clear();
		let textIndex = 0;
		for (const segment of segments) {
			const x = segment.col * this.cellSize + INSET;
			const y = segment.row * this.cellSize + INSET;
			const size = this.cellSize - INSET * 2;
			if (segment.order === 0) {
				this.graphics.roundRect(x - 2, y - 2, size + 4, size + 4, RADIUS + 1);
				this.graphics.fill({ color: Palette.coral, alpha: 0.18 });
				this.graphics.roundRect(x, y, size, size, RADIUS);
				this.graphics.fill(Palette.coral);
				textIndex = this.placeDigit(
					textIndex,
					segment.bit,
					x + size / 2,
					y + size / 2,
					this.styleHead
				);
				continue;
			}
			if (!segment.active) {
				// Хвост: лёгкое заполнение + контур, чтобы было видно на тёмном фоне.
				this.graphics.roundRect(x + 0.5, y + 0.5, size - 1, size - 1, RADIUS);
				this.graphics.fill({ color: Palette.tail, alpha: 0.22 });
				this.graphics.roundRect(x + 0.5, y + 0.5, size - 1, size - 1, RADIUS);
				this.graphics.stroke({ color: Palette.tail, width: 1.5 });
				continue;
			}
			if (segment.bit === 1) {
				this.graphics.roundRect(x, y, size, size, RADIUS);
				this.graphics.fill(Palette.light);
				textIndex = this.placeDigit(textIndex, 1, x + size / 2, y + size / 2, this.styleInk);
			} else {
				this.graphics.roundRect(x, y, size, size, RADIUS);
				this.graphics.fill(Palette.dark);
				this.graphics.roundRect(x + 1, y + 1, size - 2, size - 2, RADIUS - 1);
				this.graphics.stroke({ color: Palette.gray, width: 1 });
				textIndex = this.placeDigit(textIndex, 0, x + size / 2, y + size / 2, this.styleLight);
			}
		}
		for (let i = textIndex; i < this.texts.length; i++) {
			const text = this.texts[i];
			if (text !== undefined) {
				text.visible = false;
			}
		}
	}

	private placeDigit(index: number, bit: 0 | 1, cx: number, cy: number, style: TextStyle): number {
		let text = this.texts[index];
		if (text === undefined) {
			text = new Text({ text: '', style });
			text.anchor.set(0.5, 0.5);
			this.digitLayer.addChild(text);
			this.texts.push(text);
		}
		text.style = style;
		text.text = bit === 1 ? '1' : '0';
		text.x = cx;
		text.y = cy;
		text.visible = true;
		return index + 1;
	}

	private buildStyle(fill: number): TextStyle {
		return new TextStyle({
			fontFamily: MonoFont.FAMILY,
			fontSize: FONT_SIZE,
			fontWeight: '700',
			fill
		});
	}
}
