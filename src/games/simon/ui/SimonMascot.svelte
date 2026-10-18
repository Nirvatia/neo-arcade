<script lang="ts">
	type Mood = 'normal' | 'happy' | 'shock' | 'angry' | 'coffee' | 'shout';

	interface Props {
		mood?: Mood;
	}

	let { mood = 'normal' }: Props = $props();
</script>

<div class="mascot-box" data-mood={mood}>
	<svg class="mascot" viewBox="0 0 200 210" aria-hidden="true">
		<!-- тело -->
		<rect
			x="20"
			y="20"
			width="160"
			height="170"
			rx="34"
			fill="#ffd21f"
			stroke="#1a1130"
			stroke-width="8"
		/>

		<!-- блик сверху -->
		<path
			d="M38 42 q62 -18 124 0"
			stroke="rgba(255,255,255,0.5)"
			stroke-width="8"
			fill="none"
			stroke-linecap="round"
		/>

		<!-- логотип -->
		<text x="100" y="80" text-anchor="middle" class="logo">1С</text>

		<!-- обычные глаза -->
		<g class="eye-open">
			<ellipse cx="70" cy="115" rx="18" ry="21" fill="#fff" stroke="#1a1130" stroke-width="5" />
			<ellipse cx="130" cy="115" rx="18" ry="21" fill="#fff" stroke="#1a1130" stroke-width="5" />

			<circle cx="74" cy="119" r="7" fill="#1a1130" />
			<circle cx="126" cy="119" r="7" fill="#1a1130" />

			<circle cx="77" cy="115" r="2.2" fill="#fff" />
			<circle cx="129" cy="115" r="2.2" fill="#fff" />
		</g>

		<!-- счастливые глаза -->
		<g class="eye-happy">
			<path d="M54 116 q16 -18 32 0" stroke="#1a1130" stroke-width="6" fill="none" stroke-linecap="round" />
			<path d="M114 116 q16 -18 32 0" stroke="#1a1130" stroke-width="6" fill="none" stroke-linecap="round" />
		</g>

		<!-- шокированные глаза -->
		<g class="eye-shock">
			<circle cx="70" cy="115" r="20" fill="#fff" stroke="#1a1130" stroke-width="5" />
			<circle cx="130" cy="115" r="20" fill="#fff" stroke="#1a1130" stroke-width="5" />

			<circle cx="70" cy="115" r="4.5" fill="#1a1130" />
			<circle cx="130" cy="115" r="4.5" fill="#1a1130" />
		</g>

		<!-- злые брови -->
		<g class="brows">
			<path d="M48 94 l40 12" stroke="#1a1130" stroke-width="7" stroke-linecap="round" />
			<path d="M152 94 l-40 12" stroke="#1a1130" stroke-width="7" stroke-linecap="round" />
		</g>

		<!-- улыбка -->
		<g class="mouth-smile">
			<path
				d="M76 158 q24 18 48 0"
				fill="none"
				stroke="#1a1130"
				stroke-width="6"
				stroke-linecap="round"
			/>
		</g>

		<!-- крик -->
		<g class="mouth-shout">
			<ellipse cx="100" cy="164" rx="18" ry="13" fill="#7c1220" stroke="#1a1130" stroke-width="5" />
			<ellipse cx="100" cy="170" rx="9" ry="4" fill="#ff6b6b" />
		</g>

		<!-- стиснутые зубы -->
		<g class="mouth-grit">
			<rect x="78" y="154" width="44" height="14" rx="5" fill="#fff" stroke="#1a1130" stroke-width="5" />
			<path d="M78 161 h44 M92 154 v14 M106 154 v14" stroke="#1a1130" stroke-width="3" />
		</g>

		<!-- кофе -->
		<g class="coffee-cup">
			<path class="steam" d="M92 142 q4 -6 0 -12" />
			<path class="steam steam-2" d="M108 142 q-4 -6 0 -12" />

			<rect x="82" y="148" width="38" height="28" rx="7" fill="#fff" stroke="#1a1130" stroke-width="5" />
			<path d="M120 154 q13 3 0 15" fill="none" stroke="#1a1130" stroke-width="5" />
		</g>
	</svg>
</div>

