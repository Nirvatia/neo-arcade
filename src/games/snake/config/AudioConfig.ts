/**
 * AudioConfig — пути к аудио-ассетам.
 */
export const AudioConfig = {
	MUSIC_SRC: '/assets/snake/music/theme.mp3'
} as const;
export type AudioConfigType = typeof AudioConfig;