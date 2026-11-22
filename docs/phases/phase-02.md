# Phase 2 report — repository and runnable foundation

Gate policy: [quality.md §5](../architecture/quality.md#5-phase-completion-gate).

- **Run timestamp:** 2026-11-22T12:10:32Z (2026-11-22 17:40 IST)
- **Build version:** 0.1.0 (web `package.json`, Android `versionName`, API health response)
- **Commit scope:** Phase 2 foundation; see repository history for the merge commit
- **Host:** Windows 11, Node v24.11.1, npm 11.6.2, Docker Engine 29.9.2
- **Browser:** Chromium 152.0.7977.167 / Electron 44.9.1 (OpenCode 2.3.2 in-app browser), Windows NT 10.0 x64
- **Device:** none (no Android emulator or physical device available)

## Surface results

| Surface | Result | Build / environment | Evidence |
| --- | --- | --- | --- |
| Server | **PASS** | API 0.1.0 in Docker, PostgreSQL 16-alpine, Docker Engine 29.9.2 | `docker compose up --build -d`; `/healthz` and `/v1/health` both returned `status=ok, database=connected`; `schema_migrations` contains `0001_initial.sql`; six expected tables present |
| Web | **PASS** | Web 0.1.0, Vite 6.4.6, Chromium 152 in-app browser | Cold load at `http://127.0.0.1:5173`; shell, navigation, dashboard, connection pill, theme toggle, and language toggle rendered; `npm run build` and `npm run lint` clean; no JavaScript console errors |
| Android | **NOT APPLICABLE** | versionName 0.1.0 scaffold only | No `ANDROID_HOME`, no SDK, no emulator, no device. Debug build could not be produced or installed. Not marked as passed. Will be exercised in the phase that introduces the Android runtime; see [apps/android/README.md](../../apps/android/README.md) |

## Offline cold-start check

1. API container stopped with `docker compose stop api`.
2. Connection pill changed from **Online** to **Offline** after the failed health probe.
3. Page reloaded from scratch while the API was down. Dashboard, navigation, local task count, theme controls, and language controls all rendered. No API request is required to paint the shell.
4. API restarted; pill returned to **Online** after the next probe.
5. Fonts are self-hosted via `@fontsource`; the cold-start network log contains no external CDN request. The only non-HTTP entry is the Vite HMR websocket on `127.0.0.1:5173`.

Expected non-fatal console entry during the offline run: the browser logs `500` for the failed `/healthz` probe while the API container is stopped. This is the health probe behaving correctly, not a JavaScript exception.

## Automated gate

`.\scripts\smoke.ps1` output at run time:

```text
Surface                      Status         Detail
-------                      ------         ------
Server /healthz + /v1/health PASS           status=ok database=connected version=0.1.0 time=2026-11-22T12:10:32Z
Server migrations            PASS           applied_migrations=1
Web shell                    PASS           HTTP 200, title present at http://127.0.0.1:5173
Android debug build          NOT APPLICABLE ANDROID_HOME is not set; no SDK, emulator, or device available
```

## Scope delivered

- Git repository initialised on `main`, Conventional Commit template, contribution guide, editor settings, `.gitignore` covering secrets and build output.
- Web scaffold: React 18 + TypeScript + Vite, Tailwind tokens sourced from `contracts/tokens/tokens.json`, Dexie/IndexedDB local store, light/dark/system theme, English/Tamil bundles from `contracts/i18n/`, connection status from a real server health probe.
- Server scaffold: Go 1.23 entry point, structured JSON logging, env-driven config, PostgreSQL pool, ordered SQL migrations with tracking table, `/healthz` and `/v1/health`, `/v1` 404 envelope, trace IDs, graceful shutdown. Go toolchain is available inside the Docker build image; local Go install did not complete.
- Deployment: Compose stack with PostgreSQL and API, health checks, restart policies, persistent volumes, non-root runtime image, local-only port bindings, env templates with no committed secrets.
- Android scaffold: Kotlin/Compose activity, Room settings store, Glance widget shell, Gradle wrapper properties, strings and theme resources. No module logic and no sample data presented as real.
- Contracts seeded: OpenAPI v1 skeleton, entity-base JSON Schema, design tokens, i18n bundles, shared calculation fixture.
- Developer scripts: `check-toolchains.ps1`, `dev-web.ps1`, `dev-server.ps1`, `dev-all.ps1`, `smoke.ps1`; setup guide at [setup.md](../setup.md).

## Known limitations carried forward

- Android runtime cannot be verified until an SDK and device are available. This is an environment blocker, not a passed check.
- Google/Play integrity, biometrics, sync engine, attachments, and module workspaces are intentionally out of scope for Phase 2.
- The Gradle wrapper JAR is not checked in; generate it with a local Gradle install as described in the Android README.
- Local Go installation was not completed; Docker provides the build toolchain. Local `go test` becomes available once Go is installed.
