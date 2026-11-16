-- 004_create_desks_and_booking_desk.sql
-- Task: manual-create-a-mockup-office-for-booking (R3 approved as described). Database: ico-env, schema: public.
--
-- Applied by the human only, after 002/003; never run by agents or the app. Take a pg_dump of public.bookings first.
-- Adds public.desks (D01..D12, 4 x 3 grid), a nullable bookings.booking_desk (FK to desks) and one booking per desk and date.
-- Idempotent. No DROP, no DELETE, no UPDATE, no backfill; existing bookings keep booking_desk NULL and stay valid.
-- The seed only inserts (ON CONFLICT DO NOTHING). The partial unique index ignores rows without a desk.
--
-- Rollback (manual, not executed):
--   BEGIN;
--   DROP INDEX IF EXISTS public.ux_bookings_date_desk;
--   ALTER TABLE public.bookings DROP COLUMN IF EXISTS booking_desk;
--   DROP TABLE IF EXISTS public.desks;
--   COMMIT;

BEGIN;

CREATE TABLE IF NOT EXISTS public.desks (
    id       varchar(10) PRIMARY KEY,
    label    varchar(50) NOT NULL,
    grid_row smallint    NOT NULL CHECK (grid_row >= 1),
    grid_col smallint    NOT NULL CHECK (grid_col >= 1),
    UNIQUE (grid_row, grid_col)
);

INSERT INTO public.desks (id, label, grid_row, grid_col) VALUES
    ('D01', 'D01', 1, 1), ('D02', 'D02', 1, 2), ('D03', 'D03', 1, 3), ('D04', 'D04', 1, 4),
    ('D05', 'D05', 2, 1), ('D06', 'D06', 2, 2), ('D07', 'D07', 2, 3), ('D08', 'D08', 2, 4),
    ('D09', 'D09', 3, 1), ('D10', 'D10', 3, 2), ('D11', 'D11', 3, 3), ('D12', 'D12', 3, 4)
ON CONFLICT DO NOTHING;

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_desk varchar(10);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.bookings'::regclass
          AND conname = 'bookings_booking_desk_fkey'
    ) THEN
        ALTER TABLE public.bookings
            ADD CONSTRAINT bookings_booking_desk_fkey
            FOREIGN KEY (booking_desk) REFERENCES public.desks(id);
    END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_bookings_date_desk
    ON public.bookings (booking_date, booking_desk)
    WHERE booking_desk IS NOT NULL;

COMMIT;
