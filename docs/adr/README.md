# Architecture Decision Records

| ADR | Title | Status | Key decision |
| --- | --- | --- | --- |
| [0001](0001-technology-stack.md) | Technology stack | Accepted | Proposed React/Android/Go/PostgreSQL stack confirmed |
| [0002](0002-monorepo-layout.md) | Monorepo layout | Accepted | One repo; shared `contracts/`; both clients in parallel |
| [0003](0003-contract-first-schemas.md) | Contract-first schemas | Accepted | OpenAPI + JSON Schema generate all client models |
| [0004](0004-identity-clocks-revisions.md) | Identity, clocks, revisions | Accepted | UUIDv7 + HLC + base revisions; tombstones |
| [0005](0005-local-database-read-path.md) | Local database read path | Accepted | All reads from Dexie/Room; server never blocks UI |
| [0006](0006-time-model.md) | Time model | Accepted | UTC instants + local dates + IANA timezone |
| [0007](0007-money-model.md) | Money model | Accepted | Integer paise; expenses only in v1 |
| [0008](0008-sync-protocol.md) | Sync protocol | Accepted | Outbox, idempotency, cursors, backoff, attachments |
| [0009](0009-conflict-resolution.md) | Conflict resolution | Accepted | Entity classes; field merge; manual conflict queue |
| [0010](0010-module-boundaries.md) | Module boundaries | Accepted | Module-owned tables; Calendar/search are projections |
| [0011](0011-design-tokens-theming.md) | Design tokens and theming | Accepted | Token JSON → CSS/Compose; independent dark theme; contrast guard |
| [0012](0012-localization.md) | Localization | Accepted | ICU bundles en/ta; no hard-coded strings |
| [0013](0013-analytics-rules.md) | Analytics rules | Accepted | Shared rule catalog + JSON fixtures on both clients |
| [0014](0014-notifications-background.md) | Notifications and background work | Accepted | WorkManager reliable on Android; web best-effort |
| [0015](0015-authentication-encryption.md) | Authentication and encryption | Accepted | Argon2id + tokens; envelope encryption; OS biometrics only |
| [0016](0016-backup-deployment.md) | Backup and deployment | Accepted | Docker Compose + Tailscale; verified encrypted backups |
| [0017](0017-quality-gates.md) | Quality gates | Accepted | CI-enforced Definition of Done |
| [0018](0018-appearance-preferences.md) | Appearance preference model | Accepted | Versioned local preferences + contrast-guarded custom colours |

All ADRs were accepted on 2026-11-22 as part of the architecture baseline. Superseding one requires a new ADR that marks the old record `Superseded` and links it here.
