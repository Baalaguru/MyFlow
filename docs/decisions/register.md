# Decisions register

Source: Phase 28 of `MyFlow tasks.md`, plus scope decisions confirmed during planning.

- **Resolved date:** 2026-11-22
- **Default rule applied:** adopt the recommended default from the source specification unless the user chose otherwise.

## Resolved open decisions

| ID | Decision | Status | Resolution | Consequence |
| --- | --- | --- | --- | --- |
| D-01 | Final technology stack | Resolved | Accept the proposed stack unchanged; pin exact versions when toolchains are scaffolded | React/TS/Vite, Tailwind + custom DS, ECharts, Dexie/IndexedDB, Kotlin/Compose/Room/Glance, Go + REST/OpenAPI, PostgreSQL + SQLC, custom sync, Docker Compose, Tailscale |
| D-02 | Finance: expenses only or income + expenses | Resolved | **Expenses only** for v1; income deferred | `Expense` entity only; integer minor units and generic amount/currency fields so income can be added by migration |
| D-03 | Finance budgets and credit-card management | Resolved | **Deferred**. Optional card label per expense; no card entity, balances, statements, due dates, or budgets | Payment-mode enum includes Credit Card; card name is optional and shown only for that mode |
| D-04 | Jump-rope counting method | Resolved | **Manual + sensor-assisted**; sensor values are advisory and require device validation | `count_source` enum; no accuracy claims; manual path is the shipped baseline and has fixture tests |
| D-05 | Cycling GPS route recording | Resolved | **GPS speed and distance**; route history and map deferred | `CyclingSession` stores derived metrics; `CyclingLocationPoint` defined but not written in v1; GPS filtering rules specified |
| D-06 | Sync conflict policy | Resolved | **Smart merge with manual resolution** of true conflicts | Field-level three-way merge, append-only entity classes, conflict queue, tombstones; never silently discard |
| D-07 | Server PC availability | Resolved | **Best-effort server; local-first regardless of availability** | Server is a sync/backup peer; no feature gates on connectivity; exponential backoff; offline parity tests |
| D-08 | Exact Android widget release scope | Resolved | Prioritize **To-Do checklist, Habit quick completion, Mascot + streak, Gym quick access, Quick capture, Finance spending summary** | Six Glance widgets in the architecture; exact sizes and interactions finalized at detailed design |
| D-09 | External nutrition database provider | Resolved | **Manual nutrition entry plus recipes**; external provider deferred | `Food`/`FoodNutrition`/`Recipe*` in v1; nullable `source` and `source_ref` reserved for future imports; Phase 9 boundary detailed in [ADR-0025](../adr/0025-food-and-nutrition-tracker.md) |
| D-10 | Exact UI design and component styling | Resolved | **Design tokens are the contract**; detailed mockups are a later design task | Token pipeline, five presets, contrast guard, and typography scale defined before feature UI work |

## Scope confirmations

| Item | Decision | Notes |
| --- | --- | --- |
| First-release modules | Dashboard/widgets, Tasks, Habits, Mascot, Gym, Food, Cardio, Finance | Explicit divergence from §0 "all modules in first complete release"; Journal, Reading, and Calendar are deferred |
| Client strategy | Web and Android in parallel | Drives the up-front investment in shared contracts, tokens, and fixtures (ADR-0003, ADR-0011, ADR-0013) |
| Android widgets | Six candidates adopted as v1 scope | Behavior details to be frozen at detailed design; architecture supports all six |
| Mascot persistence | Add `MascotState` entity | §16.2 omits a mascot entity; progress is derived from habit logs, appearance/animation from settings |
| Journal key recovery | Envelope encryption with a generated recovery key | Journal is deferred, but the key scheme is fixed now so later tables are compatible |

## Process confirmations

| Item | Decision | Notes |
| --- | --- | --- |
| Phase completion verification | **Run the application at the end of every development phase** | Applies to server, web, and Android surfaces; results recorded in the phase report; see [quality.md §5](../architecture/quality.md#5-phase-completion-gate) |

## Still open (non-blocking)

| Item | Owner | Needed before |
| --- | --- | --- |
| Exact widget sizes, refresh intervals, and tap actions | Product/design | Android widget implementation |
| Journal unlock and recovery-key UX | Product/security | Journal module implementation |
| Windows toolchain verification (Node/pnpm, Go, Android SDK, Docker, PostgreSQL) | Development | Phase 2 scaffolding |
| Detailed UI mockups per module | Design | Feature UI implementation |

These do not block the architecture baseline: each has a defined boundary or default in the ADRs.
