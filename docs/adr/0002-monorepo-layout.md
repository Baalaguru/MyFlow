# ADR-0002: Monorepo layout

- **Status:** Accepted
- **Date:** 2026-11-22
- **Related:** [ADR-0001](0001-technology-stack.md), [ADR-0003](0003-contract-first-schemas.md)

## Context

Web and Android will be built in parallel and must share schemas, design tokens, localization bundles, and calculation fixtures. Separating them into independent repositories would make drift likely and slow contract changes.

## Decision

Use a single monorepo:

```text
MyFlow/
├── apps/web/          # React client
├── apps/android/      # Kotlin client (Gradle)
├── server/            # Go API
├── contracts/         # OpenAPI, JSON Schema, tokens, i18n, fixtures
├── packages/          # Generated/shared code and tooling
├── docs/              # Decisions, ADRs, architecture
└── deployments/       # Docker Compose, env templates
```

Web/contract tooling uses pnpm workspaces with task orchestration; Android uses Gradle; the server is a Go module. One CI pipeline validates all components.

Dependency rules:

- `contracts/` depends on nothing platform-specific.
- Clients and server depend on contracts, never on each other's source.
- Modules inside a client depend on their own repositories; cross-module reads go through a query registry ([ADR-0010](0010-module-boundaries.md)).

## Consequences

**Positive**

- A schema change updates both clients in the same commit.
- Shared fixtures, tokens, and strings have one home.
- Single CI signal for cross-platform compatibility.

**Negative**

- Larger checkout and more complex tooling.
- Gradle and Node builds must coexist on Windows; path/casing rules must be enforced.

## Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Separate repos per client | High drift risk for parallel development |
| Single cross-platform UI framework | Rejected in ADR-0001 |
| Nested git submodules | Poor developer experience and difficult atomic changes |

## Verification

CI builds web, Android, and server from a clean checkout in one run; contract changes cannot merge without both clients compiling.
