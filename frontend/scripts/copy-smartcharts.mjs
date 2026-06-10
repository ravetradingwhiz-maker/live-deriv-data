/**
 * Stages SmartCharts Champion runtime assets so the chart renders.
 *
 * SmartCharts loads two things at runtime:
 *  1. Its webpack chunks (locale json, the flutter-chart-adapter, sprites) from
 *     the path set via setSmartChartsPublicPath('/js/smartcharts/').
 *  2. The Flutter/CanvasKit chart ENGINE (main.dart.js, canvaskit/, assets/),
 *     which the engine resolves against document.baseURI with assetBase '/',
 *     i.e. the SITE ROOT.
 *
 * So we copy:
 *  - dist/*            -> public/js/smartcharts/   (chunks; the public path)
 *  - dist/chart/*      -> public/                  (engine: main.dart.js, canvaskit/, flutter*.js …)
 *  - dist/assets/*     -> public/assets/           (Flutter asset bundle)
 *
 * Vite's own build output is moved to /app-assets (see vite.config.ts) so it
 * doesn't collide with Flutter's /assets. Regenerated on predev/prebuild.
 */
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'node_modules/@deriv-com/smartcharts-champion/dist');
const publicDir = resolve(root, 'public');

if (!existsSync(dist)) {
    console.warn('[copy-smartcharts] source not found:', dist);
    process.exit(0);
}

// Overwrite in place (don't rm first — the dev server locks files on Windows).
// 1) Chunks served from the configured public path.
const chunksDest = resolve(publicDir, 'js/smartcharts');
mkdirSync(chunksDest, { recursive: true });
cpSync(dist, chunksDest, { recursive: true, force: true });

// 2) Flutter engine at the site root (never overwrite our own favicon).
const chartDir = resolve(dist, 'chart');
if (existsSync(chartDir)) {
    cpSync(chartDir, publicDir, {
        recursive: true,
        filter: src => !src.endsWith('favicon.png') && !src.endsWith('favicon.svg'),
    });
}

// 3) Flutter asset bundle at /assets.
const assetsDir = resolve(dist, 'assets');
if (existsSync(assetsDir)) {
    const assetsDest = resolve(publicDir, 'assets');
    mkdirSync(assetsDest, { recursive: true });
    cpSync(assetsDir, assetsDest, { recursive: true, force: true });
}


