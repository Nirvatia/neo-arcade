/**
 * A full-screen WebGL2 fragment pass in its own canvas: compiles the program, keeps the
 * uniform locations and the textures, and draws one triangle over the viewport.
 * `create()` returns null when WebGL2 is unavailable or the shader does not build.
 */
export class GlPass<U extends string> {
	readonly canvas: HTMLCanvasElement;
	readonly gl: WebGL2RenderingContext;
	private readonly loc: Record<U, WebGLUniformLocation | null>;
	private readonly textures: WebGLTexture[] = [];

	private constructor(
		canvas: HTMLCanvasElement,
		gl: WebGL2RenderingContext,
		program: WebGLProgram,
		uniforms: readonly U[]
	) {
		this.canvas = canvas;
		this.gl = gl;
		gl.useProgram(program);
		const buf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buf);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
		const loc = {} as Record<U, WebGLUniformLocation | null>;
		for (const name of uniforms) {
			loc[name] = gl.getUniformLocation(program, name);
		}
		this.loc = loc;
	}

	static create<U extends string>(
		name: string,
		fragment: string,
		uniforms: readonly U[]
	): GlPass<U> | null {
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
			console.warn(`${name}.create`, 'WebGL2 is unavailable');
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
				console.error(`${name}.create`, gl.getShaderInfoLog(shader));
				return null;
			}
			return shader;
		};
		const vs = compile(gl.VERTEX_SHADER, FULLSCREEN_VERTEX);
		const fs = compile(gl.FRAGMENT_SHADER, fragment);
		const program = gl.createProgram();
		if (!vs || !fs || !program) {
			return null;
		}
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.bindAttribLocation(program, 0, 'aPos');
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			console.error(`${name}.create`, gl.getProgramInfoLog(program));
			return null;
		}
		return new GlPass(canvas, gl, program, uniforms);
	}

	/** Adds a texture bound to `unit` and the sampler uniform `sampler`. */
	addTexture(unit: number, sampler: U, filter: 'linear' | 'nearest'): void {
		const gl = this.gl;
		const t = gl.createTexture();
		if (!t) {
			throw new Error('GlPass.addTexture: createTexture failed');
		}
		const f = filter === 'linear' ? gl.LINEAR : gl.NEAREST;
		gl.activeTexture(gl.TEXTURE0 + unit);
		gl.bindTexture(gl.TEXTURE_2D, t);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.uniform1i(this.loc[sampler], unit);
		this.textures[unit] = t;
	}

	/** Uploads a canvas into texture `unit`. */
	uploadCanvas(unit: number, source: HTMLCanvasElement): void {
		const gl = this.gl;
		gl.activeTexture(gl.TEXTURE0 + unit);
		gl.bindTexture(gl.TEXTURE_2D, this.textures[unit]);
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
	}

	/** Uploads RGBA8 bytes into texture `unit`. */
	uploadBytes(unit: number, data: Uint8Array, width: number, height: number): void {
		const gl = this.gl;
		gl.activeTexture(gl.TEXTURE0 + unit);
		gl.bindTexture(gl.TEXTURE_2D, this.textures[unit]);
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
	}

	uniform(name: U): WebGLUniformLocation | null {
		return this.loc[name];
	}

	/** Sizes the canvas and draws the pass; set the uniforms just before. */
	draw(pixelWidth: number, pixelHeight: number): void {
		const gl = this.gl;
		if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
			this.canvas.width = pixelWidth;
			this.canvas.height = pixelHeight;
		}
		gl.viewport(0, 0, pixelWidth, pixelHeight);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
	}
}

export const FULLSCREEN_VERTEX = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

/** 0xRRGGBB as 0..1 floats for uniform3f. */
export function rgb01(hex: number): [number, number, number] {
	return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
}
