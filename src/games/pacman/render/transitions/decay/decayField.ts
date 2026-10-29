import type { GridMatrix } from '../../../config/gridConfig';

/** Tiles of open ground kept around the maze so the decay also crosses the meadow. */
export const DECAY_MARGIN = 32;

/** Walking costs: the decay runs along corridors, soaks slowly through walls. */
const COST_CORRIDOR = 1;
const COST_LAIR = 1.25;
const COST_OPEN = 2.4;
const COST_WALL = 5;
/** Beyond the stored field the distance keeps growing at the open-ground rate. */
export const DECAY_OUTSIDE_RATE = COST_OPEN;

/**
 * Geodesic distance (in cost-weighted tiles) from one maze tile to every cell of the maze
 * plus a DECAY_MARGIN ring. Cell (i, j) of the field is maze tile (i - margin, j - margin).
 */
export interface DecayField {
	readonly cols: number;
	readonly rows: number;
	readonly margin: number;
	readonly dist: Float64Array;
	readonly max: number;
}

function tileCost(grid: GridMatrix, r: number, c: number): number {
	const row = grid[r];
	if (!row || c < 0 || c >= row.length) {
		return COST_OPEN;
	}
	const t = row[c];
	if (t === 'WL') {
		return COST_WALL;
	}
	if (t === 'ES') {
		return COST_OPEN;
	}
	if (
		t === 'LT' ||
		t === 'LE' ||
		t === 'BY' ||
		t === 'PY' ||
		t === 'IY' ||
		t === 'CE' ||
		t === 'DB'
	) {
		return COST_LAIR;
	}
	return COST_CORRIDOR;
}

/** Dijkstra over 8 neighbours; diagonals may not cut wall corners. */
export function computeDecayField(grid: GridMatrix, originX: number, originY: number): DecayField {
	const margin = DECAY_MARGIN;
	const rowsIn = grid.length;
	const colsIn = rowsIn > 0 ? grid[0].length : 0;
	const rows = rowsIn + 2 * margin;
	const cols = colsIn + 2 * margin;
	const cost = new Float64Array(rows * cols);
	for (let r = 0; r < rows; r++) {
		for (let c = 0; c < cols; c++) {
			cost[r * cols + c] = tileCost(grid, r - margin, c - margin);
		}
	}
	// Float64 on purpose: float32 rounds the stored key below the queued one and the
	// "stale entry" check then drops live nodes.
	const dist = new Float64Array(rows * cols).fill(Infinity);
	const heapD: number[] = [];
	const heapI: number[] = [];
	const push = (d: number, i: number) => {
		heapD.push(d);
		heapI.push(i);
		let k = heapD.length - 1;
		while (k > 0) {
			const p = (k - 1) >> 1;
			if (heapD[p] <= heapD[k]) {
				break;
			}
			[heapD[p], heapD[k]] = [heapD[k], heapD[p]];
			[heapI[p], heapI[k]] = [heapI[k], heapI[p]];
			k = p;
		}
	};
	const pop = (): [number, number] => {
		const top: [number, number] = [heapD[0], heapI[0]];
		const lastD = heapD.pop() as number;
		const lastI = heapI.pop() as number;
		if (heapD.length > 0) {
			heapD[0] = lastD;
			heapI[0] = lastI;
			let k = 0;
			for (;;) {
				const l = 2 * k + 1;
				const r = l + 1;
				let m = k;
				if (l < heapD.length && heapD[l] < heapD[m]) {
					m = l;
				}
				if (r < heapD.length && heapD[r] < heapD[m]) {
					m = r;
				}
				if (m === k) {
					break;
				}
				[heapD[m], heapD[k]] = [heapD[k], heapD[m]];
				[heapI[m], heapI[k]] = [heapI[k], heapI[m]];
				k = m;
			}
		}
		return top;
	};
	const or = Math.min(rows - 1, Math.max(0, Math.floor(originY) + margin));
	const oc = Math.min(cols - 1, Math.max(0, Math.floor(originX) + margin));
	dist[or * cols + oc] = 0;
	push(0, or * cols + oc);
	while (heapD.length > 0) {
		const [d, i] = pop();
		if (d > dist[i]) {
			continue;
		}
		const r = (i / cols) | 0;
		const c = i % cols;
		for (let dr = -1; dr <= 1; dr++) {
			for (let dc = -1; dc <= 1; dc++) {
				if (!dr && !dc) {
					continue;
				}
				const r2 = r + dr;
				const c2 = c + dc;
				if (r2 < 0 || c2 < 0 || r2 >= rows || c2 >= cols) {
					continue;
				}
				if (
					dr &&
					dc &&
					(cost[(r + dr) * cols + c] >= COST_WALL || cost[r * cols + c + dc] >= COST_WALL)
				) {
					continue;
				}
				const j = r2 * cols + c2;
				const nd = d + ((cost[i] + cost[j]) / 2) * (dr && dc ? Math.SQRT2 : 1);
				if (nd < dist[j]) {
					dist[j] = nd;
					push(nd, j);
				}
			}
		}
	}
	let max = 0;
	for (const v of dist) {
		if (v > max) {
			max = v;
		}
	}
	return { cols, rows, margin, dist, max };
}

/**
 * Distance at a point in tile coordinates (tile (c, r) has its centre at (c + 0.5, r + 0.5)),
 * bilinear between tile centres and extended past the stored ring. Mirrors the shader.
 */
export function sampleDecayField(field: DecayField, tx: number, ty: number): number {
	const gx = tx + field.margin - 0.5;
	const gy = ty + field.margin - 0.5;
	const cx = Math.min(field.cols - 1, Math.max(0, gx));
	const cy = Math.min(field.rows - 1, Math.max(0, gy));
	const extra = Math.hypot(gx - cx, gy - cy) * DECAY_OUTSIDE_RATE;
	const ix = Math.min(field.cols - 2, Math.floor(cx));
	const iy = Math.min(field.rows - 2, Math.floor(cy));
	const fx = cx - ix;
	const fy = cy - iy;
	const d = (r: number, c: number) => field.dist[r * field.cols + c];
	return (
		(d(iy, ix) * (1 - fx) + d(iy, ix + 1) * fx) * (1 - fy) +
		(d(iy + 1, ix) * (1 - fx) + d(iy + 1, ix + 1) * fx) * fy +
		extra
	);
}

/**
 * Two fields in one RGBA8 texture: R+G hold the death field and B+A the respawn field,
 * each as a 16-bit fraction of its own maximum (high byte, low byte).
 */
export function packDecayFields(death: DecayField, respawn: DecayField): Uint8Array {
	const n = death.cols * death.rows;
	const data = new Uint8Array(n * 4);
	const put = (field: DecayField, i: number, o: number) => {
		const x = Math.min(254.999, (field.dist[i] / field.max) * 255);
		const hi = Math.floor(x);
		data[i * 4 + o] = hi;
		data[i * 4 + o + 1] = Math.floor((x - hi) * 255);
	};
	for (let i = 0; i < n; i++) {
		put(death, i, 0);
		put(respawn, i, 2);
	}
	return data;
}
