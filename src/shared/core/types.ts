export const GameStatus = {
	AVAILABLE: 'AVAILABLE',
	COMING_SOON: 'COMING_SOON',
	IN_DEVELOPMENT: 'IN_DEVELOPMENT'
} as const;
export type GameStatusType = (typeof GameStatus)[keyof typeof GameStatus];

export interface GameModule {
	init(canvasParent: HTMLDivElement): Promise<void>;
	destroy(): void;
}

export interface Game {
	name: string;
	genre: string;
	route: string;
	status: GameStatusType;
	score: string;
	progress?: number; // для IN_DEVELOPMENT
}

export const GAMES: Game[] = [
	{
		name: 'SNAKE',
		genre: 'PUZZLE',
		route: '/games/snake',
		status: GameStatus.AVAILABLE,
		score: '100000'
	},
	{
		name: 'PAC-MAN',
		genre: 'MAZE',
		route: '/games/pacman',
		status: GameStatus.IN_DEVELOPMENT,
		score: '062000',
		progress: 62
	},
	{
		name: 'BREAKOUT',
		genre: 'ACTION',
		route: '/games/breakout',
		status: GameStatus.COMING_SOON,
		score: '------'
	},
	{
		name: 'TETRIS',
		genre: 'PUZZLE',
		route: '/games/tetris',
		status: GameStatus.COMING_SOON,
		score: '------'
	},
	{
		name: 'STAR DUST',
		genre: 'SHMUP',
		route: '/games/stardust',
		status: GameStatus.COMING_SOON,
		score: '------'
	},
	{
		name: 'PUZZLE LOOP',
		genre: 'PUZZLE',
		route: '/games/puzzleloop',
		status: GameStatus.IN_DEVELOPMENT,
		score: '034000',
		progress: 34
	},
	{
		name: 'RALLY X',
		genre: 'RACING',
		route: '/games/rallyx',
		status: GameStatus.COMING_SOON,
		score: '------'
	},
	{
		name: 'FROG RUN',
		genre: 'ARCADE',
		route: '/games/frogrun',
		status: GameStatus.COMING_SOON,
		score: '------'
	},
	{
		name: 'DUNGEON BIT',
		genre: 'ROGUELIKE',
		route: '/games/dungeonbit',
		status: GameStatus.COMING_SOON,
		score: '------'
	},
	{
		name: 'BIT FIGHTER',
		genre: 'VERSUS',
		route: '/games/bitfighter',
		status: GameStatus.COMING_SOON,
		score: '------'
	},
	{
		name: 'CYBER DASH',
		genre: 'RUNNER',
		route: '/games/cyberdash',
		status: GameStatus.COMING_SOON,
		score: '------'
	},
	{
		name: 'VOID RUNNER',
		genre: 'SPACE',
		route: '/games/voidrunner',
		status: GameStatus.COMING_SOON,
		score: '------'
	}
];
