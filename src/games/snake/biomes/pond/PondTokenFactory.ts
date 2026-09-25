import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { BitOp } from '../../components/index.js';
import type { TokenVisualFactory } from '../renderers.js';
import { MonoFont } from '../../view/Palette.js';
import { POND_PALETTE, C } from './PondPalette.js';

const TOKEN_GLYPHS: Record<BitOp, string> = {
	'<<': '<<',
	'>>': '>>'
};

export class PondTokenFactory implements TokenVisualFactory {
	public create(op: BitOp, cellSize: number): Container {
		const container = new Container();
		const block = new Graphics();

		const inset = 5;
		const size = cellSize - inset * 2;

		block.rect(inset, inset, size, size).fill(POND_PALETTE.form);
		block.rect(inset, inset, size, size).stroke({ color: C.accent, width: 1.5 });

		container.addChild(block);

		const label = new Text({
			text: TOKEN_GLYPHS[op],
			style: new TextStyle({
				fontFamily: MonoFont.FAMILY,
				fontSize: Math.max(10, Math.round(cellSize * 0.38)),
				fontWeight: '700',
				fill: 0x1e2816
			})
		});

		label.anchor.set(0.5, 0.5);
		label.x = cellSize / 2;
		label.y = cellSize / 2;

		container.addChild(label);

		return container;
	}
}