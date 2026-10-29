import type { FruitService } from '../../../logic/bonuses/FruitService';
import type { FruitKind } from '../../../logic/bonuses/fruitCatalog';
import { FRUIT } from '../../../logic/bonuses/fruitCatalog';
import type { GridLayout } from '../../maze/GridView';
import { drawCherry } from './CherryView';
import { drawStrawberry } from './StrawberryView';
import { drawOrange } from './OrangeView';
import { drawPretzel } from './PretzelView';
import { drawApple } from './AppleView';
import { drawPear } from './PearView';
import { drawMelon } from './MelonView';
import { drawGalaxian } from './GalaxianView';
import { drawBell } from './BellView';
import { drawKey } from './KeyView';

export class FruitView {
	draw(ctx: CanvasRenderingContext2D, fruit: FruitService, layout: GridLayout): void {
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
		const radius = Math.max(2, layout.tileSize * 0.28);
		const blinking = fruit.timer < 2 && Math.floor(fruit.timer * 4) % 2 === 0;
		ctx.save();
		if (blinking) {
			ctx.globalAlpha = 0.45;
		}
		this.drawKind(ctx, kind, x, y, radius);
		ctx.restore();
	}

	private drawKind(
		ctx: CanvasRenderingContext2D,
		kind: FruitKind,
		x: number,
		y: number,
		radius: number
	): void {
		if (kind === FRUIT.CHERRY) {
			drawCherry(ctx, x, y, radius);
			return;
		}
		if (kind === FRUIT.STRAWBERRY) {
			drawStrawberry(ctx, x, y, radius);
			return;
		}
		if (kind === FRUIT.ORANGE) {
			drawOrange(ctx, x, y, radius);
			return;
		}
		if (kind === FRUIT.PRETZEL) {
			drawPretzel(ctx, x, y, radius);
			return;
		}
		if (kind === FRUIT.APPLE) {
			drawApple(ctx, x, y, radius);
			return;
		}
		if (kind === FRUIT.PEAR) {
			drawPear(ctx, x, y, radius);
			return;
		}
		if (kind === FRUIT.MELON) {
			drawMelon(ctx, x, y, radius);
			return;
		}
		if (kind === FRUIT.GALAXIAN) {
			drawGalaxian(ctx, x, y, radius);
			return;
		}
		if (kind === FRUIT.BELL) {
			drawBell(ctx, x, y, radius);
			return;
		}
		drawKey(ctx, x, y, radius);
	}
}
