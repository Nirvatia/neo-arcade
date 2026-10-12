import { TetrisEvents } from '../../core/Events';
import { tetrisBus } from '../../engine/EventBus';
import { SvelteFxAdapter } from '../../ui/fx/SvelteFxAdapter';

export class FxCoordinator {
	private readonly adapter = new SvelteFxAdapter();
	private unsubscribers: Array<() => void> = [];

	attach(): void {
		this.unsubscribers.push(
			tetrisBus.on(TetrisEvents.FLASH, (payload) => {
				if (typeof payload === 'string') {
					this.adapter.flash(payload);
				}
			}),
			tetrisBus.on(TetrisEvents.BANNER, (payload) => {
				if (typeof payload === 'string') {
					this.adapter.banner(payload);
				}
			}),
			tetrisBus.on(TetrisEvents.SHAKE, () => {
				this.adapter.shake();
			})
		);
	}

	destroy(): void {
		for (const unsub of this.unsubscribers) {
			unsub();
		}
		this.unsubscribers = [];
	}
}