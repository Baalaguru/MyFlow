# Quality gates and Definition of Done

Binding policy: [ADR-0017](../adr/0017-quality-gates.md).

## 1. Test layers

| Layer | Scope | Mandatory checks |
| --- | --- | --- |
| Unit | Pure calculations and validators | All rules in `docs/architecture/analytics.md`, using shared fixtures on web and Android |
| Repository/integration | Local DB operations, migrations, server API | CRUD, constraints, tombstones, migration upgrade paths |
| API contract | Generated models vs. OpenAPI/JSON Schema | Compile and validate both clients against current contracts |
| Offline scenario | Create/edit/delete offline, restart, reconnect | No loss, no duplication, correct merges, attachment sync |
| UI | Screens and shared components | Light/dark, every preset, custom colors, typography preferences, a11y, empty/loading/error states |
| Device | Physical Android hardware | Sensors, GPS, permissions, widgets, battery, background restrictions |
| Security | Auth boundaries, input validation, storage | Session expiry, device revocation, rate limits, encrypted restore, log redaction |
| Performance | Startup, dashboard render, queries, sync | Measured against defined budgets; large journals, libraries, and transaction histories |

## 2. CI gates

A change cannot merge unless:

1. Generated contract artifacts are current and both clients compile.
2. All shared calculation fixtures pass on both clients.
3. Local schema parity checks pass.
4. Unit and integration suites pass.
5. Lint, formatting, static analysis, and string/token lints pass.
6. No hard-coded user-facing strings; English and Tamil bundles are complete.
7. Contrast guard permits every themed foreground/background pair.
8. Migration tests pass from the previous schema version.

## 3. Definition of Done (per task)

- [ ] Implementation finished
- [ ] Validation implemented
- [ ] Relevant tests pass
- [ ] Error cases handled
- [ ] Offline behavior verified where applicable
- [ ] Light and Dark themes checked
- [ ] Accessibility checked
- [ ] Documentation updated
- [ ] No known critical regression

## 4. Development-rule enforcement

| Source rule | Enforcement |
| --- | --- |
| Do not skip testing | CI gates; no merge on red |
| Do not label mocks as complete | DoD requires working validation and tests |
| Do not fabricate sensor measurements | Nullable fields, `count_source`/source-quality flags, unavailable UI states, fixtures with missing data |
| Do not silently overwrite user data | Conflict queue, tombstones, confirmation dialogs |
| Do not store credentials in source | Env templates, secret scanning, keystore/WebCrypto |
| Do not hard-code user-facing text | String lint + i18n bundle check |
| Do not duplicate shared data | Calendar/search are projections; analytics are derived |
| Do not sacrifice accessibility | A11y checks, contrast guard, reduced motion, keyboard and touch targets |
| Do not make UI inconsistent | Shared tokens and component contracts |
| Do not implement destructive actions without confirmation | Confirmation + backup offer + tombstones |
| Do not mark complete without verification | DoD checklist |
| Keep documentation updated | Docs are part of the same change |
| Use migrations for schema changes | Migration tests in CI |
| Keep modules independently testable | Repository boundaries, module-owned tables |
| Prefer maintainable architecture | ADRs required for new technical choices |

## 5. Phase completion gate

A phase is **not complete until the application has been run and smoke-tested**, not merely compiled or unit-tested. This gate applies at the end of every development phase, including foundation and infrastructure phases once a runnable surface exists.

### Required runs at the end of each phase

| Surface | Action | Minimum verification |
| --- | --- | --- |
| Server | `docker compose up --build` from `deployments/` | Health endpoint healthy, migrations applied, `/v1` responds |
| Web | `pnpm dev` (or production preview) from `apps/web/` | App loads in a browser, shell and navigation render, light/dark themes, offline mode still renders local data |
| Android | Install and launch the debug build on an emulator or physical device from `apps/android/` | App launches, navigation works, widgets render, permission-denied paths degrade gracefully |

### Rules

- Record the result for each surface — pass/fail, build version, browser/device, timestamp — in the phase report.
- A runtime failure blocks phase completion even when every automated test passes.
- Where practical, capture the smoke steps as repeatable scripts so the same run can be repeated at release.
- If a surface does not exist yet, mark it **not applicable** and name the phase that will introduce it; never mark it as passed.
- Each run includes a cold start with the server unreachable, so offline-first behavior is exercised every phase.
