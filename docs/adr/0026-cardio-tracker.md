# ADR-0026 — Cardio tracker

- **Status:** Accepted
- **Date:** 2026-11-24
- **Phase:** 10 — Cardio Tracker
- **Supersedes:** none
- **Related:** D-04, D-05, ADR-0003, ADR-0005, ADR-0006, ADR-0010, ADR-0012, ADR-0013, ADR-0014, ADR-0020, ADR-0025

## Context

Phase 10 adds three independent tracking modes — walking/steps, jump rope, and cycling — plus combined cardio analytics to web and Android. The source specification leaves jump-rope counting (§10.2) and cycling route recording (§10.3) TBD. D-04 resolves counting as **manual + sensor-assisted** with advisory sensor values and no device validation claims; D-05 resolves cycling as **GPS speed and distance** with route history and maps deferred.

ADR-0025 establishes the precedent for a local-first feature phase: canonical camelCase records, closed JSON Schemas under `contracts/schemas/`, shared rule fixtures under `contracts/fixtures/`, local-only repositories, and honest empty states. This ADR applies that pattern to cardio and freezes the metric rules before client implementation.

## Decision

1. **Scope boundary.** Phase 10 is local-first web + Android cardio only. There are **no server cardio tables and no server cardio endpoints**; the server remains health/sync only. Web Dexie upgrades to **v7** with the new cardio tables; Android Room upgrades to **v8** with a non-destructive `MIGRATION_7_8`. Web entry is **manual only** (no web sensor or geolocation capture). Android may use the step sensor and GPS **only while the relevant screen is in the foreground and only where the hardware and permission allow it**; when either is unavailable or denied, the UI offers an explicit manual fallback and never invents measurements. All saved records are real Dexie/Room records, not mocks.

2. **Canonical records.** All fields are camelCase. Nullable fields are present as `null` when unknown, never silently omitted.

   - `WalkingSession`: `id`, `localDate`, `startedAt`, `endedAt`, `stepCount`, `durationSeconds`, `distanceMeters: number | null`, `calories: number | null`, `bodyWeightKg: number | null`, `calorieBasis: 'manual' | 'metWalking' | 'unavailable'`, `source: 'manual' | 'sensor'`, `notes: string | null`, `createdAt`, `updatedAt`.
   - `StepRecord`: `id`, `localDate`, `stepCount`, `source: 'manual' | 'sensor' | 'session'`, `sourceEventId`, `createdAt`. This record is **append-only**: it has no `updatedAt`, and corrections are new manual records rather than edits of sensor or session rows.
   - `StepGoal`: `id = 'goal:<localDate>'`, `localDate`, `stepGoal`, `updatedAt`.
   - `JumpRopeSession`: `id`, `localDate`, `startedAt`, `endedAt`, `durationSeconds`, `jumpCount`, `countSource: 'manual' | 'sensor_assisted'`, `rounds`, `restSeconds`, `calories: number | null`, `bodyWeightKg: number | null`, `calorieBasis: 'manual' | 'metJumpRope' | 'unavailable'`, `notes`, `createdAt`, `updatedAt`.
   - `CyclingSession`: `id`, `localDate`, `startedAt`, `endedAt`, `durationSeconds`, `movingSeconds`, `pauseSeconds`, `stationarySeconds`, `distanceMeters: number | null`, `averageSpeedKmh: number | null`, `maxSpeedKmh: number | null`, `sourceQuality: 'manual' | 'gps_accepted' | 'gps_filtered' | 'unavailable'`, `notes`, `createdAt`, `updatedAt`.
   - `CyclingLocationPoint`: `sessionId`, `recordedAt`, `latitude`, `longitude`, `accuracyMeters`, `speedKmh`, `filtered`. It is **defined in the contract only and is not written in v1**; no route history is persisted, synced, or drawn.

