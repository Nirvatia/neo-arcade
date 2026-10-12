export interface FxState {
	flash: { text: string; key: number } | null;
	banner: { text: string; key: number } | null;
	shake: number;
}

export const tetrisFx = $state<FxState>({
	flash: null,
	banner: null,
	shake: 0
});

export function triggerFlash(text: string): void {
	tetrisFx.flash = { text, key: (tetrisFx.flash ? tetrisFx.flash.key : 0) + 1 };
}

export function triggerBanner(text: string): void {
	tetrisFx.banner = { text, key: (tetrisFx.banner ? tetrisFx.banner.key : 0) + 1 };
}

export function triggerShake(): void {
	tetrisFx.shake += 1;
}