# Database report - manual-containerize-the-app-with-podman

Verdict: done

## Files
- `Backend/db/migrations/001_ico_env_schema.sql` - schema `"ico-env"`, `schema_migrations`.
- `Backend/db/migrations/002_ico_env_users.sql` - `"ico-env".users`.
- `Backend/db/migrations/003_ico_env_bookings.sql` - `"ico-env".bookings`.
- `Backend/migrations/001_create_users.sql` (public, Cloud Foundry) untouched. No application code or container files touched. No SQL executed, no database connection made.

## Schema diff (local `db` container, database `POSTGRES_DB`, default `deskbooking`)
| Object | Definition |
| --- | --- |
| schema `"ico-env"` | `CREATE SCHEMA IF NOT EXISTS` |
| `"ico-env".schema_migrations` | `version varchar(255)` PK, `applied_at timestamptz NOT NULL DEFAULT now()` |
| `"ico-env".users` | `id uuid` PK default `gen_random_uuid()`, `full_name`, `email` UNIQUE, `password_hash`, `type` CHECK in (`admin`,`user`), `created_at timestamptz NOT NULL DEFAULT now()` (all `NOT NULL`, same as `public.users`) |
| `"ico-env".bookings` | `id serial` PK, `user_name varchar(255) NOT NULL`, `booking_date date NOT NULL`, `booking_desk varchar(100) NOT NULL`, `created_at timestamptz NOT NULL DEFAULT now()`, `UNIQUE (booking_date, booking_desk)` |

Recorded versions: `001_ico_env_schema`, `002_ico_env_users`, `003_ico_env_bookings` (`INSERT ... ON CONFLICT (version) DO NOTHING`).

## Design notes
- Each file is wrapped in `BEGIN; ... COMMIT;` so a table and its version row land together. The postgres entrypoint runs `*.sql` in name order with `ON_ERROR_STOP=1`; `001` < `002` < `003` sorts correctly.
- All names are schema-qualified; nothing depends on `search_path`. Plain SQL, no `psql` meta-commands, so the files also run with `psql -f`.
- No extra index: the unique constraint on `(booking_date, booking_desk)` serves date and date+desk lookups. A lookup by `booking_desk` alone would need its own index (not needed now).
- Version names deliberately differ from the public `001_create_users` so the two migration tracks are not confused.

## Risk gate
- R7: approved safer alternative applied (idempotent, non-destructive). No `DROP`, `TRUNCATE`, `DELETE`, `UPDATE`, no backfill, no seed. No `RISK` statements.
- Rollback: not included (a `DROP` is outside `approved-risks`). `RISK`, not written: removing the objects means `DROP SCHEMA "ico-env" CASCADE`, equivalent to losing the volume; it needs separate approval.
- Existing table: `CREATE TABLE IF NOT EXISTS` leaves a pre-existing differing table untouched. Not a concern on an empty volume.

## Behaviour and limits
- Init scripts run only when `db-data` is empty (first start). On an existing volume they do not re-run; later changes go through `Database Migrator` as a new numbered file (`004_...`) that records its version in `"ico-env".schema_migrations`. Re-running these files manually is safe (idempotent).
- Volume/locking: empty database, brief catalog locks only.
- `gen_random_uuid()` is built in since PostgreSQL 13; the 16-alpine image needs no extension.

## Queries for the backend builder
Login lookup with `DB_SCHEMA=ico-env` (schema validated against `^[A-Za-z0-9_-]+$` and double-quoted as an identifier; values stay parameters):

```sql
SELECT id, email, password_hash, type
FROM "ico-env".users
WHERE email = $1;
```

- Params: `[normalisedEmail]`. Row shape unchanged: `{ id, email, password_hash, type }`, 0 or 1 row.
- Health probe: `SELECT 1` (no table access).
- No `bookings` queries in this task. Future insert: unique violation is SQLSTATE `23505` on `bookings_booking_date_booking_desk_key` (desk already booked that day).

## How to apply
- Automatic: mounted read-only into `/docker-entrypoint-initdb.d` by compose (container agents); runs at the first start of the `db` container.
- Verify (Container Tester, inside the container only, since `db` is not published): `podman exec <db container> psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\dt "ico-env".*'` and `SELECT version FROM "ico-env".schema_migrations ORDER BY version;`.
- Manual re-apply, local container only: `podman exec -i <db container> psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -f - < Backend/db/migrations/001_ico_env_schema.sql` (repeat for 002, 003).

## Re-verification (second run)
Static review only; no SQL executed, no database connection. Migrations unchanged.
| Requirement | Result |
| --- | --- |
| FR8 | Pass: `001` creates schema `"ico-env"` and `schema_migrations(version PK, applied_at)`; each file records its version with `ON CONFLICT DO NOTHING`. Only `CREATE ... IF NOT EXISTS` and `INSERT`; grep finds no `DROP`/`TRUNCATE`/`DELETE`/`UPDATE`/`ALTER` (one comment mention). |
| FR9 / D2 | Pass: `users` columns, types, `NOT NULL`, `UNIQUE (email)` and `type` CHECK match `Backend/migrations/001_create_users.sql`; `bookings` matches D2 exactly. |
| FR10 | Pass: files are local-container init SQL, mounted by `compose.yaml` (`./Backend/db/migrations:/docker-entrypoint-initdb.d:ro`); nothing targets Cloud Foundry. |
| D1 | Pass: all objects in `"ico-env"`, schema-qualified; compose sets `DB_SCHEMA` default `ico-env`, `POSTGRES_DB` default `deskbooking`. |
| R7 | Pass: idempotent, non-destructive; no `RISK` statements. |

Context: `docs/context/backend.md` (Data), `project.md` and `containers.md` already describe the schema, tables and migration list; no change needed.

## Not done
- Rollback not written (needs a `DROP`, not in `approved-risks`; see Risk gate).

## Blockers
None.

## Round: orchestrated run
Verdict: done

Scope: FR2, FR8-FR10, AC4, AC13, D4; risk gate R3, R4, R7 (approved safer alternatives; no risky statements, none applied by hand).

### What was run
- `podman machine list`: `podman-machine-default` already running (no init/start needed, EP1).
- `podman compose up -d db` (project `deskbooking`, docker-compose from `%LOCALAPPDATA%\Programs\docker-compose` on PATH, `HTTP_PROXY`/`HTTPS_PROXY=http://127.0.0.1:3128`): `deskbooking-db-1` was already running; no image pull or recreate needed. Healthcheck: `healthy`.
- Read-only `psql` via `podman exec -i deskbooking-db-1 sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" ...'` (credentials read inside the container, not printed).
- No SQL applied by hand, no `down -v`, no volume removal or prune, no Cloud Foundry or remote access, no application or compose edits.

### Verification (inside the `db` container)
| Check | Result |
| --- | --- |
| Tables in schema `"ico-env"` | `bookings`, `schema_migrations`, `users` |
| `"ico-env".schema_migrations` versions | `001_ico_env_schema`, `002_ico_env_users`, `003_ico_env_bookings` |
| `"ico-env".bookings` columns | `id` integer, `user_name` varchar, `booking_date` date, `booking_desk` varchar, `created_at` timestamptz |

The schema was created by the init SQL mounted at `/docker-entrypoint-initdb.d` on the first start of the volume `deskbooking_db-data` (the only db volume, created by this project). The current container log shows "Skipping initialization" on later restarts, as expected for a non-empty volume.

### Notes
- The first-start init log lines are no longer in the log tail, so the init run is inferred from the objects and versions present, not from a log line.
- Existing volume left untouched.

### Blockers
None.
