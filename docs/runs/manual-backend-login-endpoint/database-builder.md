# Database report - manual-backend-login-endpoint

Verdict: done

## Files
- Migration: `Backend/migrations/001_create_users.sql` (path as requested; differs from the default `Backend/db/migrations/` of the role).
- No application code touched. No SQL executed, no database connection made.

## Schema diff
New table `public.users` (database `ico-env`):

| Column | Type | Constraint |
| --- | --- | --- |
| `id` | uuid | PK, default `gen_random_uuid()` |
| `full_name` | varchar | NOT NULL |
| `email` | varchar | NOT NULL, UNIQUE (implicit unique index, serves the login lookup) |
| `password_hash` | varchar | NOT NULL (bcrypt) |
| `type` | varchar | NOT NULL, CHECK in (`admin`, `user`) |
| `created_at` | timestamptz | NOT NULL, default `now()` |

## Risk gate
- R1: resolved/not applicable. No `DROP`, `TRUNCATE`, `DELETE`, `UPDATE`, no seed. No `RISK` statements.
- R5: approved as described. Migration is applied by the human only.
- R6: no seed.
- Rollback: none included in the file (a `DROP TABLE` would be destructive and is not in `approved-risks`; the spec requires the file to contain no `DROP`). If the human wants a rollback for a freshly created, empty table: `RISK` `DROP TABLE public.users;` - needs separate approval; do not run it on a table that holds users.

## Pre-existing table
`CREATE TABLE IF NOT EXISTS` does nothing if `public.users` exists. The human should check first (`\d public.users`) and reconcile columns manually if the structure differs.

## Queries for the backend builder
Login lookup (email already trimmed and lower-cased in the service, Q9):

```sql
SELECT id, email, password_hash, type
FROM public.users
WHERE email = $1;
```

- Params: `[normalisedEmail]`.
- Row shape: `{ id: string (uuid), email: string, password_hash: string, type: 'admin' | 'user' }`, 0 or 1 row (email is unique).
- Zero rows: respond with the same 401 as a wrong password (FR4). `password_hash` must never be returned or logged.
- No INSERT is part of this task, so no unique-violation (`23505`) handling is needed.
- Case note: uniqueness is case-sensitive; emails inserted by hand must be stored lower-case to match the normalised lookup.

## Volume and locking
Table creation on a new name takes only a brief catalog lock; no data volume concerns.

## How to apply (human)
1. Open the Cloud Foundry tunnel and confirm PostgreSQL version (13+ for `gen_random_uuid()`, otherwise `CREATE EXTENSION IF NOT EXISTS pgcrypto;` first).
2. Check whether `public.users` already exists.
3. Run: `psql "$DATABASE_URL" -f Backend/migrations/001_create_users.sql`.
4. Insert a first user manually (bcrypt hash generated outside the repo); there is no seed.

## Not done (out of the requested scope)
- `docs/context/backend.md` Data section and `docs/context/project.md` status line not updated, because the scope was limited to the migration file and this report.

## Blockers
None.
