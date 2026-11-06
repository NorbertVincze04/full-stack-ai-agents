# Database report - task 648 (booking_calendar)

Verdict: done (human applies; nothing was executed)

## Files
- `Backend/migrations/002_create_bookings.sql` - `public.bookings`, create-only.
- `Backend/db/migrations/004_ico_env_bookings_user_id.sql` - reshapes `"ico-env".bookings`, idempotent, registered in `schema_migrations` as `004_ico_env_bookings_user_id`. `003` untouched.

## Schema diff
| Target | Change |
| --- | --- |
| `public.bookings` (new) | `id serial PK`, `user_id uuid NOT NULL -> public.users(id) ON DELETE CASCADE`, `booking_date date NOT NULL`, `created_at timestamptz DEFAULT now()`, `UNIQUE bookings_booking_date_user_id_key (booking_date, user_id)`, index `idx_bookings_user_id` |
| `"ico-env".bookings` | add `user_id uuid` (nullable, FK `"ico-env".users(id) ON DELETE CASCADE`); `user_name`, `booking_desk` -> nullable; drop `bookings_booking_date_booking_desk_key`; add `bookings_booking_date_user_id_key`; index `idx_bookings_user_id` |

Approved risks: R2 as described (RISK: the one dropped constraint is the unused `(booking_date, booking_desk)`; no column dropped, no data deleted). Legacy rows keep `user_id` NULL (NULLs never conflict in the unique key); code always sets it.

## Queries for the backend builder
Table name: `public.bookings` or `"<schema>".bookings`, same schema-aware logic as `userRepository`.

| Use | SQL | Row shape / errors |
| --- | --- | --- |
| Create | `INSERT INTO <t> (user_id, booking_date) VALUES ($1, $2) RETURNING id, booking_date` | `{ id, booking_date }`; pg `23505` -> 409; pg `23503` (user missing) -> 401 |
| Withdraw | `DELETE FROM <t> WHERE booking_date = $1 AND user_id = $2` | `rowCount = 0` -> 404 |
| List own | `SELECT booking_date FROM <t> WHERE user_id = $1 AND booking_date >= $2 ORDER BY booking_date` | `[{ booking_date }]` |

`$1` for create/list is the JWT `id` claim. `booking_date` is a `date`: `pg` returns a JS `Date` in the local time zone by default, so select `to_char(booking_date, 'YYYY-MM-DD') AS date` (or set a text type parser) to avoid off-by-one dates. The list filter `$2` (today, server date) is optional; drop it to return all own bookings.

## Locking and volume
`ALTER TABLE` takes a short `ACCESS EXCLUSIVE` lock; the table is tiny, no rewrite (nullable column, no default). Back up before applying on a volume with data.

## How to apply
- Cloud Foundry `ico-env` (schema `public`), after `001_create_users.sql`: run `Backend/migrations/002_create_bookings.sql` through the tunnel with `psql`.
- Local container: empty volume applies `004` automatically after `003`. Existing volume, by hand:
  `podman exec -i <db-container> psql -U <POSTGRES_USER> -d <POSTGRES_DB> -v ON_ERROR_STOP=1 < Backend/db/migrations/004_ico_env_bookings_user_id.sql`
- Until applied, booking requests fail with a DB error.

## Rollback
`public`: `DROP TABLE IF EXISTS public.bookings;` (commented in the file). `"ico-env"`: commented block in `004` (re-add NOT NULL fails if rows lack `booking_desk`/`user_name`). Neither is executed.
