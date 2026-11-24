# ADR-0023: Gym workouts, sets, and personal records

- **Status:** Superseded by [ADR-0024](0024-exercise-multi-muscle-groups.md)
- **Date:** 2026-11-23
- **Related:** [ADR-0005](0005-local-database-read-path.md), [ADR-0006](0006-time-model.md), [ADR-0010](0010-module-boundaries.md), [ADR-0013](0013-analytics-rules.md), [ADR-0020](0020-dashboard-system.md)

## Context

Phase 8 adds the Gym module. The product requires exercises, workouts, individual sets, volume/progress analytics, personal records, and muscle-group context. Gym data must be local-first, offline-capable, and honest: no fabricated measurements, no inferred set completion, and no cross-set mutation.

## Decision

- **Entities** are local records: `Exercise` (built-in/custom, muscle group/category), `Workout` (started/ended/duration/note), `WorkoutExercise` (workout+exercise+order), `WorkoutSet` (one row per set: reps, weight, completed, completedAt, optional note), and `PersonalRecord` (exercise+metric+value+achievedAt+source set). Muscle-group mappings were originally `muscleGroup`/`secondaryMuscleGroups`; this field decision is superseded by [ADR-0024](0024-exercise-multi-muscle-groups.md), which defines canonical `muscleGroups: string[]`.
- **Per-set integrity**: every set is its own row/record. Editing set 2 never mutates set 3. Set volume is `reps * weight` for completed sets only; incomplete sets contribute 0.
- **Analytics** are pure functions over local records. Workout volume sums completed set volumes. PR is the highest completed value for an exercise/metric; ties keep the earliest achieved date. Progressive overload compares a completed set/exercise performance to the immediately preceding completed occurrence in historical order.
- **Dashboard widget**: `gymOverview` becomes available and backed by real local gym data. It shows recent workout/volume/PR summary and a quick-start action. Layout remains device-local (ADR-0020).
- **No fake measurements**. Weight/reps/duration are user-entered; unavailable analytics show explicit empty/unavailable states.
- **Android** mirrors web with a non-destructive Room migration, repositories, pure rules, Compose workspace, and dashboard wiring. Runtime verification is NOT APPLICABLE until an SDK/device is available.

## Consequences

**Positive**
- Set-level records prevent accidental cross-set edits and make analytics auditable.
- Shared fixtures/rules keep web and Android calculations aligned.

**Negative**
- Per-set rows increase storage/query complexity, but local single-user scale is small.
- Sync/server endpoints for gym remain future work; local schema is sync-friendly with UUIDs and timestamps.

## Verification

- Unit tests cover set/workout volume fixtures, PR tie/earliest behavior, progressive overload ordering, and empty states.
- Browser gate covers exercise/workout/set CRUD, per-set independence, completion, analytics, dashboard widget, dark/Tamil/offline, console.
- Android static parity and R.string checks pass; runtime NOT APPLICABLE in this environment.