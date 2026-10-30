import type { DoomDirection } from '../../logic/doom/DoomGraph';
import type { DoomShape, DoomStateName } from '../../logic/doom/DoomBossModel';
import type { GridLayout } from '../maze/GridView';
import type { EyeStyle, GhostShape, HornStyle } from './hellGhost';
import { dirAngle, drawEyes, drawHeading, drawHorns, ghostPath, glow, noise } from './hellGhost';

/** Everything the view needs about one body (the boss or its phase-3 echo). */
export interface BossSnapshot {
	/** Tile-center coordinates. */
	readonly x: number;
	readonly y: number;
	readonly phase: number;
	readonly state: DoomStateName;
	readonly shape: DoomShape;
	/** Where the body is heading (or aims, during a wind-up). */
	readonly dir: DoomDirection;
	/** Telegraph progress 0..1. */
	readonly progress: number;
	readonly alpha: number;
	/** 0..1 while the boss materialises at the start of the fight. */
	readonly intro: number;
	/** Angle toward the player: the eyes lock onto it during a wind-up. */
	readonly look: number;
	/** 0..1 white flash after taking a hit. */
	readonly hit: number;
	/** The phase-3 decoy: same body, cold violet and translucent. */
	readonly echo: boolean;
}

interface Skin {
	readonly top: string;
	readonly mid: string;
	readonly low: string;
	readonly rim: string;
	/** Lava cracks and the fire inside (rgb). */
	readonly fire: string;
	readonly horn: HornStyle;
	readonly eyes: EyeStyle;
}

const HELL_EYES: EyeStyle = {
	sclera: '#ffe27a',
	pupil: '#1a0000',
	glow: '255,140,40',
	brows: true
};

/** Phase 1 → 3: dark red with small horns; cracked with lava; burning from inside. */
const SKINS: readonly Skin[] = [
	{
		top: '#e0262a',
		mid: '#9a0c12',
		low: '#3a0206',
		rim: 'rgba(20,0,0,.8)',
		fire: '255,90,30',
		horn: {
			length: 0.5,
			thick: 0.2,
			dark: '#2a0a08',
			light: '#cfbfa8',
			ember: null,
			curl: 0
		},
		eyes: { ...HELL_EYES, glow: null }
	},
	{
		top: '#f0302a',
		mid: '#8a0a0e',
		low: '#2a0204',
		rim: 'rgba(20,0,0,.85)',
		fire: '255,110,30',
		horn: {
			length: 0.62,
			thick: 0.22,
			dark: '#1a0404',
			light: '#e8d8bc',
			ember: '255,120,40',
			curl: 0.2
		},
		eyes: HELL_EYES
	},
	{
		top: '#ff5a2a',
		mid: '#c0141a',
		low: '#3a0204',
		rim: 'rgba(30,0,0,.9)',
		fire: '255,170,60',
		horn: {
			length: 0.7,
			thick: 0.24,
			dark: '#120202',
			light: '#fff0c8',
			ember: '255,190,80',
			curl: 0.35
		},
		eyes: { ...HELL_EYES, sclera: '#fff6c0' }
	}
];

const ECHO_SKIN: Skin = {
	top: '#c8b0ff',
	mid: '#5a3aa8',
	low: '#140a30',
	rim: 'rgba(10,0,30,.8)',
	fire: '170,120,255',
	horn: {
		length: 0.72,
		thick: 0.18,
		dark: '#1a0a3a',
		light: '#e0d4ff',
		ember: '170,120,255',
		curl: 0.35
	},
	eyes: { sclera: '#e8e0ff', pupil: '#1a0a3a', glow: '150,110,255', brows: true }
};

/**
 * Blinky, lord of hell: the red arcade ghost turned demon, one tile in size.
 * Phase 1: dark red, small horns, a closed scowl.
 * Phase 2: lava cracks, longer glowing horns, a torn skirt, a fanged grin.
 * Phase 3: burning from inside, a second pair of horns, a skirt of flames.
 * The eyes look where it is heading (on the wind-up: at the player); a chevron on the
 * tile's leading edge repeats it. Wind-up: it swells and shivers, the grin glows.
 * Dash: stretched along the heading with afterimages. Stunned: spiral eyes.
 */
