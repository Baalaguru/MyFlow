# ADR-0021: To-Do task model, views, and recurrence

- **Status:** Accepted
- **Date:** 2026-11-22
- **Related:** [ADR-0005](0005-local-database-read-path.md), [ADR-0010](0010-module-boundaries.md), [ADR-0013](0013-analytics-rules.md), [ADR-0020](0020-dashboard-system.md)

## Context

Phase 4 introduced local tasks with only an id, title, completed flag, and creation time. Phase 6 requires richer tasks, four priorities, several views, subtasks, recurrence, reminders, and task analytics. The app is offline-first and single-user; there is no notification scheduler, no server task endpoint, and no calendar module in the first release.

## Decision

- A **Task** keeps the existing stable id and adds: description, priority (`veryHigh`, `high`, `medium`, `low`), category, due date, optional start and end times, status (`open` or `completed`), subtasks, recurrence rule, reminder offset, and completion instant. All fields are local; no server round trip is required to create or edit a task.
- **Completion instants** are authoritative. `completedAt` is set on completion and cleared on reopen. Legacy tasks without `completedAt` keep their completed status but are not credited to a completion date; no timestamp is invented.
- **Progress denominator** follows [analytics.md](../architecture/analytics.md): only tasks scheduled in the selected range count. A task is scheduled when it has a due date or a start time. If no scheduled task exists in the range, progress is *unavailable* rather than 0%. The dashboard and the Tasks workspace use the same pure calculator.
- **Subtasks** are embedded records with their own id, title, and completed flag. They are independently toggled. Parent completion does not mutate subtasks, and subtask progress is reported separately.
- **Recurrence** is stored as a simple local rule (daily, weekly, or monthly, with an interval and either an occurrence count or an end date). Completing a recurring task materialises the next occurrence as a new concrete task linked to its parent. Occurrences are append-only: editing or completing one never rewrites a previous occurrence. A rule with neither count nor end date creates at most one future occurrence at a time, avoiding unbounded background generation.
- **Reminders** store an offset from the due instant only. OS notifications, banners, and background delivery are **deferred**; the UI states that the reminder is saved locally and that delivery is not yet implemented. It is never presented as a working alarm.
- **Views** (All, Today, Upcoming, Overdue, Completed, By priority, By category, and Calendar) are pure projections over the same task list. The Calendar view is a month grid of task deadlines inside the Tasks workspace, not a new Calendar module. Search and filters compose with any view.
- **Android** mirrors the extended task schema with a non-destructive Room v3→v4 migration, a repository with the same pure projections, and resource-backed labels. Interactive widgets and OS reminders remain in their own later phases.

## Consequences

**Positive**

- All task data stays in one local table, so offline create/edit and restart persistence are immediate.
- Recurrence is auditable because each occurrence is a real record rather than a derived display trick.
- Unscheduled notes cannot inflate completion percentages.

**Negative**

- Reminder delivery is not implemented in this phase.
- The Calendar view is in-app only; system calendar integration is deferred with the Calendar module.
- Recurrence materialisation happens on completion, so a future occurrence does not exist until the current one is completed.

## Verification

Unit tests cover the four-priority ordering, each view projection, subtask independence, recurrence generation with count and end-date bounds, progress exclusion of unscheduled tasks, and analytics with empty data. The Phase 6 browser gate creates, edits, completes, reopens, filters, and deletes tasks offline, checks subtasks and recurrence, and verifies the calendar projection and charts. Android runtime verification remains NOT APPLICABLE until an SDK and device exist.
