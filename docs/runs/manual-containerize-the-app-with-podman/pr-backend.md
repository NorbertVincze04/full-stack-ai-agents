# PR (backend) - manual-containerize-the-app-with-podman

## Title
manual-containerize-the-app-with-podman: Containerize the app with Podman (backend)

## Branch
- Head (proposed, not created): `feature/manual-containerize-the-app-with-podman-containerize-the-app-with-podman`
- Base: see "Base-branch situation". Recommended: create the head from `feature/manual-backend-login-endpoint-backend-login-endpoint` (`a4cc66f`), not from `main`.

## Base-branch situation (needs a human decision)
- The working tree is on `feature/manual-backend-login-endpoint-backend-login-endpoint`. The login work is already committed there (`a4cc66f`), not uncommitted. It is not on `main` and not on `origin` (`origin` only has `main` at `43f6326`; local `main` `faa3c44` is unpushed).
- This task's backend changes modify files introduced by the login commit (`Backend/src/app.ts`, `server.ts`, `repositories/userRepository.ts`, `Backend/.env.example`, `docs/context/backend.md`) and import `Queryable` and the user repository from it. They do not compile or apply on `main`.
- Options:
  1. Create the head branch from `a4cc66f` and open the PR with the login branch as base (stacked PR; the login branch must be pushed first, needs separate push confirmation). After the login PR merges, retarget to `main`.
  2. Wait until the login PR is merged to `main`, then branch from `main`.
  Option 1 is proposed. Branching from `main` now is not viable.
- Branch name follows `feature/<task-id>-<kebab-title>` (same pattern as the login branch). If a container commit shares this branch, reuse it. No `feature/manual-containerize*` branch exists yet.

## Summary
Backend part of the Podman containerization: adds public `GET /api/health` (`SELECT 1` on the injected DB, 2000 ms timeout, 200/503 with fixed bodies), a validated `DB_SCHEMA` setting (default `public`, `ico-env` in the container) used by the login user query, 5 s `pg.Pool` timeouts with SIGTERM/SIGINT graceful shutdown in `server.ts`, and idempotent init SQL that creates schema `"ico-env"`, `users`, `bookings` and `schema_migrations` in the `db` container on first start. Layering routes -> controller -> service -> repository. No dependencies added. Compose, Containerfiles, `.containerignore` and nginx are not part of this commit (container agents).

Work item: none (source: manual, no URL in the task file).

## Acceptance criteria (backend scope)
- [x] AC3 `GET /api/health` returns 200 only when the database answers (503 on DB error, timeout, or no probe).
- [x] AC4 (SQL) `users` and `bookings` in schema `"ico-env"` created by `Backend/db/migrations/001..003` (execution inside the container is for the container tester).
- [x] AC5 (backend part) `Backend/.env.example` documents `DB_SCHEMA`, values empty; `.env` is gitignored (`Backend/.gitignore`), no secret in the change.
- [x] AC6 `DB_SCHEMA` validated `^[A-Za-z0-9_-]+$` at startup (exit 1, value not echoed); users query is `public.users` by default and `"ico-env".users` for `ico-env`.
- [x] AC7 tests without a database (200, 503 reject, 503 timeout, no leak, schema accept/reject).
- [ ] AC1, AC2, AC8-AC13 (compose, images, nginx, ports, `down`/`up`): container scope, not in this PR.

## API contract
| Method, path | Auth | Request | Responses |
| --- | --- | --- | --- |
| `GET /api/health` | none, no rate limit | none | 200 `{ "success": true, "payload": { "status": "ok" } }`; 503 `{ "success": false, "message": "Database unavailable" }` |

Other methods on `/api/health` return 404. Login contract unchanged.

