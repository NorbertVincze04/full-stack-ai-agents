-- Apply manually after 002_create_bookings.sql when using the public schema.
-- Existing bookings remain unchanged.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS user_name varchar(255);