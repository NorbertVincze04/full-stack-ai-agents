-- 003_ico_env_bookings.sql
-- Task: manual-containerize-the-app-with-podman (FR9, D2). Local db container only.
--
-- One booking per desk per day; the composite unique index also serves lookups by booking_date.
-- Idempotent and non-destructive; no seed data.

BEGIN;

CREATE TABLE IF NOT EXISTS "ico-env".bookings (
    id           serial       PRIMARY KEY,
    user_name    varchar(255) NOT NULL,
    booking_date date         NOT NULL,
    booking_desk varchar(100) NOT NULL,
    created_at   timestamptz  NOT NULL DEFAULT now(),
    UNIQUE (booking_date, booking_desk)
);

INSERT INTO "ico-env".schema_migrations (version)
VALUES ('003_ico_env_bookings')
ON CONFLICT (version) DO NOTHING;

COMMIT;
