# ADR-0013: Analytics rules and shared fixtures

- **Status:** Accepted
- **Date:** 2026-11-22
- **Related:** [ADR-0006](0006-time-model.md), [ADR-0012](0012-localization.md)

## Context

Every module and dashboard needs statistics. Web and Android are implemented independently, so identical inputs must produce identical numbers. A shared runtime would force a framework choice rejected in ADR-0001.

## Decision

- Publish the complete rule catalog in `docs/architecture/analytics.md`: formulas, denominators, date grouping, edge cases, and empty-state behavior.
- Implement each rule as a pure function in each client, with no UI or database dependencies.
- Store JSON fixtures in `contracts/fixtures/` covering normal, empty, boundary, DST, over-goal, and missing-data cases.
- Both clients run the identical fixture set in unit tests; CI fails if either diverges.
- Analytics are derived from source records on demand; computed values are not persisted as truth.
- Progress indicators follow the owning module's rule and are hidden when no goal or schedule exists.

## Consequences

**Positive**

- Cross-platform numeric parity without a shared code runtime.
- Rules are reviewable as documentation and executable as tests.
- New modules reuse the same aggregation patterns.

**Negative**

- Each rule is implemented twice; fixtures are the guard.
- Complex rules require careful, explicit definitions to avoid ambiguous interpretations.

## Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Shared Kotlin Multiplatform module | Adds toolchain complexity rejected in ADR-0001 |
| Server-computed analytics | Violates offline-first requirement |
| No shared definition | Guaranteed cross-platform divergence |

## Verification

Fixture suite passes on both clients; accuracy verification is a release gate; reports embed rule name and parameters for independent checking.
