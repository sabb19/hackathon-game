/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1a1b1d',
        night: '#26282c',
        concrete: '#5f6266',
        steel: '#3c5a78',
        fog: '#a3a6aa',
        cream: '#e8e2d2',
        signal: '#e8823a',
        ok: '#7cc495',
        bad: '#e0634b',
      },
      fontFamily: {
        sans: ['"Inter Tight"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        display: ['"Big Shoulders Display"', '"Inter Tight"', 'sans-serif'],
        hand: ['"Caveat"', 'cursive'],
      },
    },
  },
  plugins: [],
}
