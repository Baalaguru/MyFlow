# ADR-0010: Module boundaries and projections

- **Status:** Accepted
- **Date:** 2026-11-22
- **Related:** [ADR-0005](0005-local-database-read-path.md)

## Context

Thirteen modules share data: tasks appear in Calendar and dashboards, expenses appear in Finance overview and Calendar due dates, habits feed the mascot, and global search spans everything. Copying data between modules would create conflicting versions.

## Decision

- Each module owns its tables. Only its repository may write them.
- Cross-module reads go through a **read-only query registry** that returns view models, never mutable records.
- **Calendar** (deferred) is a pure projection over task due dates, habit reminders, workout schedules, reading goals, journal indicators, and finance due dates — it creates no copies.
- **Global search** builds a local index over module records with privacy gating; journal content is excluded unless unlocked.
- **Dashboard widgets** consume module repositories and analytics functions; they hold only configuration (layout, colors, filters), never duplicated data.
- **Mascot state** derives growth from habit logs and reads appearance settings; it does not duplicate habit history.
- Dependency direction: UI → repository → local DB → sync engine. Modules must not write another module's tables.

## Consequences

**Positive**

- No conflicting copies of shared data.
- Deferred modules can be added without migrating existing records.
- Modules remain independently testable.

**Negative**

- Projection queries must be carefully indexed for performance.
- Requires discipline to prevent UI code from reaching across boundaries.

## Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Each module stores its own copy of calendar items | Guaranteed drift; explicitly forbidden by §13.2 |
| Directly share UI components and database access | Tight coupling, untestable |
| Single generic "items" table | Loses domain constraints and clarity |

## Verification

Architecture lint rule blocks cross-module table writes; integration tests assert that a task deletion changes Calendar/search projections without leaving stale copies; performance tests cover projection queries with large datasets.
