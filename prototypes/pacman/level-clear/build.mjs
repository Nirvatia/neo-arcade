// Builds level-clear.html: bundles main.ts (which imports the game's sources) into one
// IIFE and inlines it into index.html. Run from the repo root: node prototypes/pacman/level-clear/build.mjs
import { build } from 'vite';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = mkdtempSync(join(tmpdir(), 'level-clear-'));
await build({
	configFile: false,
	logLevel: 'warn',
	build: {
		outDir: out,
		emptyOutDir: true,
		minify: false,
		lib: { entry: join(here, 'main.ts'), formats: ['iife'], name: 'LevelClear', fileName: () => 'proto.js' }
	}
});
const js = readFileSync(join(out, 'proto.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
const html = readFileSync(join(here, 'index.html'), 'utf8').replace('/*SCRIPT*/', () => js);
writeFileSync(join(here, '..', 'level-clear.html'), html);
rmSync(out, { recursive: true, force: true });
console.log('prototypes/pacman/level-clear.html', Math.round(html.length / 1024), 'KB');
