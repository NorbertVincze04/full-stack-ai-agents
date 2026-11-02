# Handover - manual-backend-login-endpoint - Backend login endpoint

- Task: `docs/tasks/manual-backend-login-endpoint.md` (source: manual, no Azure work item)
- Spec: `docs/specs/manual-backend-login-endpoint.md`
- Area: backend only (no frontend work)
- Commit: `a4cc66f` on `feature/manual-backend-login-endpoint-backend-login-endpoint` (from `main`, local, not pushed)
- Final status: **done**

## Summary
Adds `POST /api/auth/login` to the Express backend. It validates `email` and `password`, looks the user up in `public.users` (database `ico-env`), compares the bcrypt hash and returns an HS256 JWT signed with `JWT_SECRET`. The route is rate limited, CORS keeps a restrictive default, and startup fails fast without `JWT_SECRET` or `DATABASE_URL`. A non-destructive migration for `public.users` is delivered for the human to apply.

## Deviations from the task text (approved by the human)
| Id | Task text | What was implemented | Consequence |
| --- | --- | --- | --- |
| D1 (R1) | "Recreate the users table (drop it first if it already exists)" | `CREATE TABLE IF NOT EXISTS public.users`, no `DROP`, no seed. | If `public.users` already exists with a different structure it is left untouched and must be reconciled manually. The destructive variant is documented in the spec only and was not delivered. |
| D2 (R2) | "Allow CORS from any origin" | Default stays `http://localhost:4200`. `CORS_ORIGIN=*` is honoured only when set explicitly and `NODE_ENV !== "production"`. With `*` in production, `createApp()` throws. No credentials are ever sent. | Browser calls from other origins need `CORS_ORIGIN` set in the local `.env`. |
| D3 (R4) | Not mentioned | `express-rate-limit` on `POST /api/auth/login`: 10 counted attempts per 15 min per IP, successful logins not counted, 429 with `Retry-After`. | In-memory store, no account lockout; see follow-ups. |

## What was implemented
### Backend
- Route `POST /api/auth/login` in `Backend/src/routes/authRoutes.ts`, wired in `createApp()`. Layering: route -> controller -> service -> repository.
- Controller validates input (400 with `errors[{ field, message }]`). The service normalises the email (trim, lower-case), compares bcrypt against a dummy hash for unknown users, and signs the JWT (`id`, `email`, `type`; expiry `JWT_EXPIRES_IN`, default `8h`). The repository runs one parameterised query on `public.users`.
- Generic error handler: 500 `Internal server error` (logs the message only), 400 `Invalid JSON body`.
- `server.ts` exits with code 1 when `JWT_SECRET` or `DATABASE_URL` is missing or empty. The login service also refuses to sign without `JWT_SECRET` (no default).
- `npm test` script added.

### Database
- `Backend/migrations/001_create_users.sql`: `public.users` (`id` uuid PK default `gen_random_uuid()`, `full_name`, `email` unique, `password_hash`, `type` CHECK `admin`/`user`, `created_at` timestamptz default `now()`). Not executed by any agent or by the app.

### Frontend
None.

## Files changed
Created: `Backend/migrations/001_create_users.sql`, `Backend/src/routes/authRoutes.ts`, `Backend/src/controllers/authController.ts`, `Backend/src/services/authService.ts`, `Backend/src/repositories/userRepository.ts`, `Backend/src/middleware/loginRateLimit.ts`, `Backend/src/middleware/errorHandler.ts`, `Backend/tests/auth.test.ts`, `Backend/tests/login.acceptance.test.ts`.

Changed: `Backend/src/app.ts`, `Backend/src/server.ts`, `Backend/package.json`, `Backend/package-lock.json`, `Backend/.env.example`, `Backend/tests/server.test.ts` (startup now needs `JWT_SECRET` and `DATABASE_URL`), `docs/context/backend.md`, `docs/context/project.md`.

Docs: task, spec and run reports under `docs/`.

## Tools and technologies
Node.js, Express 5, TypeScript (ESM), PostgreSQL via `pg`, bcrypt (`bcryptjs`), JWT (`jsonwebtoken`, HS256), `express-rate-limit`, `node:test`.

## Dependencies added (R7 approved)
| Name | Version | Reason |
| --- | --- | --- |
| `pg` | ^8.23.1 | PostgreSQL client (`Pool` from `DATABASE_URL`) |
| `bcryptjs` | ^3.0.3 | Password hash comparison (pure JS, no native build) |
| `jsonwebtoken` | ^9.0.3 | JWT signing |
| `express-rate-limit` | ^8.7.2 | Login rate limiting (D3) |
| `@types/pg` (dev) | as in `package.json` | Types |
| `@types/jsonwebtoken` (dev) | as in `package.json` | Types |

## API contract
`POST /api/auth/login`, no auth, body `{ "email": string, "password": string }`.

