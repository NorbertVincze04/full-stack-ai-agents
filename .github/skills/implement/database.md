# Database area (used by `implement` and `containerize`)

Schema `"ico-env"` in PostgreSQL. Source of truth: the `Data` section of `docs/context/backend.md`, `Backend/db/migrations/` and `Backend/migrations/`.

## Write the migration (`implement database`)
- Minimal change: columns/types, `NOT NULL`, `CHECK`, `UNIQUE`, foreign keys, indexes matching the access patterns.
- File: `Backend/db/migrations/<yyyymmddHHMM>_<task-id>.sql` with an up section and a rollback section. Idempotent where possible (`IF NOT EXISTS`), schema-qualified.
- Every query proposed to the backend uses placeholders (`$1`, `$2`); never string concatenation.
- Risky SQL (`DROP`, `TRUNCATE`, wide `DELETE`/`UPDATE`, column removal or retyping, new constraints on tables with data, backfills): write it only if it is in `approved-risks` exactly as approved, mark it `RISK` in the report; otherwise return `needs-approval` with the statement, impact and an additive alternative (expand/contract).
- Update the `Data` section of `docs/context/backend.md`. The report lists: schema diff, migration path, the exact parameterised queries with row shapes and unique-violation handling, locking or volume notes, how to apply.

## Apply to the local database container
Only the `db` service of this project's compose project (`COMPOSE_PROJECT_NAME`), never Cloud Foundry or any remote host. `<runtime>` is `containers.runtime` from `.github/config.json` (`podman` or `docker`).
1. Apply only when `.env` and `compose.yaml` exist (else leave the file and say so in the report). `<runtime> compose up -d db`, wait for `pg_isready`.
2. Ensure schema `"ico-env"` and `"ico-env".schema_migrations(version text primary key, applied_at timestamptz not null default now())`.
3. Pending = files whose version is not in `schema_migrations`, in name order; classify each as safe or risky.
4. Risky ones only if approved: back up first with `pg_dump` to `db-backups/<timestamp>_<version>.sql` (git-ignored).
5. Apply each with `psql -v ON_ERROR_STOP=1 --single-transaction` run inside the container (`sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" ...'` so secrets stay in the container), then insert the version. Stop at the first failure and report the error without data.
6. Verify with `information_schema` (tables, columns, constraints) and the `schema_migrations` rows.

## Never
`DROP DATABASE`, `compose down -v`, deleting volumes, printing credentials or row data, running SQL against anything but the local container, editing an already-applied migration (add a new one).
