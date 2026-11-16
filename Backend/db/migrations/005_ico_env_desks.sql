-- 005_ico_env_desks.sql
-- Task: manual-create-a-mockup-office-for-booking (R3 approved as described). Local db container only.
-- Applied by a human on existing volumes; on an empty volume the postgres image runs it after 004 (name order).
-- Never run by the app, never run against Cloud Foundry.
--
-- Adds "ico-env".desks (D01..D12, 4 x 3 grid), links bookings.booking_desk to it and allows one booking per desk and date.
-- Idempotent. No DROP, no DELETE, no UPDATE, no backfill; legacy bookings (booking_desk NULL) stay valid.
-- The seed only inserts (ON CONFLICT DO NOTHING). The FK is NOT VALID so existing rows are not scanned or rewritten.
-- Take a pg_dump before applying on a volume with data.
--
-- Rollback (manual, not executed):
--   BEGIN;
--   DROP INDEX IF EXISTS "ico-env".ux_bookings_date_desk;
--   ALTER TABLE "ico-env".bookings DROP CONSTRAINT IF EXISTS bookings_booking_desk_fkey;
--   DROP TABLE IF EXISTS "ico-env".desks;
--   DELETE FROM "ico-env".schema_migrations WHERE version = '005_ico_env_desks';
--   COMMIT;

BEGIN;

CREATE TABLE IF NOT EXISTS "ico-env".desks (
    id       varchar(10) PRIMARY KEY,
    label    varchar(50) NOT NULL,
    grid_row smallint    NOT NULL CHECK (grid_row >= 1),
    grid_col smallint    NOT NULL CHECK (grid_col >= 1),
    UNIQUE (grid_row, grid_col)
);

INSERT INTO "ico-env".desks (id, label, grid_row, grid_col) VALUES
    ('D01', 'D01', 1, 1), ('D02', 'D02', 1, 2), ('D03', 'D03', 1, 3), ('D04', 'D04', 1, 4),
    ('D05', 'D05', 2, 1), ('D06', 'D06', 2, 2), ('D07', 'D07', 2, 3), ('D08', 'D08', 2, 4),
    ('D09', 'D09', 3, 1), ('D10', 'D10', 3, 2), ('D11', 'D11', 3, 3), ('D12', 'D12', 3, 4)
ON CONFLICT DO NOTHING;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = '"ico-env".bookings'::regclass
          AND conname = 'bookings_booking_desk_fkey'
    ) THEN
        ALTER TABLE "ico-env".bookings
            ADD CONSTRAINT bookings_booking_desk_fkey
            FOREIGN KEY (booking_desk) REFERENCES "ico-env".desks(id) NOT VALID;
    END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_bookings_date_desk
    ON "ico-env".bookings (booking_date, booking_desk)
    WHERE booking_desk IS NOT NULL;

INSERT INTO "ico-env".schema_migrations (version)
VALUES ('005_ico_env_desks')
ON CONFLICT (version) DO NOTHING;

COMMIT;
