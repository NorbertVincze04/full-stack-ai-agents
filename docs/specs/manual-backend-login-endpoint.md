---
id: manual-backend-login-endpoint
title: Backend login endpoint
area: backend
status: specified
---

# Spec manual-backend-login-endpoint - Backend login endpoint

## Summary
Add `POST /api/auth/login` to the Express backend. It validates `email` and `password`, looks the user up in the PostgreSQL table `public.users` of the database `ico-env`, compares the password with the stored bcrypt hash and returns a JWT (HS256) signed with `JWT_SECRET`. The task also asks to create the `users` table (delivered as a non-destructive migration, see D1) and to allow CORS from any origin; on the human's risk-gate decision (R2) this is delivered as a guarded opt-in, not as an open default (D2). Login is rate limited (R4, D3).

## Deviations from the task text
- **D1 - No drop of the users table.** The task says "Recreate the users table (drop it first if it already exists)". On the human's decision (Q2) the migration is non-destructive: `CREATE TABLE IF NOT EXISTS`, no `DROP`. Consequence: if a `public.users` table already exists with a different structure, the migration does not change it and the human must reconcile it manually. The destructive variant is kept only as a documented, **not applied** alternative (see "Not-applied alternative").
- **D2 - CORS is not open by default.** The task says "Allow CORS from any origin". On the human's risk-gate decision (R2, safer alternative) the restrictive `CORS_ORIGIN` default (`http://localhost:4200`) is kept; `*` is only honoured when explicitly set via `CORS_ORIGIN=*` (e.g. in a local, git-ignored `.env`) and `NODE_ENV` is not `production`. This supersedes Q5(c).
- **D3 - Rate limiting added.** The task does not mention it. On the human's risk-gate decision (R4, safer alternative) `POST /api/auth/login` is rate limited in this task (FR16).

## Decisions (from human answers)
| Id | Decision |
| --- | --- |
| Q1 | `ico-env` is the **database name**; the table is `public.users` (no `"ico-env"` schema qualification). Connection: single `DATABASE_URL` (e.g. `postgresql://user:pass@host:port/ico-env`), chosen because it is one secret and works directly with `pg` `Pool({ connectionString })` and the Cloud Foundry tunnel. `id` is `uuid` with `DEFAULT gen_random_uuid()` (opaque, non-guessable; built in since PostgreSQL 13, `pgcrypto` needed on older versions). |
| Q2 | Non-destructive migration: `CREATE TABLE IF NOT EXISTS`, no `DROP`. Applied manually by the human; never by agents or by the app at start-up. |
| Q3 | 400 body: `{ "success": false, "message": "Validation failed", "errors": [{ "field": string, "message": string }] }`. |
| Q4 | JWT: HS256, claims `id`, `email`, `type`; expiry `8h`, configurable via `JWT_EXPIRES_IN` (default `8h` when unset). No refresh mechanism. |
| Q5 | ~~CORS: allow any origin everywhere (Q5(c)).~~ **Superseded** by the R2 risk-gate decision (safer alternative): keep `CORS_ORIGIN` with its restrictive default `http://localhost:4200`; `*` only when explicitly set (`CORS_ORIGIN=*`, local `.env`) and `NODE_ENV !== "production"`; never with credentials. See FR12. |
| Q7 | Rate limiting is **in this task** (R4 safer alternative chosen by the human), no longer a follow-up. See FR16. |
| Q6 | No seed data at all. |

## Scope
- New route `POST /api/auth/login`, wired in `createApp()` (routes -> controller -> service -> repository layering from `backend.md`).
- Request validation (400), credential check (401), token issue (200).
- Database access layer for the `users` lookup (parameterised SQL, `pg`), with the DB connection configured from `DATABASE_URL`.
- SQL migration file with `CREATE TABLE IF NOT EXISTS public.users`; delivered for the human to apply (never executed by agents or the app).
- `JWT_SECRET` read from the environment, no default; fail fast when missing (FR9).
- CORS change per the R2 decision (restrictive default kept; `*` only as guarded explicit opt-in, FR12).
- Rate limiting on `POST /api/auth/login` (FR16).
- Unit tests with no real database (repository/DB client mocked or injected).
- `.env.example` and `docs/context/backend.md` updates (new env vars, route, data, decisions).

