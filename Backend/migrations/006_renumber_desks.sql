-- 006_renumber_desks.sql
-- Task: 650 desk numbering (R1, R2 approved as described). Database: ico-env, schema: public (Cloud Foundry).
-- Applied by the human only, after 004 and a pg_dump of public.bookings and public.desks; never run by agents or the app.
--
-- Replaces the 12 desks D01..D12 with 16 desks A1..D4: four 2 x 2 blocks (A B / C D), numbered row by row in a block.
-- Destructive: sets bookings.booking_desk to NULL (bookings stay, only lose their desk), deletes all desks, inserts 16.
-- Guarded: runs only while desk A1 is missing, so a second run changes nothing (new bookings keep their desk).
--
-- Rollback (manual, not executed): restore the pg_dump taken before applying.

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.desks WHERE id = 'A1') THEN
        UPDATE public.bookings SET booking_desk = NULL WHERE booking_desk IS NOT NULL;

        DELETE FROM public.desks;

        INSERT INTO public.desks (id, label, grid_row, grid_col) VALUES
            ('A1', 'A1', 1, 1), ('A2', 'A2', 1, 2), ('A3', 'A3', 2, 1), ('A4', 'A4', 2, 2),
            ('B1', 'B1', 1, 3), ('B2', 'B2', 1, 4), ('B3', 'B3', 2, 3), ('B4', 'B4', 2, 4),
            ('C1', 'C1', 3, 1), ('C2', 'C2', 3, 2), ('C3', 'C3', 4, 1), ('C4', 'C4', 4, 2),
            ('D1', 'D1', 3, 3), ('D2', 'D2', 3, 4), ('D3', 'D3', 4, 3), ('D4', 'D4', 4, 4);
    END IF;
END
$$;

COMMIT;