## Migration to apply
`Backend/db/migrations/001_ico_env_schema.sql`, `002_ico_env_users.sql`, `003_ico_env_bookings.sql`. Applied automatically by the postgres entrypoint (mounted into `/docker-entrypoint-initdb.d` by compose) on the first start of an empty `db-data` volume; not run by the agent. Idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`), each file in a transaction, no `DROP`/`TRUNCATE`/`DELETE`/`UPDATE`, no seed. On an existing volume they do not re-run; later changes need a new numbered file. `Backend/migrations/001_create_users.sql` (public, Cloud Foundry) is untouched. Rollback is not included (`DROP SCHEMA "ico-env" CASCADE` needs separate approval).

Schema summary: `"ico-env".users` mirrors `public.users`; `"ico-env".bookings` (`id` serial PK, `user_name`, `booking_date`, `booking_desk`, `created_at`, `UNIQUE (booking_date, booking_desk)`); `"ico-env".schema_migrations`.

## New configuration
`DB_SCHEMA` (optional, default `public`). No new dependencies.

## Test results (round 2 reports, re-run on the current tree)
- `npm run build` (Backend): success.
- `npm test` (Backend): 74 tests, 18 suites, 72 pass, 0 fail, 2 skipped. The 2 skipped are the new SIGTERM/SIGINT graceful-shutdown tests in `Backend/tests/server.test.ts`, skipped on Windows by design; unverified here, run them on Linux/CI or confirm in the container tester (`podman stop` returns well before the timeout).
- No database contacted. Not covered: real `pg.Pool` timeouts, `SELECT 1` and init SQL against PostgreSQL, forced-exit path (container tester); no coverage script exists.

## Review and security
Code review (round 2): approved (0 blocker, 0 high, 0 medium, 7 low). Security (round 2): approved (0 blocker, 0 high, 2 medium, 6 low). Nothing blocks. The earlier pool-timeout and SIGTERM findings are resolved.

Open findings:
- Medium (security M1): login rate limiter keyed by `req.ip` collapses to one bucket behind nginx (no `trust proxy`); known gap R6, documented in `backend.md`, separate task.
- Medium (security M2): backend connects as the database superuser; consider a least-privilege role in a later migration.
- Low: health probe still shares the login pool and timeouts are client-side only (no `statement_timeout`); health failure log can flood; pool error handler logs `err.message`; shutdown handler not idempotent (repeated signal re-runs `pool.end()`, exit code still correct); `Queryable` lives in `userRepository.ts` but is used by health code; duplicated test helper and one weak test; leak test only stubs `console.error`; `X-Powered-By` not disabled, no `helmet`; no minimum length check for `JWT_SECRET`; schema pattern permissive (informational).
- Pre-existing: high-severity transitive `body-parser` advisory (rated medium), recorded in `backend.md`.
- Container-side items (R5, R6, nginx, frontend image) belong to the container review.

## How to verify
1. `cd Backend; npm install; npm run build; npm test` (72 pass, 2 skipped on Windows).
2. Without `DATABASE_URL`/`JWT_SECRET` the server exits 1; with `DB_SCHEMA=a"b` it exits 1 without echoing the value.
3. With a database: `GET /api/health` returns 200 `{"success":true,"payload":{"status":"ok"}}`; with the database stopped it returns 503.
4. On Linux/CI: `SIGTERM` and `SIGINT` make the server exit 0 (the two skipped tests).
5. Container (after the container PR): `podman exec <db> psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\dt "ico-env".*'` shows `users`, `bookings`, `schema_migrations`.

## Frontend
`docs/runs/manual-containerize-the-app-with-podman/pr-frontend.md` does not exist; this PR covers the backend only.

## Proposed commit
Message: `manual-containerize-the-app-with-podman: Containerize the app with Podman (backend)`

Body: Adds GET /api/health (SELECT 1, 2 s timeout, 200/503), validated DB_SCHEMA for the users query, 5 s pool timeouts with SIGTERM/SIGINT graceful shutdown, and idempotent ico-env init SQL (users, bookings, schema_migrations) for the db container.

Files (exact list, 28):
- Modified: `Backend/.env.example`, `Backend/src/app.ts`, `Backend/src/server.ts`, `Backend/src/repositories/userRepository.ts`, `Backend/tests/server.test.ts`, `docs/context/backend.md`
- New: `Backend/src/config/dbSchema.ts`, `Backend/src/controllers/healthController.ts`, `Backend/src/repositories/healthRepository.ts`, `Backend/src/routes/healthRoutes.ts`, `Backend/src/services/healthService.ts`
- New: `Backend/tests/health.schema.test.ts`, `Backend/tests/health.extra.test.ts`
- New: `Backend/db/migrations/001_ico_env_schema.sql`, `002_ico_env_users.sql`, `003_ico_env_bookings.sql`
- New: `docs/tasks/manual-containerize-the-app-with-podman.md`, `docs/specs/manual-containerize-the-app-with-podman.md`
- New: `docs/runs/manual-containerize-the-app-with-podman/{database-builder,backend-builder,backend-tester,backend-code-reviewer,backend-security,pr-backend}.md`

Excluded (container scope or other tasks): `Backend/Containerfile`, `Backend/.containerignore`, `compose.yaml`, root `.env.example`, `Frontend/Containerfile`, `Frontend/.containerignore`, `Frontend/nginx.conf`, `certs/`, `docs/context/containers.md`, `docs/runs/manual-containerize-the-app-with-podman/{container-builder,container-reviewer,container-tester,pr-containers}.md`, root `.gitignore`, `.github/**`, `docs/risk-gate.md`, `docs/workflow.md`, `docs/context/README.md`, `docs/context/project.md`, `docs/tasks/manual-backend-login-endpoint.md`, `docs/handover/manual-backend-login-endpoint.md`, `docs/handover/manual-info-page.md`, `docs/tasks/manual-info-page.md`.

Overlap check: every `Backend/src`, `Backend/tests`, `Backend/db` and `Backend/.env.example` change in the working tree belongs to this task; the login work is committed in `a4cc66f`, so the modified files are edits on top of it (see base-branch situation). The only other untracked `Backend/` files are `Containerfile` and `.containerignore` (container scope). `docs/context/project.md` is modified in the working tree but is not in the backend builder report; excluded unless the human wants it included.

Note: `docs/context/backend.md` lists `tests/health.schema.test.ts` but not `tests/health.extra.test.ts` (documentation gap, no action required before commit).
