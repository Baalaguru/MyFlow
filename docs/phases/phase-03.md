# Phase 3 report — design system and appearance

Gate policy: [quality.md §5](../architecture/quality.md#5-phase-completion-gate).

- **Run timestamp:** 2026-11-22T12:55:27Z (2026-11-22 18:25 IST)
- **Build version:** 0.1.0 (web `package.json`, Android `versionName`, API health response)
- **Commit scope:** Phase 3 design system and appearance; see repository history for the commit
- **Host:** Windows 11, Node v24.11.1, npm 11.6.2, Docker Engine 29.9.2
- **Browser:** Edge 158.0.0.0 / Chromium 158, Windows NT 10.0 x64, browse relay 0.1.5
- **Device:** none (no Android emulator or physical device available)

## Surface results

| Surface | Result | Build / environment | Evidence |
| --- | --- | --- | --- |
| Server | **PASS** | API 0.1.0 in Docker, PostgreSQL 16-alpine, Docker Engine 29.9.2 | `docker compose up --build -d`; `/healthz` and `/v1/health` returned `status=ok, database=connected`; `/v1` followed its redirect and returned the JSON `not_found` envelope; `schema_migrations` contains `0001_initial.sql` |
| Web | **PASS** | Web 0.1.0, Vite 6.4.6, Edge 158 / Chromium 158 | Cold load at `http://127.0.0.1:5173`; shell, navigation, dashboard, quick capture, appearance settings, design-system showcase, language toggle, and connection pill rendered; all six presets exercised in light and dark; invalid and valid custom colours verified; restore defaults verified; `npm test` (11 tests), `npm run lint`, and `npm run build` passed; no uncaught browser errors in the final interaction pass |
| Android | **NOT APPLICABLE** | versionName 0.1.0, static Compose parity only | No `ANDROID_HOME`, no SDK, no emulator, no device. Debug build could not be produced or installed. Token-driven theme, resource-backed strings, Tamil resources, and widget strings were implemented but not runtime-verified. Not marked as passed; see [apps/android/README.md](../../apps/android/README.md) |

## Offline cold-start check

1. API container stopped with `docker compose stop api`.
2. Connection pill changed from **Online** to **Offline** after the failed health probe.
3. Page reloaded from scratch while the API was down. Dashboard, navigation, local task count (2 records), theme controls, and language controls all rendered. No API request is required to paint the shell.
4. API restarted; pill returned to **Online** after the next probe, with the same 2 local records still present.
5. Fonts remain self-hosted via `@fontsource`; no external CDN request appears in the cold-start network log. The only non-HTTP entry is the Vite HMR websocket on `127.0.0.1:5173`.

Expected non-fatal console entry during the offline run: the browser logs `500` for the failed `/healthz` probe while the API container is stopped. This is the health probe behaving correctly, not a JavaScript exception. No React warnings or favicon 404s remain after the fixes in this phase.

## Browser interaction pass

- **Presets and modes:** all six presets (Vintage Library, Botanical Garden, Autumn Journal, Coffee & Paper, Olive Vintage, Custom) applied correctly in both light and dark; `data-preset`, `data-mode`, background, and primary colours matched the generated token maps.
- **Typography and spacing:** font character, text size, line spacing, and heading size selectors changed the active CSS variables and `data-*` attributes; Restore Defaults cleared all overrides and stored the versioned default preference object.
- **Custom colours:** an unreadable grey was rejected with a visible alert and left the palette unchanged; `#70563B` was accepted, switched the preset to Custom, and produced lowercase `--mf-primary`.
- **Localisation:** English and Tamil shell/navigation strings switched without a reload. The duplicate-key warning that appeared when “Home” was both the first and current breadcrumb in Tamil was fixed by keying breadcrumbs by position.
- **Design system:** the showcase rendered palette, primitives, typography, controls, interaction states, feedback/progress, data display, and navigation sections. Sync indicator states are labelled as component states only; the chart caption states that no module data is represented.
- **Quick capture:** saving a task from the bottom sheet incremented the local dashboard count from 2 to 3, closed the sheet, and showed the saved toast.
- **Responsive:** the mobile module navigation became visible at 390 × 844 with 44 px minimum touch targets.
- **Console:** the final interaction pass produced no console entries.

## Automated gate

`.\scripts\smoke.ps1` output at run time:

```text
Surface                      Status         Detail
-------                      ------         ------
Contracts                    PASS           Contracts valid: 141 strings x2 locales, 6 presets x2 modes, generated artifacts current.
Server /healthz + /v1/health PASS           status=ok database=connected version=0.1.0 time=2026-11-22T12:55:27Z
Server /v1 envelope          PASS           HTTP 404, JSON not_found envelope returned
Server migrations            PASS           applied_migrations=1
Web shell                    PASS           HTTP 200, title present at http://127.0.0.1:5173
Android debug build          NOT APPLICABLE ANDROID_HOME is not set; no SDK, emulator, or device available
```

Additional checks run in this phase: `node scripts/validate-contracts.mjs`, `npm test`, `npm run lint`, and `npm run build`. The build emits a non-blocking chunk-size warning for the main bundle; there are no type or lint errors.

## Scope delivered

- `contracts/tokens/tokens.json` expanded to six presets with independent light/dark maps, semantic and state roles, module accents, typography families/preferences, spacing, radii, elevation, motion, and chart palettes.
- `scripts/generate-tokens.mjs` writes committed CSS/TypeScript/Kotlin artifacts; `scripts/validate-contracts.mjs` checks i18n parity, token shape, generated-artifact freshness, and contrast.
- Web appearance engine with versioned local preferences, validation of stored values, system-mode support, custom colours with a 4.5:1 foreground guard, and restore-default confirmation. See [ADR-0018](../adr/0018-appearance-preferences.md).
- Shared web component library and Appearance/Design system screens; all user-facing strings resolve through the English/Tamil contract bundles. Quick capture writes real records to Dexie/IndexedDB.
- Android Compose theme wrapper consumed generated token maps, token-driven parity screen, resource-backed English and Tamil strings, and resource-backed widget labels.
- Architecture documentation updated in [design-system.md](../architecture/design-system.md); phase gate script extended with contract validation and the `/v1` envelope check.

## Known limitations carried forward

- Android runtime remains unverified until an SDK and device are available. This is an environment blocker, not a passed check.
- Appearance preferences are per-device until a later sync phase defines a conflict-safe account-level model.
- Android consumes custom token maps read-only; custom-palette editing is exposed on web only.
- The Gradle wrapper JAR is still not checked in; generate it with a local Gradle install as described in the Android README.
- Local Go installation was not completed; Docker provides the build toolchain.
- Module workspaces, sync engine, sensors, GPS, finance records, and backups remain intentionally out of scope for this phase.
