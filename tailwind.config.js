/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    fontFamily: {
      sans: ['var(--font-body)'],
      heading: ['var(--font-heading)'],
      display: ['var(--font-heading)'],
      accent: ['var(--font-accent)'],
    },
    extend: {},
  },
  plugins: [],
}