## Out of scope
- Frontend (login page, `AuthService`, token storage, guards, header button).
- Other auth endpoints (register, logout, refresh, password reset), role-based authorization middleware, JWT verification middleware.
- Seed data and any script to create users (Q6: none).
- The `bookings` table and any other schema object.
- Account lockout, a shared/persistent rate-limit store (Redis etc.) and helmet (not requested; noted under Risks). Rate limiting itself is in scope (FR16).
- Running SQL against any real database; creating the Cloud Foundry tunnel.

## Area
**backend** - API, auth logic and database only; no UI change is needed.

## Scope flags
- `ui-changes`: no - no visible UI, templates, styles or routes.
- `logic-changes`: yes - new login/validation/token logic and DB access layer.
- `security-relevant`: yes - authentication, password hashing, JWT secret, user input, CORS, SQL, DB credentials.
- `dependencies-changed`: yes - `pg`, `bcryptjs`, `jsonwebtoken`, `express-rate-limit` (plus `@types` where needed).
- `database-changes`: yes - new `public.users` table (migration delivered, not executed).
- `scaffolding-only`: no - behaviour is added.

## Current state
- `Backend/src/app.ts`: `createApp()` with `cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:4200" })` and `express.json()`; no routes (all 404).
- `Backend/src/server.ts`: loads `dotenv`, reads `PORT`, listens.
- `Backend/package.json`: dependencies `cors`, `dotenv`, `express`; no `pg`, no bcrypt, no JWT library; no `npm test` script (tests run with `node --test "tests/**/*.test.ts"`).
- Conventions: ESM with `.ts` import extensions, `erasableSyntaxOnly` (no enums/parameter properties), parameterised SQL only, response shape `{ success, payload?, message?, errors? }`, `node:test` tests without DB or network.
- `project.md`: database not started; reachable only through a Cloud Foundry tunnel. Its mention of a planned schema `"ico-env"` is superseded by Q1: `ico-env` is the database name, the table lives in `public`; `docs/context/backend.md` must say so.
- The existing CORS default is restricted to one origin. The task asks to open it to any origin; the human chose to keep the restrictive default and allow `*` only as a guarded opt-in (D2).

