/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '"Noto Sans Kannada"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        ink: {
          950: 'rgb(var(--ink-950) / <alpha-value>)',
          900: 'rgb(var(--ink-900) / <alpha-value>)',
          850: 'rgb(var(--ink-850) / <alpha-value>)',
          800: 'rgb(var(--ink-800) / <alpha-value>)',
          700: 'rgb(var(--ink-700) / <alpha-value>)',
          600: 'rgb(var(--ink-600) / <alpha-value>)',
          500: 'rgb(var(--ink-500) / <alpha-value>)',
          400: 'rgb(var(--ink-400) / <alpha-value>)',
          300: 'rgb(var(--ink-300) / <alpha-value>)',
          200: 'rgb(var(--ink-200) / <alpha-value>)',
          100: 'rgb(var(--ink-100) / <alpha-value>)',
        },
        forest: {
          deep: 'rgb(var(--forest-deep) / <alpha-value>)',
          base: 'rgb(var(--forest-base) / <alpha-value>)',
          light: 'rgb(var(--forest-light) / <alpha-value>)',
          bright: 'rgb(var(--forest-bright) / <alpha-value>)',
          pale: 'rgb(var(--forest-pale) / <alpha-value>)',
        },
        teal: {
          850: 'rgb(var(--coastal-pale) / <alpha-value>)',
          700: 'rgb(var(--coastal-soft) / <alpha-value>)',
          500: 'rgb(var(--coastal-medium) / <alpha-value>)',
          400: 'rgb(var(--coastal-medium) / <alpha-value>)',
          300: 'rgb(var(--coastal-deep) / <alpha-value>)',
        },
        success: {
          deep: 'rgb(var(--success-deep) / <alpha-value>)',
          base: 'rgb(var(--forest-base) / <alpha-value>)',
          bright: 'rgb(var(--forest-light) / <alpha-value>)',
          pale: 'rgb(var(--forest-base) / <alpha-value>)',
        },
        earth: {
          dark: 'rgb(var(--earth-dark) / <alpha-value>)',
          clay: 'rgb(var(--earth-medium) / <alpha-value>)',
          sand: 'rgb(var(--earth-sand) / <alpha-value>)',
          gold: 'rgb(var(--border) / <alpha-value>)',
          beige: 'rgb(var(--earth-beige) / <alpha-value>)',
        },
        risk: {
          low: 'rgb(var(--forest-base) / <alpha-value>)',
          moderate: 'rgb(var(--risk-moderate) / <alpha-value>)',
          elevated: 'rgb(var(--risk-elevated) / <alpha-value>)',
          high: 'rgb(var(--risk-high) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
};
