# Phase 4 report — application navigation and layout

Gate policy: [quality.md §5](../architecture/quality.md#5-phase-completion-gate).
Accepted decisions: [ADR-0019](../adr/0019-navigation-workspaces.md).

- **Run timestamp:** 2026-11-22T13:20:03Z (2026-11-22 18:50 IST)
- **Build version:** 0.1.0 (web `package.json`, Android `versionName`, API health response)
- **Commit scope:** Phase 4 navigation, search, profile access, and module workspaces
- **Host:** Windows 11, Node v24.11.1, npm 11.6.2, Docker Engine 29.9.2
- **Browser:** Edge 158.0.0.0 / Chromium 158, Windows NT 10.0 x64
- **Device:** none (no Android SDK, emulator, or physical device available)

## Surface results

| Surface | Result | Build / environment | Evidence |
| --- | --- | --- | --- |
| Server | **PASS** | API 0.1.0 in Docker, PostgreSQL 16-alpine, Docker Engine 29.9.2 | `docker compose up --build -d` remains healthy; `/healthz` and `/v1/health` returned `status=ok, database=connected`; `/v1` returned the JSON `not_found` envelope; `schema_migrations` contains `0001_initial.sql` |
| Web | **PASS** | Web 0.1.0, Vite 6.4.6, Edge 158 / Chromium 158 | Cold load at `http://127.0.0.1:5173`; all 11 hash deep links, browser/app history, global task search, profile access, distinct module workspaces, honest progress states, light/dark themes, and English/Tamil all exercised in the live app; `npm test` (21 tests), `npm run lint`, and `npm run build` passed; no new browser errors in the final online pass |
| Android | **NOT APPLICABLE** | versionName 0.1.0, static Compose implementation only | No `ANDROID_HOME`, no SDK, no emulator, no device. Debug build could not be produced or installed. Navigation, deep links, Room v2 migration, workspace screens, and resource-backed strings were implemented and statically reviewed but not runtime-verified. Not marked as passed; see [apps/android/README.md](../../apps/android/README.md) |

## Browser interaction pass

- **Deep links:** `#/dashboard`, `#/tasks`, `#/habits`, `#/mascot`, `#/gym`, `#/food`, `#/cardio`, `#/finance`, `#/appearance`, `#/design-system`, and `#/profile` each resolved to the matching screen. Unknown or empty fragments fall back to the dashboard without adding a history entry.
- **Navigation history:** pushing a route with the sidebar enabled the in-app Back control; Back returned to the previous route and enabled Forward; Forward restored the later route. Browser back/forward also follows the same history stack.
- **Global search:** a task saved through quick capture was found by the header search using a partial, case-insensitive title ("basil"), grouped under tasks and labelled with its completed status. The results panel states that it searches local records only; a blank query returns no results.
- **Profile access:** the header profile button and `#/profile` open a single-person profile screen. It states that family/multi-user accounts are not in the first release and links to Appearance preferences; it does not invent an editable profile record.
- **Task workspace:** quick capture saved a real record to Dexie. Progress moved from *unavailable* (no records) to `0 completed of 1`, then to `1 completed of 1` / 100% after the checkbox was toggled. All/Open/Completed filters changed the visible list; an empty view showed an honest empty state.
- **Module workspaces:** Habits, Mascot, Gym, Food, Cardio, and Finance each rendered a distinct body layout with a header, top-centre progress strip, statistics, actions, filters, and an empty state. Every one of them reported progress as unavailable — none displayed a fabricated 0% or 100% bar.
- **Tokens and accents:** the module accent variable resolved to the generated palette (for example Habits → growth `#4F5A3C`). Dark mode changed the body background from `rgb(243,235,221)` to `rgb(36,30,26)`. English and Tamil switched without a reload, including all new navigation and workspace labels.
- **Console:** no JavaScript exceptions or React warnings in the final interaction pass.

## Offline cold-start check

1. API container stopped with `docker compose stop api`.
2. Page reloaded at a deep link while the API was down. The connection pill changed to **Offline**, yet the Tasks workspace, its local record ("Water the basil plant"), real `1 completed of 1` progress, filters, and language settings all rendered from IndexedDB.
3. API restarted with `docker compose start api`; the pill returned to **Online** after the next probe and the same local record and progress remained intact.
4. Expected non-fatal console entry during the offline window: `500` for the failed `/healthz` probe through the Vite proxy. This is the health check behaving correctly, not an application exception.

## Automated gate

`.\scripts\smoke.ps1` output at run time:

```text
Surface                      Status         Detail
-------                      ------         ------
Contracts                    PASS           Contracts valid: 190 strings x2 locales, 6 presets x2 modes, generated artifacts current.
Server /healthz + /v1/health PASS           status=ok database=connected version=0.1.0 time=2026-11-22T13:17:11Z
Server /v1 envelope          PASS           HTTP 404, JSON not_found envelope returned
Server migrations            PASS           applied_migrations=1
Web shell                    PASS           HTTP 200, title present at http://127.0.0.1:5173
Android debug build          NOT APPLICABLE ANDROID_HOME is not set; no SDK, emulator, or device available
```

Additional checks: `node scripts/generate-tokens.mjs`, `node scripts/validate-contracts.mjs`, `npm test` (21 tests), `npm run lint`, and `npm run build`. The build emits a non-blocking chunk-size warning; there are no type or lint errors. Token artifacts were regenerated after adding the Mascot accent and were never hand-edited.

## Scope delivered

- Stable hash routes with browser history, back/forward controls, and safe fallback for unknown fragments. Route identifiers are contract values shared by the sidebar, breadcrumbs, search results, deep links, and Android destinations.
- A local read-only search projection with a task provider; journal and other absent modules are not indexed. The UI does not need to know which module owns a result.
- Single personal-profile access screen, with profile editing explicitly deferred to Phase 15.
- Focused web workspaces assembled from shared header, progress, filter, action, and empty-state primitives. To-Do progress is derived from real local task records; all other modules report unavailable progress.
- Android static parity: Navigation Compose host with 11 destinations, `myflow://app/<route>` and `https://myflow.local/<route>` deep links, drawer/bottom-bar scaffold, local task repository with a non-destructive Room v1→v2 migration, task search, profile screen, and six distinct module workspaces. All 150 `R.string` references resolve in both English and Tamil resource files.
- `contracts/tokens/tokens.json` gained a Mascot module accent; generated CSS/TypeScript/Kotlin artifacts were regenerated. English and Tamil bundles were extended together and checked for parity.

## Known limitations carried forward

- Android runtime remains unverified until an SDK and device are available. This is an environment blocker, not a passed check. Compilation of Material 3 APIs, deep-link dispatch, Room migration on a real pre-v2 database, and back-stack behaviour were statically reviewed only.
- Global search currently indexes local task titles only. Habits, Gym, Food, Cardio, Finance, Journal, and Calendar providers belong to their own phases; the search registry is ready to accept them.
- Module filters and actions on empty modules are intentionally inert and labelled as available when records exist. Rich task editing, habits, workouts, meals, and expenses remain later-phase work.
- Mascot growth is not yet derived from habit completions because habits do not exist locally; its workspace shows an honest empty state.
- The Gradle wrapper JAR is still not checked in; generate it with a local Gradle install as described in the Android README.
- Sync, sensors, GPS, authentication, notifications, and backups remain intentionally out of scope.
