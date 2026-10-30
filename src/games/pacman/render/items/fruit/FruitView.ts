import type { FruitService } from '../../../logic/bonuses/FruitService';
import type { FruitKind } from '../../../logic/bonuses/fruitCatalog';
import { FRUIT } from '../../../logic/bonuses/fruitCatalog';
import type { GridLayout } from '../../maze/GridView';
import type { CollectibleArt } from '../collectibleSprite';
import { drawCollectible, fruitMotion } from '../collectibleSprite';
import { CHERRY_ART } from './CherryView';
import { drawStrawberry } from './StrawberryView';
import { drawOrange } from './OrangeView';
import { drawPretzel } from './PretzelView';
import { APPLE_ART } from './AppleView';
import { drawPear } from './PearView';
import { drawMelon } from './MelonView';
import { GALAXIAN_ART } from './GalaxianView';
import { BELL_ART } from './BellView';
import { drawKey } from './KeyView';

/** The larger side of a fruit (without its glow), in tiles. */
export const FRUIT_EXTENT = 0.9;

/** Fruit with the owner's art; the rest are stubs on the shared primitive until theirs arrive. */
const ART: Partial<Record<FruitKind, CollectibleArt>> = {
	[FRUIT.CHERRY]: CHERRY_ART,
	[FRUIT.APPLE]: APPLE_ART,
	[FRUIT.GALAXIAN]: GALAXIAN_ART,
	[FRUIT.BELL]: BELL_ART
};

type StubDraw = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) => void;

const STUBS: Partial<Record<FruitKind, StubDraw>> = {
	[FRUIT.STRAWBERRY]: drawStrawberry,
	[FRUIT.ORANGE]: drawOrange,
	[FRUIT.PRETZEL]: drawPretzel,
	[FRUIT.PEAR]: drawPear,
	[FRUIT.MELON]: drawMelon,
	[FRUIT.KEY]: drawKey
};

export class FruitView {
	draw(ctx: CanvasRenderingContext2D, fruit: FruitService, layout: GridLayout, time: number): void {
		if (!Number.isFinite(layout.tileSize) || layout.tileSize <= 0) {
			console.error('FruitView.draw', 'invalid layout tile size', layout.tileSize);
			return;
		}
		const kind = fruit.active;
		if (!kind) {
			return;
		}
		const position = fruit.position;
		if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
			console.error('FruitView.draw', 'invalid fruit position', position);
			return;
		}
		const x = layout.offsetX + position.x * layout.tileSize;
		const y = layout.offsetY + position.y * layout.tileSize;
		const blinking = fruit.timer < 2 && Math.floor(fruit.timer * 4) % 2 === 0;
		ctx.save();
		if (blinking) {
			ctx.globalAlpha = 0.45;
		}
		drawFruit(ctx, kind, x, y, layout.tileSize, time);
		ctx.restore();
	}
}

/** One fruit centred at (x, y) on a tile of `tileSize` px. */
export function drawFruit(
	ctx: CanvasRenderingContext2D,
	kind: FruitKind,
	x: number,
	y: number,
	tileSize: number,
	time: number
): void {
	const art = ART[kind];
	if (art) {
		drawCollectible(ctx, art, x, y, tileSize * FRUIT_EXTENT, fruitMotion(time));
		return;
	}
	STUBS[kind]?.(ctx, x, y, Math.max(2, tileSize * 0.28));
}
