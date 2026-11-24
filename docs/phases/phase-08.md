# Phase 8 report — Gym workouts, sets, and personal records

Gate policy: [quality.md §5](../architecture/quality.md#5-phase-completion-gate).
Accepted decisions: [ADR-0023](../adr/0023-gym-workouts-and-sets.md) (superseded for muscle-group field only) and [ADR-0024](../adr/0024-exercise-multi-muscle-groups.md).

- **Run timestamp:** 2026-11-24T11:23:35Z (2026-11-24 16:53 IST, final full smoke run)
- **Build version:** 0.1.0 (web `package.json`, Android `versionName`, API health response)
- **Commit scope:** Phase 8 implementation committed/pushed as `b7e95e6`, `0949ad1`, `b8a5639`, `5061bff` on `origin/develop`. Current working tree contains uncommitted follow-up fixes for i18n/TA strings, muscle-group normalization, contract schema, exercise delete in-use guard, and gate documentation. No commit/push was made for those follow-ups.
- **Host:** Windows 11, Node v24.11.1, npm 11.6.2, Docker Engine 29.9.2, JDK 21 Temurin, Gradle 8.9
- **Browser:** OpenCode in-app browser, `http://127.0.0.1:5173` (automated interaction/DOM/console evidence)
- **Device/emulator:** Android Emulator `emulator-5554` (`myflow_api35`, sdk_gphone64_x86_64, Android 15/API 35). User manually verified the Android Gym flow on 2026-11-24 and reported it working fine.

## Surface results

| Surface | Result | Build / environment | Evidence |
| --- | --- | --- | --- |
| Server | **PASS** | API 0.1.0 in Docker, PostgreSQL 16-alpine, Docker Engine 29.9.2 | Final `.\scripts\smoke.ps1` at 16:53 IST: `/healthz` and `/v1/health` returned `status=ok, database=connected, version=0.1.0`; `/v1` returned JSON `not_found` envelope; `applied_migrations=1`. Output saved to `docs/reports/smoke-latest-phase8-final.txt`. |
| Web | **PASS** | Vite build/dev server, Node v24.11.1, npm 11.6.2 | `npm run lint` PASS, `npm test -- --run` PASS (12 files, 53 tests), `npm run build` PASS. Full browser interaction gate exercised Gym load, exercise create with multi-muscle selection, workout create/add exercise/add set, draft reps/weight, tick completion, finish workout, volume/PR/PR graph, per-set independence, dashboard Gym widget, dark/Tamil/English toggles, offline indicator, and clean console (0 errors). Exercise delete in-use guard verified: deleting an in-use exercise shows `Cannot delete an exercise used in workouts.` and leaves the record; deleting an unused exercise shows `Exercise removed.` and removes it. |
| Android | **PASS** | Debug APK `com.myflow.app`, Android 15 emulator `emulator-5554`, JDK 21, Gradle 8.9 | `gradle :app:assembleDebug :app:testDebugUnitTest` PASS; final `installDebug` PASS in full smoke; debug APK installed and launched on `emulator-5554`. Gym screen, workout cards, exercise/set controls, PR/graph, and dashboard were exercised in emulator artifacts under `docs/reports/android-runtime-gate/`. User manually verified the Android Gym flow on 2026-11-24 and reported it working fine, including Tamil rendering. No app crash observed in filtered logcat; local DB contains gym tables and records. |
| Data | **PASS (local/web+Android)** | Dexie v5 web, Room v6 Android | Web Gym local records/types/rules implemented; Android Room v6 gym entities/DAO/migrations present with non-destructive `MIGRATION_5_6`. Unit tests: web `gym.test.ts` PASS, Android `GymRulesTest` PASS (6 tests). Canonical sync/API field is `muscleGroups: string[]` per ADR-0024; Android local comma-separated storage remains an intentional boundary concern until gym sync lands. No server-side gym sync/endpoints in Phase 8. |
| Security | **N-A** | — | No auth, encryption, key management, sync, or secret-handling changes in this phase. No credentials added to source. |
| Backup | **N-A** | — | No backup/restore workflow changes. Local gym data follows existing local-first storage; server backup scope unchanged. |

## Smoke and automated checks

| Check | Result | Evidence |
| --- | --- | --- |
| `.\scripts\smoke.ps1` (full, final) | **PASS** | `docs/reports/smoke-latest-phase8-final.txt` (contracts/server/db/web/Android installDebug pass) |
| `.\scripts\smoke.ps1 -SkipAndroid` | **PASS** | `docs/reports/smoke-latest-skip-android.txt` |
| Web lint | **PASS** | `npm run lint` |
| Web tests | **PASS** | `npm test -- --run` (12 files, 53 tests) |
| Web build | **PASS** | `npm run build` |
| Contract validation | **PASS** | `node scripts/validate-contracts.mjs` — 433 strings x2 locales, 6 presets x2 modes |
| Android assemble + unit tests | **PASS** | `gradle :app:assembleDebug :app:testDebugUnitTest` |
| Android install | **PASS** | Final full smoke `installDebug` on `emulator-5554` |
| Web browser interaction gate | **PASS** | OpenCode in-app browser DOM/console checks; see Web surface evidence above |
| Android manual runtime gate | **PASS (user-verified)** | User confirmed Android Gym flow working fine on 2026-11-24; emulator build/install/screenshots/DB/logcat recorded under `docs/reports/android-runtime-gate/` |
| Android TA rendering | **PASS (user-verified)** | UTF-8 Tamil resources build and link successfully; user confirmed Android UI rendering in Tamil was fine |

## Phase 8 scope notes

- **Implemented:** Gym exercises/workouts/sets, per-set completion, volume/progress rules, PR derivation, dashboard Gym widget backed by local data, web + Android static parity.
- **Post-gate UI/data fixes:** set draft commit on blur/before completion; tick-button set completion; multi-select muscle groups (web `muscleGroups[]`, Android comma-separated `muscleGroup` TEXT with boundary conversion per ADR-0024); per-exercise max-weight PR graph; exercise create/delete with in-use guard; PR graph label and muscle labels moved to i18n/contracts and Android string resources; Android TA fallbacks replaced with proper Tamil.
- **Deferred (not complete in Phase 8):** gym sync/server endpoints; reminder delivery; cross-device dashboard sync. These are explicitly deferred, not treated as passing phase features.

## Repo/ops notes

- `docs/reports/` is ignored via `.gitignore`; selected smoke/gate artifacts remain locally as evidence and are not staged for commit.
- Follow-up fixes are uncommitted. Commit/push only when explicitly requested.

## Verdict

**Phase 8 is complete for the local web + Android scope.** All required surfaces are recorded as PASS or N-A: server/web/Android runtime gates pass, full smoke passes, automated web/Android checks pass, and the Android runtime gate is accepted from user manual verification on 2026-11-24. Deferred sync/reminder/cross-device dashboard items remain explicitly outside Phase 8 completion.