<style>
	.mascot-box {
		flex: none;
		width: clamp(110px, 19vh, 180px);
		animation: simon-mascot-bob 3.2s ease-in-out infinite;
		filter: drop-shadow(7px 8px 0 rgba(0, 0, 0, 0.28));
	}

	.mascot {
		display: block;
		width: 100%;
		height: auto;
	}

	.logo {
		font-family: 'Russo One', 'Arial Black', sans-serif;
		font-size: 36px;
		fill: #e8352b;
		stroke: #fff;
		stroke-width: 1.2px;
		paint-order: stroke;
	}

	.mascot g {
		transition: opacity 0.15s;
	}

	.eye-happy,
	.eye-shock,
	.brows,
	.mouth-shout,
	.mouth-grit,
	.coffee-cup {
		opacity: 0;
	}

	.eye-open {
		animation: simon-mascot-blink 4.2s infinite;
		transform-box: fill-box;
		transform-origin: center;
	}

	@keyframes simon-mascot-blink {
		0%,
		93%,
		100% {
			transform: scaleY(1);
		}
		95.5% {
			transform: scaleY(0.12);
		}
	}

	/* normal */
	.mascot-box[data-mood='normal'] .eye-open {
		opacity: 1;
	}

	.mascot-box[data-mood='normal'] .mouth-smile {
		opacity: 1;
	}

	/* happy */
	.mascot-box[data-mood='happy'] {
		animation:
			simon-mascot-hop 0.45s cubic-bezier(0.3, 1.8, 0.4, 1),
			simon-mascot-bob 3.2s ease-in-out infinite 0.45s;
	}

	.mascot-box[data-mood='happy'] .eye-open {
		opacity: 0;
	}

	.mascot-box[data-mood='happy'] .eye-happy {
		opacity: 1;
	}

	.mascot-box[data-mood='happy'] .mouth-smile {
		opacity: 1;
	}

	/* shout */
	.mascot-box[data-mood='shout'] .mouth-smile {
		opacity: 0;
	}

	.mascot-box[data-mood='shout'] .mouth-shout {
		opacity: 1;
	}

	/* shock */
	.mascot-box[data-mood='shock'] {
		animation:
			simon-mascot-shock 0.4s ease,
			simon-mascot-bob 3.2s ease-in-out infinite 0.4s;
	}

	.mascot-box[data-mood='shock'] .eye-open {
		opacity: 0;
	}

	.mascot-box[data-mood='shock'] .eye-shock {
		opacity: 1;
	}

	.mascot-box[data-mood='shock'] .mouth-smile {
		opacity: 0;
	}

	.mascot-box[data-mood='shock'] .mouth-shout {
		opacity: 1;
	}

	/* angry */
	.mascot-box[data-mood='angry'] {
		animation:
			simon-mascot-quake 0.4s ease,
			simon-mascot-bob 3.2s ease-in-out infinite 0.4s;
	}

	.mascot-box[data-mood='angry'] .brows {
		opacity: 1;
	}

	.mascot-box[data-mood='angry'] .mouth-smile {
		opacity: 0;
	}

	.mascot-box[data-mood='angry'] .mouth-grit {
		opacity: 1;
	}

	/* coffee */
	.mascot-box[data-mood='coffee'] .eye-open {
		opacity: 0;
	}

	.mascot-box[data-mood='coffee'] .eye-happy {
		opacity: 1;
	}

	.mascot-box[data-mood='coffee'] .mouth-smile {
		opacity: 0;
	}

	.mascot-box[data-mood='coffee'] .coffee-cup {
		opacity: 1;
	}

	.steam {
		fill: none;
		stroke: #fff;
		stroke-width: 3.5;
		stroke-linecap: round;
		opacity: 0.85;
		animation: simon-mascot-steam 2.2s ease-in-out infinite;
	}

	.steam-2 {
		animation-delay: 1s;
	}

	@keyframes simon-mascot-steam {
		0% {
			transform: translateY(0);
			opacity: 0;
		}
		30% {
			opacity: 0.85;
		}
		100% {
			transform: translateY(-12px);
			opacity: 0;
		}
	}

	@keyframes simon-mascot-bob {
		0%,
		100% {
			transform: translateY(0) rotate(-2deg);
		}
		50% {
			transform: translateY(-8px) rotate(2deg);
		}
	}

	@keyframes simon-mascot-hop {
		0% {
			transform: translateY(0);
		}
		35% {
			transform: translateY(-22px) scale(1.05, 0.95);
		}
		70% {
			transform: translateY(2px) scale(0.97, 1.04);
		}
		100% {
			transform: translateY(0);
		}
	}

	@keyframes simon-mascot-quake {
		0%,
		100% {
			transform: translateX(0);
		}
		25% {
			transform: translateX(-8px) rotate(-4deg);
		}
		50% {
			transform: translateX(8px) rotate(4deg);
		}
		75% {
			transform: translateX(-5px);
		}
	}

	@keyframes simon-mascot-shock {
		0% {
			transform: scale(1);
		}
		35% {
			transform: scale(1.07);
		}
		100% {
			transform: scale(1);
		}
	}

	@media (max-width: 760px) {
		.mascot-box {
			width: clamp(84px, 14vh, 120px);
		}
	}
</style>