# Backend security report - manual-containerize-the-app-with-podman

Verdict: approved

Findings: blocker 0, high 0, medium 2, low 6

Re-review of the current state; replaces the previous report. Changes since the last review: `server.ts` now sets pool timeouts and handles SIGTERM/SIGINT; `compose.yaml` and `Backend/Containerfile` now exist and were read for the backend-relevant parts.

## Scope
Spec R3, R7, R8, FR11, FR13 plus init SQL. Read-only review of: `Backend/src/app.ts`, `server.ts`, `config/dbSchema.ts`, `repositories/{user,health}Repository.ts`, `services/healthService.ts`, `controllers/healthController.ts`, `routes/healthRoutes.ts`, `middleware/{errorHandler,loginRateLimit}.ts`, `Backend/.env.example`, root `.env.example`, `Backend/db/migrations/001..003_ico_env_*.sql`, `compose.yaml` (db and backend services), `Backend/Containerfile`. No database connection was made, no code was edited. nginx, the frontend image and port exposure (R5/R6) belong to the container review.

## Checked and OK
- **DB_SCHEMA injection (FR13/R7):** `parseDbSchema` allows only `^[A-Za-z0-9_-]+$`; `"`, `.`, `;`, whitespace and non-ASCII are rejected, so `"<schema>".users` cannot be broken out of. Validated at startup (exit 1, value not echoed) and again in `createUserRepository`. `public` stays unquoted and constant. `email` is always parameter `$1`. Dashes/digits-only names are accepted but always quoted, so this is safe.
- **SQL:** all queries are parameterised or constant (`SELECT 1`); no request data is concatenated.
- **Init SQL:** idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`), transactional, no `DROP`/`TRUNCATE`/`DELETE`/`UPDATE`, no dynamic SQL, no `COPY ... PROGRAM`, no extensions, no seed data, no credentials or hashes. `password_hash NOT NULL`, `type` CHECK, unique `email`, `UNIQUE (booking_date, booking_desk)`.
- **Health endpoint (R8/FR11):** fixed bodies (`ok` / `Database unavailable`), no driver message, host or timing detail; GET only; the 2 s race answers the client with 503 on timeout.
- **Pool timeouts (new):** `connectionTimeoutMillis` 5000 and `query_timeout` 5000 in `server.ts:23-27` bound how long a request can wait for a connection or a query; this mitigates the unbounded-wait part of the earlier finding.
- **Shutdown (new):** `server.close` then `pool.end` then exit 0; `closeIdleConnections` frees keep-alive sockets; a 5 s unref'd timer forces exit 1. No secret or value is logged; no new input surface. In-flight requests drain before exit.
- **Logging:** health logs a fixed string; `errorHandler` logs message only; no body/password/hash is logged; no `child_process`, no `eval`.
- **Secrets:** no secret in source, either `.env.example`, `compose.yaml` or SQL. `compose.yaml` uses `${VAR:?...}` for `POSTGRES_USER`, `POSTGRES_PASSWORD`, `JWT_SECRET`; `Backend/Containerfile` has no `ENV`/`ARG` secret (only proxy ARGs in the deps stage). `JWT_SECRET` has no hard-coded fallback; startup fails without it. `DATABASE_URL` is visible via `podman inspect` (accepted in R3).
- **Container hardening (backend service):** runs as `node` (non-root), `cap_drop: [ALL]`, `no-new-privileges`, `init: true`, `npm ci --omit=dev`, no published port, no runtime proxy, pinned image tag.
- **CORS:** `*` refused when `NODE_ENV=production`; no credentials.

## Findings

### Medium
1. **Login rate limiter collapses to one bucket behind nginx (account-lockout DoS)** - `Backend/src/middleware/loginRateLimit.ts`, no `trust proxy` in `Backend/src/app.ts`. Known, accepted gap (R6, `backend.md`).
   - Risk: with the backend only reachable through the nginx container, every client has the same `req.ip`; 10 failed logins from anyone lock login for everyone for 15 minutes, and per-client brute-force protection is lost.
   - Fix (separate task): forward the client IP from nginx (`X-Forwarded-For` from `$remote_addr`), set Express `trust proxy` to 1 hop, and optionally also key the limit per email.
2. **Backend connects as the database superuser (least privilege)** - `compose.yaml` backend `DATABASE_URL` (uses `POSTGRES_USER`), `Backend/db/migrations/*`.
   - Risk: `POSTGRES_USER` is the image superuser; any SQL injection or credential leak elsewhere gives full control of the instance. Init SQL creates no application role.
   - Fix: add a migration creating a role with `SELECT` on `"ico-env".users` and `SELECT/INSERT/UPDATE/DELETE` on `"ico-env".bookings` (password from `.env`, never in the SQL) and use it in `DATABASE_URL`.

### Low
3. **Health probe still shares the login pool** - `Backend/src/server.ts:30-33`, `healthService.ts`. Mitigated by the new timeouts, but a public, unlimited `/api/health` flood can still occupy up to 10 connections and delay login while queries are slow; `query_timeout` is client-side only and no server-side `statement_timeout` is set. Fix: separate small pool (`max` 1-2) or cache the probe result for about 1 s; add `statement_timeout` via the connection options.
4. **Log flooding by unauthenticated requests** - `Backend/src/controllers/healthController.ts:12`. Each failed probe logs one line; a flood while the DB is down fills container logs. Fix: log only on state change or rate-limit the line.
5. **Pool error log prints driver message** - `Backend/src/server.ts:28` (`err.message`). `pg` errors can contain internal IPs/ports (for example `ECONNREFUSED <ip>:5432`); the health path avoids this, the pool handler does not. No password is included. Fix: log a fixed text or `err.code` only.
6. **Framework fingerprinting / no hardening headers** - `Backend/src/app.ts`. `X-Powered-By: Express` is sent, no `helmet`; known gap. Fix: `app.disable("x-powered-by")`; headers via nginx or `helmet` (new package, needs approval).
7. **No minimum strength check for `JWT_SECRET`** - `Backend/src/server.ts:8-12`. Only presence is checked; a short secret passes. The compose flow generates >= 32 hex chars (FR7), but other environments are not protected. Fix: refuse secrets shorter than 32 characters at startup.
8. **Repeated signals re-run shutdown** - `Backend/src/server.ts:35-44`. A second SIGTERM/SIGINT calls `pool.end()` again (rejects, handled by `.finally`) and arms another timer; harmless, exit code is still correct. Fix (optional): guard with a `shuttingDown` flag.

## Dependencies
No package files changed (`Backend/package.json`, `package-lock.json`, `Frontend/package.json`, `package-lock.json` have no diff against `HEAD`; no npm package was added), so `npm audit` and `npm outdated` were not run (per task instruction). Pre-existing advisory recorded in `docs/context/backend.md`: high severity in transitive `body-parser` (via `express`); under the rating rule this is `medium` at most and is not counted as new here. No critical advisory is known, so nothing blocks. Base images are pinned (`node:22.18.0-alpine`, `postgres:16.9-alpine`) and come from `docker.io/library`.

## Result
No blocker or high finding; the two medium findings are reported, none blocks.
