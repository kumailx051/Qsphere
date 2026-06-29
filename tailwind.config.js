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
    fontSize: {
      xs: ['var(--type-tinyText-size)', { lineHeight: 'var(--type-tinyText-lineHeight)', letterSpacing: 'var(--type-tinyText-letterSpacing)', fontWeight: 'var(--type-tinyText-weight)' }],
      sm: ['var(--type-cardBody-size)', { lineHeight: 'var(--type-cardBody-lineHeight)', letterSpacing: 'var(--type-cardBody-letterSpacing)', fontWeight: 'var(--type-cardBody-weight)' }],
      base: ['var(--type-bodyText-size)', { lineHeight: 'var(--type-bodyText-lineHeight)', letterSpacing: 'var(--type-bodyText-letterSpacing)', fontWeight: 'var(--type-bodyText-weight)' }],
      lg: ['var(--type-bodyLarge-size)', { lineHeight: 'var(--type-bodyLarge-lineHeight)', letterSpacing: 'var(--type-bodyLarge-letterSpacing)', fontWeight: 'var(--type-bodyLarge-weight)' }],
      xl: ['var(--type-titleSm-size)', { lineHeight: 'var(--type-titleSm-lineHeight)', letterSpacing: 'var(--type-titleSm-letterSpacing)', fontWeight: 'var(--type-titleSm-weight)' }],
      '2xl': ['var(--type-titleMd-size)', { lineHeight: 'var(--type-titleMd-lineHeight)', letterSpacing: 'var(--type-titleMd-letterSpacing)', fontWeight: 'var(--type-titleMd-weight)' }],
      '3xl': ['var(--type-cardHeading-size)', { lineHeight: 'var(--type-cardHeading-lineHeight)', letterSpacing: 'var(--type-cardHeading-letterSpacing)', fontWeight: 'var(--type-cardHeading-weight)' }],
      '4xl': ['var(--type-sectionHeading-size)', { lineHeight: 'var(--type-sectionHeading-lineHeight)', letterSpacing: 'var(--type-sectionHeading-letterSpacing)', fontWeight: 'var(--type-sectionHeading-weight)' }],
      '5xl': ['var(--type-heading-size)', { lineHeight: 'var(--type-heading-lineHeight)', letterSpacing: 'var(--type-heading-letterSpacing)', fontWeight: 'var(--type-heading-weight)' }],
      '6xl': ['var(--type-heroHeading-size)', { lineHeight: 'var(--type-heroHeading-lineHeight)', letterSpacing: 'var(--type-heroHeading-letterSpacing)', fontWeight: 'var(--type-heroHeading-weight)' }],
    },
    extend: {},
  },
  plugins: [],
}
