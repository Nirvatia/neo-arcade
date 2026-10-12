import { triggerFlash, triggerBanner, triggerShake } from './fxStore.svelte.ts';

export class SvelteFxAdapter {
	flash(text: string): void {
		triggerFlash(text);
	}
	banner(text: string): void {
		triggerBanner(text);
	}
	shake(): void {
		triggerShake();
	}
}