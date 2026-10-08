/**
 * FxConfig — тайминги и лимиты эффектов.
 */
export const FxConfig = {
	MAX_PARTICLES: 320,
	FAIL_MS: 400,

	// Анимация смены биома.
	BIOME_TRANSITION_MS: 1600,
	BIOME_TRANSITION_PEAK: 0.5,

	// Эффект успешной последовательности (радиальный импульс от головы).
	SEQUENCE_PULSE_MS: 620,
	SEQUENCE_RING_COUNT: 3,
	SEQUENCE_SPARK_COUNT: 10
} as const;

export type FxConfigType = typeof FxConfig;