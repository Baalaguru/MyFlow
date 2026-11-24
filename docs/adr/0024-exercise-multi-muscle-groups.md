# ADR-0024: Gym exercise multi-muscle groups

- **Status:** Accepted
- **Date:** 2026-11-24
- **Related:** [ADR-0023](0023-gym-workouts-and-sets.md), [ADR-0010](0010-module-boundaries.md), [ADR-0005](0005-local-database-read-path.md)
- **Supersedes:** [ADR-0023](0023-gym-workouts-and-sets.md) (muscle-group field decision only; all other Phase 8 gym decisions remain in effect and are restated here where relevant)

## Context

Phase 8 initially modeled an exercise with a single `muscleGroup` and optional `secondaryMuscleGroups`. Real exercises commonly target multiple primary muscle groups (e.g., bench press: chest, arms; deadlift: back, legs). UI and local data now support multi-select muscle groups. Before sync/API work, contracts must define a canonical normalized shape.

## Decision

- **Canonical contract field** is `muscleGroups: string[]` (ordered, deduplicated, non-empty). Allowed v1 values: `chest`, `back`, `legs`, `shoulders`, `arms`, `core`, `fullBody`, `other`.
- **Compatibility**: readers may accept legacy `muscleGroup?: string` and normalize to `muscleGroups = [muscleGroup]`; writers emit `muscleGroups`. Web local records keep `muscleGroup` as the first element for backward compatibility during migration.
- **Android local storage** currently persists `muscleGroup` TEXT as comma-separated canonical keys (no Room migration in this phase). Repository/DAO boundaries must serialize `List<String> -> "chest,arms"` and deserialize `"chest,arms" -> ["chest","arms"]`, normalizing unknown/blank values to `["other"]`.
- **Sync/API boundary**: when gym sync contracts are added, they use `muscleGroups: string[]`. Android must convert comma-separated storage to array on push and array to normalized comma-separated/canonical storage on pull until a Room migration introduces a normalized table or JSON column.
- **Validation**: empty selection is invalid in UI; persisted records normalize to at least one value.

## Consequences

**Positive**
- Matches real exercise anatomy and user expectation.
- Contract has a clear canonical array shape for future sync/API.

**Negative**
- Android has temporary storage/contract shape divergence; boundary conversion is required.
- Existing local Android rows with single value remain valid; multi-value rows depend on comma parsing.

## Verification

- Web/Android unit/build checks pass.
- Contract validation includes updated i18n/schema artifacts as applicable.
- Runtime gate must confirm multi-select create/display/delete behavior on web and Android.