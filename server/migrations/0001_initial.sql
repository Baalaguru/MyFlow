-- My Flow initial schema. Applied in order; never edit an applied migration.
CREATE TABLE IF NOT EXISTS app_settings (
    key         TEXT PRIMARY KEY,
    value       JSONB NOT NULL,
    hlc_updated TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS devices (
    id             UUID PRIMARY KEY,
    label          TEXT NOT NULL,
    platform       TEXT NOT NULL CHECK (platform IN ('web', 'android')),
    authorized     BOOLEAN NOT NULL DEFAULT FALSE,
    last_seen_at   TIMESTAMPTZ,
    sync_cursor    TEXT
);

CREATE TABLE IF NOT EXISTS sync_operations (
    idempotency_key UUID PRIMARY KEY,
    device_id       UUID NOT NULL REFERENCES devices(id),
    entity          TEXT NOT NULL,
    entity_id       UUID NOT NULL,
    op              TEXT NOT NULL CHECK (op IN ('upsert', 'delete')),
    payload         JSONB NOT NULL,
    hlc             TEXT NOT NULL,
    received_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sync_operations_device_idx ON sync_operations (device_id, received_at);

CREATE TABLE IF NOT EXISTS sync_metadata (
    device_id         UUID PRIMARY KEY REFERENCES devices(id),
    last_sync_at      TIMESTAMPTZ,
    pending_count     INTEGER NOT NULL DEFAULT 0,
    last_error        TEXT
);

CREATE TABLE IF NOT EXISTS sync_conflicts (
    id           UUID PRIMARY KEY,
    entity       TEXT NOT NULL,
    entity_id    UUID NOT NULL,
    field        TEXT NOT NULL,
    local_value  JSONB,
    remote_value JSONB,
    base_value   JSONB,
    resolved_at  TIMESTAMPTZ,
    resolution   TEXT
);
