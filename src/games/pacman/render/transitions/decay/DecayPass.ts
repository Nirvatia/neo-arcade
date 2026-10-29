import { DECAY_FRAGMENT, DECAY_VERTEX } from './decayShader';

/** Colours of the abyss and the fronts, as 0xRRGGBB. */
export interface DecayPalette {
	readonly deep: number;
	readonly mid: number;
	readonly wisp: number;
	readonly ice: number;
	readonly rim: number;
	readonly warm: number;
}

export interface DecayUniforms {
	/** Viewport in CSS px. */
	readonly width: number;
	readonly height: number;
	/** Board origin (css px), css px per world unit, world units per tile. */
	readonly originX: number;
	readonly originY: number;
	readonly worldScale: number;
	readonly tileWorld: number;
	readonly front: number;
	readonly rebuild: number;
	readonly shock: number;
	readonly time: number;
	readonly epicX: number;
	readonly epicY: number;
	readonly palette: DecayPalette;
}

const UNIFORMS = [
	'uScene',
	'uDist',
	'uSizePx',
	'uScenePx',
	'uWorld',
	'uDistSize',
	'uMargin',
	'uDMax',
	'uFront',
	'uRebuild',
	'uTime',
	'uShock',
	'uEpic',
	'uDeep',
	'uMid',
	'uWisp',
	'uIce',
	'uRim',
	'uWarm'
] as const;

type UniformName = (typeof UNIFORMS)[number];

const rgb = (hex: number): [number, number, number] => [
	((hex >> 16) & 255) / 255,
	((hex >> 8) & 255) / 255,
	(hex & 255) / 255
];

/**
 * WebGL2 wrapper for the decay shader: uploads the rendered world layer as a texture each
 * frame (only while the effect runs) and draws the decayed frame into its own canvas.
 * `create()` returns null when WebGL2 is unavailable or the shader fails to build.
 */
export class DecayPass {
	readonly canvas: HTMLCanvasElement;
	private readonly gl: WebGL2RenderingContext;
	private readonly loc: Record<UniformName, WebGLUniformLocation | null>;
	private readonly sceneTex: WebGLTexture;
	private readonly distTex: WebGLTexture;
	private distCols = 1;
	private distRows = 1;
	private distMargin = 0;
	private distMax: [number, number] = [1, 1];

	private constructor(
		canvas: HTMLCanvasElement,
		gl: WebGL2RenderingContext,
		program: WebGLProgram
	) {
		this.canvas = canvas;
		this.gl = gl;
		gl.useProgram(program);
		const buf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buf);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
		const loc = {} as Record<UniformName, WebGLUniformLocation | null>;
		for (const name of UNIFORMS) {
			loc[name] = gl.getUniformLocation(program, name);
		}
		this.loc = loc;
		this.sceneTex = DecayPass.texture(gl, gl.LINEAR);
		this.distTex = DecayPass.texture(gl, gl.NEAREST);
		gl.uniform1i(loc.uScene, 0);
		gl.uniform1i(loc.uDist, 1);
	}

	static create(): DecayPass | null {
		if (typeof document === 'undefined') {
			return null;
		}
		const canvas = document.createElement('canvas');
		const gl = canvas.getContext('webgl2', {
			alpha: false,
			antialias: false,
			premultipliedAlpha: false,
			preserveDrawingBuffer: false
		});
		if (!gl) {
			console.warn('DecayPass.create', 'WebGL2 is unavailable; using the fallback veil');
			return null;
		}
		const compile = (type: number, source: string): WebGLShader | null => {
			const shader = gl.createShader(type);
			if (!shader) {
				return null;
			}
			gl.shaderSource(shader, source);
			gl.compileShader(shader);
			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
				console.error('DecayPass.create', gl.getShaderInfoLog(shader));
				return null;
			}
			return shader;
		};
		const vs = compile(gl.VERTEX_SHADER, DECAY_VERTEX);
		const fs = compile(gl.FRAGMENT_SHADER, DECAY_FRAGMENT);
		const program = gl.createProgram();
		if (!vs || !fs || !program) {
			return null;
		}
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.bindAttribLocation(program, 0, 'aPos');
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			console.error('DecayPass.create', gl.getProgramInfoLog(program));
			return null;
		}
		return new DecayPass(canvas, gl, program);
	}

	private static texture(gl: WebGL2RenderingContext, filter: number): WebGLTexture {
		const t = gl.createTexture();
		if (!t) {
			throw new Error('DecayPass.texture: createTexture failed');
		}
		gl.bindTexture(gl.TEXTURE_2D, t);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		return t;
	}

	/** Packed fields from `packDecayFields`, with their geometry and maxima. */
	setFields(
		data: Uint8Array,
		cols: number,
		rows: number,
		margin: number,
		maxDeath: number,
		maxRespawn: number
	): void {
		const gl = this.gl;
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, this.distTex);
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, cols, rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
		this.distCols = cols;
		this.distRows = rows;
		this.distMargin = margin;
		this.distMax = [maxDeath, maxRespawn];
	}

	/** Renders the decayed `scene` at `pixelWidth`×`pixelHeight` into `canvas`. */
	render(
		scene: HTMLCanvasElement,
		pixelWidth: number,
		pixelHeight: number,
		u: DecayUniforms
	): void {
		const gl = this.gl;
		if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
			this.canvas.width = pixelWidth;
			this.canvas.height = pixelHeight;
		}
		const l = this.loc;
		gl.viewport(0, 0, pixelWidth, pixelHeight);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.sceneTex);
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, scene);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, this.distTex);
		gl.uniform2f(l.uSizePx, pixelWidth, pixelHeight);
		gl.uniform2f(l.uScenePx, u.width, u.height);
		gl.uniform4f(l.uWorld, u.originX, u.originY, u.worldScale, u.tileWorld);
		gl.uniform2f(l.uDistSize, this.distCols, this.distRows);
		gl.uniform1f(l.uMargin, this.distMargin);
		gl.uniform2f(l.uDMax, this.distMax[0], this.distMax[1]);
		gl.uniform1f(l.uFront, u.front);
		gl.uniform1f(l.uRebuild, u.rebuild);
		gl.uniform1f(l.uTime, u.time);
		gl.uniform1f(l.uShock, u.shock);
		gl.uniform2f(l.uEpic, u.epicX, u.epicY);
		gl.uniform3f(l.uDeep, ...rgb(u.palette.deep));
		gl.uniform3f(l.uMid, ...rgb(u.palette.mid));
		gl.uniform3f(l.uWisp, ...rgb(u.palette.wisp));
		gl.uniform3f(l.uIce, ...rgb(u.palette.ice));
		gl.uniform3f(l.uRim, ...rgb(u.palette.rim));
		gl.uniform3f(l.uWarm, ...rgb(u.palette.warm));
		gl.drawArrays(gl.TRIANGLES, 0, 3);
	}
}
