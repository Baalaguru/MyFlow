# ADR-0022: Habit tracking, streaks, and mascot progression

- **Status:** Accepted
- **Date:** 2026-11-22
- **Related:** [ADR-0005](0005-local-database-read-path.md), [ADR-0006](0006-time-model.md), [ADR-0010](0010-module-boundaries.md), [ADR-0013](0013-analytics-rules.md), [ADR-0014](0014-notifications-background.md), [ADR-0020](0020-dashboard-system.md)

## Context

Phase 7 introduces habits, daily logs, streaks, analytics, and mascot integration. The app is offline-first and single-user. There is no notification scheduler, no sync engine, and no server habit endpoint. Streak rules are easy to get wrong around rest days, skips, schedule changes, and timezone boundaries; the mascot must also never shame the user for missed days.

## Decision

- **Habit** is a local record with stable id, name, optional description, icon, accent token, schedule, optional target, paused/archived flags, reminder offsets, and created instant. Schedules are local rules: `daily`, `weekdays` (selected weekday mask), or `custom` (explicit weekday mask; future extension possible without rewriting logs).
- **HabitLog** is an append-only-per-day record keyed by `(habitId, localDate)`. Status is `done`, `skipped`, or `rest`. A done log stores a completion instant and optional target value; skipped/rest store the day decision only. Logs are never duplicated for the same habit+date; writing the same day replaces that day's record so the user can correct a mistake.
- **Schedule semantics** follow [analytics.md](../architecture/analytics.md): completion % uses *scheduled* days only. `skipped` and `rest` are scheduled non-completion outcomes that do **not** break a streak and do **not** count as done. A missed scheduled day (no done log, not skipped/rest) breaks the streak. Paused/archived habits have no scheduled days after the pause/archive effective point unless reactivated.
- **Streaks** are computed from history and the habit's current schedule rules by evaluating each scheduled local day in order. Schedule changes do not rewrite history; they change which days are scheduled going forward and for recomputation. Current streak counts consecutive scheduled completions ending at the last completed scheduled day; longest streak is the maximum over history. If there is no completion, streaks are 0.
- **MascotState** is local, derived primarily from habit completion totals/streaks but stored as user-selected preferences (companion variant, plant style, animation enabled) plus derived stage. Stage thresholds are deterministic and documented: stage increases with lifetime completed habit-days and is never decreased by missed days. Missed days may show a neutral "resting" state, never punitive copy, damage, or loss messaging.
- **Reminders** store local offset/time configuration only. OS notification delivery is deferred to [ADR-0014](0014-notifications-background.md) implementation phases; UI states reminder is saved locally and delivery is not implemented.
- **Analytics** are pure functions over local records: daily/weekly/monthly completion %, current/longest streak, consistency, heatmap cells, and trend series. Empty ranges show explicit empty states, never fabricated zeros.
- **Android** mirrors the schema with a non-destructive Room migration, repositories, and Compose workspaces. Runtime verification remains NOT APPLICABLE until an SDK/device is available.

## Consequences

**Positive**

- Habit history is auditable and local-first; streaks can be recomputed after schedule edits.
- Skipped/rest days avoid punishing intentional breaks while preserving honest analytics.
- Mascot progression is encouraging and cannot regress due to misses.

**Negative**

- Reminder delivery is not active in this phase.
- Recomputing streaks from full history is O(days) per habit but acceptable for local single-user data; can be memoized later.
- Schedule-change semantics must be tested carefully to avoid surprising streak jumps.

## Verification

Unit tests cover schedule matching, daily/weekly/monthly completion denominators, skip/rest/missed streak behavior, schedule-change recomputation, heatmap/trend empty states, and mascot stage derivation. Browser gate exercises create/edit/delete/pause/archive, daily done/skip/rest, history, streaks, heatmaps, mascot changes, dark/Tamil/offline. Android runtime NOT APPLICABLE.