-- 002_ico_env_users.sql
-- Task: manual-containerize-the-app-with-podman (FR9). Local db container only.
--
-- Mirrors Backend/migrations/001_create_users.sql (public.users) in schema "ico-env".
-- gen_random_uuid() is built in since PostgreSQL 13 (image is 16-alpine).
-- Idempotent and non-destructive; no seed data.

BEGIN;

CREATE TABLE IF NOT EXISTS "ico-env".users (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name     varchar     NOT NULL,
    email         varchar     NOT NULL UNIQUE,
    password_hash varchar     NOT NULL,
    type          varchar     NOT NULL CHECK (type IN ('admin', 'user')),
    created_at    timestamptz NOT NULL DEFAULT now()
);

INSERT INTO "ico-env".schema_migrations (version)
VALUES ('002_ico_env_users')
ON CONFLICT (version) DO NOTHING;

COMMIT;
