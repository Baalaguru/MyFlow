# ADR-0005: Local database as the single read path

- **Status:** Accepted
- **Date:** 2026-11-22
- **Related:** [ADR-0001](0001-technology-stack.md), [ADR-0008](0008-sync-protocol.md)

## Context

The application must remain usable with the server offline, including search and analytics. If some screens read from the server and others from the local database, behavior and data freshness become inconsistent.

## Decision

- Web uses Dexie/IndexedDB; Android uses Room/SQLite.
- Both implement the same logical schema from `docs/architecture/data-model.md`.
- All UI reads go exclusively through module repositories backed by the local database.
- All writes commit locally first, append an outbox operation, and return success to the UI immediately.
- Synchronization runs in the background and never blocks a user action.
- Server responses are merged into the local database; the UI never renders them directly.

## Consequences

**Positive**

- Consistent offline behavior across every module.
- Simple, testable UI layer with no loading states caused by network latency.
- Sync failures cannot interrupt the user.

**Negative**

- Schema parity must be maintained and tested on both platforms.
- Migrations must be written twice and run in both clients.
- Local storage size must be monitored, especially for attachments and images.

## Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Server-first reads with local cache | Cache invalidation and offline gaps; violates local-first requirement |
| Shared embedded SQL engine on web (WASM SQLite) | Adds complexity and persistence limitations in browsers; Dexie is a better fit |
| Direct component-to-DB queries | No repository boundary; untestable and inconsistent |

## Verification

UI tests run with the server disabled and assert full module functionality; parity test compares table/column lists across Dexie and Room definitions; migration tests cover every upgrade step.
