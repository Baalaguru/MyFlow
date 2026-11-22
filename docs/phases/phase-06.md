# Phase 6 report — To-Do task management

Gate policy: [quality.md §5](../architecture/quality.md#5-phase-completion-gate).
Accepted decision: [ADR-0021](../adr/0021-task-management.md).

- **Run timestamp:** 2026-11-22T14:36:23Z (2026-11-22 20:06 IST)
- **Build version:** 0.1.0 (web `package.json`, Android `versionName`, API health response)
- **Commit scope:** Phase 6 extended task model, eight task views, subtasks, bounded recurrence, task analytics, scheduled-only progress, and Android static parity
- **Host:** Windows 11, Node v24.11.1, npm 11.6.2, Docker Engine 29.9.2
- **Browser:** OpenCode in-app Chromium (Chrome/152.0.7977.167, Electron/44.9.1), Windows NT 10.0 x64
- **Device:** none (no Android SDK, emulator, or physical device available)

## Surface results

| Surface | Result | Build / environment | Evidence |
| --- | --- | --- | --- |
| Server | **PASS** | API 0.1.0 in Docker, PostgreSQL 16-alpine, Docker Engine 29.9.2 | `/healthz` and `/v1/health` returned `status=ok, database=connected`; `/v1` returned the JSON `not_found` envelope; `schema_migrations` contains `0001_initial.sql` |
| Web | **PASS** | Web 0.1.0, Vite 6.4.6, in-app Chromium 152 | Cold load at `http://127.0.0.1:5173/#/tasks`; create/edit/complete/reopen, subtasks, recurrence, all eight views, filters/search, calendar, analytics, dark mode, Tamil, offline cold start, and console check exercised in the live app; `npm test` (44 tests), `npm run lint`, and `npm run build` passed; no application JavaScript errors in the final online pass |
| Android | **NOT APPLICABLE** | versionName 0.1.0, static Compose implementation only | No `ANDROID_HOME`, no SDK, no emulator, no device. Debug build could not be produced or installed. Room v4 migration, repository, pure rules, workspace, and 251 `R.string` references resolving in both locales were reviewed statically but not runtime-verified. See [apps/android/README.md](../../apps/android/README.md) |

## Browser interaction pass

- **Creation and editing:** created a task with title, description, Very high priority, Home category, due date, start/end times, weekly recurrence (count 2), a subtask, and a reminder offset. The card rendered every saved field and explicitly stated that reminder details are stored locally while notification delivery arrives in a later phase. Editing changed the title to *Water basil daily* and the priority to Low; the saved card reflected both without touching the original unrelated task.
- **Completion and recurrence:** completing the task set its completion instant, moved *COMPLETED / TOTAL* from `0/1` to `1/1`, and appended a new open occurrence due one week later. Reopening the original restored the denominator to `0/1` while leaving the appended occurrence intact. Only the completed originals were credited to *COMPLETED TODAY*; the legacy unscheduled task was not backdated.
- **Subtasks:** toggling *Check soil* marked only that subtask as done and applied a line-through style; the parent task remained open until explicitly completed. Subtasks are independent records rather than a parent-status proxy.
- **Views:** all eight projections were opened in turn — All, Today, Upcoming, Overdue, Completed, By priority, By category, and Calendar. Overdue showed an explicit empty state when no overdue record existed. The Calendar view rendered a Tasks month grid, not a separate Calendar module.
- **Search and filters:** searching `balcony` matched the task by description; searching `home` matched by category. Clearing filters restored the full list. Priority and category filters composable with the active view.
- **Calendar deadlines:** the November 2026 grid showed the original deadline on the 22nd and the recurring occurrence on the 29th, both labelled with the task title.
- **Delete:** deleting the recurring occurrence used a confirmation dialog and removed only that occurrence; the original task and unrelated record remained.
- **Themes and locale:** Dark mode changed the page and followed the active tokens. Switching to Tamil translated the heading, analytics, priority/status labels, all eight view tabs, field labels, reminder note, and empty states without a reload.
- **Console:** no JavaScript exceptions or React warnings in the final interaction pass. The only console errors were the expected `500` responses from the `/healthz` probe while the API container was intentionally stopped (see below).

## Offline cold-start check

1. API container stopped with `docker compose stop api`.
2. Page reloaded at the Tasks deep link. The connection pill changed to **இணைப்பு இல்லை** (*Offline*), yet the two surviving local tasks, completion counts, priority distribution, empty weekly/monthly charts, dark theme, and Tamil locale all rendered from IndexedDB.
3. API restarted with `docker compose start api`; the pill returned to **இணைக்கப்பட்டது** (*Online*) after the next probe and the same task state remained intact.
4. Expected non-fatal console entries during the offline window: two `500` responses for the failed `/healthz` probe through the Vite proxy. This is the health check behaving correctly, not an application exception.

## Automated gate

`.\\scripts\\smoke.ps1` output at run time:

```text
Surface                      Status         Detail
-------                      ------         ------
Contracts                    PASS           Contracts valid: 323 strings x2 locales, 6 presets x2 modes, generated artifacts current.
Server /healthz + /v1/health PASS           status=ok database=connected version=0.1.0 time=2026-11-22T14:34:59Z
Server /v1 envelope          PASS           HTTP 404, JSON not_found envelope returned
Server migrations            PASS           applied_migrations=1
Web shell                    PASS           HTTP 200, title present at http://127.0.0.1:5173
Android debug build          NOT APPLICABLE ANDROID_HOME is not set; no SDK, emulator, or device available
```

Additional checks:

- `node scripts/validate-contracts.mjs` — `Contracts valid: 323 strings x2 locales, 6 presets x2 modes, generated artifacts current.`
- `npm test` — 44 tests across 10 files, including shared JSON fixture tests for scheduled-only progress, local-midnight boundaries, and bounded recurrence.
- `npm run lint` — clean.
- `npm run build` — TypeScript and Vite build succeeded; only the existing non-blocking chunk-size warning was emitted.
- Android `R.string` reference check — 251 references resolve in both `values/strings.xml` and `values-ta/strings.xml` (285 unique names per locale, no missing references).

## Scope delivered

- Dexie v4 indexes and an extended local `TaskRecord` with description, four priorities, category, due date, optional start/end times, `completedAt`-authoritative status, independent subtasks, recurrence rule, recurrence parent, and reminder offset.
- Pure task rules for eight projections, scheduled-only progress, daily/weekly/monthly analytics, priority distribution, overdue count, subtask progress, and bounded append-only recurrence generation.
- A local task repository with create, edit, delete, complete/reopen, subtask toggling/removal, recurrence materialisation, search, and progress. Completion instants are set on completion and cleared on reopen; legacy rows are never given invented timestamps.
- A Tasks workspace with a rich editor, filters/search, all eight views, a month deadline grid, task analytics with honest empty states, edit/reopen/delete actions, and resource-backed English/Tamil labels.
- Dashboard To-Do progress now uses the same scheduled-only calculator, so unscheduled notes no longer inflate the percentage.
- Shared cross-client JSON fixtures under `contracts/fixtures/task.progress.json` and `contracts/fixtures/task.recurrence.json`, consumed by web unit tests.
- Android static parity: Room v4 with a non-destructive `MIGRATION_3_4`, extended `TaskEntity`, JSON type converters, matching repository/rules, an eight-view Tasks workspace, and both locales.

## Known limitations carried forward

- **Reminder delivery is deferred** by [ADR-0021](../adr/0021-task-management.md). Only the offset is stored; the UI never presents a working alarm or notification.
- **Calendar is an in-app Tasks month projection only.** System calendar integration remains deferred with the Calendar module.
- **Cross-device dashboard preference sync is deferred** to the sync phase ([ADR-0020](../adr/0020-dashboard-system.md)). Layouts and active dashboard remain device-local.
- Android runtime remains unverified until an SDK and device are available. Compose compilation, the v3→v4 migration on a real pre-v4 database, recurrence persistence, and on-device Tamil rendering were statically reviewed only.
- Recurrence materialises one future occurrence on completion; a future occurrence does not exist until the current one is completed. Rules with no count or end date still create at most one successor at a time.
- Habits, Gym, Food, Cardio, and Finance repositories do not exist yet, so their analytics and dashboard widgets remain honest empty states.
- Sync, sensors, GPS, authentication, notifications, and backups remain intentionally out of scope.
