# ADR-0009: Conflict resolution

- **Status:** Accepted
- **Date:** 2026-11-22
- **Related:** D-06, [ADR-0008](0008-sync-protocol.md)

## Context

Two devices can edit the same record while offline. A simple last-writer-wins policy silently destroys user data, which is explicitly forbidden by the development rules and by D-06's recommended smart merge.

## Decision

Classify entities and merge accordingly:

| Class | Examples | Rule |
| --- | --- | --- |
| Append-only | `HabitLog`, `StepRecord`, `MealEntry`, outbox | Insert once; dedupe by unique key; never conflict |
| Field-mergeable | `Task`, `Habit`, `Workout`, `WorkoutSet`, `Food`, `Expense`, dashboards, widgets | Three-way merge per field against stored base |
| Keyed settings | `AppSettings`, notification preferences | LWW per key by HLC |
| Reference data | Built-in muscle groups, payment methods | Server-authoritative; custom entries are field-mergeable |

Rules:

- Non-conflicting field edits merge automatically.
- Same-field divergent edits create a `SyncConflict` with local, incoming, and base values; the UI requires an explicit choice.
- Delete versus edit creates a conflict with options Keep local, Accept deletion, or Keep both; never defaults to deletion.
- Original timestamps and revision metadata are preserved in conflict history.
- No user data is discarded automatically; unsafe merges are always surfaced.

## Consequences

**Positive**

- Most offline edits converge without user intervention, especially because much of the model is append-only.
- Genuine losses are impossible without an explicit user decision.
- Conflict history supports auditing.

**Negative**

- Requires storing base snapshots and a conflict-resolution UI.
- Some sync cycles pause for user input in genuinely ambiguous cases.

## Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Last-writer-wins everywhere | Silent data loss; forbidden |
| Manual review for every change | Unusable with frequent sync |
| Full CRDT types | Complex, not needed for append-only/field-level majority |

## Verification

Fixtures for: non-overlapping field edits, same-field edits, delete versus edit, append duplicates, settings LWW, and three-device concurrency; tests assert no record disappears without a recorded decision.
