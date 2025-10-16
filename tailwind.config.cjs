/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  // Safelist percentage width utilities for runtime-generated progress widths
  safelist: Array.from({ length: 101 }, (_, i) => `w-[${i}%]`),
}
