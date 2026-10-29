<!-- HUD of the hell level, styled after the CLAUDE_GRID_DOOM_v3 prototype plate.
	Hearts are the player's hit points in the boss fight; the bar below is the boss. -->
<script lang="ts">
	import { pacmanHudStore } from './hudStore';

	const WEAPON_LABEL: Record<string, string> = {
		bfg: 'BFG',
		barrel: 'БОЧКА',
		berserk: 'БЕРСЕРК',
		'': '—'
	};

	const hud = $derived($pacmanHudStore.hell);
	const score = $derived($pacmanHudStore.score.toLocaleString('ru-RU'));
	const hearts = $derived(hud ? Array.from({ length: hud.hpMax }, (_, i) => i < hud.hp) : []);
	const bossRatio = $derived(hud && hud.bossHpMax > 0 ? hud.bossHp / hud.bossHpMax : 0);
</script>

{#if hud}
	<div class="hell-hud" aria-label="HUD">
		<div class="plate">
			<div class="hc"><small>ОЧКИ</small><b>{score}</b></div>
			<div class="hc"><small>УРОВЕНЬ</small><b>{$pacmanHudStore.level}</b></div>
			<div class="hc">
				<small>ЖИЗНИ</small>
				<span class="hearts">
					{#each hearts as on, i (i)}
						<svg viewBox="0 0 24 22" width="20" height="18">
							<path
								d="M12 21s-9-6.2-9-12.2C3 5.6 5.4 3 8.4 3c1.6 0 2.9.8 3.6 2 .7-1.2 2-2 3.6-2 3 0 5.4 2.6 5.4 5.8C21 14.8 12 21 12 21z"
								fill={on ? '#e0343c' : 'rgba(255,255,255,.22)'}
								stroke={on ? '#fff4dc' : 'rgba(255,255,255,.4)'}
								stroke-width="1.5"
							/>
						</svg>
					{/each}
				</span>
			</div>
			<div class="hc weapon" class:armed={hud.weapon !== ''}>
				<small>ОРУЖИЕ</small>
				<b>
					{WEAPON_LABEL[hud.weapon]}{#if hud.weapon === 'berserk'}<em>{hud.berserk.toFixed(1)}</em
						>{/if}
				</b>
			</div>
		</div>
		<div class="boss" class:enraged={hud.bossPhase >= 3}>
			<small>БОСС · ФАЗА {hud.bossPhase}</small>
			<div class="track">
				<div class="fill" style:width="{Math.max(0, Math.min(1, bossRatio)) * 100}%"></div>
				<i style:left="33.333%"></i>
				<i style:left="66.666%"></i>
			</div>
		</div>
	</div>
{/if}

<style>
	.hell-hud {
		position: fixed;
		top: max(14px, env(safe-area-inset-top));
		left: 50%;
		transform: translateX(-50%);
		z-index: 5;
		user-select: none;
		pointer-events: none;
		color: #fff4dc;
		font-family: 'Impact', 'Arial Narrow', 'Segoe UI', system-ui, sans-serif;
	}

	.plate {
		position: relative;
		display: flex;
		padding: 13px 6px 9px;
		border-radius: 12px;
		background:
			repeating-linear-gradient(
				90deg,
				rgba(0, 0, 0, 0) 0 38px,
				rgba(255, 255, 255, 0.05) 38px 39px
			),
			linear-gradient(#3a3d44, #1a1c20);
		box-shadow:
			0 4px 0 #050505,
			0 0 0 2px #5a5f68,
			0 12px 20px rgba(0, 0, 0, 0.5);
	}

	.plate::before {
		content: '';
		position: absolute;
		left: -5px;
		right: -5px;
		top: -8px;
		height: 15px;
		border-radius: 2px;
		background: repeating-linear-gradient(135deg, #ffcc00 0 9px, #14110f 9px 18px);
		box-shadow:
			0 3px 0 #000,
			0 0 0 1px #000;
	}

	/* the prototype plate was laid out without Tailwind's preflight (border-box, block svg) */
	.hc {
		box-sizing: content-box;
		padding: 0 16px;
		min-width: 74px;
		text-align: center;
	}

	.hc + .hc {
		border-left: 2px solid rgba(40, 25, 12, 0.35);
	}

	.hc small {
		display: block;
		font-size: 10px;
		letter-spacing: 0.14em;
		color: #ff8a5a;
	}

	.hc b {
		display: block;
		font-size: 22px;
		line-height: 26px;
		font-variant-numeric: tabular-nums;
		text-shadow: 0 2px 0 rgba(40, 25, 12, 0.45);
		white-space: nowrap;
	}

	.hearts {
		display: block;
		height: 26px;
		line-height: 30px;
	}

	.hearts {
		white-space: nowrap;
	}

	.hearts svg {
		display: inline-block;
		vertical-align: baseline;
		margin: 0 1px;
	}

	/* wide enough for «БЕРСЕРК 9.9» so the plate does not jump when the weapon changes */
	.weapon {
		min-width: 118px;
	}

	.weapon b {
		color: rgba(255, 244, 220, 0.45);
	}

	.weapon.armed b {
		color: #fff4dc;
	}

	.weapon em {
		font-style: normal;
		font-size: 14px;
		margin-left: 6px;
		color: #40d0ff;
	}

	.boss {
		margin: 10px auto 0;
		width: 78%;
		text-align: center;
	}

	.boss small {
		display: block;
		font-size: 10px;
		letter-spacing: 0.14em;
		color: #ff8a5a;
		text-shadow: 0 1px 0 #000;
		margin-bottom: 3px;
	}

	.track {
		position: relative;
		height: 9px;
		border-radius: 999px;
		overflow: hidden;
		background: linear-gradient(#1a1c20, #2a2d32);
		box-shadow:
			0 0 0 1px #5a5f68,
			0 2px 0 #050505;
	}

	.fill {
		height: 100%;
		background: linear-gradient(#ff6a1a, #b02a08);
		box-shadow: 0 0 10px rgba(255, 90, 20, 0.85);
		transition: width 0.25s ease-out;
	}

	.enraged .fill {
		background: linear-gradient(#e01a10, #6a0a06);
		box-shadow: 0 0 12px rgba(255, 30, 20, 0.9);
	}

	.track i {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 2px;
		background: rgba(5, 5, 5, 0.75);
	}

	@media (max-width: 480px) {
		.hc {
			padding: 0 8px;
			min-width: 52px;
		}

		.hc small {
			font-size: 9px;
			letter-spacing: 0.08em;
		}

		.hc b {
			font-size: 18px;
		}

		.weapon {
			min-width: 84px;
		}

		.hearts svg {
			width: 15px;
			height: 14px;
		}
	}
</style>