export class HellBlinkyView {
	draw(ctx: CanvasRenderingContext2D, snap: BossSnapshot, layout: GridLayout, time: number): void {
		if (snap.alpha <= 0.01) {
			return;
		}
		const S = layout.tileSize;
		const phase = Math.min(3, Math.max(1, Math.floor(snap.phase)));
		const intro = Math.min(1, Math.max(0, snap.intro));
		const tele = snap.state === 'TELEGRAPH' ? snap.progress : 0;
		const stunned = snap.state === 'STUNNED';
		const transition = snap.state === 'TRANSITION';
		const dash = snap.state === 'ACTIVE' && snap.shape === 'wedge';
		const casting = snap.state === 'ACTIVE' && snap.shape === 'cast';
		const skin = snap.echo ? ECHO_SKIN : SKINS[phase - 1];
		const t = time * (stunned ? 0.35 : 1);
		const heading = dirAngle(snap.dir);
		const R = S * 0.5 * (0.3 + 0.7 * intro) * (1 + tele * 0.06);
		let x = layout.offsetX + snap.x * S;
		let y = layout.offsetY + snap.y * S;
		const shiver = (transition ? 0.08 : 0) + (stunned ? 0.03 : 0) + tele * 0.04;
		if (shiver > 0) {
			x += (Math.random() - 0.5) * R * shiver;
			y += (Math.random() - 0.5) * R * shiver;
		}
		const bob = Math.sin(t * 3.2) * R * 0.03;
		const shape: GhostShape = {
			// sized so the horn tips (phase 3, with their glow) end at the tile's top edge
			w: R * 0.64,
			domeY: -R * 0.02 + bob,
			hem: R * 0.78 + bob,
			feet: 4,
			torn: snap.echo ? 1 : [0, 0.8, 1][phase - 1],
			seed: 7
		};
		const pulse = 0.5 + 0.5 * Math.sin(t * (3 + phase * 1.5));

		ctx.save();
		ctx.globalAlpha = snap.alpha * (snap.echo ? 0.72 : 1) * (0.3 + 0.7 * intro);
		ctx.lineJoin = 'round';
		ctx.lineCap = 'round';

		// a dark pool and a glow under it, kept inside the tile
		const pool = ctx.createRadialGradient(x, y, R * 0.2, x, y, R);
		pool.addColorStop(0, 'rgba(0,0,0,0.5)');
		pool.addColorStop(1, 'rgba(0,0,0,0)');
		ctx.fillStyle = pool;
		ctx.fillRect(x - R, y - R, R * 2, R * 2);
		ctx.globalCompositeOperation = 'lighter';
		glow(ctx, x, y, R, snap.echo ? '150,90,255' : '255,40,16', 0.16 + 0.08 * phase + tele * 0.3);
		ctx.globalCompositeOperation = 'source-over';

		if (dash) {
			// afterimages trail the dash
			for (let k = 2; k >= 1; k -= 1) {
				ctx.save();
				ctx.globalAlpha *= 0.22 * (3 - k);
				ghostPath(
					ctx,
					x - Math.cos(heading) * R * 0.22 * k,
					y - Math.sin(heading) * R * 0.22 * k,
					shape,
					t
				);
				ctx.fillStyle = skin.mid;
				ctx.fill();
				ctx.restore();
			}
		}

		ctx.save();
		ctx.translate(x, y);
		if (dash) {
			// stretched along the heading, squeezed across it
			ctx.rotate(heading);
			ctx.scale(1.14, 0.88);
			ctx.rotate(-heading);
		}
		this.drawBody(ctx, shape, skin, phase, t, pulse, snap);
		const horns = (at: number, style: HornStyle) => drawHorns(ctx, 0, 0, shape, at, style, pulse);
		if (phase >= 3 || snap.echo) {
			horns(1.05, { ...skin.horn, length: skin.horn.length * 0.55, curl: 0.6 });
		}
		horns(0.55, casting || tele > 0 ? { ...skin.horn, ember: skin.fire } : skin.horn);
		this.drawFace(ctx, shape, skin, phase, t, tele, casting, stunned, transition, snap);
		ctx.restore();

		if (phase >= 3 && !snap.echo) {
			this.drawFlames(ctx, x, y, shape, skin, t);
		}
		if (!stunned && !transition && snap.state !== 'INTRO') {
			drawHeading(
				ctx,
				x,
				y,
				S,
				heading,
				snap.echo ? '190,150,255' : '255,90,40',
				0.55 + 0.35 * pulse
			);
		}
		ctx.restore();
	}

