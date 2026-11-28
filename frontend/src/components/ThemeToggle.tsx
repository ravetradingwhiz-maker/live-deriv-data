import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

/** Light/dark theme toggle (sun in dark mode → switch to light, moon vice-versa). */
const ThemeToggle = ({ className = '' }: { className?: string }) => {
    const { theme, toggle } = useTheme();
    return (
        <button
            type='button'
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            onClick={toggle}
            /* The icon alone — no box around it. The hit area stays 36px, so
               it is still comfortably tappable without anything drawn. */
            className={`festive-on-red inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition-colors hover:text-cyan-300 ${className}`}
        >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
    );
};

export default ThemeToggle;
