# ADR-0003: Contract-first schemas

- **Status:** Accepted
- **Date:** 2026-11-22
- **Related:** [ADR-0002](0002-monorepo-layout.md), [ADR-0004](0004-identity-clocks-revisions.md)

## Context

Web, Android, and the Go server must exchange identical shapes. Hand-written models on each side would diverge and cause sync and UI bugs that are hard to diagnose.

## Decision

Contracts are authored first and generated outward:

- **OpenAPI 3.1** in `contracts/openapi/` defines REST endpoints, request/response schemas, error shapes, and security schemes.
- **JSON Schema** in `contracts/schemas/` defines synchronizable entities and their metadata fields.
- Generated TypeScript models for web, generated Kotlin models for Android, and server-side validation types.
- SQLC compiles checked-in SQL into Go; migrations are the only way to change schema.
- API version prefix `/v1`; breaking changes require a new version.
- Generated files are committed and verified in CI; hand-editing them is prohibited.

## Consequences

**Positive**

- Compile-time detection of contract drift across all three components.
- Server validation and client models cannot disagree about required fields.
- Documentation is generated from the same source.

**Negative**

- A contract change requires regeneration in one commit and coordinated client updates.
- Some generated code is verbose; customization must stay in adapters, not generated files.

## Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Hand-written models per platform | Drift risk; no compile-time compatibility |
| GraphQL with codegen | Adds a gateway layer not needed for a single-user, local-first app |
| Protobuf/gRPC | Poor fit for browser clients and REST/OpenAPI documentation requirements |

## Verification

CI regenerates artifacts and fails on a dirty tree; contract tests compile both clients against current schemas; breaking-change detection runs on every pull request.
