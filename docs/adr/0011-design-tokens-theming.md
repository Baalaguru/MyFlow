# ADR-0011: Design tokens and theming

- **Status:** Accepted
- **Date:** 2026-11-22
- **Related:** D-10, [ADR-0002](0002-monorepo-layout.md)

## Context

The product requires a distinctive vintage visual identity, light and dark themes designed independently, five presets plus custom palettes, customization of widget/panel/chart colors, and consistent appearance on web and Android.

## Decision

- `contracts/tokens/tokens.json` is the source of truth for six color primitives, semantic role mappings, typography scale, spacing, radii, elevation, motion, and chart palettes.
- Generate CSS variables/Tailwind theme for web and Kotlin/Compose theme constants for Android; commit generated output and verify in CI.
- Light and Dark palettes are authored independently; dark uses deep warm browns and warm cream text, never pure black/white dominance.
- Presets: Vintage Library, Botanical Garden, Autumn Journal, Coffee & Paper, Olive Vintage, Custom — each with coordinated light and dark maps.
- Semantic roles decouple components from primitives so custom colors cannot break layout.
- A CI contrast guard rejects unreadable foreground/background combinations; defaults are always restorable.
- Typography uses Cormorant Garamond, Libre Baskerville, Lora, and Nunito Sans per role; supports font scaling, line spacing, reading width, reduced motion, and Android system font scaling.
- Paper textures, shadows, and animations stay subtle; no generic Inter/Roboto identity.

## Consequences

**Positive**

- Both clients stay visually consistent while allowing customization.
- Contrast and accessibility are enforced mechanically.
- Theme changes require token edits, not component rewrites.

**Negative**

- Token generation and CI checks must be built before feature UI work.
- Custom colors need sensible role constraints and fallback text colors.

## Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Hand-coded styles per platform | Drift and inconsistent themes |
| Invert light theme for dark | Explicitly forbidden by the specification |
| Runtime theme fetched from server | Theme must work offline and load before sync |

## Verification

CI generates tokens and checks for dirty tree; contrast guard runs for every preset and theme; UI tests render all shared components in both themes and preset combinations.
