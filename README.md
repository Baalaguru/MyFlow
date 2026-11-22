# My Flow — A Second Brain

A private, offline-first personal productivity ecosystem with the feel of a vintage journal, a well-ordered library, a fitness logbook, and a modern second brain.

**Project status:** Architecture baseline complete. No application code yet.

## What this repository contains

| Path | Purpose |
| --- | --- |
| `docs/decisions/` | Resolved open decisions (D-01 … D-10) and scope confirmations |
| `docs/adr/` | Architecture Decision Records — the binding technical choices |
| `docs/architecture/` | System, data, sync, API, security, design, and quality specifications |
| `contracts/` | Shared schemas, design tokens, localization bundles, calculation fixtures |
| `apps/web/` | React + TypeScript web/desktop client (planned) |
| `apps/android/` | Kotlin + Jetpack Compose native client (planned) |
| `server/` | Go API and synchronization server (planned) |
| `packages/` | Shared token, i18n, and rule packages (planned) |
| `deployments/` | Docker Compose and deployment configuration (planned) |

## Product scope

**v1 modules:** Dashboard + widgets, Tasks, Habits, Mascot, Gym, Food, Cardio (walking / jump rope / cycling), Finance (expenses only).

**Deferred, but schema-compatible:** Journal, Reading, Calendar, finance income/budgets/full credit-card management, cycling route recording, external nutrition provider.

The full source specification lives at `C:\Users\GEETHABALU\Downloads\MyFlow tasks.md` (28 phases). This repository is the architecture baseline derived from it.

## Governing principles

1. Local-first: every module works fully without the server.
2. The server is a sync and backup peer, never a runtime dependency.
3. Web and Android are built in parallel against one set of contracts.
4. Derived statistics are computed, never stored as competing truth.
5. User data is never silently discarded; destructive actions require confirmation.
6. Accessibility, both themes, offline behavior, and localization are part of "done".
7. Every phase ends with the application actually running and smoke-tested on each available surface — see the [phase completion gate](docs/architecture/quality.md#5-phase-completion-gate).

## Start here

- [Documentation index](docs/README.md)
- [Resolved decisions](docs/decisions/register.md)
- [Architecture overview](docs/architecture/overview.md)
- [ADR index](docs/adr/README.md)

## Next step

Scaffold the monorepo toolchains and begin Phase 2 of the source specification, using the ADRs as the binding design.