## Functional requirements
- FR1. `POST /api/auth/login` accepts JSON `{ email, password }`.
- FR2. Validation: `email` and `password` must be present, non-empty strings. If either is missing/empty/not a string, respond `400` with `{ success: false, message: "Validation failed", errors: [{ field, message }] }` (one item per invalid field; `field` is `email` or `password`). No database call is made.
- FR3. Lookup: find the user by `email` with a parameterised query on `public.users`. Email is normalised (trim + lower-case) before lookup (Q9 default).
- FR4. Credential check: `bcrypt` compare of `password` with `password_hash`. Unknown email and wrong password return the same response (no user enumeration): `401` `{ success: false, message: "Invalid credentials" }` (exact text proposed; no email-vs-password distinction). To limit timing differences, compare against a dummy hash when the user does not exist.
- FR5. Success: `200` `{ success: true, payload: { token } }`. The payload contains only `token` (never `password_hash` or any user record field).
- FR6. JWT: algorithm HS256 (set explicitly), signed with `JWT_SECRET`; claims `id` (user uuid), `email`, `type`; expiry from `JWT_EXPIRES_IN` (default `8h`).
- FR7. `JWT_SECRET`: read from `process.env.JWT_SECRET` with no hard-coded default or fallback. The token service refuses to sign (throws) when it is missing or empty.
- FR8. Unexpected errors (DB unreachable, etc.) return `500` `{ success: false, message: "Internal server error" }` without leaking internals; the error is logged server-side without the password or hash.
- FR9. Missing `JWT_SECRET`: fail fast at startup in `server.ts` (clear error, non-zero exit), in addition to FR7.
- FR10. DB connection: `pg` `Pool` created from `DATABASE_URL`, injected into the repository so tests can substitute a fake. No credentials in code or in the repo. A missing `DATABASE_URL` is reported at startup like FR9.
- FR11. Migration SQL (human-applied, `docs/risk-gate.md` rule 5): `CREATE TABLE IF NOT EXISTS public.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name varchar NOT NULL, email varchar UNIQUE NOT NULL, password_hash varchar NOT NULL, type varchar NOT NULL CHECK (type IN ('admin','user')), created_at timestamptz NOT NULL DEFAULT now())`. No `DROP`, no seed `INSERT`. File: `Backend/migrations/001_create_users.sql`; it states that it does not alter an existing `users` table.
- FR12. CORS (R2 safer alternative, approved): the origin is `process.env.CORS_ORIGIN ?? "http://localhost:4200"` (restrictive default unchanged). If the value is `*`, it is honoured (`origin: "*"`) only when `NODE_ENV !== "production"`; with `NODE_ENV === "production"` and `CORS_ORIGIN=*`, `createApp()` throws (fail fast, no silent fallback). `*` is never the default and is never combined with `credentials: true`. `.env.example` documents `CORS_ORIGIN` (default value, and that `*` is for local `.env` only). Interpretation of the human's wording ("only when explicitly set in a local .env or when NODE_ENV is not production"): both conditions are required, since the app cannot tell a local `.env` from a deployed environment; see Q11.
- FR13. Dependencies (R7 approved): add `pg`, `bcryptjs`, `jsonwebtoken` and `express-rate-limit` (maintained, supports Express 5), with `@types` where the package ships none, caret-pinned like existing ones. `npm audit` is reviewed.
- FR14. Tests (`node:test`, no DB, no network): see AC8 and AC11.
- FR16. Rate limiting (R4 safer alternative, approved): `express-rate-limit` applied only to `POST /api/auth/login`, before the controller (so a limited request makes no DB call). Defaults: **10 requests per 15 minutes per client IP**, `skipSuccessfulRequests: true` (only 4xx/5xx responses count, so legitimate logins do not exhaust the budget). Overridable via optional env `LOGIN_RATE_LIMIT_MAX` and `LOGIN_RATE_LIMIT_WINDOW_MS` (invalid values fall back to the defaults); `createApp()` also accepts the limiter options so tests can use a small `max` without waiting. When exceeded: `429` with `{ success: false, message: "Too many login attempts, please try again later" }`, a `Retry-After` header and standard `RateLimit-*` headers (`standardHeaders: true`, `legacyHeaders: false`). In-memory store (per process; resets on restart). Behind a reverse proxy (Cloud Foundry) `req.ip` is the proxy unless Express `trust proxy` is configured; see Risks and Q12.
- FR15. Docs: update `Backend/.env.example` (`JWT_SECRET`, `JWT_EXPIRES_IN`, `DATABASE_URL`, `CORS_ORIGIN`, `LOGIN_RATE_LIMIT_MAX`, `LOGIN_RATE_LIMIT_WINDOW_MS`, no real values) and `docs/context/backend.md` (route, env, data, decisions, `ico-env` = database name); add an `npm test` script (`node --test "tests/**/*.test.ts"`, Q10 default).

## Not-applied alternative (documented only)
Destructive variant from the original task text: `DROP TABLE IF EXISTS public.users;` followed by the `CREATE TABLE` above. Impact: irreversibly deletes all users and anything referencing them. It is **not** part of this spec, is not delivered as a migration and must not be implemented. If the human later wants it, it needs a new approval, local/dev only, with a prior `pg_dump` of the table.

## API / data changes
New endpoint:

| Item | Value |
| --- | --- |
| Route | `POST /api/auth/login` |
| Request | `{ "email": string, "password": string }` |
| 200 | `{ "success": true, "payload": { "token": string } }` |
| 400 | `{ "success": false, "message": "Validation failed", "errors": [{ "field": string, "message": string }] }` |
| 401 | `{ "success": false, "message": "Invalid credentials" }` |
| 429 | `{ "success": false, "message": "Too many login attempts, please try again later" }` (plus `Retry-After` header) |
| 500 | `{ "success": false, "message": "Internal server error" }` |

Data: table `public.users` (database `ico-env`)

