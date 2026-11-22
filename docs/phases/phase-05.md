# Phase 5 report — dashboard system and widgets

Gate policy: [quality.md §5](../architecture/quality.md#5-phase-completion-gate).
Accepted decisions: [ADR-0020](../adr/0020-dashboard-system.md).

- **Run timestamp:** 2026-11-22T13:59:04Z (2026-11-22 19:29 IST)
- **Build version:** 0.1.0 (web `package.json`, Android `versionName`, API health response)
- **Commit scope:** Phase 5 dashboard records, modular grid, widget catalogue, and task-backed analytics
- **Host:** Windows 11, Node v24.11.1, npm 11.6.2, Docker Engine 29.9.2
- **Browser:** Edge 158.0.0.0 / Chromium 158, Windows NT 10.0 x64
- **Device:** none (no Android SDK, emulator, or physical device available)

## Surface results

| Surface | Result | Build / environment | Evidence |
| --- | --- | --- | --- |
| Server | **PASS** | API 0.1.0 in Docker, PostgreSQL 16-alpine, Docker Engine 29.9.2 | `/healthz` and `/v1/health` returned `status=ok, database=connected`; `/v1` returned the JSON `not_found` envelope; `schema_migrations` contains `0001_initial.sql` |
| Web | **PASS** | Web 0.1.0, Vite 6.4.6, Edge 158 / Chromium 158 | Cold load at `http://127.0.0.1:5173/#/dashboard`; dashboard CRUD, ordering, default, widget grid, add/configure/resize/hide/show/remove/reset, charts, themes, and both locales exercised in the live app; `npm test` (32 tests), `npm run lint`, and `npm run build` passed; no application console errors in the final online pass |
| Android | **NOT APPLICABLE** | versionName 0.1.0, static Compose implementation only | No `ANDROID_HOME`, no SDK, no emulator, no device. Debug build could not be produced or installed. Dashboard Room v3 migration, repository, selector, widget list, and 192 resource references were reviewed statically but not runtime-verified. See [apps/android/README.md](../../apps/android/README.md) |

## Browser interaction pass

- **Default and selector:** a fresh device gets exactly one default dashboard. A second concurrent first-run seed was observed during development; first-run seeding was changed to a stable primary key (`default-dashboard`) with an idempotent upsert, and a reload confirmed one default row. The selector lists every dashboard, marks the default, and remembers the active choice across reloads.
- **Creation / rename / duplication / deletion:** created *Work*, renamed it to *Focus*, duplicated it to *Focus — copy* with an independent layout, deleted the extra duplicate, and confirmed deletion never touched the local task record. Deleting the last dashboard recreates a default; the confirmation states that task records are unaffected.
- **Ordering and default:** the in-app up/down controls moved *Focus — copy* ahead of *Focus*, and *Set as default* moved the default badge to it. Both changes survived a reload.
- **Widget grid:** the 12-column grid seeded four task-backed widgets (To-Do overview, weekly statistics, monthly statistics, quick capture). All sixteen catalogue entries appear in the add-widget picker; the four already present are disabled. HTML5 drag-and-drop moved `todoOverview` from position 1 to 3, and the keyboard-equivalent up/down controls moved it back. Reset layout restored the seed order.
- **Configuration:** adding *Habit overview* produced an honest empty state (“Habits are added in a later phase.”), never a zeroed counter. Its settings dialog changed background to `panel` (`rgb(228, 215, 193)`), accent to `growth` (`rgb(79, 90, 60)`), and width to 12 columns (`span 12`). Hiding the widget left a labelled *Show widget* chip; showing it restored the saved configuration; removing it left the other four widgets intact.
- **Charts and progress:** To-Do overview showed the real local record as `1 completed of 1` / 100%. Weekly and monthly statistics showed `Captured: 1` from the task's real timestamp. The legacy task predates `completedAt`, so it is honestly counted as captured but not as completed in the period rather than backdated. Unit tests cover the empty-series case.
- **Themes and locale:** Dark mode changed the page while the widget backgrounds and accents followed the active tokens. Switching to Tamil translated the dashboard name, selector, widget headers, notes, resize labels, and connection pill without a reload. The duplicated name’s system suffix also translated because it is stored as a contract key.
- **Console:** no JavaScript exceptions or React warnings in the final interaction pass.

## Offline cold-start check

1. API container stopped with `docker compose stop api`.
2. Page reloaded at the dashboard deep link. The connection pill changed to **இணைப்பு இல்லை** (*Offline*), yet the selected dashboard, its three surviving records, the To-Do progress (`1 / 1`, 100%), the weekly captured count, widget layout, theme, and Tamil locale all rendered from IndexedDB.
3. API restarted with `docker compose start api`; the pill returned to **இணைக்கப்பட்டது** (*Online*) after the next probe and the same dashboard state remained intact.
4. Expected non-fatal console entries during the offline window: `500` for the failed `/healthz` probe through the Vite proxy. This is the health check behaving correctly, not an application exception.

## Automated gate

`.\\scripts\\smoke.ps1` output at run time:

```text
Surface                      Status         Detail
-------                      ------         ------
Contracts                    PASS           Contracts valid: 257 strings x2 locales, 6 presets x2 modes, generated artifacts current.
Server /healthz + /v1/health PASS           status=ok database=connected version=0.1.0 time=2026-11-22T13:59:05Z
Server /v1 envelope          PASS           HTTP 404, JSON not_found envelope returned
Server migrations            PASS           applied_migrations=1
Web shell                    PASS           HTTP 200, title present at http://127.0.0.1:5173
Android debug build          NOT APPLICABLE ANDROID_HOME is not set; no SDK, emulator, or device available
```

Additional checks: `node scripts/validate-contracts.mjs`, `npm test` (32 tests across 8 files), `npm run lint`, and `npm run build`. The build emits a non-blocking chunk-size warning; there are no type or lint errors. No token files changed in this phase, so generated token artifacts were checked but not regenerated.

## Scope delivered

- Local `DashboardRecord` persistence in Dexie v2 with stable ids, names, ordering, a default flag, and independently saved widget layouts. First-run seeding is idempotent; deleting the last dashboard recreates a default.
- A selector with creation, renaming, duplication, deletion with confirmation, ordering, set-default, and per-device active-dashboard persistence.
- A 12-column modular grid with drag-and-drop, keyboard-equivalent reorder controls, width and height changes, visibility, removal, addition, background/accent/width configuration, persistence after every change, single-column mobile collapse, and reset to seed layout.
- A sixteen-widget stable registry. Only To-Do overview, weekly statistics, monthly statistics, and quick capture read real local task records; the other twelve render module-specific honest empty states.
- Reusable pure analytics over real task timestamps, with explicit empty states, active-theme chart palettes, and configurable axis/grid colours instead of hard-coded ones.
- Android static parity: Room v3 with a non-destructive `MIGRATION_2_3`, `DashboardRepository` mirroring the web operations, dashboard selector and widget sections, task-backed counts with empty states, and 192 `R.string` references resolving in both English and Tamil.

## Known limitations carried forward

- **Cross-device dashboard preference sync is deferred** to the sync phase ([ADR-0020](../adr/0020-dashboard-system.md)). Layouts and the active dashboard persist on the current device only. This Phase 5 checkbox is not claimed as complete.
- Android runtime remains unverified until an SDK and device are available. Compose compilation, the v2→v3 migration on a real pre-v3 database, and on-device Tamil rendering were statically reviewed only.
- Weekly and monthly series currently use task *captured* timestamps and task *completion instants*; the scheduled-range denominator from [analytics.md](../architecture/analytics.md) awaits scheduling/`dueDate` support in a later phase.
- Category distributions and module-specific summaries for other modules remain unimplemented because those repositories do not exist yet. Their widget cards deliberately show empty states.
- Dashboard analytics fixtures are expressed as unit tests rather than shared cross-client fixture files; fixture parity will be formalised when the respective module repositories land.
- Global search still indexes task titles only; dashboard names and widget configurations are not searchable.
- Sync, sensors, GPS, authentication, notifications, and backups remain intentionally out of scope.
