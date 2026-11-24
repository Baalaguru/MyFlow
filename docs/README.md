# My Flow documentation

This is the single source of truth for architectural decisions. Product requirements remain in the external specification file; this directory records **how** they will be satisfied.

## Decisions

| Document | Contents |
| --- | --- |
| [decisions/register.md](decisions/register.md) | Resolutions for D-01 … D-10, scope confirmations, and items still open |

## Architecture Decision Records

See [adr/README.md](adr/README.md) for the index of ADR-0001 … ADR-0024.

## Architecture specifications

| Document | Contents |
| --- | --- |
| [architecture/overview.md](architecture/overview.md) | System context, components, runtime flows, repository map, tech stack |
| [architecture/data-model.md](architecture/data-model.md) | Canonical entities, v1/deferred boundary, critical data rules |
| [architecture/sync-protocol.md](architecture/sync-protocol.md) | Outbox, HLC, push/pull, retry, conflicts, attachments |
| [architecture/api-contracts.md](architecture/api-contracts.md) | REST conventions, endpoint inventory, errors, pagination |
| [architecture/security.md](architecture/security.md) | Auth, encryption, key management, privacy, threat model |
| [architecture/design-system.md](architecture/design-system.md) | Palette, typography, theming, tokens, accessibility |
| [architecture/cross-platform.md](architecture/cross-platform.md) | Web/Android parity, platform differences, shared contracts |
| [architecture/analytics.md](architecture/analytics.md) | Calculation rules, fixtures, chart behavior |
| [architecture/operations.md](architecture/operations.md) | Deployment, backup/restore, environments, logging |
| [architecture/quality.md](architecture/quality.md) | Testing strategy, quality gates, Definition of Done |
| [setup.md](setup.md) | Windows/VS Code toolchain and local startup |

## Phase reports

Runtime gate results, recorded at the end of each phase:

| Report | Phase | Result |
| --- | --- | --- |
| [phases/phase-02.md](phases/phase-02.md) | Repository and runnable foundation | Server PASS, Web PASS, Android NOT APPLICABLE |
| [phases/phase-03.md](phases/phase-03.md) | Design system and appearance | Server PASS, Web PASS, Android NOT APPLICABLE |
| [phases/phase-04.md](phases/phase-04.md) | Application navigation and layout | Server PASS, Web PASS, Android NOT APPLICABLE |
| [phases/phase-05.md](phases/phase-05.md) | Dashboard system and widgets | Server PASS, Web PASS, Android NOT APPLICABLE |
| [phases/phase-06.md](phases/phase-06.md) | To-Do task management | Server PASS, Web PASS, Android NOT APPLICABLE |
| [phases/phase-07.md](phases/phase-07.md) | Habit tracker and mascot integration | Server PASS, Web PASS, Android NOT APPLICABLE |
| [phases/phase-08.md](phases/phase-08.md) | Gym workouts, sets, and personal records | Server PASS, Web PASS, Android PASS (user-verified runtime); full smoke PASS |

## Change rules

- A new technical choice requires a new ADR; do not silently amend an accepted one.
- Superseding an ADR requires marking the old one `Superseded` and linking the replacement.
- Changes to v1 scope or a resolved decision require updating `decisions/register.md` first.
- Documentation is part of the Definition of Done — code changes that alter behavior must update the relevant document in the same change.
