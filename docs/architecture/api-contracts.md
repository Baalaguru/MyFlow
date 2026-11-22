# API contracts

## 1. Standards

- REST over HTTPS, JSON request/response bodies, UTF-8.
- All endpoints are versioned under `/v1`; breaking changes require `/v2`.
- OpenAPI 3.1 in `contracts/openapi/` is the source of truth. Server routes, TypeScript types, and Kotlin models are generated from it ([ADR-0003](../adr/0003-contract-first-schemas.md)).
- Database queries are written as SQL and compiled with SQLC; no ad-hoc query strings.
- Cursor-based pagination for lists; offset pagination is not used for synchronizable data.
- Errors use a consistent structured shape with a stable machine-readable code.
- Every protected request is authorized; no endpoint assumes the client is trusted.
- Mutating requests accept an `Idempotency-Key` header so retries are safe.
- Structured request tracing is attached to every request and included in errors and logs.

## 2. Conventions

| Concern | Convention |
| --- | --- |
| Resource paths | Plural nouns: `/v1/tasks`, `/v1/workouts/{id}/sets` |
| Methods | `GET` read, `POST` create, `PATCH` partial update, `DELETE` tombstone |
| Create response | `201` with the full stored representation and `Location` |
| Update response | `200` with the updated representation |
| Delete response | `204`; the record is tombstoned, not hard-deleted |
| Validation error | `422` with field-level details |
| Auth errors | `401` unauthenticated, `403` unauthorized/device not approved |
| Conflict | `409` for a rejected duplicate or unresolved version conflict |
| Rate limit | `429` with `Retry-After` |
| List query | `?cursor=&limit=&filter=&sort=` |
| Timestamps | RFC 3339 UTC for instants; `YYYY-MM-DD` for local dates |

### Error shape

```json
{
  "type": "https://myflow.local/problems/validation-failed",
  "title": "Validation failed",
  "status": 422,
  "code": "validation_failed",
  "trace_id": "01J...",
  "errors": [{ "field": "amount_minor", "code": "must_be_positive" }]
}
```

User-facing strings are never taken from raw server messages; clients map `code` to a localized string.

## 3. Endpoint inventory

| Area | Representative endpoints |
| --- | --- |
| Auth | `POST /v1/auth/login`, `/v1/auth/logout`, `/v1/auth/refresh`, `POST /v1/auth/2fa/*` |
| Profile & settings | `GET/PATCH /v1/profile`, `GET/PATCH /v1/settings`, `GET/PUT /v1/settings/{key}` |
| Dashboards | `GET/POST /v1/dashboards`, `GET/PATCH/DELETE /v1/dashboards/{id}`, `PUT /v1/dashboards/{id}/widgets` |
| Tasks | `/v1/tasks`, `/v1/tasks/{id}`, `/v1/tasks/{id}/subtasks`, `/v1/task-categories`, `/v1/tasks/{id}/recurrence`, `/v1/tasks/{id}/reminders` |
| Habits | `/v1/habits`, `/v1/habits/{id}`, `/v1/habits/{id}/schedule`, `/v1/habits/{id}/logs`, `/v1/habits/{id}/reminders` |
| Gym | `/v1/exercises`, `/v1/muscle-groups`, `/v1/workouts`, `/v1/workouts/{id}/exercises`, `/v1/workout-exercises/{id}/sets`, `/v1/personal-records` |
| Food | `/v1/foods`, `/v1/meals`, `/v1/meals/{id}/entries`, `/v1/recipes`, `/v1/recipes/{id}/ingredients`, `/v1/recipes/{id}/steps`, `/v1/nutrition-goals` |
| Cardio | `/v1/cardio/walking`, `/v1/cardio/steps`, `/v1/cardio/jump-rope`, `/v1/cardio/cycling` |
| Finance | `/v1/expenses`, `/v1/expense-categories`, `/v1/payment-methods` |
| Sync | `POST /v1/sync/push`, `GET /v1/sync/pull`, `GET /v1/sync/status`, `POST /v1/sync/conflicts/{id}/resolve` |
| Attachments | `POST /v1/attachments` (resumable where supported), `GET /v1/attachments/{checksum}` |
| Devices | `GET /v1/devices`, `PATCH /v1/devices/{id}/authorization`, `DELETE /v1/devices/{id}` |
| Backup | `POST /v1/backups`, `GET /v1/backups`, `POST /v1/backups/{id}/restore`, `GET /v1/backups/{id}/verify` |

Endpoints for deferred modules (Journal, Reading, Calendar, income/budgets/cards) are not created in v1; their names are reserved in the OpenAPI roadmap so future clients do not have to guess conventions.

## 4. Synchronization endpoints

### `POST /v1/sync/push`

Request: `{ device_id, operations: [SyncOperation] }`.
Response: `{ acked_keys: [], rejected: [{ idempotency_key, code, message }], server_hlc }`.

- Duplicated idempotency keys return `acked` without reapplying.
- Validation failures are per-operation; one bad record does not reject the batch.
- The server never rewrites a client record to "fix" a conflict; it stores it and lets the merge protocol surface the conflict.

### `GET /v1/sync/pull`

Query: `cursor`, `limit`.
Response: `{ changes: [record envelopes], new_cursor, has_more }`.

- Envelopes include the full record metadata (`id`, `revision`, HLC fields, tombstone) so clients can merge.
- Results are ordered by HLC. Deleted records appear as tombstones.
- Cursors are per device and opaque to clients.

## 5. Cross-cutting behavior

| Concern | Requirement |
| --- | --- |
| Validation | All input validated at the boundary; amount positive, dates parseable, enums closed, payload size bounded |
| Authorization | Single-user model, but every device and session is checked on every request |
| Rate limiting | Per session and per IP; login and sync endpoints have stricter limits |
| Sensitive data | Journal content (deferred) is transported only as ciphertext; servers never index it |
| Logging | Trace ID, device ID, entity type, and status; never record values or journal text |
| Compatibility | Contract tests run against every generated client model; breaking schema changes fail CI |
