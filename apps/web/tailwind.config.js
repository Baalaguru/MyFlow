import tokens from '../../contracts/tokens/tokens.json' with { type: 'json' }

const { primitives } = tokens.colors
const { families, scale } = tokens.typography
const { radii } = tokens

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
        display: families.appTitle,
        heading: families.heading,
        section: families.section,
        body: families.body,
      },
      fontSize: Object.fromEntries(
        Object.entries(scale).map(([name, value]) => [name, `${value}px`]),
      ),
      borderRadius: {
        paper: `${radii.lg}px`,
      },
      boxShadow: {
        paper: tokens.elevation.paper,
        raised: tokens.elevation.raised,
      },
    },
  },
  plugins: [],
}
