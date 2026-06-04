import { createRoot } from 'react-dom/client';
import App from '@/App';
import '@/index.css';

// Note: intentionally NOT wrapped in <StrictMode>. Its dev double-mount breaks
// libraries with module-level singletons / one-time init (SmartCharts' trading-
// times store, OAuth one-time code/CSRF consumption).
createRoot(document.getElementById('root')!).render(<App />);
