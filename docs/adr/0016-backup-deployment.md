# ADR-0016: Backup, recovery, and deployment topology

- **Status:** Accepted
- **Date:** 2026-11-22
- **Related:** D-07, [ADR-0015](0015-authentication-encryption.md)

## Context

The self-hosted server runs on a PC that may be offline. Data must be recoverable from corruption, device loss, or interrupted backups, and the deployment must not expose the database publicly.

## Decision

- **Deployment:** Docker Compose with Go API, PostgreSQL, persistent DB and backup volumes, health checks, restart policies, migration step, and log rotation. Remote access only through Tailscale with HTTPS.
- **Backups:** versioned archive of database, attachments, and metadata; encrypted per [ADR-0015](0015-authentication-encryption.md); checksummed; manual and scheduled; retention-configurable.
- **Verification:** a backup is valid only after a successful test restore into a scratch database; manifest records counts and checksums.
- **Recovery:** documented runbook with stop-writes, verify key, restore to scratch, integrity checks, swap, restart, and forced client re-sync.
- **Export/import:** full JSON export, individual module export, CSV where appropriate, validated import with duplicate detection.
- **Destructive actions:** confirmation plus backup offer for module or full-data deletion.
- **Interruption safety:** interrupted backup and restore are explicit test scenarios; partial artifacts are discarded, never treated as valid.

## Consequences

**Positive**

- Backups are recoverable, not merely files on disk.
- Server downtime does not affect client usability.
- Private data stays on the user's infrastructure.

**Negative**

- Restore requires planning and brief write downtime.
- Operators must maintain Tailscale and key material.

## Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Unencrypted database dumps on the host | Fails security and media-theft scenarios |
| Cloud-hosted database | Violates self-hosted/private requirement |
| Assume the server is always available | Explicitly forbidden by D-07 and §26 |

## Verification

Automated backup → verify → restore tests, corruption recovery test, interrupted backup/restore tests, full-device migration simulation, deployment health-check and restart tests.
