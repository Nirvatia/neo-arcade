// Pac-Man on the season levels: the hero (render/actors/hero/PacmanHero) driven by the game.
// It turns the player's position, heading and speed, the energizer and its last seconds, the
// death and the respawn shield into the hero's state, and the game's cues into his acting
// (a glow at the lips per dot, a real bite for fruit, the egg and ghosts). The hell keeps
// PlayerView for now (berserk and the BFG charge are its own looks).
import type { PlayerService } from '../../logic/actors/PlayerService';
import type { PacmanAudioCue } from '../../core/Events';
import type { GridLayout } from '../maze/GridView';
import type { PlayerDrawOptions } from './PlayerView';
import { PacmanHero } from './hero/PacmanHero';

/** Body radius in tiles (10 % smaller than the first cut, the owner's review). */
const RADIUS = 0.39;

function facingAngle(facing: string | null, fallback: number): number {
	if (facing === 'UP') return -Math.PI / 2;
	if (facing === 'DOWN') return Math.PI / 2;
	if (facing === 'LEFT') return Math.PI;
	if (facing === 'RIGHT') return 0;
	return fallback;
}

export class PacmanHeroView {
	private readonly hero = new PacmanHero();
	private lastTime = -1;
	private angle = 0;
	private last: { x: number; y: number } | null = null;
	/** Smoothed speed, tiles per second. */
	private speed = 0;

	trigger(cue: PacmanAudioCue): void {
		if (cue === 'dot') {
			this.hero.gulp();
		} else if (cue === 'fruit-collect' || cue === 'egg-collect' || cue === 'ghost-eaten') {
			this.hero.eat();
		}
	}

	reset(): void {
		this.hero.reset();
		this.last = null;
		this.speed = 0;
	}

	draw(
		ctx: CanvasRenderingContext2D,
		player: PlayerService,
		layout: GridLayout,
		time: number,
		options: PlayerDrawOptions = { look: 'normal', charge: 0, dying: false }
	): void {
		const S = layout.tileSize;
		const pos = player.position;
		if (!(S > 0) || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) {
			return;
		}
		const dt = this.lastTime < 0 ? 0 : Math.min(0.1, Math.max(0, time - this.lastTime));
		this.lastTime = time;

		const moved = this.last ? Math.hypot(pos.x - this.last.x, pos.y - this.last.y) : 0;
		if (dt > 0 && moved < 1.5) {
			this.speed += (moved / dt - this.speed) * Math.min(1, dt * 12);
		}
		this.last = { x: pos.x, y: pos.y };
		// turn fast but not in one frame: the hero reads the turn
		const target = facingAngle(player.facing, this.angle);
		let turn = target - this.angle;
		while (turn > Math.PI) turn -= Math.PI * 2;
		while (turn < -Math.PI) turn += Math.PI * 2;
		this.angle += turn * Math.min(1, dt * 30);

		this.hero.setRadius(S * RADIUS);
		this.hero.update(dt, {
			x: layout.offsetX + pos.x * S,
			y: layout.offsetY + pos.y * S,
			angle: this.angle,
			moving: !options.dying && this.speed > 0.5,
			power: options.look === 'energized',
			ending: Boolean(options.ending),
			dying: options.dying,
			invulnerable: player.isInvulnerable
		});
		this.hero.draw(ctx);
	}
}
