<script lang="ts">
  import { page } from "$app/stores";
</script>

<div class="flex min-h-screen items-center justify-center bg-black font-mono">
  <div class="text-center">
    <p class="text-6xl font-bold text-emerald-500/40">{$page.status}</p>
    <h1 class="mt-4 text-lg uppercase tracking-[0.3em] text-zinc-300">signal lost</h1>
    <a
      href="/"
      class="mt-8 inline-block text-xs uppercase tracking-[0.3em] text-zinc-500 transition-colors hover:text-emerald-400"
    >
      ← return to terminal
    </a>
  </div>
</div>