// Builds a prototype page: bundles <name>/main.ts (which imports the game's sources) into
// one IIFE and inlines it into <name>/index.html, writing <name>.html next to this file.
// Run from the repo root: node prototypes/pacman/build.mjs <name>   (e.g. level-clear)
import { build } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const name = process.argv[2];
if (!name) {
	throw new Error('usage: node prototypes/pacman/build.mjs <name>');
}
const here = join(root, name);
const out = mkdtempSync(join(tmpdir(), `${name}-`));
await build({
	configFile: false,
	logLevel: 'warn',
	// prototypes may mount the game's own Svelte components (CSS injected into the page)
	plugins: [svelte({ configFile: false, compilerOptions: { css: 'injected' } })],
	build: {
		outDir: out,
		emptyOutDir: true,
		minify: false,
		lib: { entry: join(here, 'main.ts'), formats: ['iife'], name: 'Prototype', fileName: () => 'proto.js' }
	}
});
const js = readFileSync(join(out, 'proto.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
const html = readFileSync(join(here, 'index.html'), 'utf8').replace('/*SCRIPT*/', () => js);
writeFileSync(join(root, `${name}.html`), html);
rmSync(out, { recursive: true, force: true });
console.log(`prototypes/pacman/${name}.html`, Math.round(html.length / 1024), 'KB');