	private drawBody(
		ctx: CanvasRenderingContext2D,
		shape: GhostShape,
		skin: Skin,
		phase: number,
		t: number,
		pulse: number,
		snap: BossSnapshot
	): void {
		const { w, domeY, hem } = shape;
		ghostPath(ctx, 0, 0, shape, t);
		const fill =
			phase >= 3 && !snap.echo
				? ctx.createRadialGradient(0, hem * 0.35, w * 0.1, 0, domeY * 0.5, w * 1.35)
				: ctx.createLinearGradient(0, domeY - w, 0, hem);
		fill.addColorStop(0, skin.top);
		fill.addColorStop(0.55, skin.mid);
		fill.addColorStop(1, skin.low);
		ctx.fillStyle = fill;
		ctx.fill();
		ctx.strokeStyle = skin.rim;
		ctx.lineWidth = Math.max(1, w * 0.07);
		ctx.stroke();

		ctx.save();
		ghostPath(ctx, 0, 0, shape, t);
		ctx.clip();
		// a sheen on the dome
		const sheen = ctx.createRadialGradient(
			-w * 0.35,
			domeY - w * 0.5,
			0,
			-w * 0.35,
			domeY - w * 0.5,
			w * 0.7
		);
		sheen.addColorStop(0, 'rgba(255,255,255,.28)');
		sheen.addColorStop(1, 'rgba(255,255,255,0)');
		ctx.fillStyle = sheen;
		ctx.fillRect(-w, domeY - w, w * 2, w * 1.4);
		if (phase >= 2 || snap.echo) {
			// lava cracks
			ctx.globalCompositeOperation = 'lighter';
			ctx.strokeStyle = `rgba(${skin.fire},${0.45 + 0.45 * pulse})`;
			ctx.lineWidth = Math.max(0.8, w * 0.05);
			for (let i = 0; i < 5; i += 1) {
				let px = (noise(i, 1) - 0.5) * w * 1.5;
				// under the face only, so the eyes stay clean
				let py = domeY + w * 0.95 + noise(i, 2) * (hem - domeY - w * 1.2);
				ctx.beginPath();
				ctx.moveTo(px, py);
				for (let k = 0; k < 3; k += 1) {
					px += (noise(i, k + 3) - 0.5) * w * 0.5;
					py += w * 0.18;
					ctx.lineTo(px, py);
				}
				ctx.stroke();
			}
			ctx.globalCompositeOperation = 'source-over';
		}
		if (phase >= 3 && !snap.echo) {
			// the fire inside shows through the skin
			ctx.globalCompositeOperation = 'lighter';
			glow(ctx, 0, hem * 0.55, w * (0.7 + 0.1 * pulse), skin.fire, 0.4);
			ctx.globalCompositeOperation = 'source-over';
		}
		if (snap.hit > 0) {
			ctx.fillStyle = `rgba(255,255,255,${0.8 * snap.hit})`;
			ctx.fillRect(-w * 1.2, domeY - w * 1.2, w * 2.4, hem - domeY + w * 2.4);
		}
		ctx.restore();
	}

	private drawFace(
		ctx: CanvasRenderingContext2D,
		shape: GhostShape,
		skin: Skin,
		phase: number,
		t: number,
		tele: number,
		casting: boolean,
		stunned: boolean,
		transition: boolean,
		snap: BossSnapshot
	): void {
		const { w, domeY } = shape;
		const faceY = domeY + w * 0.35;
		// on the wind-up the eyes lock onto the player; otherwise they look ahead
		const look = tele > 0 ? snap.look : dirAngle(snap.dir);
		const eyes: EyeStyle =
			tele > 0.5 || casting ? { ...skin.eyes, sclera: '#ffffff', glow: skin.fire } : skin.eyes;
		drawEyes(ctx, 0, faceY, w, look, eyes, transition ? 0 : 1, stunned, t);

		// mouth: a scowl in phase 1, a fanged grin later; it opens and glows on a wind-up
		const my = faceY + w * 0.42;
		const mw = w * (phase === 1 && !snap.echo ? 0.36 : 0.5);
		const open = phase === 1 && !snap.echo ? tele * 0.18 : 0.1 + tele * 0.14 + (casting ? 0.08 : 0);
		ctx.fillStyle = '#120000';
		ctx.beginPath();
		ctx.moveTo(-mw, my - w * 0.04);
		ctx.quadraticCurveTo(0, my + w * (0.06 + open), mw, my - w * 0.04);
		ctx.quadraticCurveTo(0, my + w * 0.02, -mw, my - w * 0.04);
		ctx.fill();
		if (open > 0.05) {
			ctx.save();
			ctx.globalCompositeOperation = 'lighter';
			glow(
				ctx,
				0,
				my + w * open * 0.4,
				mw * 1.1,
				skin.fire,
				0.3 + tele * 0.6 + (casting ? 0.4 : 0)
			);
			ctx.restore();
			ctx.fillStyle = '#f4ead8';
			const fangs = 4;
			for (let i = 0; i < fangs; i += 1) {
				const fx = -mw * 0.7 + (i / (fangs - 1)) * mw * 1.4;
				ctx.beginPath();
				ctx.moveTo(fx - w * 0.05, my - w * 0.02);
				ctx.lineTo(fx, my + w * (0.06 + open * 0.6));
				ctx.lineTo(fx + w * 0.05, my - w * 0.02);
				ctx.fill();
			}
		}
	}

	/** Phase 3: tongues of fire licking from the hem, additive, inside the tile. */
	private drawFlames(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		shape: GhostShape,
		skin: Skin,
		t: number
	): void {
		const { w, hem } = shape;
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		for (let i = 0; i < 6; i += 1) {
			const fx = x - w * 0.85 + (i / 5) * w * 1.7;
			const flick = 0.5 + 0.5 * Math.sin(t * 13 + i * 1.9);
			const len = w * (0.14 + 0.16 * flick);
			const g = ctx.createLinearGradient(fx, y + hem - len, fx, y + hem + len);
			g.addColorStop(0, `rgba(${skin.fire},0)`);
			g.addColorStop(0.5, `rgba(${skin.fire},0.85)`);
			g.addColorStop(1, 'rgba(255,240,180,0)');
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.moveTo(fx - w * 0.12, y + hem - len * 0.4);
			ctx.quadraticCurveTo(
				fx + Math.sin(t * 9 + i) * w * 0.08,
				y + hem + len,
				fx + w * 0.12,
				y + hem - len * 0.4
			);
			ctx.fill();
		}
		ctx.restore();
	}
}
