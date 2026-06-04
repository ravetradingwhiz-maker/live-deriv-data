/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                // Darker-cyan theme — solid colors only, no gradients.
                cyan: {
                    DEFAULT: '#0e7490', // primary action
                    50: '#ecfeff',
                    100: '#cffafe',
                    200: '#a5f3fc',
                    300: '#67e8f9',
                    400: '#22d3ee',
                    500: '#06b6d4',
                    600: '#0891b2',
                    700: '#0e7490',
                    800: '#155e75',
                    900: '#164e63',
                    950: '#083344',
                },
                // Near-black, teal-tinted surfaces for the dark UI.
                ink: {
                    DEFAULT: '#06141a',
                    900: '#06141a',
                    800: '#0a1c24',
                    700: '#0f2730',
                    600: '#15333d',
                    500: '#1d434f',
                },
                line: '#173842',
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
