# Security and privacy

## 1. Security model

Single personal profile, self-hosted server, offline-first clients. Security must not depend on continuous server availability: offline data remains protected on the device and in backups.

## 2. Threat model summary

| Threat | Mitigation |
| --- | --- |
| Stolen device | App lock, OS keystore-held tokens, biometric/PIN unlock, encrypted local sensitive data |
| Network eavesdropping | HTTPS to the self-hosted server; remote access restricted to Tailscale |
| Direct database exposure | PostgreSQL bound to the private network/Docker network, never published to the internet |
| Credential stuffing | Argon2id password hashing, per-session rate limits, device authorization, optional 2FA |
| Stolen session token | Opaque rotating tokens, device revocation, auto-lock, session expiry |
| Sensitive data in logs/crashes | Allowlisted structured fields only; no journal content, tokens, or secrets |
| Malicious or corrupted sync payload | Schema validation, authorization, size limits, client-side validation before apply |
| Backup theft | Encrypted backups, protected key material, verified restore workflow |
| Biometric misuse | Biometrics remain under OS control; the app stores no templates and receives only a success/failure result |

A full STRIDE review is a milestone before release; the table above fixes the mandatory controls.

## 3. Authentication and authorization

- Passwords hashed with Argon2id on the server; parameters documented and versioned with the hash.
- Opaque, rotating session tokens; refresh rotation detects reuse.
- Login rate limiting and lockout with exponential delays.
- Device authorization list; any device can be revoked, which invalidates its tokens and sync cursor.
- Android biometric unlock calls the OS biometric prompt; the app never handles biometric data.
- Passkeys supported where the platform makes them available; password fallback always retained.
- Two-factor authentication available; recovery codes stored by the user.
- Authorization checked on every protected request; the server does not trust client-supplied identity.

## 4. Encryption and key management

Envelope encryption is used so keys can be rotated without re-encrypting all data:

1. A random **data encryption key (DEK)** is generated locally per profile.
2. Record content (initially sensitive fields, later all journal content and attachments) is encrypted with the DEK using authenticated encryption (e.g., AES-GCM / platform equivalent).
3. The DEK is wrapped by a **key encryption key (KEK)** derived from the user's passphrase with Argon2id.
4. On Android, an additional Keystore-backed wrapping key enables biometric unlock without storing the passphrase.
5. On web, a non-extractable WebCrypto key is held in IndexedDB where supported; passphrase unlock is the portable fallback.
6. A generated **recovery key** is shown at setup and required if all device keys are lost.

Rules:

- No hard-coded secrets; configuration comes from environment variables or secret files.
- Keys are never logged, synced in plaintext, or embedded in backups without wrapping.
- Journal tables (deferred) are designed from the start with `ciphertext`, `nonce`, and `key_version` columns.
- Synchronization carries ciphertext for protected fields; the server cannot read journal content.
- Notification previews never include journal content by default; lock-screen privacy is configurable.

## 5. Data security by layer

| Layer | Controls |
| --- | --- |
| Local database | Sensitive fields encrypted; ordinary data protected by OS app sandbox and app lock |
| Transport | TLS; Tailscale-only remote access; certificate validation never disabled |
| Server | Validated input, authorized requests, parameterized SQL via SQLC, least-privilege DB role |
| Files | Content-addressed storage, size and type validation, no path traversal, encrypted where sensitive |
| Backups | Encrypted with a versioned scheme, checksummed, restore-verified ([ADR-0016](../adr/0016-backup-deployment.md)) |
| Crash reports | Structured metadata only; redaction allowlist for any user-generated content |

## 6. Privacy rules

- Single profile only; no family/multi-user accounts in the initial design.
- Journal entries and attachments are private by default and excluded from global search unless the user explicitly unlocks them.
- No analytics telemetry leaves the device or the self-hosted server.
- External nutrition provider is deferred; no food data is sent to third parties.
- User-facing privacy controls live in Settings → Privacy and Security.

## 7. Verification before release

- Threat modeling review signed off.
- Authentication and authorization boundary tests.
- Input validation fuzz cases on sync and attachment endpoints.
- Session expiry, device revocation, and rate-limit tests.
- Encrypted-storage and encrypted-backup restore tests.
- Log and crash-report inspection for accidental sensitive data.
- Documented security limitations (e.g., browser notification constraints, self-hosted operator responsibilities).
