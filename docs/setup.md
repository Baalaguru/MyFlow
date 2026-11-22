# Windows development setup

Target environment: Windows + VS Code. All commands are PowerShell.

## 1. Required software

| Tool | Purpose | Status on this machine |
| --- | --- | --- |
| Node.js 24 + npm | Web client | Present |
| Go 1.23+ | API server | Not installed locally; available inside the Docker build image |
| JDK 17+ | Android build and Gradle | JDK 21 present |
| Docker Desktop + Compose | PostgreSQL and self-hosted deployment | CLI present; daemon required for containers |
| Android SDK (API 35) | Android build, emulator, device tests | Not installed — see note below |
| Git | Version control | Present |

Check at any time:

```powershell
.\scripts\check-toolchains.ps1
```

## 2. Install missing toolchains

```powershell
winget install --id GoLang.Go -e --accept-source-agreements --accept-package-agreements
```

Android SDK: install Android Studio and the API 35 platform, then set `ANDROID_HOME` to the SDK directory. The Android build cannot be verified until this is done. Generate the Gradle wrapper JAR once with a local Gradle installation:

```powershell
cd apps\android
gradle wrapper --gradle-version 8.9
```

## 3. Web client

```powershell
cd apps\web
npm install
npm run dev
```

Open http://127.0.0.1:5173. Production check:

```powershell
npm run build
npm run preview
```

## 4. API server (local-only mode)

The server starts without PostgreSQL when `DATABASE_URL` is unset; this is enough for health checks and early client work.

```powershell
cd server
go mod tidy
go run ./cmd/api
curl http://127.0.0.1:8080/healthz
```

## 5. Full stack with Docker

```powershell
cd deployments
Copy-Item .env.example .env
# set POSTGRES_PASSWORD in .env
docker compose up --build -d
docker compose ps
curl http://127.0.0.1:8080/healthz
```

Remote access is expected over Tailscale. Do not publish PostgreSQL or the API directly to the internet.

## 6. Android

See [apps/android/README.md](../apps/android/README.md).

## 7. VS Code

Open the repository root. Recommended extensions are listed in `.vscode/extensions.json`. Formatting and ESLint run on save.

## 8. Before declaring a phase complete

Run the application on every available surface, with the server unreachable, and record the results in `docs/phases/`. See the [phase completion gate](architecture/quality.md#5-phase-completion-gate).
