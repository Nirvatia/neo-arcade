/**
 * FxConfig — тайминги и лимиты эффектов.
 */
export const FxConfig = {
	MAX_PARTICLES: 320,
	WAVE_MS: 550,
	FAIL_MS: 400
} as const;
export type FxConfigType = typeof FxConfig;