| Column | Type | Constraint |
| --- | --- | --- |
| `id` | uuid | primary key, default `gen_random_uuid()` |
| `full_name` | text / varchar | not null |
| `email` | varchar | unique, not null |
| `password_hash` | varchar (bcrypt, 60 chars) | not null |
| `type` | varchar | check in `('admin','user')`, not null |
| `created_at` | timestamptz | not null, default `now()` |

New environment variables: `JWT_SECRET` (required), `DATABASE_URL` (required), `JWT_EXPIRES_IN` (optional, default `8h`), `LOGIN_RATE_LIMIT_MAX` (optional, default `10`), `LOGIN_RATE_LIMIT_WINDOW_MS` (optional, default `900000`). Existing `CORS_ORIGIN` keeps its default; `*` is a guarded opt-in (FR12).

## UI behaviour
None.

## Acceptance criteria
- [ ] AC1: Valid email and password returns `200` with `{ success: true, payload: { token } }`; the token verifies with `JWT_SECRET`, uses HS256, carries claims `id`, `email`, `type` and expires after `JWT_EXPIRES_IN` (default `8h`).
- [ ] AC2: Wrong password or unknown email returns `401` with `{ success: false, message }` (same message for both; no hash or user data in the body).
- [ ] AC3: Missing, empty or non-string `email` or `password` returns `400` with `{ success: false, message, errors: [{ field, message }] }` and no DB call is made.
- [ ] AC4: `JWT_SECRET` is read from the environment with no hard-coded default; when it is missing the app does not issue tokens (FR7/FR9) and a test proves it.
- [ ] AC5: The users lookup uses a parameterised query; no string concatenation of user input; `password_hash` is never returned or logged.
- [ ] AC6: `Backend/migrations/001_create_users.sql` creates `public.users` with `CREATE TABLE IF NOT EXISTS` (columns above, `email` unique, `type` limited to `admin`/`user`), contains no `DROP` and no seed, and is not executed by any agent or by the application. Deviation D1 is recorded in the spec and the handover.
- [ ] AC7: CORS follows the approved R2 safer alternative (FR12): with `CORS_ORIGIN` unset the allowed origin is still `http://localhost:4200`; an explicit `CORS_ORIGIN` value is honoured; `CORS_ORIGIN=*` yields `Access-Control-Allow-Origin: *` only when `NODE_ENV !== "production"`; `CORS_ORIGIN=*` with `NODE_ENV=production` makes `createApp()` throw; no `Access-Control-Allow-Credentials` is ever sent. Covered by tests in `tests/app.test.ts` (existing default/override tests kept, new `*` cases added, `process.env` restored after each test) and documented in `.env.example`.
- [ ] AC8: Unit tests cover, without a real database: 200 success (token verified), 401 wrong password, 401 unknown email, 400 missing email, 400 missing password, 400 non-string/empty values, 500 on repository failure, missing `JWT_SECRET`, and that the repository is not called on 400.
- [ ] AC9: `npm run build` succeeds and `node --test "tests/**/*.test.ts"` passes in `Backend/`; existing tests still pass (the CORS default/override tests stay valid; `*` cases are added).
- [ ] AC10: `Backend/.env.example` documents `JWT_SECRET`, `JWT_EXPIRES_IN`, `DATABASE_URL`, `CORS_ORIGIN`, `LOGIN_RATE_LIMIT_MAX` and `LOGIN_RATE_LIMIT_WINDOW_MS` without real values; `docs/context/backend.md` is updated (route, env vars, data, CORS and rate-limit decisions, `ico-env` = database name).
- [ ] AC11: `POST /api/auth/login` is rate limited with `express-rate-limit` (FR16): after the configured `max` counted attempts from the same IP within the window, the next request returns `429` with `{ success: false, message }`, a `Retry-After` header, and no repository/DB call; successful logins are not counted; other routes are not limited. Covered by unit tests (small `max` injected, fake repository, no real DB, no sleeping on the real window).

