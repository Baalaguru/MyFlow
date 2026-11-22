import tokens from '../../contracts/tokens/tokens.json' with { type: 'json' }

const { primitives, fontFamily } = {
  primitives: tokens.colors.primitives,
  fontFamily: tokens.typography,
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        parchment: primitives.parchment,
        paper: primitives.paper,
        leather: primitives.leather,
        sage: primitives.sage,
        terracotta: primitives.terracotta,
        ink: primitives.ink,
      },
      fontFamily: {
        display: fontFamily.display,
        heading: fontFamily.heading,
        body: fontFamily.body,
      },
      boxShadow: {
        paper: '0 1px 2px rgba(59, 51, 43, 0.08), 0 8px 24px rgba(59, 51, 43, 0.06)',
      },
    },
  },
  plugins: [],
}
