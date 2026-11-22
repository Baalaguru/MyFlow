# ADR-0001: Technology stack

- **Status:** Accepted
- **Date:** 2026-11-22
- **Related:** D-01, [ADR-0002](0002-monorepo-layout.md), [ADR-0003](0003-contract-first-schemas.md)

## Context

My Flow must be offline-first, self-hosted, single-user, available as a web/desktop client and a native Android client with home-screen widgets and sensor access, and built by one developer on Windows with VS Code. The source specification proposes a stack but marks final approval as open (D-01).

## Decision

Accept the proposed stack unchanged:

| Layer | Choice |
| --- | --- |
| Web | React + TypeScript + Vite; Tailwind CSS with generated tokens; Apache ECharts |
| Web persistence | IndexedDB via Dexie |
| Android | Kotlin + Jetpack Compose; Room; Jetpack Glance widgets |
| Backend | Go; REST with OpenAPI 3.1; PostgreSQL; SQLC |
| Sync | Custom offline-first engine (outbox + HLC + field merge) |
| Deployment | Docker Compose; Tailscale for remote access |
| Quality | Unit, integration, offline, UI, device, and security testing |

Exact versions are pinned by lockfiles (`pnpm-lock.yaml`, `go.sum`, Gradle lockfile) when toolchains are scaffolded; CI fails on stale locks.

## Consequences

**Positive**

- Native Android widgets and sensors are fully supported by Glance and platform APIs.
- Web and Android can be developed in parallel against generated contracts.
- Local-first storage is native on both platforms.
- Go + SQLC gives a small, statically typed, easy-to-self-host server.

**Negative**

- Two client implementations must be kept aligned; this is why ADR-0003, ADR-0011, and ADR-0013 are mandatory.
- A custom sync engine is significant work; no hosted backend is available to offload it.

## Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Electron/Tauri single desktop client | Does not provide native Android widgets or sensor integration |
| React Native / Flutter | Widget, sensor, and background-work constraints; spec requires native Android |
| Firebase / Supabase hosted backend | Conflicts with self-hosted, offline-first, private-data requirements |
| Server-assigned IDs / online-first API | Blocks offline creation |

## Verification

Toolchain versions documented and reproducible from lockfiles; a clean Windows dev machine can build all three components by following Phase 2 setup docs.
