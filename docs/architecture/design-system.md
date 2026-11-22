# Design system

The visual identity is **Vintage Literary + Botanical + Modern Productivity** — a personal journal, library, and botanical planner, never a generic dashboard. Decisions are binding in [ADR-0011](../adr/0011-design-tokens-theming.md).

## 1. Color primitives

All six colors are available throughout the application.

| Token | Hex | Role |
| --- | --- | --- |
| `parchment` | `#F3EBDD` | Primary light background |
| `paper` | `#E4D7C1` | Cards and panels |
| `leather` | `#70563B` | Primary accent |
| `sage` | `#788064` | Nature and growth |
| `terracotta` | `#A36F59` | Highlights |
| `ink` | `#3B332B` | Text and dark surfaces |

Semantic roles (`background`, `surface`, `surfaceAlt`, `primary`, `onPrimary`, `growth`, `onGrowth`, `highlight`, `onHighlight`, `text`, `muted`, `border`, `success`, `warning`, `danger`, `disabled`, `focus`, `widgetBackground`, `panel`) map to primitives per theme and preset, so customization changes roles without breaking contrast.

## 2. Light and dark

- **Light:** parchment background, aged-paper surfaces, leather buttons, sage growth accents, terracotta highlights, ink text, subtle warm borders, optional paper texture.
- **Dark:** independently designed deep warm brown and ink backgrounds, warm cream foreground, dark brown surfaces, muted leather/sage/terracotta accents. No pure black or pure white as dominant colors; chart colors re-tuned for dark surfaces.
- **System:** follows OS preference while preserving the chosen preset.

## 3. Theme presets

Each preset defines coordinated light and dark token maps:

1. Vintage Library
2. Botanical Garden
3. Autumn Journal
4. Coffee & Paper
5. Olive Vintage
6. Custom Palette

Customization covers accent colors, widget backgrounds, module accents, panel colors, and chart palettes. A contrast guard in CI rejects unreadable foreground/background pairs and permits restoring defaults.

## 4. Typography

| Usage | Font |
| --- | --- |
| Application title | Cormorant Garamond |
| Main headings | Libre Baskerville |
| Section headings | Lora |
| Body text | Nunito Sans |
| Journal content | Cormorant Garamond |
| Reading notes | Lora / Cormorant Garamond |
| Statistics | Lora / Nunito Sans |
| Quotes | Serif italic |

Hierarchy uses restrained weights, generous line height, letter-spaced small uppercase labels, and comfortable measure width. Font scaling, size/line-spacing/heading preferences, Android system font scaling, reduced motion, and accessible chart descriptions are required. Inter/Roboto must not be the dominant identity; system fonts are acceptable only for native controls and accessibility.

## 5. Component inventory

Navigation: sidebar, mobile navigation, top bar, breadcrumbs, module headers, deep links.
Inputs: buttons, icon buttons, fields, textareas, selects, date/time pickers, dialogs, confirmation dialogs, bottom sheets.
Feedback: toasts, tooltips, progress bars/rings, offline and sync indicators, loading skeletons, empty and error states.
Data: statistics cards, tables, charts, responsive cards, heatmaps, muscle diagrams, book gallery.

Each component is implemented once per platform from the same token set and verified in both themes, all presets, keyboard navigation, touch-target sizing, and screen readers.

## 6. Token pipeline

```text
contracts/tokens/tokens.json  (source of truth)
        │
        ├── generated CSS variables + Tailwind theme  → web
        └── generated Kotlin constants / Compose theme → Android
```

Tokens include colors, semantic role mappings, module accents, interaction-state roles, typography families and preferences, spacing, radii, elevation, motion durations, and chart palettes. `scripts/generate-tokens.mjs` writes the committed web CSS/TypeScript and Kotlin artifacts; `node scripts/generate-tokens.mjs --check` fails when they are stale, and `scripts/validate-contracts.mjs` also checks i18n parity and contrast. Hand-editing generated output is prohibited.

## 8. Phase 3 implementation status

- Web: all shared components are implemented in `apps/web/src/components/ui/` and exercised on the Design system screen. Status pills, sync indicators, quick capture, breadcrumbs, search, mobile navigation, dialogs, bottom sheets, toasts, tooltips, progress, tables, charts, and responsive cards use token variables only.
- Appearance: `apps/web/src/lib/appearance.ts` persists a versioned local preference object, validates stored values, applies typography selectors and multipliers, and rejects unreadable custom colours. Restoring defaults clears overrides without touching records. See [ADR-0018](../adr/0018-appearance-preferences.md).
- Strings: every user-facing web string resolves from `contracts/i18n/en.json` or `ta.json`; both bundles are checked for parity.
- Android: a Compose wrapper maps generated tokens to Material 3 colours and typography, and a parity screen demonstrates primitives, semantic roles, and type samples. Android strings and Tamil translations are resource-backed. No Android runtime pass is claimed; see the Phase 3 report for the device gate status.
- Charts: the reusable bar graph uses the selected preset and mode palette and an accessible description; no module chart is shown without module data.

## 7. Visual rules

- Consistent 4/8-point spacing and clear information hierarchy.
- Subtle shadows and restrained paper textures.
- No excessive gradients, decoration, or animation.
- Identical iconography and interaction semantics across platforms.
- Charts use the selected theme palette and show meaningful empty/loading/error states; no meaningless charts for modules without data.
