<div class="backdrop" aria-hidden="true">
	<div class="grid"></div>
	<div class="watermark">1С</div>
	<div class="vig"></div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 0;
		pointer-events: none;
		overflow: hidden;
		background: radial-gradient(130% 110% at 50% 18%, #182742 0%, #0d1522 55%, #070b12 100%);
	}
	.grid {
		position: absolute;
		inset: 0;
		background-image:
			linear-gradient(rgba(120, 150, 200, 0.05) 1px, transparent 1px),
			linear-gradient(90deg, rgba(120, 150, 200, 0.05) 1px, transparent 1px);
		background-size: 44px 44px;
	}
	.watermark {
		position: absolute;
		right: -30px;
		bottom: -110px;
		font-family: Tahoma, sans-serif;
		font-weight: 800;
		font-size: min(46vw, 460px);
		line-height: 1;
		color: rgba(255, 210, 0, 0.04);
		user-select: none;
	}
	.vig {
		position: absolute;
		inset: 0;
		background: radial-gradient(120% 100% at 50% 50%, transparent 58%, rgba(0, 0, 0, 0.6));
	}
</style>