3. **Daily steps, dedupe, and precedence.** The local unique key for step records is `(source, localDate, sourceEventId)`, enforced by both Dexie and Room; a repeated event is stored once. `sourceEventId` is non-null (sensor provider event id, session id, or `manual:<localDate>` for a correction). Daily steps are the sum of deduplicated records from the **highest-precedence source present for that local date**: `manual` > `sensor` > `session`. Lower-precedence rows are ignored, never added, so sources never double-count. A manual record therefore acts as a whole-day correction; a date with no records reports `null` (unavailable), not zero.

4. **Calories.** Calories are estimated **only when both `bodyWeightKg` and `durationSeconds` are present**: walking `kcal = 3.5 * bodyWeightKg * hours`, jump rope `kcal = 11.8 * bodyWeightKg * hours`, with `hours = durationSeconds / 3600`. When either input is missing, `calories = null` and `calorieBasis = 'unavailable'`. A user-entered value uses `calorieBasis = 'manual'`; an estimated value uses `metWalking` or `metJumpRope`. Rules retain full precision internally and round to one decimal place only for display. These are estimates, not medical measurements.

5. **Cycling GPS filtering and time accounting.** A candidate point is accepted only when `accuracyMeters <= 50`, `speedKmh <= 120`, latitude/longitude are valid (finite latitude in `[-90, 90]`, longitude in `[-180, 180]`), and the time delta from the previously accepted point is `>= 1000ms`. The first acceptable point establishes the baseline; rejected points are flagged `filtered: true` and never become the reference. Points with speed `< 1 km/h` are stationary and excluded from `movingSeconds`; paused intervals are excluded too. `movingSeconds = durationSeconds - pauseSeconds - stationarySeconds`. `averageSpeedKmh = distanceKm / movingHours` when distance is known and `movingSeconds > 0`; `maxSpeedKmh` is the greatest speed among **accepted GPS points only**. `sourceQuality` reports `manual`, `gps_accepted`, `gps_filtered` (GPS present but no point accepted), or `unavailable`. Manual distance may produce an average speed, but `maxSpeedKmh` stays `null` without accepted GPS points; missing distance/speed is never fabricated.

6. **Jump-rope counting (D-04).** Manual entry is the shipped baseline. `countSource: 'sensor_assisted'` counts are **advisory and must be labelled as estimates in the UI**. No accuracy claims, device validation claims, or verified-count claims are made; `verified` is always false for sensor-assisted values. The shipped fixture covers the manual path and the advisory label path.

7. **Combined cardio summary.** Daily/weekly/monthly summaries derive from known fields only: sum recorded `durationSeconds` across sessions, sum only non-null `distanceMeters` with `distanceAvailable` true when at least one distance contributed, and sum only non-null `calories` with `caloriesAvailable` true when at least one calorie value contributed. Unknown values are never coerced to zero or inferred from another module; a fully unknown metric stays `null`/unavailable. Weekly and monthly series use the same rules over their local-date ranges.

8. **Step goals.** A goal is a per-local-date record keyed by `id = 'goal:<localDate>'`, so setting a future date's goal does not change today's. Progress is `dailySteps / stepGoal * 100`, reported as a percent with `available: true` and `overGoal: true` when exceeded (never clamped to 100). With no goal for that date, progress is `{ available: false, percent: null, overGoal: false }`.

9. **Deferrals.** Route history and maps, background tracking and an Android foreground service, launcher widgets, physical sensor accuracy/device validation, cross-device sync, and medical-grade precision are all deferred. Foreground-only tracking and manual fallback are the honest v1 behavior.

## Consequences

- Cardio data stays on the device; no cardiology data crosses a network boundary and no third-party sensor service is introduced.
- `contracts/fixtures/cardio.metrics.json` is consumed by pure functions on both clients; the eleven rule names are checked by `scripts/validate-contracts.mjs` alongside the existing food fixture rules.
- Closed JSON Schemas make the canonical field names and enums explicit before sync work, following ADR-0024's boundary-conversion precedent.
- All user-facing labels come from the EN/TA bundles; no hard-coded strings are introduced. Widget notes describe real saved local records, not unavailable placeholders.
- Server, security, backup, and sync surfaces are N-A for Phase 10 feature work but still pass the existing smoke gate.
