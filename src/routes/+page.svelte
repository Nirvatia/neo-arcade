<script lang="ts">
  import GameCard from "$shared/ui/GameCard.svelte";
</script>

<div class="flex min-h-screen flex-col items-center justify-center bg-black px-6 font-mono text-zinc-100">
  <header class="mb-12 text-center">
    <p class="mb-3 text-[10px] tracking-[0.5em] text-zinc-600">TERMINAL v0.1.0</p>
    <h1 class="text-3xl font-bold uppercase tracking-[0.3em]">Neo Arcade</h1>
    <p class="mt-3 text-xs uppercase tracking-[0.25em] text-zinc-500">select program</p>
  </header>

  <main class="flex flex-wrap items-start justify-center gap-4">
    <GameCard
      name="Snake"
      route="/games/snake"
      description="Битовый лабиринт. Собери регистр, примени операцию, уйди через портал."
    />
  </main>

  <footer class="mt-16 text-[10px] uppercase tracking-[0.3em] text-zinc-700">
    sys.neo.v0.1.0
  </footer>
</div>