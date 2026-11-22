# ADR-0015: Authentication, encryption, and key management

- **Status:** Accepted
- **Date:** 2026-11-22
- **Related:** D-07, [ADR-0008](0008-sync-protocol.md)

## Context

The app holds personal journal, health, and finance data on devices and a self-hosted server. It must remain secure offline, support password and biometric/passkey unlock, and encrypt backups without storing biometric templates or hard-coded secrets.

## Decision

- **Server auth:** Argon2id password hashing, opaque rotating session tokens, refresh rotation, optional 2FA, login rate limiting, device authorization and revocation.
- **Transport:** HTTPS only; remote access restricted to Tailscale; PostgreSQL never exposed publicly.
- **App lock:** password/passphrase always available; Android biometric prompt delegates to the OS and never receives templates; passkeys where supported.
- **Envelope encryption:** a random data encryption key (DEK) encrypts sensitive fields with authenticated encryption; the DEK is wrapped by a key encryption key derived from the user's passphrase with Argon2id. Android Keystore adds a device-bound wrapper; web uses non-extractable WebCrypto keys where available.
- **Recovery:** a generated recovery key is shown at setup and is the fallback when all device keys are lost.
- **Journal readiness:** journal tables (deferred) include `ciphertext`, `nonce`, and `key_version`; synchronization transfers ciphertext, so the server cannot read journal content.
- **Secrets:** environment variables/secret files only; no credentials in source; no sensitive values in logs or crash reports; notification previews exclude private content by default.

## Consequences

**Positive**

- Offline data and backups remain protected.
- Key rotation and future journal encryption fit the existing model.
- Biometrics stay under OS control.

**Negative**

- Users must store a recovery key; losing it means losing encrypted data.
- Two unlock paths (passphrase, device key) require careful UX and migration logic.

## Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Store encryption key derived directly from password each time | No rotation; poor UX; weak if password changes |
| Server-side encryption only | Data readable offline and by the operator; violates privacy goals |
| Store biometric templates in app | Explicitly forbidden |
| No encryption at rest | Fails security requirements |

## Verification

Threat model review, auth boundary tests, session expiry and device revocation tests, log redaction inspection, encrypted-storage tests, and encrypted-backup restore tests.
