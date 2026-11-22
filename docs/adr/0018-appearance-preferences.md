# ADR-0018: Appearance preference model

- **Status:** Accepted
- **Date:** 2026-11-22
- **Related:** [ADR-0011](0011-design-tokens-theming.md), [ADR-0012](0012-localization.md)

## Context

Phase 3 introduces user-controlled appearance choices: colour preset, light/dark/system mode, font character, text size, line spacing, heading size, custom accent/widget/panel colours, and restoring defaults. These preferences must survive a restart, work with the server unreachable, and never produce unreadable foreground/background pairs.

## Decision

- Web appearance is stored as one versioned JSON object in `localStorage` under `myflow.appearance`; locale remains a separate `myflow.locale` key.
- Only preset IDs, mode IDs, font-preference IDs, and six-digit hex colours read from the token contract are accepted. Unknown or stale stored values fall back to documented defaults instead of crashing the shell.
- Custom colours are allowed only for the `primary`, `growth`, `highlight`, `widgetBackground`, and `panel` roles, and only when the Custom Palette preset is active.
- Foreground colours for custom backgrounds are computed from relative luminance and the nearest of the two contract-approved foregrounds. A pair is accepted only at 4.5:1 or better; invalid choices are rejected before any state is written.
- Typography preferences are applied as multipliers and selectors on generated CSS custom properties, so no component hard-codes a font size, family, or line height.
- Android consumes the same generated token maps through a small Compose theme wrapper; device-level font scaling is left to the platform rather than overridden.
- Restoring defaults clears custom colours and typography overrides but never touches user records.

## Consequences

**Positive**

- Appearance loads before network access and cannot be blocked by sync.
- Invalid stored preferences degrade to defaults rather than an unusable UI.
- One contract drives contrast checks on both platforms.

**Negative**

- Preferences are per-device until a later sync phase defines a conflict-safe account-level model.
- Android custom-palette editing is not exposed in Phase 3; the generated maps are consumed read-only.

## Verification

`scripts/validate-contracts.mjs` checks generated artifact freshness, i18n parity, and contrast for every preset and mode. Web unit tests cover luminance, contrast symmetry, hex validation, readable foreground selection, and rejection of invalid custom colours. The Phase 3 browser gate exercises preset, mode, typography, custom-colour rejection, and restore-default flows.
