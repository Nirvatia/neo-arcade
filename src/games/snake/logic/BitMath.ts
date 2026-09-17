// Линейный индекс клетки в поле шириной cols.
export function cellIndex(col: number, row: number, cols: number): number {
	return row * cols + col;
}

// Индекс слова (элемента Uint32Array), в котором живёт клетка.
export function wordIndex(cellIdx: number): number {
	return cellIdx >> 5;
}

// Индекс бита внутри слова (0..31).
export function bitIndex(cellIdx: number): number {
	return cellIdx & 31;
}

// Сколько слов нужно, чтобы покрыть поле из cols*rows клеток.
export function wordCount(cols: number, rows: number): number {
	return Math.ceil((cols * rows) / 32);
}

// Установить бит клетки.
export function setBit(mask: Uint32Array, cellIdx: number): void {
	mask[wordIndex(cellIdx)] |= 1 << bitIndex(cellIdx);
}

// Очистить бит клетки.
export function clearBit(mask: Uint32Array, cellIdx: number): void {
	mask[wordIndex(cellIdx)] &= ~(1 << bitIndex(cellIdx));
}

// Проверить бит клетки.
export function testBit(mask: Uint32Array, cellIdx: number): boolean {
	return (mask[wordIndex(cellIdx)] & (1 << bitIndex(cellIdx))) !== 0;
}

// Инвертировать бит клетки.
export function toggleBit(mask: Uint32Array, cellIdx: number): void {
	mask[wordIndex(cellIdx)] ^= 1 << bitIndex(cellIdx);
}
