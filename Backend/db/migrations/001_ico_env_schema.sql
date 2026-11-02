-- 001_ico_env_schema.sql
-- Task: manual-containerize-the-app-with-podman (FR8). Local db container only.
--
-- Mounted read-only into /docker-entrypoint-initdb.d; the postgres image runs it once,
-- on an empty data volume, against POSTGRES_DB. Files run in name order (001, 002, 003).
-- Idempotent and non-destructive: no DROP, TRUNCATE or DELETE.

BEGIN;

CREATE SCHEMA IF NOT EXISTS "ico-env";

CREATE TABLE IF NOT EXISTS "ico-env".schema_migrations (
    version    varchar(255) PRIMARY KEY,
    applied_at timestamptz  NOT NULL DEFAULT now()
);

INSERT INTO "ico-env".schema_migrations (version)
VALUES ('001_ico_env_schema')
ON CONFLICT (version) DO NOTHING;

COMMIT;
