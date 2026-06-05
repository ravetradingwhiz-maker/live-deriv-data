/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                // Bright accent shades (200–400) are theme-aware: original/bright
                // in dark, darker in light so they stay readable on white.
                cyan: {
                    DEFAULT: '#0e7490', // primary action
                    50: '#ecfeff',
                    100: '#cffafe',
                    200: 'rgb(var(--cyan-200) / <alpha-value>)',
                    300: 'rgb(var(--cyan-300) / <alpha-value>)',
                    400: 'rgb(var(--cyan-400) / <alpha-value>)',
                    500: '#06b6d4',
                    600: '#0891b2',
                    700: '#0e7490',
                    800: '#155e75',
                    900: '#164e63',
                    950: '#083344',
                },
                emerald: {
                    300: 'rgb(var(--emerald-300) / <alpha-value>)',
                    400: 'rgb(var(--emerald-400) / <alpha-value>)',
                },
                amber: {
                    200: 'rgb(var(--amber-200) / <alpha-value>)',
                    300: 'rgb(var(--amber-300) / <alpha-value>)',
                    400: 'rgb(var(--amber-400) / <alpha-value>)',
                },
                violet: {
                    200: 'rgb(var(--violet-200) / <alpha-value>)',
                    300: 'rgb(var(--violet-300) / <alpha-value>)',
                    400: 'rgb(var(--violet-400) / <alpha-value>)',
                },
                rose: {
                    300: 'rgb(var(--rose-300) / <alpha-value>)',
                    400: 'rgb(var(--rose-400) / <alpha-value>)',
                },
                sky: {
                    400: 'rgb(var(--sky-400) / <alpha-value>)',
                },
                // Surfaces — driven by CSS variables so they flip with the theme
                // (.dark / .light defined in index.css). RGB triplets enable the
                // `/opacity` modifier (e.g. bg-ink-900/90).
                ink: {
                    DEFAULT: 'rgb(var(--ink-900) / <alpha-value>)',
                    900: 'rgb(var(--ink-900) / <alpha-value>)',
                    800: 'rgb(var(--ink-800) / <alpha-value>)',
                    700: 'rgb(var(--ink-700) / <alpha-value>)',
                    600: 'rgb(var(--ink-600) / <alpha-value>)',
                    500: 'rgb(var(--ink-500) / <alpha-value>)',
                },
                line: 'rgb(var(--line) / <alpha-value>)',
                // Primary text. `text-white` flips to dark in the light theme;
                // for elements that must stay white/dark, use text-[#fff]/[#06141a].
                white: 'rgb(var(--fg) / <alpha-value>)',
                // Muted text scale — flips per theme.
                slate: {
                    200: 'rgb(var(--slate-200) / <alpha-value>)',
                    300: 'rgb(var(--slate-300) / <alpha-value>)',
                    400: 'rgb(var(--slate-400) / <alpha-value>)',
                    500: 'rgb(var(--slate-500) / <alpha-value>)',
                    600: 'rgb(var(--slate-600) / <alpha-value>)',
                    700: 'rgb(var(--slate-700) / <alpha-value>)',
                },
            },
            fontFamily: {
                sans: ['Poppins', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
                mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
            },
            container: {
                center: true,
                padding: '1.25rem',
                screens: {
                    '2xl': '1200px',
                },
            },
        },
    },
    plugins: [],
};
