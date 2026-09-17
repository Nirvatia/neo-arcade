<script lang="ts">
	import '../app.css';
	import ArcadeLayout from '$shared/ui/ArcadeLayout.svelte';

	let { children } = $props();
</script>

<ArcadeLayout>
	{@render children()}
</ArcadeLayout>
