export const GameplayConfig = {
	INITIAL_SNAKE_LENGTH: 3,
	MIN_SNAKE_LENGTH: 3,
	TARGET_FOOD_COUNT: 5,
	MAX_INPUT_QUEUE: 3,
	MAX_DELTA_MS: 200,
	// Цикл.
	FIXED_STEP_MS: 1000 / 60,
	// Очки.
	// Очки начисляются только за успешные последовательности,
	// комбо и бонусы за безошибочность/переход в новый биом.
	POINTS_PER_SEQUENCE: 100,
	POINTS_FLAWLESS_BONUS: 50,
	POINTS_BIOME_BONUS: 500,
	COMBO_MAX_MULTIPLIER: 4,
	// Рост змейки только за успешные последовательности.
	GROWTH_PER_SEQUENCE: 1,
	// Битовый регистр.
	FAILURE_TAIL_LOSS: 2,
	MAX_TARGET_ATTEMPTS: 32,
	MAX_SEQUENCE_LENGTH: 8,
	// Битовые токены.
	TOKEN_RESPAWN_COOLDOWN_MS: 4000,
	// Органика еды.
	FOOD_WANDER_SPEED_CELLS_PER_S: 0.9,
	FOOD_FLEE_SPEED_CELLS_PER_S: 2.25,
	FOOD_ACCEL_PER_S: 7.5,
	FOOD_FLEE_RADIUS: 2.2,
	FOOD_FLEE_COOLDOWN_MS: 1200,
	FOOD_RETARGET_MIN_MS: 700,
	FOOD_RETARGET_MAX_MS: 2200,
	// Уровень и выход.
	MAX_EXIT_SPAWN_ATTEMPTS: 200,
	EXIT_MARGIN: 2,
	// Стражи спавна.
	REFILL_GUARD: 1000,
	MAX_FIND_ATTEMPTS: 200,
	// Анимация смерти.
	DEATH_MS_PER_SEGMENT: 55,
	DEATH_MIN_MS: 450,
	DEATH_MAX_MS: 1400
} as const;
export type GameplayConfigType = typeof GameplayConfig;