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
          950: '#F3EFE5',
          900: '#FAF9F5',
          850: '#FFFFFF',
          800: '#EBE6DC',
          700: '#DDD4C4',
          600: '#C9BDA9',
          500: '#74695B',
          400: '#655F55',
          300: '#585A50',
          200: '#41453E',
          100: '#292D27',
        },
        forest: {
          deep: '#E5EEE7',
          base: '#315D50',
          light: '#4D9B89',
          bright: '#315D50',
          pale: '#244B3D',
        },
        teal: {
          850: '#E4EEE7',
          700: '#A7B68A',
          500: '#4D9B89',
          400: '#4D9B89',
          300: '#315D50',
        },
        success: {
          deep: '#0D382D',
          base: '#147A58',
          bright: '#28C48A',
          pale: '#9BE8C7',
        },
        earth: {
          clay: '#765943',
          sand: '#68734E',
          gold: '#D6C5A5',
        },
        risk: {
          low: '#315D50',
          moderate: '#8A6510',
          elevated: '#A75030',
          high: '#B4483C',
        },
      },
    },
  },
  plugins: [],
};
