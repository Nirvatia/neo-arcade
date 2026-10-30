import type { FruitService } from '../../../logic/bonuses/FruitService';
import type { FruitKind } from '../../../logic/bonuses/fruitCatalog';
import { FRUIT } from '../../../logic/bonuses/fruitCatalog';
import type { GridLayout } from '../../maze/GridView';
import type { CollectibleArt } from '../collectibleSprite';
import { drawCollectible } from '../collectibleSprite';
import { CHERRY_ART } from './CherryView';
import { STRAWBERRY_ART } from './StrawberryView';
import { ORANGE_ART } from './OrangeView';
import { PRETZEL_ART } from './PretzelView';
import { APPLE_ART } from './AppleView';
import { PEAR_ART } from './PearView';
import { MELON_ART } from './MelonView';
import { GALAXIAN_ART } from './GalaxianView';
import { BELL_ART } from './BellView';
import { KEY_ART } from './KeyView';

/** Every fruit's art: the owner's mock-ups. */
const ART: Record<FruitKind, CollectibleArt> = {
	[FRUIT.CHERRY]: CHERRY_ART,
	[FRUIT.STRAWBERRY]: STRAWBERRY_ART,
	[FRUIT.ORANGE]: ORANGE_ART,
	[FRUIT.PRETZEL]: PRETZEL_ART,
	[FRUIT.APPLE]: APPLE_ART,
	[FRUIT.PEAR]: PEAR_ART,
	[FRUIT.MELON]: MELON_ART,
	[FRUIT.GALAXIAN]: GALAXIAN_ART,
	[FRUIT.BELL]: BELL_ART,
	[FRUIT.KEY]: KEY_ART
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
	drawCollectible(ctx, ART[kind], x, y, tileSize, time);
}
