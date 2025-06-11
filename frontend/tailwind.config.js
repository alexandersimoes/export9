/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'game-primary': '#3B82F6',
        'game-secondary': '#10B981',
        'game-accent': '#F59E0B',
        'game-danger': '#EF4444'
      }
    },
  },
  plugins: [],
}