# ADR-0020: Dashboard system and widget contract

- **Status:** Accepted
- **Date:** 2026-11-22
- **Related:** [ADR-0010](0010-module-boundaries.md), [ADR-0011](0011-design-tokens-theming.md), [ADR-0013](0013-analytics-rules.md), [ADR-0019](0019-navigation-workspaces.md)

## Context

Phase 5 adds multiple dashboards, a modular grid, and a widget catalogue. The first release is offline-first and single-user, with Tasks as the only module that already has local records. Habits, Gym, Food, Cardio, Finance, Mascot growth, Journal, Reading, and Calendar do not have repositories yet. Sync is also not implemented, so "persist dashboard preferences across devices" cannot honestly be claimed in this phase.

## Decision

- A **Dashboard** is a local record with a stable id, display name, sort order, default flag, and an ordered array of widget configurations. The first run creates one default dashboard ("Daily Overview"). Deleting the last dashboard recreates a default one so the home route always has a valid target.
- Widget configurations hold only layout and presentation state: widget id, column span, row span, visibility, background token id, and accent token id. They never copy module records. Widget bodies read through module repositories, following [ADR-0010](0010-module-boundaries.md).
- Widget identifiers are stable contract values shared by the web registry, Android destinations, and localisation keys. A widget whose module has no repository renders an honest empty state with the reason; it never renders zeroed or invented statistics.
- The grid is a 12-column CSS grid. Drag and drop and resizing use pointer events with keyboard-accessible reorder controls as an equivalent path. Layouts persist locally after every change and can be reset to the dashboard's seed layout. Below the desktop breakpoint the grid collapses to a single column with the same widget order.
- Dashboard analytics are pure functions over real local task records. Weekly and monthly charts show an explicit empty state when there are no records in the range; no chart is drawn from a fabricated series.
- Cross-device dashboard preference sync is **deferred** to the sync phase. Phase 5 persists preferences on the current device only. This is recorded in the phase report rather than presented as complete.
- Android mirrors the dashboard selector and widget list statically. Interactive home-screen widgets remain in Phase 19 scope.

## Consequences

**Positive**

- Dashboard configurations can later travel through the sync engine without a schema change.
- The widget registry can grow as modules land, without rewriting the grid or the dashboard record.
- Empty modules cannot imply activity through meaningless charts or zeroed counters.

**Negative**

- Cross-device preference continuity is not available yet.
- Only task-backed widgets show real numbers in this phase; the rest are honest placeholders.
- Pointer-driven drag/resize needs a keyboard equivalent to stay accessible.

## Verification

Unit tests cover dashboard CRUD helpers, layout normalisation, widget registry completeness, and task-backed analytics with empty data. The Phase 5 browser gate creates, renames, duplicates, reorders, deletes, and restores dashboards; adds and configures widgets; drags, resizes, hides, and resets a layout; verifies charts and empty states; and reruns the offline cold-start check. Android runtime verification remains NOT APPLICABLE until an SDK and device exist.
