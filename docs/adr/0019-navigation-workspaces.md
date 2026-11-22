# ADR-0019: Navigation, deep links, and module workspaces

- **Status:** Accepted
- **Date:** 2026-11-22
- **Related:** [ADR-0010](0010-module-boundaries.md), [ADR-0011](0011-design-tokens-theming.md), [ADR-0017](0017-quality-gates.md)

## Context

Phase 4 turns the Phase 3 shell into a real navigation system: browser history, deep links, working global search, profile access, and focused workspaces for each module. The first release is offline-first and single-user; most module datasets do not exist until later phases. Progress must never be presented as 0% or 100% when there is no goal or record to measure.

## Decision

- Web routes are hash-based (`#/dashboard`, `#/tasks`, `#/habits`, `#/gym`, `#/food`, `#/cardio`, `#/finance`, `#/appearance`, `#/design-system`, `#/profile`). Hash routes work from static hosting without server rewrites and survive a cold offline start.
- Route identifiers are stable contract values, not translation labels or array indices. The sidebar, breadcrumbs, deep links, Android destinations, and search results all use the same identifiers.
- Navigation history uses the browser history stack. In-app back/forward controls call the browser history API; an unknown or empty fragment is replaced with `#/dashboard` without adding a history entry.
- Global search is a local, read-only projection registry. In Phase 4 its only provider is the task repository; later phases add providers without changing the search UI. Journal content is not indexed while locked or absent.
- The profile entry point resolves to a single personal-profile screen. Phase 4 exposes access only; editable profile name/image and account security remain in Phase 15. No multi-user or family-member model is introduced.
- Each module opens as its own focused workspace assembled from shared primitives (header, progress strip, filter bar, empty state), but the body layout is module-specific. A module with no records shows an honest empty state and an unavailable progress indicator rather than a generic card full of zeroes.
- Module progress is computed only from real local records. To-Do uses completed/total tasks because quick capture already writes tasks. All other modules report *unavailable* until their repositories and goals exist.
- Android mirrors the same destination identifiers and selected states using Compose navigation. Device runtime verification remains blocked until an SDK and device are available and is recorded as NOT APPLICABLE.

## Consequences

**Positive**

- Deep links, browser back/forward, and Android destinations share one vocabulary.
- The search UI does not need to know which module owns a record.
- Empty modules cannot display misleading completion percentages.
- Later phases add modules and search providers without changing navigation contracts.

**Negative**

- Hash URLs are less aesthetic than path routing and are not a full routing framework.
- Task completion is introduced early so To-Do progress is real; the richer task editor still belongs to Phase 6.
- Android navigation is implemented statically until a device is available.

## Verification

Pure unit tests cover route parsing, progress calculation, and the task search projection. The Phase 4 browser gate exercises deep links, back/forward, global search, profile access, task completion progress, all module workspaces, both themes, and an offline cold start. Contract validation checks English/Tamil parity. The Android target is reported as NOT APPLICABLE with the missing SDK/device named explicitly.
