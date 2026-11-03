import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// `__dirname` does not exist in an ESM config (this package is type: module).
const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Unit tests only. The growth maths behind the dashboard cards is pure, so it
 * runs in node with no DOM — this config deliberately does not pull in the app's
 * vite config, which defines `process.env.*` for the browser bundle.
 */
export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(here, './src'),
        },
    },
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
    },
});
