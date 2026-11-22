# ADR-0006: Time model

- **Status:** Accepted
- **Date:** 2026-11-22
- **Related:** D-07, [ADR-0013](0013-analytics-rules.md), [ADR-0014](0014-notifications-background.md)

## Context

Habit logs, due dates, expenses, journal entries, and reminders depend on the user's local calendar day. Instants must also be comparable across devices and timezones, and daylight-saving changes must not shift a daily habit or reminder.

## Decision

- **Instants** (`created_at`, `logged_at`, `completed_at`, session start/stop): UTC, stored as RFC 3339 UTC or epoch milliseconds, converted for display.
- **Local dates** (`due_date`, `HabitLog.local_date`, `Expense.local_date`, meal dates): `YYYY-MM-DD` with no timezone, interpreted in the user's configured IANA timezone.
- `UserProfile.timezone` is authoritative; date format, 12/24-hour preference, and first day of week are separate settings.
- Recurrence rules are stored as timezone-aware JSON; next occurrences are computed in local time and recomputed after a timezone change.
- Reminders are scheduled in local time; DST transitions regenerate the next firing time.
- Analytics group by local date using the configured first day of week.

## Consequences

**Positive**

- A habit completed "on Tuesday" stays on Tuesday across timezones and DST.
- Instants remain globally comparable for sync and ordering.
- Locale-aware formatting is straightforward.

**Negative**

- Two column types must be used consistently; mixing them causes subtle bugs.
- DST edge cases require dedicated fixtures.

## Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Store everything as UTC instants | Local calendar semantics shift across timezones and DST |
| Store everything as local naive datetime | Ambiguous during DST overlap, not comparable across devices |
| Derive timezone from device only | Cross-device sync would reinterpret dates inconsistently |

## Verification

Fixtures cover spring-forward, fall-back, timezone change mid-history, recurring tasks, and reminders; both clients must produce identical local dates and aggregation buckets.
