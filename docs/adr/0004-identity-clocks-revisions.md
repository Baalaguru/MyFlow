# ADR-0004: Identity, clocks, and revisions

- **Status:** Accepted
- **Date:** 2026-11-22
- **Related:** [ADR-0008](0008-sync-protocol.md), [ADR-0009](0009-conflict-resolution.md)

## Context

Records are created offline on multiple devices, device clocks can be wrong, and the server must never renumber a client's record. Plain timestamps are unsafe for ordering concurrent changes, and integer IDs require a round trip.

## Decision

- Every record gets a **client-generated UUIDv7** before the local write; it never changes.
- Every record carries `revision` (integer), `hlc_created`, `hlc_updated`, and optional `hlc_deleted`.
- HLC format: `physicalMillis-logicalCounter-deviceId`, monotonically increasing per device; ties break by device ID.
- `base_revision` and `base_payload` store the last server-confirmed version for three-way merges.
- Deletes are tombstones (`hlc_deleted`), not hard deletes, until retention expiry.
- The server validates but never reassigns IDs.

## Consequences

**Positive**

- Offline creation needs no server.
- Cross-device ordering is deterministic despite clock skew.
- Merge base is explicit, enabling safe field-level merging.

**Negative**

- HLC values are more complex to store and compare than timestamps.
- Tombstones require retention management and index maintenance.

## Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Server-assigned auto-increment IDs | Breaks offline creation and stable local IDs |
| Plain `updated_at` timestamps with LWW | Unsafe with skewed clocks and silent data loss |
| ULID instead of UUIDv7 | Viable alternative; UUIDv7 chosen for standard library/library support across TS, Kotlin, and Go |

## Verification

Fixture tests generate records on simulated skewed clocks and assert deterministic ordering; integration tests confirm IDs and base revisions survive a sync round trip unchanged.
