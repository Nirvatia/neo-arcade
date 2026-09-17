// src/shared/utils/scoreStore.ts

const STORAGE_PREFIX = 'neo_arcade_score_';

/**
 * Форматирует числовое значение очков в аркадный вид с 6 цифрами (например: 450 -> "000450").
 */
export function formatArcadeScore(score: number): string {
	if (isNaN(score) || score < 0) return '000000';
	return String(score).padStart(6, '0');
}

/**
 * Читает High Score игры из localStorage.
 */
export function getSavedScore(gameId: string, defaultScore: string | number = '000000'): string {
	if (typeof window === 'undefined') {
		return typeof defaultScore === 'number' ? formatArcadeScore(defaultScore) : defaultScore;
	}

	try {
		const raw = localStorage.getItem(`${STORAGE_PREFIX}${gameId}`);
		if (raw !== null) {
			const parsed = parseInt(raw, 10);
			if (!isNaN(parsed)) {
				return formatArcadeScore(parsed);
			}
		}
	} catch (e) {
		console.warn(`[ScoreStore] Failed to read score for ${gameId}`, e);
	}

	return typeof defaultScore === 'number' ? formatArcadeScore(defaultScore) : String(defaultScore);
}

/**
 * Сохраняет новый рекорд в localStorage (если он больше текущего).
 */
export function saveScore(gameId: string, newScore: number): boolean {
	if (typeof window === 'undefined') return false;

	try {
		const currentRaw = localStorage.getItem(`${STORAGE_PREFIX}${gameId}`);
		const currentScore = currentRaw ? parseInt(currentRaw, 10) : 0;

		if (newScore > currentScore) {
			localStorage.setItem(`${STORAGE_PREFIX}${gameId}`, String(newScore));
			return true; // Новый рекорд сохранен
		}
	} catch (e) {
		console.warn(`[ScoreStore] Failed to save score for ${gameId}`, e);
	}

	return false;
}
