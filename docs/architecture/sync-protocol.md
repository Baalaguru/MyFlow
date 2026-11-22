# Synchronization protocol

This is the core cross-cutting mechanism. Full rationale is in [ADR-0008](../adr/0008-sync-protocol.md) and [ADR-0009](../adr/0009-conflict-resolution.md).

## 1. Goals

- Local creation, editing, deletion, search, and analytics work offline.
- Changes made while offline survive restarts and eventually reach every device.
- No duplicate records, no silent data loss, no unsafe automatic conflict resolution.
- Interruptions at any point are recoverable.

## 2. Record metadata

Every synchronizable row carries:

| Field | Purpose |
| --- | --- |
| `id` | Client-generated UUIDv7, stable for the record's lifetime |
| `revision` | Monotonically increasing local version |
| `hlc_created` / `hlc_updated` | Hybrid logical clock: `physicalMillis-logicalCounter-deviceId` |
| `hlc_deleted` | Tombstone instant; null when live |
| `base_revision` / `base_payload` | Last server-confirmed version used as the merge base |

HLC ordering tolerates clock skew between devices; ties break by device ID, deterministically on every client.

## 3. Outbox operation

```json
{
  "idempotency_key": "uuidv7",
  "entity": "WorkoutSet",
  "entity_id": "uuidv7",
  "op": "upsert | delete",
  "payload": { "...": "full merged record after the local change" },
  "base_revision": 3,
  "hlc": "1732200000000-2-deviceA",
  "attempts": 0,
  "next_attempt_at": null
}
```

The idempotency key is generated once when the local mutation occurs and never changes, so retries cannot create duplicate records.

## 4. Push / pull cycle

```mermaid
sequenceDiagram
    participant C as Client sync engine
    participant L as Local DB
    participant S as Go API

    C->>L: select pending outbox ops (batch)
    C->>S: POST /v1/sync/push {ops, device_id}
    S->>S: validate, authorize, dedupe by idempotency key
    S-->>C: {acked_keys[], rejected[], server_hlc}
    C->>L: mark acked ops committed; store rejections for correction
    C->>S: GET /v1/sync/pull?cursor=...&limit=...
    S-->>C: {changes[], new_cursor, has_more}
    loop each change
        C->>L: three-way merge against base_revision/payload
        alt same field changed on both sides
            C->>L: write SyncConflict row (manual queue)
        else non-conflicting
            C->>L: apply merged record
        end
    end
    C->>L: persist cursor, sync status, history
```

Pagination continues until `has_more` is false. Tombstones are included in pull results.

## 5. Entity conflict classes

| Class | Examples | Rule |
| --- | --- | --- |
| Append-only | `HabitLog`, `StepRecord`, `MealEntry`, `JournalEntry` (later), `SyncOperation` | Never conflict; insert with unique dedupe key. Ignore duplicate delivery. |
| Field-mergeable | `Task`, `Habit`, `Exercise`, `Workout`, `WorkoutSet`, `Food`, `Expense`, `Dashboard`, `DashboardWidget` | Three-way merge per field against base. Same-field edits from two devices become a conflict. |
| Keyed settings | `AppSettings`, `NotificationPreference` | Last-writer-wins per key using HLC, because there is no meaningful partial merge. |
| Reference data | `MuscleGroup`, `PaymentMethod`, `TaskCategory`, `ExpenseCategory` | Server-authoritative for built-ins; custom entries are field-mergeable. |

Workout sets are field-mergeable but each set is its own row, which naturally prevents one set's values from overwriting another's.

## 6. Merge algorithm

1. Load local record, incoming record, and stored base.
2. For each field:
   - unchanged locally → take incoming;
   - unchanged remotely → keep local;
   - changed both to the same value → keep one;
   - changed both differently → if the field is mergeable by type (e.g., set union for tag lists), merge; otherwise create a conflict entry retaining local, incoming, and base values.
3. Resolve metadata: `revision` increments, `hlc_updated` becomes max(local, incoming) + 1, `base_*` becomes the newly accepted server version.
4. Nothing is overwritten while a conflict entry exists; the UI shows both values with a explicit choice.

### Delete versus edit

A delete tombstone meeting a local edit produces a conflict with options **Keep local copy (restore as new record)**, **Accept deletion**, or **Keep both**. The default is never "accept deletion".

## 7. Retry and status

- Exponential backoff with jitter, starting at a short interval and capped; reset on success.
- Immediate retry on network reconnect, app foreground, and widget refresh triggers.
- Batch size limited so a slow connection can make progress.
- Status values: `idle`, `pending`, `syncing`, `blocked` (validation/auth error), `offline`, `conflict`.
- UI shows connection state, pending count, last successful sync, and actionable errors.
- An interrupted push/pull is safe: idempotency keys prevent duplicates, and cursors are persisted after each applied page.

## 8. Attachments

- Binary content is stored separately from records and addressed by content checksum.
- Record fields hold an attachment reference plus checksum, not embedded bytes.
- Upload/download use dedicated endpoints with resumable behavior where the platform allows.
- An attachment whose transfer fails stays referenced locally; the record is not blocked from syncing.
- Journal attachments (deferred) use the encrypted path from [ADR-0015](../adr/0015-authentication-encryption.md).

## 9. Recovery guarantees

| Failure | Outcome |
| --- | --- |
| App closed mid-write | Local transaction is atomic; outbox and record either both commit or neither |
| Network lost mid-push | Unacked operations remain pending; server dedupes on retry |
| Network lost mid-pull | Cursor advances only after a page is fully applied |
| Server rejects a record | Local data kept; rejection surfaced for correction |
| Two devices edit offline | Non-conflicting fields merge; genuine conflicts queued for manual choice |
| Server unavailable for days | Client continues normally; queue grows and drains when available |
