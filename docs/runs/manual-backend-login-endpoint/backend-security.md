# Backend security review - manual-backend-login-endpoint

Verdict: approved

Scope: `Backend/src/**` (app, server, auth route/controller/service/repository, rate limit, error handler), `Backend/migrations/001_create_users.sql`, `.env.example`, `.gitignore`, `package.json`, `npm audit --omit=dev`, `npm outdated`. No code edited, no database contacted.

## Findings count
| Severity | Count |
| --- | --- |
| blocker | 0 |
| high | 0 |
| medium | 3 |
| low | 7 |

## Findings

### Medium
- **M1 - Dependency: `body-parser` 2.0.0-2.3.0 (via `express`), npm severity high.** Advisory GHSA-27r3-jxmh-p828: DoS via trailing bytes after a compressed request body. Reported as medium per rule (only critical is a blocker). Reachable through `express.json()` in `Backend/src/app.ts` (line 24). Fix: `npm audit fix` (bumps `body-parser`/`express` transitively) in a follow-up.
- **M2 - Rate limit keyed by `req.ip` without `trust proxy`** (`Backend/src/middleware/loginRateLimit.ts`, `Backend/src/app.ts`). Behind Cloud Foundry all clients share the proxy IP: 10 failed logins from anyone lock out every user for 15 min (availability). The opposite mistake (too permissive `trust proxy`) allows `X-Forwarded-For` spoofing to bypass the limit. Known and accepted as Q12; must be configured (exact hop count) when the deployment is defined. No per-account throttle/lockout and in-memory store (per process, resets on restart, not shared across instances).
- **M3 - CORS `*` guard fails open when `NODE_ENV` is unset or differently cased** (`Backend/src/app.ts` lines 20-23). The guard only throws on the exact string `production`; a deployment without `NODE_ENV` (or `Production`) would accept `CORS_ORIGIN=*`. Impact is reduced: tokens are sent in the `Authorization` header (no cookies, no credentials mode), and `*` requires an explicit opt-in. Suggested fix: compare case-insensitively and/or allow `*` only when `NODE_ENV` is explicitly `development`/`test`.

### Low
- **L1 - No `JWT_SECRET` strength check** (`Backend/src/server.ts` line 7, `Backend/src/services/authService.ts` line 21). Only non-empty is enforced; a short or whitespace-only secret is accepted, enabling offline brute force of HS256 tokens. Suggested fix: require a minimum length (e.g. 32 chars) at startup.
- **L2 - No upper bound on `email`/`password` length** (`Backend/src/controllers/authController.ts` lines 17-26). Body limit is the Express default (100 kb) so the impact is small; bcrypt only uses the first 72 bytes. Suggested fix: reject strings above a sane limit (e.g. email 254, password 128) before the DB/bcrypt work.
- **L3 - Timing equalisation is approximate** (`Backend/src/services/authService.ts` lines 26-30, 40-44). The dummy hash uses cost 10; real stored hashes with another cost factor produce a measurable difference, and the first unknown-email request pays the extra dummy-hash computation. Enumeration via timing is hard but not impossible. Suggested fix: derive the dummy hash cost from the cost of a real hash, or precompute it at startup with the same cost used for user hashes (and document that hashes must use it).
- **L4 - Invalid `JWT_EXPIRES_IN` is only detected at login time** (`Backend/src/services/authService.ts` lines 46-48). A bad value makes `jwt.sign` throw, so every login returns 500 (no leak, but silent outage). Suggested fix: validate at startup like `JWT_SECRET`.
- **L5 - Body-parser errors other than invalid JSON become 500** (`Backend/src/middleware/errorHandler.ts`). e.g. `413 entity.too.large` or unsupported charset/encoding return 500 and are logged as unhandled errors. No leak; correctness/log noise. Suggested fix: honour `err.status` for 4xx body-parser errors with a generic message.
- **L6 - No `helmet` / `X-Powered-By` header enabled** (`Backend/src/app.ts`). Express discloses its framework. Already listed as a known gap; suggested fix: `app.disable("x-powered-by")` or add helmet.
- **L7 - JWT/DB hardening notes for follow-up work.** (a) `jwt.verify` is not implemented yet; when added it must pin `algorithms: ["HS256"]`. Tokens carry no `iss`/`aud`. (b) `DATABASE_URL` does not enforce TLS; ensure `sslmode` is set for any non-tunnel connection. (c) `email` uniqueness is case-sensitive while lookup lower-cases; users inserted with mixed case cannot log in (functional, not exploitable); consider a unique index on `lower(email)` in a later migration.

## Checked and OK
- **Passwords/bcrypt:** `bcryptjs` compare with a stored hash; unknown user compares against a dummy hash; same `401 Invalid credentials` for both; hash never returned, logged, or included in the response (`authService.ts`, `userRepository.ts`).
- **JWT:** HS256 set explicitly on sign; claims `id`, `email`, `type`; expiry always set (default `8h`); secret read only from `process.env.JWT_SECRET`, no hard-coded fallback; login throws before any DB lookup if it is missing; `server.ts` exits 1 when `JWT_SECRET` or `DATABASE_URL` is missing.
- **SQL injection:** single parameterised query (`WHERE email = $1`); no string concatenation; migration has no `DROP`/`TRUNCATE`/seed and creates only the table with a `CHECK` on `type`.
- **Input validation:** type and emptiness checks for `email` and `password` before any DB call; non-object bodies handled; non-string values (e.g. objects for NoSQL-style injection) rejected with 400.
- **CORS (R2):** default `http://localhost:4200`; `*` only with `NODE_ENV !== "production"` (production throws); no `credentials: true` anywhere (see M3 for the residual gap).
- **Rate limiting (R4):** applied to the login route only, before the controller, so limited requests make no DB call; 10 failed / 15 min / IP; `skipSuccessfulRequests`; 429 generic message; standard headers; invalid env values fall back to defaults (see M2).
- **Error leakage:** 500 returns a generic message; logs contain `err.message` only (no body, password, hash). `pg` pool errors are logged by message only. Malformed JSON gives a generic 400. 400 validation messages do not reveal account existence.
- **Secrets/config:** `.env` and `.env.*` ignored (root and `Backend/.gitignore`), only `.env.example` is tracked and has no values; tests use dummy secrets and a dummy `DATABASE_URL` (`user:pass@127.0.0.1:1`), no real credentials found in `src` or `tests`.
- **Other:** no `child_process` in application code (only in `tests/server.test.ts` to spawn the test server); no personal data logged.

## Dependencies
`npm audit --omit=dev`: 1 high (`body-parser`, see M1), 0 critical -> not a blocker.

`npm outdated`: `@types/node` 22.20.5 (latest 26.6.6), `dotenv` 16.6.1 (latest 18.0.9), `typescript` 5.9.3 (latest 7.0.2); all dev/tooling or major-version lag with no known advisory. Newly added packages (`pg`, `bcryptjs`, `jsonwebtoken`, `express-rate-limit`, `@types/*`) are current.

## Notes
- Nobody can log in until a user is inserted manually (no seed); the human must create bcrypt hashes outside the repo and store emails in lower case.
- No findings require changes before merge; M1-M3 are recommended follow-ups.
