export const PaletteConfig = {
	BIT_ZERO: 0x60a8e0,
	BIT_ONE: 0xe07850,
	SNAKE_HEAD: 0xe0fbf4,
	SNAKE_BODY_ONE: 0x64c8b0,
	SNAKE_BODY_ZERO: 0x3a806c,
	WALL: 0x1a3a5c,
	EXIT_LOCKED: 0x4a3b63,
	EXIT_OPEN: 0xcc66ff,
	TOKEN: 0xf5d76e
} as const;

export type PaletteConfigType = typeof PaletteConfig;
