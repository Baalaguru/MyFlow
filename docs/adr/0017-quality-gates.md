# ADR-0017: Quality gates and Definition of Done

- **Status:** Accepted
- **Date:** 2026-11-22
- **Related:** [architecture/quality.md](../architecture/quality.md)

## Context

The specification includes 15 development rules, a Definition of Done, and a warning not to skip testing or label mocks as complete. With parallel clients and a complex sync engine, quality must be enforced mechanically rather than by intent.

## Decision

Adopt the [quality gates](../architecture/quality.md) as merge-blocking CI checks:

1. Contract artifacts regenerated and clean; both clients compile.
2. Shared calculation fixtures pass on web and Android.
3. Local database schema parity passes.
4. Unit, integration, offline, UI, device, and security suites pass at their required cadence.
5. Lint, formatting, static analysis, string lints, and token/contrast lints pass.
6. Migration tests pass from the previous schema version.
7. Documentation is updated in the same change.
8. **Phase completion runtime gate:** at the end of every development phase, launch and smoke-test each runnable surface (server, web, Android) with the server unreachable. A phase cannot be marked complete on tests alone. See [quality.md §5](../architecture/quality.md#5-phase-completion-gate).

The Definition of Done checklist is mandatory per task: implementation, validation, tests, error cases, offline verification where applicable, both themes, accessibility, documentation, and no critical regression. Development rules are enforced as described in the quality document — notably no fabricated sensor data, no silent overwrites, no hard-coded strings, no unconfirmed destructive actions.

## Consequences

**Positive**

- "Complete" has a single, verifiable meaning across both clients.
- Cross-platform drift and silent data loss are caught before release.
- Every phase ends with a recorded runtime smoke test, not just a green CI run.
- Documentation stays current with behavior.

**Negative**

- CI is stricter and slower; some device tests run on a schedule rather than per commit.
- Contributors must learn the fixture and contract workflow.

## Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Manual review only | Inconsistent and unreliable under deadline pressure |
| Test only at release | Defects in sync and calculations become expensive to fix |
| Different standards per platform | Violates consistency requirement |

## Verification

CI configuration contains every gate; release checklist maps directly to the Definition of Done and Phase 27 acceptance criteria; no gate can be skipped without an ADR-level exception.
