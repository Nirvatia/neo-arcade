// Prototype: the HUD and the screens (the game's own components) over a real world.
import { mount } from 'svelte';
import Proto from './Proto.svelte';

mount(Proto, { target: document.getElementById('app') as HTMLElement });
