import { Container, Graphics } from 'pixi.js';
import type { BitOp } from '../../components/index.js';
import type { TokenVisualFactory } from '../renderers.js';
import { C } from './LunarPalette.js';

export class LunarTokenFactory implements TokenVisualFactory {
	public create(op: BitOp, cellSize: number): Container {
		const container = new Container();
		const g = new Graphics();
		const cx = cellSize / 2;
		const cy = cellSize / 2;
		const isRight = op === '>>';
		const mainColor = isRight ? C.tokenRight : C.tokenLeft;
		const hiColor = isRight ? C.tokenRightHi : C.tokenLeftHi;
		const darkBg = isRight ? 0x4a3a1a : 0x3a2a5a;
		const darkBgEdge = isRight ? 0x2a2010 : 0x201840;

		// Тень под токеном.
		g.ellipse(cx, cy + 9, 8, 2.4).fill({ color: C.fish, alpha: 0.3 });

		// Фон токена (скруглённый квадрат с градиентом).
		const inset = cellSize * 0.18;
		const size = cellSize - inset * 2;
		g.roundRect(inset, inset, size, size, cellSize * 0.18)
			.fill(darkBg)
			.stroke({ color: mainColor, width: 1.5, alpha: 0.9 });

		// Блик сверху.
		g.roundRect(inset + 2, inset + 2, size - 4, size * 0.35, cellSize * 0.1).fill({
			color: 0xffffff,
			alpha: 0.12
		});

		// Шевроны.
		const chevronOffset = cellSize * 0.14;
		g.stroke({ color: mainColor, width: 3, alpha: 0.95 });
		if (isRight) {
			// >> : два шеврона вправо.
			for (const offset of [-chevronOffset, chevronOffset * 0.5]) {
				g.moveTo(cx + offset - 2, cy - 5)
					.lineTo(cx + offset + 4, cy)
					.lineTo(cx + offset - 2, cy + 5);
			}
		} else {
			// << : два шеврона влево.
			for (const offset of [-chevronOffset * 0.5, chevronOffset]) {
				g.moveTo(cx + offset + 2, cy - 5)
					.lineTo(cx + offset - 4, cy)
					.lineTo(cx + offset + 2, cy + 5);
			}
		}

		// Точка-блик в центре.
		g.circle(cx, cy, 1.5).fill({ color: hiColor, alpha: 0.8 });

		container.addChild(g);
		return container;
	}
}