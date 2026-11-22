# Contributing to My Flow

## Branches

- `main` — stable architecture and released work
- `develop` — integration branch for completed phases
- `phase/<n>-<topic>` — phase work, merged into `develop` through a phase gate
- `fix/<topic>` — corrections

## Commit convention

Conventional Commits:

```text
<type>(<scope>): <short imperative summary>

[body]

[footer]
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`.
Scopes: `web`, `android`, `server`, `contracts`, `docs`, `deploy`.

Examples:

```text
feat(web): add offline-aware application shell
docs(adr): accept phase completion runtime gate
ci(contracts): fail build on stale generated models
```

## Before you open a phase gate

1. All CI gates pass ([quality.md](docs/architecture/quality.md)).
2. The application has been run on every available surface with the server unreachable ([phase completion gate](docs/architecture/quality.md#5-phase-completion-gate)).
3. Results are recorded in the phase report under `docs/phases/`.
4. Relevant ADRs and architecture docs are updated in the same change.

## Definition of done

See [quality.md §3](docs/architecture/quality.md#3-definition-of-done-per-task). A task is complete only with implementation, validation, passing tests, handled error cases, verified offline behavior where applicable, both themes checked, accessibility checked, documentation updated, and no critical regression.

## Development rules

The 15 rules at the end of `MyFlow tasks.md` are binding. In particular: no mock functionality labelled complete, no fabricated sensor measurements, no silent data overwrites, no credentials in source, no hard-coded user-facing strings, and no destructive action without confirmation.
