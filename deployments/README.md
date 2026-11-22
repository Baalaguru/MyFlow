# Self-hosted deployment

All services are local by default. Remote access is expected over Tailscale, not by publishing ports to the internet.

## Start

```powershell
Copy-Item .env.example .env
# edit .env and set a strong POSTGRES_PASSWORD
docker compose up --build -d
docker compose ps
curl http://127.0.0.1:8080/healthz
```

## Stop

```powershell
docker compose down
```

Data persists in the named volumes `pgdata` and `backups`.

## Notes

- PostgreSQL is bound to `127.0.0.1` on the host and is otherwise reachable only inside the `myflow` Docker network.
- Migrations live in `server/migrations/` and are applied in order by the migration step; never edit an applied migration.
- Backup and restore procedures are specified in [operations.md](../docs/architecture/operations.md).
