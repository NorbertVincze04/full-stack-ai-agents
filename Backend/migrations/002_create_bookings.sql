-- 002_create_bookings.sql
-- Task: 648 (booking_calendar). Database: ico-env, schema: public.
--
-- Applied by the human only, after 001_create_users.sql (FK to public.users); never run by agents or the app.
-- Create-only: CREATE ... IF NOT EXISTS. An existing public.bookings with another shape is left untouched.
-- One booking per user per date; only the user id is stored (no e-mail or name).
-- Rollback is not executed here (destructive, needs its own approval):
--   DROP TABLE IF EXISTS public.bookings;

CREATE TABLE IF NOT EXISTS public.bookings (
    id           serial      PRIMARY KEY,
    user_id      uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    booking_date date        NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT bookings_booking_date_user_id_key UNIQUE (booking_date, user_id)
);

CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings (user_id);
