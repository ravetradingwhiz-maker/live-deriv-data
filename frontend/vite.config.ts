import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    // Expose selected env vars to the client as process.env.* so the ported
    // Deriv auth code (which reads process.env.CLIENT_ID etc.) works unchanged.
    const define: Record<string, string> = {};
    ['CLIENT_ID', 'APP_ID', 'REDIRECT_URL', 'API_URL'].forEach(key => {
        define[`process.env.${key}`] = JSON.stringify(env[key] ?? '');
    });

    // When serving through an https tunnel (ngrok/cloudflare), the page loads on
    // port 443, so Vite's HMR websocket must connect on 443 too. Enable with
    // TUNNEL=1 in .env. Left off, HMR uses the normal local port.
    const tunnel = env.TUNNEL === '1' || env.TUNNEL === 'true';

    return {
        plugins: [react()],
        define,
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
        build: {
            // Keep Vite's own output out of /assets — that path is used by the
            // SmartCharts Flutter engine's asset bundle (served from public/assets).
            assetsDir: 'app-assets',
        },
        server: {
            port: 5173,
            host: true,
            // Allow any host (needed for ngrok/cloudflare tunnels whose host
            // changes each session). Fine for a dev server.
            allowedHosts: true,
            hmr: tunnel ? { clientPort: 443 } : undefined,
        },
        preview: {
            port: 4173,
            host: true,
            allowedHosts: true,
        },
    };
});
