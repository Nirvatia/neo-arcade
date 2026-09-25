export interface FoodWander {
	/** Смещение от центра клетки (интерполяция между клетками). */
	offsetX: number;
	offsetY: number;
	/** Целевая клетка (куда движется). */
	targetCol: number;
	targetRow: number;
	/** Время до следующего шага (мс). */
	stepTimerMS: number;
	/** Скорость шага (интерполяция в [0,1]). */
	stepProgress: number;
	/** Фаза анимации покачивания. */
	phase: number;
	/** Кулдаун отпугивания от змейки. */
	startleCdMS: number;
}