# PR (backend) - manual-backend-login-endpoint

## Title
manual-backend-login-endpoint: Backend login endpoint (backend)

## Branch
- Head: `feature/manual-backend-login-endpoint-backend-login-endpoint` (to be created from `main`; does not exist yet)
- Base: `main` (`origin/main` is at `43f6326`; local `main` is one commit ahead, `faa3c44`, unpushed)

## Summary
Adds `POST /api/auth/login`: validates email and password, looks the user up in PostgreSQL (`public.users`, database `ico-env`), compares the bcrypt hash and returns an HS256 JWT signed with `JWT_SECRET`. Adds a rate limit on the login route, a restrictive CORS default (`*` only outside production), fail-fast startup checks (`JWT_SECRET`, `DATABASE_URL`) and a migration that creates the `users` table. Layering: routes -> controller -> service -> repository.

Work item: none (source: manual, no URL in the task file).

## Acceptance criteria
- [x] AC1 Valid email and password return 200 `{ success: true, payload: { token } }`.
- [x] AC2 Wrong credentials (unknown email or wrong password) return 401 `{ success: false, message }` (identical body).
- [x] AC3 Missing email or password returns 400 with `errors[]` (`{ field, message }`).
- [x] AC4 `JWT_SECRET` read from the environment, no default; login fails with 500 if missing; server exits 1 at startup.
- [x] AC5 Unit tests cover the above without a real database (49 tests).
- [x] Spec extras: CORS (AC7), migration without `DROP` (AC6), `.env.example` and docs (AC10), rate limit (AC11).

## API contract
`POST /api/auth/login`, no auth, body `{ email: string, password: string }`.

| Status | Body |
| --- | --- |
| 200 | `{ success: true, payload: { token } }` |
| 400 | `{ success: false, message: "Validation failed", errors: [{ field: "email"\|"password", message }] }` (malformed JSON: `{ success: false, message: "Invalid JSON body" }`) |
| 401 | `{ success: false, message: "Invalid credentials" }` |
| 429 | `{ success: false, message: "Too many login attempts, please try again later" }` + `Retry-After` |
| 500 | `{ success: false, message: "Internal server error" }` |

JWT: HS256, claims `id`, `email`, `type`, expiry `JWT_EXPIRES_IN` (default `8h`).

## Migration to apply (human only, not run by the agent)
`Backend/migrations/001_create_users.sql`: `CREATE TABLE IF NOT EXISTS public.users` (`id` uuid PK, `full_name`, `email` unique, `password_hash`, `type` CHECK `admin`/`user`, `created_at` timestamptz). No `DROP`, no seed.
1. Check `public.users` first (`\d public.users`); `IF NOT EXISTS` does nothing on an existing table.
2. PostgreSQL 13+ for `gen_random_uuid()`, otherwise `CREATE EXTENSION IF NOT EXISTS pgcrypto;`.
3. `psql "$DATABASE_URL" -f Backend/migrations/001_create_users.sql`.
4. Insert a first user manually (bcrypt hash generated outside the repo, email in lower case). Nobody can log in until then.

Note: migration path is `Backend/migrations/` (as requested), not the role default `Backend/db/migrations/`.

## New configuration
`JWT_SECRET` (required), `DATABASE_URL` (required), `JWT_EXPIRES_IN`, `CORS_ORIGIN`, `LOGIN_RATE_LIMIT_MAX`, `LOGIN_RATE_LIMIT_WINDOW_MS` (see `Backend/.env.example`, values left empty). New dependencies: `pg`, `bcryptjs`, `jsonwebtoken`, `express-rate-limit`; dev `@types/pg`, `@types/jsonwebtoken`.

## Test results
- `npm run build`: ok.
- `npm test`: 49 pass, 0 fail (19 existing/builder + 30 acceptance). No real database contacted.
- Not covered: rate-limit window expiry, `LOGIN_RATE_LIMIT_WINDOW_MS` parsing, real `pg` Pool, migration execution.
- `tests/server.test.ts` was changed: startup now requires `JWT_SECRET` and `DATABASE_URL`.

## Review and security
Code review: approved (0 blocker, 0 high, 1 medium, 6 low). Security: approved (0 blocker, 0 high, 3 medium, 7 low). No findings require changes before merge.

Open findings:
- Medium (security M1): `npm audit` high on transitive `body-parser` 2.0.0-2.3.0 via `express` (DoS). Follow-up `npm audit fix`.
- Medium (security M2): rate limit keyed by `req.ip` without `trust proxy`; behind Cloud Foundry all clients share one IP, so 10 failures can lock out everyone for 15 min. In-memory store, no per-account throttle. Configure hop count at deployment.
- Medium (security M3): CORS `*` guard only throws on exact `production`; unset or differently cased `NODE_ENV` accepts `CORS_ORIGIN=*`.
- Medium (review 1 / security L4): invalid `JWT_EXPIRES_IN` is only detected at login (every login returns 500); not validated at startup.
- Low: no `JWT_SECRET` strength check; no max length on email/password; dummy-hash timing is approximate; non-JSON body-parser errors (413, charset) return 500; rate limit also counts 5xx (DB outage can lock users out); no `listen` error handling / `pool.end()` on shutdown; `X-Powered-By` not disabled; `jwt.verify` must pin HS256 when added; no TLS enforcement on `DATABASE_URL`; email uniqueness is case-sensitive; `docs/context/backend.md` tables omit `tests/login.acceptance.test.ts`.
- Spec open questions (Q1-Q12 in the task) were resolved in the spec; the original "drop and recreate" request was replaced by a non-destructive `CREATE TABLE IF NOT EXISTS`.

## How to verify
1. `cd Backend; npm install; npm run build; npm test`.
2. Apply the migration and insert a test user (see above).
3. Set `JWT_SECRET` and `DATABASE_URL`, run `npm run dev`/`npm start`.
4. `POST /api/auth/login` with valid credentials (200 + token), wrong password (401), missing field (400); 11th failed attempt within 15 min returns 429.
5. Start without `JWT_SECRET` or `DATABASE_URL`: process exits with code 1.

## Frontend
`docs/runs/manual-backend-login-endpoint/pr-frontend.md` does not exist; this PR covers the backend only.
