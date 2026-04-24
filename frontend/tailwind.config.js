/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        s: {
          bg:     '#0A0A0A',
          card:   '#141414',
          cardhi: '#1A1A1A',
          chip:   '#1F1F1F',
          accent: '#1D9E75',
          hover:  '#178A64',
          ghost:  'rgba(29,158,117,0.12)',
          neg:    '#F87171',
          info:   '#60A5FA',
          warn:   '#F59E0B',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
