/**
 * Production build for the UnlimitedPDF Chrome MV3 extension.
 *
 * Passes:
 *   1. Service worker  → dist/service-worker.js  (ESM, Vite/Rollup)
 *   2. HTML pages      → dist/{popup,workspace,options}/index.html + assets/
 *      (Vite + Preact; bundles page code, CSS, dedicated workers referenced via
 *       `new URL('./x.worker.ts', import.meta.url)` and the pdf.js worker)
 *   3. manifest.json   → serialized from the typed src/config/manifest.ts
 *   4. icons           → copied from public/icons
 *   5. optional --zip  → dist-zip/unlimited-pdf-<version>.zip for the Web Store
 *
 * Everything is bundled locally: no CDN scripts, no remote code, no eval.
 */
import { build as viteBuild } from 'vite';
import preact from '@preact/preset-vite';
import * as esbuild from 'esbuild';
import {
  cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, watch as fsWatch,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SRC = resolve(ROOT, 'src');
const DIST = resolve(ROOT, 'dist');
const ALIAS = { '@': SRC };

const args = process.argv.slice(2);
const has = (name) => args.includes(`--${name}`);

/** Load and evaluate the typed manifest (TS) by bundling it to memory. */
async function loadManifest() {
  const res = await esbuild.build({
    entryPoints: [resolve(SRC, 'config/manifest.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    alias: ALIAS,
    logLevel: 'silent',
  });
  const code = res.outputFiles[0].text;
  const url = 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
  const mod = await import(url);
  return (mod.buildManifest ?? mod.default)();
}

/** Pass 1 — service worker as a self-contained ES module. */
async function buildServiceWorker() {
  await viteBuild({
    root: ROOT,
    configFile: false,
    logLevel: 'warn',
    resolve: { alias: ALIAS },
    build: {
      outDir: DIST,
      emptyOutDir: true,
      target: 'es2022',
      minify: true,
      reportCompressedSize: false,
      rollupOptions: {
        input: resolve(SRC, 'background/service-worker.ts'),
        output: {
          format: 'esm',
          entryFileNames: 'service-worker.js',
          inlineDynamicImports: true,
        },
      },
    },
  });
}

/** Pass 2 — extension HTML pages + their dedicated/pdf.js workers. */
async function buildPages() {
  await viteBuild({
    root: resolve(SRC, 'ui'),
    base: './',
    configFile: false,
    logLevel: 'warn',
    resolve: { alias: ALIAS },
    worker: { format: 'es' },
    plugins: [preact()],
    build: {
      outDir: DIST,
      emptyOutDir: false,
      target: 'es2022',
      minify: true,
      reportCompressedSize: false,
      rollupOptions: {
        input: {
          popup: resolve(SRC, 'ui/popup/index.html'),
          workspace: resolve(SRC, 'ui/workspace/index.html'),
          options: resolve(SRC, 'ui/options/index.html'),
        },
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
  });
}

async function buildAll() {
  await buildServiceWorker();
  await buildPages();

  const manifest = await loadManifest();
  writeFileSync(resolve(DIST, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

  copyDir(resolve(ROOT, 'public/icons'), resolve(DIST, 'icons'));

  console.log(`\n  ✓ ${manifest.name} v${manifest.version}`);
  console.log(`    permissions: ${manifest.permissions.join(', ')}`);
  console.log(`    optional_host_permissions: ${(manifest.optional_host_permissions || []).join(', ')}`);

  if (has('zip')) zipDist(manifest.version);
  console.log(`\n✅ Done. Load unpacked from ${relative(ROOT, DIST)}/`);
}

/* ------------------------------- helpers ------------------------------- */

function copyDir(from, to) {
  if (!existsSync(from)) return;
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

function walk(dir, base = dir, out = {}) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, base, out);
    else out[relative(base, full)] = new Uint8Array(readFileSync(full));
  }
  return out;
}

function zipDist(version) {
  const files = walk(DIST);
  const zipped = zipSync(files, { level: 9 });
  const zipRoot = resolve(ROOT, 'dist-zip');
  mkdirSync(zipRoot, { recursive: true });
  const out = resolve(zipRoot, `unlimited-pdf-${version}.zip`);
  writeFileSync(out, zipped);
  console.log(`  ⇢ packaged ${relative(ROOT, out)} (${(zipped.length / 1024).toFixed(0)} KB)`);
}

/* -------------------------------- main -------------------------------- */

async function main() {
  await buildAll();

  if (has('watch')) {
    console.log('\n👀 Watching src/ for changes (Ctrl+C to stop)…');
    let timer = null;
    let building = false;
    fsWatch(SRC, { recursive: true }, () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        if (building) return;
        building = true;
        try {
          await buildAll();
        } catch (e) {
          console.error('Rebuild failed:', e.message);
        } finally {
          building = false;
        }
      }, 200);
    });
  }
}

main().catch((e) => {
  console.error('\n❌ Build failed:', e);
  process.exit(1);
});
