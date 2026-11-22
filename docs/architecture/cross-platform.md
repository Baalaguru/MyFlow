# Cross-platform architecture

Web and Android are built in parallel. The architecture's main job is to prevent two implementations from drifting.

## 1. Shared contract surface

| Shared artifact | Location | Consumed by |
| --- | --- | --- |
| REST + entity schemas | `contracts/openapi/`, `contracts/schemas/` | Generated TS models (web), generated Kotlin models (Android), Go server validation |
| Design tokens | `contracts/tokens/tokens.json` | Tailwind/CSS variables, Compose theme, chart palettes |
| Localization bundles | `contracts/i18n/en.json`, `ta.json` | Web message loader, Android string resources generator |
| Calculation fixtures | `contracts/fixtures/` | Both clients' unit tests |
| Sync protocol spec | `docs/architecture/sync-protocol.md` | Both sync engines, server |

CI verifies that generated artifacts are current and that both clients pass the same fixtures. A contract change that is not reflected in both clients fails the build.

## 2. Local database parity

| Logical entity | Web (Dexie / IndexedDB) | Android (Room / SQLite) |
| --- | --- | --- |
| Table/collection names | Identical to canonical model | Identical to canonical model |
| Column names and types | Identical logical types | Identical logical types |
| ID strategy | UUIDv7, generated before write | UUIDv7, generated before write |
| Metadata columns | `id`, `revision`, `hlc_*`, `base_*` | Same |
| Migrations | Versioned Dexie upgrades | Versioned Room migrations |
| Queries | Repository layer only | Repository layer only |

A parity test compares table lists, column names, and logical types from both schema definitions against `docs/architecture/data-model.md`.

## 3. Feature parity for v1

| Capability | Web | Android | Notes |
| --- | --- | --- | --- |
| All v1 modules | Yes | Yes | Same fields, views, and calculations |
| Offline create/edit/delete/search/analytics | Yes | Yes | Local DB is the read path on both |
| Multiple dashboards + widget grid | Full drag/resize grid | Configurable widget list/layout | Platform interaction differs, configuration schema is shared |
| Home-screen widgets | N/A | Six Glance widgets | Read Room directly; actions write locally and queue sync |
| Biometric unlock | No (passphrase + WebCrypto where available) | OS biometric prompt | No templates stored by the app |
| Step sensor | N/A (manual entry) | Sensor where available | `count_source` records provenance; no fabricated values |
| Cycling GPS | N/A | GPS where permitted | Permission-denied fallback: manual distance/duration, no invented speed |
| Local notifications | Limited when tab is closed | Reliable via WorkManager | Android is the primary reminder surface |
| File/image access | File picker | Android storage + camera intents | Attachments content-addressed and encrypted where sensitive |

## 4. Platform-specific constraints

| Constraint | Consequence |
| --- | --- |
| Browser tab may be closed | Web reminders are best-effort; critical reminders require Android or server-side channels in a later phase |
| Background execution limits | Android uses WorkManager with battery-conscious scheduling; no continuous polling |
| Sensor availability varies | Every sensor-derived field is nullable with an explicit unavailable state |
| Widget refresh budget | Widgets read local DB, refresh on system schedules and explicit actions, and show stale-data indicators |
| WebCrypto support varies | Passphrase-based fallback plus recovery key; never store plaintext sensitive fields |

## 5. Shared calculation strategy

Both clients implement the same pure calculation functions and run the same JSON fixtures ([ADR-0013](../adr/0013-analytics-rules.md)). No shared runtime (e.g., Kotlin Multiplatform) is introduced in v1; the fixture set is the compatibility contract. Adding a rule requires adding fixtures that both clients must pass before release.

## 6. Test strategy across platforms

1. Contract tests: generated models compile against current schemas.
2. Fixture tests: identical calculation results for every rule.
3. Parity tests: local schema definitions match the canonical model.
4. Offline scenarios: create/edit/delete offline → restart → reconnect → verify no loss or duplication.
5. Themed UI checks: light/dark/presets, custom colors, typography preferences, a11y.
6. Device tests on physical Android hardware for sensors, GPS, widgets, and battery consumption.