| Status | Body |
| --- | --- |
| 200 | `{ "success": true, "payload": { "token": string } }` |
| 400 | `{ "success": false, "message": "Validation failed", "errors": [{ "field": "email" \| "password", "message": string }] }` (malformed JSON: `{ "success": false, "message": "Invalid JSON body" }`) |
| 401 | `{ "success": false, "message": "Invalid credentials" }` (same for unknown email and wrong password) |
| 429 | `{ "success": false, "message": "Too many login attempts, please try again later" }` + `Retry-After` |
| 500 | `{ "success": false, "message": "Internal server error" }` |

New environment variables (see `Backend/.env.example`, values left empty): `JWT_SECRET` (required), `DATABASE_URL` (required), `JWT_EXPIRES_IN` (default `8h`), `LOGIN_RATE_LIMIT_MAX` (default `10`), `LOGIN_RATE_LIMIT_WINDOW_MS` (default `900000`). Existing `CORS_ORIGIN` keeps its default.

## Manual steps for the human (nothing was applied by agents)
1. Check whether `public.users` already exists (`\d public.users`). `CREATE TABLE IF NOT EXISTS` does nothing on an existing table; reconcile the columns by hand if they differ.
2. Confirm the PostgreSQL version is 13+ (`gen_random_uuid()`); otherwise run `CREATE EXTENSION IF NOT EXISTS pgcrypto;` first.
3. Apply the migration through the Cloud Foundry tunnel: `psql "$DATABASE_URL" -f Backend/migrations/001_create_users.sql`.
4. Insert at least one user by hand. There is no seed. Generate the bcrypt hash outside the repo and store the email in lower case (login lower-cases the email and uniqueness is case-sensitive).
5. Set `JWT_SECRET` and `DATABASE_URL` in the git-ignored `Backend/.env` (or the deployment environment). Without them the server exits with code 1.
6. Optional: set `CORS_ORIGIN` (for example `*` in a local `.env` only, never in production) and the rate-limit variables.

## How to run and verify
1. `cd Backend; npm install; npm run build; npm test` (49 tests, no database needed).
2. Complete the manual steps above, then `npm run dev` (or `npm start` after the build).
3. `POST /api/auth/login` with valid credentials returns 200 and a token. A wrong password returns 401, a missing field returns 400, and the 11th failed attempt within 15 minutes returns 429.
4. Start without `JWT_SECRET` or `DATABASE_URL`: the process exits with code 1.

## Acceptance criteria
Task criteria (T1-T5) and spec criteria (AC1-AC11).

| AC | Status | Evidence |
| --- | --- | --- |
| T1 / AC1 Valid credentials return 200 `{ success: true, payload: { token } }`; HS256, claims `id`/`email`/`type`, `JWT_EXPIRES_IN` default 8h | Verified | `backend-tester.md` (49/49 pass: header, claims, expiry, token rejected with another secret), `backend-code-reviewer.md` (FR5-FR7 met); human acceptance |
| T2 / AC2 Wrong credentials return 401 `{ success: false, message }`, identical for unknown email and wrong password | Verified | `backend-tester.md` (identical bodies, no hash or id in body); `backend-security.md` (dummy-hash compare checked); human acceptance |
| T3 / AC3 Missing, empty or non-string `email`/`password` return 400 with `errors[]`, no DB call | Verified | `backend-tester.md` (per-field errors, non-string values, repository never called); `backend-code-reviewer.md` |
| T4 / AC4 `JWT_SECRET` from the environment, no default; no token without it | Verified | `backend-tester.md` (unset or empty secret gives 500, no token, no lookup); `server.test.ts` fail-fast; `backend-security.md` (no hard-coded fallback) |
| T5 / AC8 Unit tests cover all of the above without a real database | Verified | `backend-tester.md`: 49 tests, 0 fail, fake repository and `Queryable`, no database or network beyond loopback |
| AC5 Parameterised lookup; `password_hash` never returned or logged | Verified | `backend-security.md` (single `WHERE email = $1`, no leakage in responses or logs); `backend-tester.md` (logs checked for password and hash) |
| AC6 Migration uses `CREATE TABLE IF NOT EXISTS`, no `DROP`, no seed, not executed; D1 recorded | Verified | `database-builder.md` and `backend-code-reviewer.md` (file inspected); `backend-security.md`; D1 recorded above and in the spec |
| AC7 CORS per R2 (default kept, `*` guarded, throws in production, no credentials) | Verified | `backend-tester.md` (default, explicit, `*` allowed outside production, throws in production, no credentials header); `backend-security.md` (see open finding M3) |
| AC9 `npm run build` and `npm test` pass | Verified | `backend-builder.md`, `backend-tester.md`, `backend-code-reviewer.md` (build ok, 49 pass, 0 fail) |
| AC10 `.env.example` and `docs/context/backend.md` updated | Verified | `backend-code-reviewer.md` (FR15/AC10 met); the file change list in `git diff --stat`; minor gap: the acceptance test file is missing from the tables in `backend.md` (low, follow-up) |
| AC11 Rate limit on the login route (429, `Retry-After`, no DB call, successes not counted, other routes free) | Verified | `backend-tester.md` (small `max` injected, no sleeping); `backend-code-reviewer.md` |

