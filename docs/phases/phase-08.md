# Phase 8 report — Gym workouts, sets, and personal records

Gate policy: [quality.md §5](../architecture/quality.md#5-phase-completion-gate).
Accepted decision: [ADR-0023](../adr/0023-gym-workouts-and-sets.md).

- **Run timestamp:** 2026-11-23T12:50:27Z (2026-11-23 18:20 IST, smoke run)
- **Build version:** 0.1.0 (web `package.json`, Android `versionName`, API health response)
- **Commit scope (uncommitted working tree):** Gym exercise create/delete, multi-select muscle groups, set completion tick control, per-exercise max-weight PR graph, Android Gym set draft-commit fix, Gym rules unit tests, smoke script Gradle fallback
- **Host:** Windows 11, Node v24.11.1, npm 11.6.2, Docker Engine 29.9.2, JDK 21 Temurin, Gradle 8.9
- **Browser:** not recorded in this closeout pass (web browser interaction gate not re-run)
- **Device/emulator:** Android Emulator `emulator-5554` (`myflow_api35`, sdk_gphone64_x86_64, Android 15/API 35)

## Surface results

| Surface | Result | Build / environment | Evidence |
| --- | --- | --- | --- |
| Server | **PASS** | API 0.1.0 in Docker, PostgreSQL 16-alpine, Docker Engine 29.9.2 | `.\scripts\smoke.ps1 -SkipAndroid` at 18:20 IST: `/healthz` and `/v1/health` returned `status=ok, database=disabled, version=0.1.0`; `/v1` returned JSON `not_found` envelope; `applied_migrations=1`. Output saved to `docs/reports/smoke-latest-skip-android.txt`. |
| Web | **FAIL** | Vite build, Node v24.11.1, npm 11.6.2 | Automated checks pass: `npm run lint` PASS, `npm test -- --run` PASS (12 files, 53 tests), `npm run build` PASS. Smoke shell check PASS (`HTTP 200` at `http://127.0.0.1:5173`). **Phase browser interaction gate not completed in this pass**: no recorded evidence for Gym CRUD, per-set independence, PR derivation, volume, dashboard Gym widget, dark, Tamil, offline, or clean console. Cannot mark PASS until manual browser gate is recorded. |
| Android | **FAIL** | Debug APK `com.myflow.app`, Android 15 emulator `emulator-5554`, JDK 21, Gradle 8.9 | `gradle :app:assembleDebug :app:testDebugUnitTest` PASS; `gradle -p apps/android :app:installDebug` PASS (installed on `myflow_api35`). Earlier smoke: app launched on emulator and physical device `ZD222MRNPX`; no fatal logcat in smoke tail. **Full Gym runtime gate not completed**: manual verification still required for exercise add/delete, multi-muscle selection, set draft save/blur, tick completion, finish workout, volume, PR graph, dashboard Gym widget, dark, Tamil, and DB correctness. Prior automated ADB input produced suspect persisted set values; do not treat as PASS. |
| Data | **PASS (local/web+Android static)** | Dexie v5 web, Room v6 Android | Web Gym local records/types/rules implemented; Android Room v6 gym entities/DAO/migrations present with non-destructive `MIGRATION_5_6`. Unit tests: web `gym.test.ts` PASS, Android `GymRulesTest` PASS (6 tests). No server-side gym sync/endpoints in Phase 8. |
| Security | **N-A** | — | No auth, encryption, key management, sync, or secret-handling changes in this phase. No credentials added to source. |
| Backup | **N-A** | — | No backup/restore workflow changes. Local gym data follows existing local-first storage; server backup scope unchanged. |

## Smoke and automated checks

| Check | Result | Evidence |
| --- | --- | --- |
| `.\scripts\smoke.ps1 -SkipAndroid` | **PASS** | `docs/reports/smoke-latest-skip-android.txt` |
| `.\scripts\smoke.ps1` (Android enabled) | **FAIL (script/output capture issue)** | Script updated to fall back to `gradle` when wrapper missing; `gradle :app:installDebug` succeeds directly, but smoke output capture in this environment produced an incomplete report file. Treat as tooling issue; Android install verified separately. |
| Web lint | **PASS** | `cd apps/web && npm run lint` |
| Web tests | **PASS** | `cd apps/web && npm test -- --run` (12 files, 53 tests) |
| Web build | **PASS** | `cd apps/web && npm run build` |
| Android assemble + unit tests | **PASS** | `gradle :app:assembleDebug :app:testDebugUnitTest` |
| Android install | **PASS** | `gradle -p apps/android :app:installDebug` on `emulator-5554` |

## Phase 8 scope notes

- **Implemented:** Gym exercises/workouts/sets, per-set completion, volume/progress rules, PR derivation, dashboard Gym widget backed by local data, web + Android static parity.
- **Post-gate UI/data fixes applied in working tree:** set draft commit on blur/before completion; tick-button set completion; multi-select muscle groups (web `muscleGroups[]`, Android comma-separated `muscleGroup` TEXT); per-exercise max-weight PR graph; exercise create/delete with in-use guard.
- **Deferred (not complete):** gym sync/server endpoints; reminder delivery; cross-device dashboard sync; full browser/Android manual runtime gate evidence.

## Known gaps / follow-ups

1. Run full web browser gate and record evidence (CRUD, per-set independence, PR, volume, dashboard, dark, Tamil, offline, console).
2. Run full Android runtime gate on emulator/device and capture screenshots/logcat/DB evidence; confirm tick control, multi-muscle, exercise delete, PR graph, dark/Tamil.
3. Move hard-coded PR graph label to i18n/contracts/strings (EN/TA).
4. Decide canonical muscle-group model before sync/API (`string[]` vs normalized mapping). ADR-0023 currently documents single `muscleGroup`/secondary fields; update ADR if model changes.
5. Fix `scripts/smoke.ps1` Android result capture/reporting in wrapper-less Gradle environments.
6. Decide disposition of `docs/reports/` artifacts before commit (keep selected evidence, gitignore, or remove generated noise).

## Verdict

**Phase 8 is NOT complete.** Server smoke, local data rules, and automated web/Android builds/tests pass, but required web browser interaction and Android runtime interaction gates are not yet recorded with sufficient evidence. Do not mark Phase 8 done until those gates are run and logged honestly.