## Risks
- Brute force: mitigated by rate limiting (R4, FR16); there is still no account lockout, and the in-memory store is per process and resets on restart.
- Rate limiting is keyed by `req.ip`; behind a reverse proxy without `trust proxy` all clients share one bucket (a few failed logins could block everyone), and with a wrongly permissive `trust proxy` the header can be spoofed. Proxy configuration is not part of this task (Q12).
- User enumeration and timing differences between unknown email and wrong password (mitigated by FR4).
- A weak or leaked `JWT_SECRET` allows token forgery; secret comes only from the environment and is never committed.
- Express 5 handles async handler rejections, but errors must still be mapped to the `500` shape without internals.
- With no seed (Q6), nobody can log in until the human inserts a user by hand (bcrypt hash generated outside the repo); end-to-end flow cannot be verified manually before that.
- `CREATE TABLE IF NOT EXISTS` leaves a pre-existing, differently structured `public.users` untouched; the code assumes the columns above.
- `gen_random_uuid()` requires PostgreSQL 13+ (or `pgcrypto`); the DB version is unknown.
- The Cloud Foundry tunnel is the only DB access path; local development and tests must not depend on it (tests use fakes).
- No tags were provided on the task.

## Risk gate
All items carry the human decision. Nothing is pending.

- R1 (Database) - **Resolved / not applicable.** The destructive `DROP TABLE` was replaced by `CREATE TABLE IF NOT EXISTS` (Q2, deviation D1). The drop remains only as a documented, not-applied alternative.
- R2 (Security) - **Decision: SAFER ALTERNATIVE chosen.** The task's "CORS from any origin" is not implemented as an open default. Keep `CORS_ORIGIN` with its restrictive default (`http://localhost:4200`); allow `*` only when explicitly set (`CORS_ORIGIN=*` in a local `.env`) and `NODE_ENV !== "production"`; never combine `*` with `credentials: true` (FR12, AC7). Supersedes Q5(c). Original impact avoided: any website calling the API from a browser, and the open setting reaching a non-local deployment unchanged.
- R3 (Security) - **Decision: APPROVED as described.** New authentication logic: bcrypt password verification, JWT issuance (HS256, `id`/`email`/`type`, 8h) and secret handling. Impact: errors compromise every account (forged tokens, wrong comparisons, leaked hashes). Mitigations kept: generic 401, no default secret, fail-fast startup, explicit HS256, security review (`security-relevant` flag).
- R4 (Security / Major functionality) - **Decision: SAFER ALTERNATIVE chosen.** Rate limiting on `POST /api/auth/login` is added in this task with `express-rate-limit`: 10 counted attempts per 15 minutes per IP, `429` with `{ success: false, message }` (FR16, AC11). Residual: no lockout, in-memory per-process store, proxy/`trust proxy` caveat (Risks, Q12).
- R5 (Database) - **Decision: APPROVED as described.** Database access and credential handling (`DATABASE_URL`, Cloud Foundry tunnel). Impact: accidental data loss or credential leakage. Conditions kept: agents never connect to a real DB; the migration is human-applied; `DATABASE_URL` only in a git-ignored `.env`.
- R6 (Security / Database) - **Resolved / not applicable.** No seed data (Q6), so no default or privileged credential is created.
- R7 (Dependencies) - **Decision: APPROVED as described, including the rate-limiting dependency.** New runtime dependencies: `pg`, `bcryptjs`, `jsonwebtoken`, `express-rate-limit` (plus `@types`). Impact: supply-chain risk; native-build risk avoided by pure-JS `bcryptjs`. Caret-pinned, `npm audit` reviewed.

## Open Questions
Blocking: none.

Non-blocking (defaults applied unless the human says otherwise):
- Q8 - Library preference (resolved by R7 approval: `bcryptjs` + `jsonwebtoken` + `express-rate-limit`).
- Q11 - R2 wording "explicitly set in a local .env **or** when NODE_ENV is not production" is implemented as both conditions required (`CORS_ORIGIN=*` set explicitly AND `NODE_ENV !== "production"`); production with `*` throws at startup (default: as stated).
- Q12 - Rate limit keyed by `req.ip` with no `trust proxy` configuration in this task (default: yes; to be set when the Cloud Foundry deployment is defined).
- Q9 - Email normalised to lower case on lookup (default: yes).
- Q10 - Add `npm test` script in this task (default: yes).
