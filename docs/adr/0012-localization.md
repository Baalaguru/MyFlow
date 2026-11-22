# ADR-0012: Localization and formatting

- **Status:** Accepted
- **Date:** 2026-11-22
- **Related:** [ADR-0006](0006-time-model.md), [ADR-0011](0011-design-tokens-theming.md)

## Context

The architecture is multi-language with English and Tamil translations. Dates, numbers, and currency must format correctly, and the development rules forbid hard-coded user-facing strings.

## Decision

- ICU message bundles in `contracts/i18n/en.json` and `ta.json` with stable dotted keys (e.g., `tasks.due.overdue`).
- Web loads bundles at runtime; Android generates string resources from the same source.
- Fallback chain: selected locale → `en`. Missing keys are build warnings and release blockers.
- All dates, times, numbers, and currency use platform locale APIs with the user's timezone and format preferences; no manually concatenated formatted strings.
- Pluralization uses ICU plural forms; no string building in code.
- Tamil is left-to-right, but layout must not hard-code text direction assumptions that would prevent future RTL support.
- Server error codes map to localized strings; raw server messages are never shown to users.
- A string lint check fails the build on user-facing literals outside bundles.

## Consequences

**Positive**

- Adding a language is a translation task, not a code change.
- Consistent wording, pluralization, and formatting across clients.
- Server errors remain user-friendly and localized.

**Negative**

- Every new UI string requires bundle updates on both languages.
- ICU syntax must be learned and reviewed carefully.

## Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Hard-coded English strings | Explicitly forbidden |
| Separate per-platform translation files | Drift; single source required |
| Machine translation at runtime | Unreliable, requires network, unacceptable quality |

## Verification

String lint, bundle completeness check, and locale-format fixtures for `en-IN` and `ta-IN` run in CI; UI tests switch language and verify no raw keys or fallback leakage.
