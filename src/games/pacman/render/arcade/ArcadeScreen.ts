import { GlPass } from '../common/GlPass';
import { CRT_FRAGMENT } from './crtShader';

type Uniform = 'uTex' | 'uSrc' | 'uOut' | 'uGlow';
const UNIFORMS: readonly Uniform[] = ['uTex', 'uSrc', 'uOut', 'uGlow'];

/**
 * Puts the native-resolution arcade board on screen through the CRT pass (WebGL2). The
 * board is uploaded every frame (it is small); without WebGL2 it is scaled up by hard
 * pixels instead.
 */
export class ArcadeScreen {
	private pass: GlPass<Uniform> | null | undefined;

	present(
		ctx: CanvasRenderingContext2D,
		source: HTMLCanvasElement,
		x: number,
		y: number,
		width: number,
		height: number,
		pixelRatio: number
	): void {
		if (this.pass === undefined) {
			this.pass = GlPass.create('ArcadeScreen', CRT_FRAGMENT, UNIFORMS);
			this.pass?.addTexture(0, 'uTex', 'nearest');
		}
		const pass = this.pass;
		if (!pass) {
			ctx.save();
			ctx.imageSmoothingEnabled = false;
			ctx.drawImage(source, x, y, width, height);
			ctx.restore();
			return;
		}
		const w = Math.max(1, Math.round(width * pixelRatio));
		const h = Math.max(1, Math.round(height * pixelRatio));
		const gl = pass.gl;
		pass.uploadCanvas(0, source);
		gl.uniform2f(pass.uniform('uSrc'), source.width, source.height);
		gl.uniform2f(pass.uniform('uOut'), w, h);
		gl.uniform1f(pass.uniform('uGlow'), 0.55);
		pass.draw(w, h);
		ctx.drawImage(pass.canvas, x, y, width, height);
	}
}
