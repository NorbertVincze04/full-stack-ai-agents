-- 004_ico_env_bookings_user_id.sql
-- Task: 648 (booking_calendar). Local db container only. Applied by a human on existing volumes;
-- on an empty volume the postgres image runs it after 003 (name order). Never run by agents or the app.
--
-- Reshapes "ico-env".bookings to "one booking per user per date", keyed by user id (no e-mail stored).
-- Idempotent. No column is dropped and no row is deleted. 003 is not edited.
-- Drops only the unused UNIQUE (booking_date, booking_desk). Back up first on a volume with data.
--
-- Rollback (manual, not executed; fails if rows without booking_desk/user_name exist):
--   BEGIN;
--   ALTER TABLE "ico-env".bookings DROP CONSTRAINT IF EXISTS bookings_booking_date_user_id_key;
--   DROP INDEX IF EXISTS "ico-env".idx_bookings_user_id;
--   ALTER TABLE "ico-env".bookings DROP COLUMN IF EXISTS user_id;
--   ALTER TABLE "ico-env".bookings ALTER COLUMN user_name SET NOT NULL, ALTER COLUMN booking_desk SET NOT NULL;
--   ALTER TABLE "ico-env".bookings ADD CONSTRAINT bookings_booking_date_booking_desk_key UNIQUE (booking_date, booking_desk);
--   DELETE FROM "ico-env".schema_migrations WHERE version = '004_ico_env_bookings_user_id';
--   COMMIT;

BEGIN;

ALTER TABLE "ico-env".bookings
    ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES "ico-env".users(id) ON DELETE CASCADE;

ALTER TABLE "ico-env".bookings ALTER COLUMN user_name DROP NOT NULL;
ALTER TABLE "ico-env".bookings ALTER COLUMN booking_desk DROP NOT NULL;

ALTER TABLE "ico-env".bookings
    DROP CONSTRAINT IF EXISTS bookings_booking_date_booking_desk_key;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = '"ico-env".bookings'::regclass
          AND conname = 'bookings_booking_date_user_id_key'
    ) THEN
        ALTER TABLE "ico-env".bookings
            ADD CONSTRAINT bookings_booking_date_user_id_key UNIQUE (booking_date, user_id);
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON "ico-env".bookings (user_id);

INSERT INTO "ico-env".schema_migrations (version)
VALUES ('004_ico_env_bookings_user_id')
ON CONFLICT (version) DO NOTHING;

COMMIT;
