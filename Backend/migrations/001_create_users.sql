-- 001_create_users.sql
-- Task: manual-backend-login-endpoint (FR11). Database: ico-env, schema: public.
--
-- Applied by the human only; never run by agents or by the application.
-- Non-destructive: CREATE TABLE IF NOT EXISTS. It does NOT alter an existing
-- users table; if public.users already exists with a different structure, it is
-- left untouched and must be reconciled manually.
-- No seed data. Rollback is intentionally not included (it would be destructive
-- and needs a separate approval; see docs/runs/manual-backend-login-endpoint/database-builder.md).
-- gen_random_uuid() is built in since PostgreSQL 13 (older versions need pgcrypto).

CREATE TABLE IF NOT EXISTS public.users (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name     varchar     NOT NULL,
    email         varchar     NOT NULL UNIQUE,
    password_hash varchar     NOT NULL,
    type          varchar     NOT NULL CHECK (type IN ('admin', 'user')),
    created_at    timestamptz NOT NULL DEFAULT now()
);
