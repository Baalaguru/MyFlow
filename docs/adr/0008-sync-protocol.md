# ADR-0008: Synchronization protocol

- **Status:** Accepted
- **Date:** 2026-11-22
- **Related:** D-06, D-07, [ADR-0004](0004-identity-clocks-revisions.md), [ADR-0009](0009-conflict-resolution.md)

## Context

The server PC may be unavailable for long periods. All devices must be able to create, edit, and delete data offline, then converge when connectivity returns, without duplicates or silent data loss.

## Decision

Implement an outbox-based, bidirectional sync protocol ([full spec](../architecture/sync-protocol.md)):

- Every local mutation writes the record and an **outbox operation** in one local transaction, with a durable idempotency key.
- Push sends batches to `POST /v1/sync/push`; the server deduplicates by idempotency key and validates per operation.
- Pull uses a per-device cursor over HLC-ordered changes, including tombstones.
- Apply merges each change against the stored base revision; unresolved cases go to a conflict queue ([ADR-0009](0009-conflict-resolution.md)).
- Cursors and sync status persist after each page; retries use exponential backoff with jitter and resume immediately on reconnection/app foreground.
- Attachments transfer separately, content-addressed by checksum, and never block record sync.
- The server is a peer: no feature is gated on its availability, and it never overwrites unsynced local data.

## Consequences

**Positive**

- Safe retries and interruption recovery; no duplicate records.
- Works with days or weeks of offline use.
- Clear status, pending counts, and history can be shown to the user.

**Negative**

- Considerable implementation and test surface.
- Eventual consistency must be explained in UI states (pending/syncing/conflict).

## Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Online-first API with local cache | Fails offline requirements |
| CRDT library for all entities | Heavy, hard to audit for domain rules, poor fit for relational queries and manual conflict review |
| Upload entire database snapshot | No concurrent edits, huge payloads, destructive overwrite risk |
| Third-party sync service | Violates self-hosted/private requirements |

## Verification

Offline scenario suite: create/edit/delete offline, restart, reconnect mid-push and mid-pull, assert no loss or duplication; fault injection for server rejection, auth failure, and interrupted transfers.
