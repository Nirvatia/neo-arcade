<script lang="ts">
  import { GameStatus, type GameStatusType } from "$shared/core/types.js";

  interface Props {
    name: string;
    route: string;
    description: string;
    status?: GameStatusType;
  }
  let {
    name,
    route,
    description,
    status = GameStatus.AVAILABLE,
  }: Props = $props();

  const isAvailable = $derived(status === GameStatus.AVAILABLE);
</script>

{#if isAvailable}
  <a
    href={route}
    class="group block w-72 border border-zinc-800 bg-zinc-950 p-6 transition-colors hover:border-emerald-500/60 hover:bg-zinc-900"
  >
    <div class="mb-4 flex items-center justify-between">
      <span class="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-emerald-400">
        <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400"></span>
        available
      </span>
      <span class="text-zinc-600 transition-all group-hover:translate-x-1 group-hover:text-emerald-400">→</span>
    </div>
    <h2 class="mb-2 text-2xl font-bold uppercase tracking-widest text-zinc-100">{name}</h2>
    <p class="text-sm leading-relaxed text-zinc-500">{description}</p>
  </a>
{:else}
  <div class="w-72 border border-zinc-900 bg-zinc-950/50 p-6 opacity-50">
    <div class="mb-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-zinc-600">
      <span class="h-1.5 w-1.5 rounded-full bg-zinc-700"></span>
      {#if status === GameStatus.IN_DEVELOPMENT}in dev{:else}coming soon{/if}
    </div>
    <h2 class="mb-2 text-2xl font-bold uppercase tracking-widest text-zinc-500">{name}</h2>
    <p class="text-sm leading-relaxed text-zinc-600">{description}</p>
  </div>
{/if}