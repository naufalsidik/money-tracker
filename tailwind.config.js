/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Sora', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        bg: '#0d1117',
        surface: '#161b22',
        border: '#21262d',
        accent: '#f0a500',
        green: '#3fb950',
        red: '#f85149',
        muted: '#8b949e',
      }
    },
  },
  plugins: [],
}
