# Phase 10 report — Cardio Tracker

Gate policy: [quality.md §5](../architecture/quality.md#5-phase-completion-gate).
Accepted decision: [ADR-0026](../adr/0026-cardio-tracker.md).

- **Run timestamp:** 2026-11-24T15:51:30Z, final full smoke run (web gate 15:26:29Z; Android gate 15:48:20Z)
- **Build version:** 0.1.0 (web `package.json`, Android `versionName`, API health response)
- **Commit scope:** Uncommitted working tree on `phase/10-cardio-tracker`, based on `2b43243`. No commit or push was requested for Phase 10.
- **Host:** Windows 11, Node v24.11.1, npm 11.6.2, Docker Engine 29.9.2, JDK 21 Temurin, Gradle 8.9
- **Browser:** OpenCode in-app Chromium, `http://127.0.0.1:5173/#/cardio`
- **Device/emulator:** Android Emulator `emulator-5554` (Android 15/API 35). The emulator has no usable step counter or live GPS fix; sensor/GPS data paths verified by code, unit tests, and offline/denied states, not by physical-device accuracy claims.

## Surface results

| Surface | Result | Build / environment | Evidence |
| --- | --- | --- | --- |
| Server | **PASS** | API 0.1.0 in Docker, PostgreSQL 16-alpine | Final `.\scripts\smoke.ps1`: `/healthz` and `/v1/health` return `status=ok, database=connected, version=0.1.0`; `/v1` returns JSON `not_found` envelope; `applied_migrations=1`. Output saved to `docs/reports/smoke-latest-phase10-final.txt`. No cardio server tables or endpoints were added. |
| Web | **PASS** | Vite dev server, Node v24.11.1, Dexie v7 | `npm run lint`, `npm test -- --run` (16 files, 104 tests), `npm run build` all PASS. Browser gate exercised manual step entry/duplicate rejection, step goal progress, walking/jump-rope/cycling session CRUD, session and rest timers, analytics charts, all three dashboard widgets, dark theme and Tamil locale; 0 console errors. Evidence: `docs/reports/web-runtime-phase10.txt`, `docs/reports/web-runtime-phase10-cardio.png`. |
| Android | **PASS** | Debug APK `com.myflow.app`, emulator `emulator-5554`, Room v8, Gradle 8.9 | `gradle :app:assembleDebug :app:testDebugUnitTest` PASS; `CardioRulesTest` has 10 test methods covering all 11 shared fixture rules, 0 failures/errors. Emulator gate seeded local Room records and verified real rendering: 8000 steps, 80% goal, 300 sensor-assisted jumps, 20.00 km ride with 30 km/h average and 42.5 km/h maximum, combined duration/distance/calories, and three dashboard widgets. Permission-denied pass verified "Permission denied. Manual entry remains available." with no fabricated values and 0 fatal crashes. Evidence: `docs/reports/android-runtime-phase10/`. |
| Data | **PASS (local/web+Android)** | Dexie v7 web, Room v8 Android | Canonical walking/step/goal/jump-rope/cycling records on both clients; additive non-destructive Room `MIGRATION_7_8`; six closed JSON Schemas; shared fixture `contracts/fixtures/cardio.metrics.json` with 11 rules; `CyclingLocationPoint` defined in contract only and not written in v1. No server cardio tables or sync endpoints. |
| Security | **PASS (permission boundary)** | Android runtime permissions | `ACTIVITY_RECOGNITION`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION` declared and requested only in the cardio workspace; denial/unavailable states verified on device. No credentials added to source, no analytics telemetry leaves the device. Broader GPS-location privacy classification remains outside this phase. |
| Backup | **N-A** | — | No backup/restore workflow changes. Local cardio data follows the existing local-first storage boundary. |

## Automated and runtime checks

| Check | Result | Evidence |
| --- | --- | --- |
| `.\scripts\smoke.ps1` (full, final) | **PASS** | `docs/reports/smoke-latest-phase10-final.txt`. The first attempt failed only because Gradle was absent from the shell `PATH`; rerunning with the installed Gradle 8.9 on `PATH` passed all surfaces. |
| Contract validation | **PASS** | `node scripts/validate-contracts.mjs` — `Contracts valid: 633 strings x2 locales, 6 presets x2 modes, generated artifacts current.` |
| Web lint | **PASS** | `npm run lint` |
| Web tests | **PASS** | `npm test -- --run` — 16 files, 104 tests (including 12 cardio fixture cases) |
| Web build | **PASS** | `npm run build` (pre-existing >500 kB chunk advisory only) |
| Android assemble + unit tests | **PASS** | `gradle :app:assembleDebug :app:testDebugUnitTest` after final fixes; `BUILD SUCCESSFUL in 33s` |
| Android install | **PASS** | `adb install -r app-debug.apk` before the final gate and full smoke `installDebug` on `emulator-5554` |
| Web browser interaction gate | **PASS** | `docs/reports/web-runtime-phase10.txt`; 0 console errors |
| Android emulator runtime gate | **PASS** | `docs/reports/android-runtime-phase10/runtime-log.txt`, `cardio-visible-texts.txt`, `dashboard-visible-texts.txt`, `denied-visible-texts.txt`, `permission-denied-verification.txt`, screenshots, `logcat-filtered.txt` |
| Android string parity | **PASS** | `python docs/reports/check_strings.py` — `refs 484, missingEn 0, missingTa 0` |

## Phase 10 scope coverage

- **10.1 Walking / step counter:** walking sessions with date/time, steps, duration, optional distance/weight/calories, manual or sensor source; manual step records with append-only dedupe by source/date/event id; per-date step goal and 80% within-goal / over-goal states; daily steps, weekly/monthly step, distance and duration charts; Android step-counter path requires permission and computes deltas from cumulative sensor totals; unavailable sensor and denied permission never invent steps.
- **10.2 Jump rope:** session timer, rest timer, duration, jump count, rounds, rest periods, history, jump-count/duration charts, MET calories from body weight and duration; D-04 counting method is manual + sensor-assisted with sensor values advisory and labelled, never presented as verified or accuracy-validated.
- **10.3 Cycling:** start/pause/resume/stop timer controls, duration, pause/stationary intervals, distance, average speed from moving time, accepted-GPS max speed, history, distance and speed charts; D-05 uses GPS speed/distance with filtering thresholds in ADR-0026; manual entries keep max speed unavailable; no route recording, map, or invented GPS value.
- **10.4 Cardio analytics:** daily steps, weekly/monthly distance and duration, step trends, cycling speed trend, jump-rope performance trend, and combined summary computed from known local fields only with explicit empty/unavailable states.

## Deferred (not complete in Phase 10)

- Cycling route recording, map/history, and `CyclingLocationPoint` writes.
- Background/foreground-service tracking and launcher (Glance) widgets.
- Physical-device step-sensor/GPS accuracy validation and any accuracy claims.
- Server cardio endpoints, cross-device sync, medical/clinical precision, and cardio preferences (Phase 15).
- Exact widget sizes/refresh/tap actions and detailed cardio UI mockups remain governed by the open decisions in `docs/decisions/register.md`.

## Repo/ops notes

- Two defects were found and fixed during runtime gates, then re-verified: web manual step records used a random per-submit dedupe key (allowing double-counting) and Android analytics labels rendered raw `%1$d` placeholders. Android combined calories also got a dedicated translated label instead of the walking-specific one.
- `docs/reports/` is ignored via `.gitignore`; evidence remains local and untracked.
- Room exported schema `apps/android/app/schemas/com.myflow.app.data.AppDatabase/8.json` is generated by the build and ignored by `apps/android/.gitignore`, matching the existing schema-directory policy.
- No commit or push was made for Phase 10.

## Verdict

**Phase 10 is complete for the local web + Android scope.** All required surfaces are recorded as PASS or N-A, runtime verification passed on web and Android, clearly deferred sensor-accuracy/route/background/sync work is excluded from completion, and the working tree remains uncommitted pending an explicit request.
