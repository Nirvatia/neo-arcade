export type KickDirection = '0->1' | '1->2' | '2->3' | '3->0';
export type KickOffsets = [number, number][];

export const WALL_KICKS_JLSTZ: Record<KickDirection, KickOffsets> = {
	'0->1': [[-1, 0], [-1, -1], [0, 2], [-1, 2]],
	'1->2': [[1, 0], [1, 1], [0, -2], [1, -2]],
	'2->3': [[1, 0], [1, -1], [0, 2], [1, 2]],
	'3->0': [[-1, 0], [-1, 1], [0, -2], [-1, -2]]
};

export const WALL_KICKS_I: Record<KickDirection, KickOffsets> = {
	'0->1': [[-2, 0], [1, 0], [-2, -1], [1, 2]],
	'1->2': [[-1, 0], [2, 0], [-1, 2], [2, -1]],
	'2->3': [[2, 0], [-1, 0], [2, -1], [-1, 2]],
	'3->0': [[1, 0], [-2, 0], [1, 2], [-2, -1]]
};