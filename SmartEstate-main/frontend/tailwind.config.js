/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0F1720',      // page background
        slate: '#1C2530',    // card surfaces
        hairline: '#2A3542', // borders / dividers
        parchment: '#EDEEF0',// primary text
        muted: '#8B96A5',    // secondary text
        brass: '#C9A227',    // signature accent (value, action)
        sage: '#34D399',     // positive / underpriced
        rust: '#E2725B',     // negative / overpriced / risk
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}