import { createRoot } from 'react-dom/client';
import App from '@/App';
import '@/index.css';

// Note: intentionally NOT wrapped in <StrictMode>. Its dev double-mount breaks
// libraries with module-level singletons / one-time init (SmartCharts' trading-
// times store, OAuth one-time code/CSRF consumption).
createRoot(document.getElementById('root')!).render(<App />);

// Register the service worker so the app is installable and works offline.
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {
            /* offline / unsupported — the app still runs, just not installable */
        });
    });
}