Result: 16 of 16 criteria verified (5 task criteria, 11 spec criteria; T1-T5 overlap AC1-AC4 and AC8). Human acceptance was also given for the implementation (`human-accepted: true`).

Not covered by tests (stated in `backend-tester.md`): rate-limit window expiry and `LOGIN_RATE_LIMIT_WINDOW_MS` parsing, real `pg` Pool behaviour, and execution of the migration. None of these is an acceptance criterion.

## Open findings
Blockers: 0. High: 0 (non-dependency). Critical dependency advisories: 0.

Code review: approved (0 blocker, 0 high, 1 medium, 6 low). Security: approved (0 blocker, 0 high, 3 medium, 7 low).

| Source | Severity | Finding | Suggested action |
| --- | --- | --- | --- |
| Security M1 | Dependency, npm "high" (not critical, not a blocker) | Transitive `body-parser` 2.0.0-2.3.0 via `express` (GHSA-27r3-jxmh-p828): DoS through trailing bytes after a compressed body | Follow-up `npm audit fix` |
| Security M2 | Medium | Rate limit keyed by `req.ip` without `trust proxy`. Behind Cloud Foundry all clients share one bucket, so 10 failures can lock everyone out for 15 min. Also: in-memory store, no lockout | Set the exact hop count when the deployment is defined (Q12) |
| Security M3 | Medium | CORS `*` guard throws only on the exact string `production`; with `NODE_ENV` unset or differently cased, `CORS_ORIGIN=*` is accepted | Compare case-insensitively or allow `*` only with `NODE_ENV` `development`/`test` |
| Review 1 / Security L4 | Medium / Low | Invalid `JWT_EXPIRES_IN` is detected only at login, so every login returns 500 | Validate at startup |
| Review 2 / Security L5 | Low | Body-parser errors other than invalid JSON (413, charset) return 500 | Honour `err.status` for 4xx |
| Review 3 / Security L3 | Low | Dummy-hash timing is approximate; built lazily | Build at startup with the real hash cost |
| Review 4 | Low | Rate limiter also counts 5xx, so a DB outage can consume the budget | Use `requestWasSuccessful` or document |
| Review 5 / Security L2 | Low | No max length for `email` and `password` | Cap (email 254, password 128) |
| Review 6 | Low | No `listen` error handling or `pool.end()` on shutdown | Add graceful shutdown |
| Review 7 | Low | `docs/context/backend.md` tables omit `tests/login.acceptance.test.ts` | Add the row |
| Security L1 | Low | No `JWT_SECRET` strength check | Require a minimum length (for example 32) |
| Security L6 | Low | `X-Powered-By` not disabled, no helmet | `app.disable("x-powered-by")` or helmet |
| Security L7 | Low | Future `jwt.verify` must pin HS256; no TLS enforcement on `DATABASE_URL`; case-sensitive email uniqueness | Address with the next auth work or a later migration (unique index on `lower(email)`) |

## Review coverage
- Backend Code Reviewer: ran, approved.
- Backend Security Agent: ran (always), approved.
- Backend Tester: ran, 49/49 passing, build passes, no real database.
- Frontend reviewers (code, security, UX): not applicable, no frontend work.

## Approved risks
| Risk | Human decision | What was implemented |
| --- | --- | --- |
| R1 Database (drop and recreate `users`) | Resolved | Non-destructive `CREATE TABLE IF NOT EXISTS` (D1). The drop was not implemented. |
| R2 Security (CORS any origin) | Safer alternative | Restrictive `CORS_ORIGIN` default; `*` only when explicit and `NODE_ENV !== "production"` (D2). |
| R3 Security (new auth logic) | Approved | bcrypt verification, HS256 JWT, generic 401, no default secret, fail-fast startup. |
| R4 Security / Major functionality (brute force) | Safer alternative | Rate limiting on the login route (D3). |
| R5 Database (DB access, credentials) | Approved | `DATABASE_URL` from the environment only. The migration is applied by the human, and agents never connected to a database. |
| R6 Security / Database (seed) | Resolved | No seed. A user must be inserted manually. |
| R7 Dependencies | Approved | `pg`, `bcryptjs`, `jsonwebtoken`, `express-rate-limit` (plus `@types`). |

## Follow-ups
- Run `npm audit fix` for the `body-parser` advisory (M1).
- Configure `trust proxy` for the Cloud Foundry deployment and re-check the rate-limit keying (M2).
- Harden the CORS guard against an unset `NODE_ENV` (M3), validate `JWT_EXPIRES_IN` and add a `JWT_SECRET` strength check at startup.
- Cover the low findings above and the untested rate-limit window parsing.
- Frontend login page, token storage, `jwt.verify` middleware, a lower-case unique index on `email`: separate tasks.
- Push the branch and open the PR (`docs/runs/manual-backend-login-endpoint/pr-backend.md` has the PR text). Nothing is pushed yet.
