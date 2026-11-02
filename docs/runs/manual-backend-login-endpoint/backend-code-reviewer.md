# Backend code review - manual-backend-login-endpoint

Verdict: approved

## Scope and checks
Reviewed: `Backend/src/**` (app, server, routes, controller, service, repository, middleware), `Backend/migrations/001_create_users.sql`, `Backend/tests/*.ts` (`auth.test.ts`, `login.acceptance.test.ts`, `server.test.ts`), `Backend/package.json`, `Backend/.env.example`, `docs/context/backend.md`, against `docs/specs/manual-backend-login-endpoint.md` and the builder, database and tester reports.

Read-only checks run: `git status`, `npm run build` (ok), `npm test` (49 pass, 0 fail). No database contacted, no code edited. `.env` and `.env.*` (except `.env.example`) are git-ignored.

## Spec conformance
| Item | Result |
| --- | --- |
| FR1-FR3, AC3 | Met. Controller validates before the service; 400 shape per Q3; repository not called. Email trimmed and lower-cased in the service. |
| FR4, AC2 | Met. Same `InvalidCredentialsError` -> identical 401 for unknown email and wrong password; dummy-hash compare for unknown users. |
| FR5-FR7, AC1, AC4 | Met. HS256 set explicitly, claims `id`/`email`/`type`, `JWT_EXPIRES_IN` fallback `8h`, no default secret, secret checked before the DB lookup. Payload is only `{ token }`. |
| FR8 | Met. Error handler returns the generic 500 and logs the message only. |
| FR9, FR10 | Met. `server.ts` exits 1 on missing `JWT_SECRET`/`DATABASE_URL`; Pool built from `DATABASE_URL` and injected into the repository. |
| FR11, AC6 | Met. `CREATE TABLE IF NOT EXISTS`, columns and CHECK as specified, no `DROP`, no seed. Query matches `database.md` (`$1`, selected columns). |
| FR12, AC7 | Met. Default `http://localhost:4200`; `*` honoured outside production; `createApp()` throws with `*` in production; no `credentials`. |
| FR13 | Met. Dependencies caret-pinned, `@types` added for `pg` and `jsonwebtoken`. |
| FR16, AC11 | Met. Limiter only on the login route, before the controller; 10 / 15 min, `skipSuccessfulRequests`, 429 body, standard headers, `legacyHeaders: false`; options injectable; invalid env falls back to defaults. |
| FR15, AC10 | Met. `.env.example` and `docs/context/backend.md` updated, `npm test` script added, `ico-env` documented as the database name. |
| AC8, AC9 | Met. Build and tests pass; no DB or network use beyond loopback. |

Layering is respected (routes -> controller -> service -> repository). The repository is injected through a `Queryable`/`UserRepository` interface, which keeps the code testable without a DB. Code follows the existing conventions (`.ts` import extensions, no enums or parameter properties, response shape).

## Findings

Count: blocker 0, high 0, medium 1, low 6.

### Medium
1. **`Backend/src/services/authService.ts` (`expiresIn` block), `Backend/src/server.ts`** - an invalid `JWT_EXPIRES_IN` (for example `8 hours`, `abc`) is cast to `SignOptions["expiresIn"]` and is only rejected by `jwt.sign` at request time. Every login with correct credentials then returns 500, and the cause shows only in the log. The spec's fail-fast approach (FR9) is applied to `JWT_SECRET` and `DATABASE_URL` but not to this setting. Fix: validate `JWT_EXPIRES_IN` at startup in `server.ts` (try a `jwt.sign` with a dummy payload, or check against a simple pattern) and exit with a clear message, or fall back to `8h` with a warning, as is done for the rate-limit variables.

### Low
2. **`Backend/src/middleware/errorHandler.ts`** - only `entity.parse.failed` is mapped. A body larger than the `express.json()` limit (`entity.too.large`, 413) or an unsupported charset or encoding (`err.status` 4xx) falls through to a 500 and is logged as an unhandled error. Fix: for `err.status` in 400-499 that comes from body-parser, respond with that status and a generic message in the standard shape.
3. **`Backend/src/services/authService.ts` (`getDummyHash`)** - the dummy hash is built lazily on the first unknown-email request, so that one request pays an extra hash and is slower. The dummy uses cost 10, but the cost of real stored hashes is not fixed, so timing parity is approximate. It is acceptable under FR4, but the dummy could be created once at `createAuthService()` time, with the cost documented to match the one used to create user hashes.
4. **`Backend/src/middleware/loginRateLimit.ts`** - `skipSuccessfulRequests: true` counts every non-2xx response, including 500s caused by a DB outage or by the missing secret. A DB outage can therefore lock users out of the endpoint. Fix: use `requestWasSuccessful` to skip 5xx too, or document that it is intended. With no `trust proxy` (Q12, already documented) `express-rate-limit` also logs a validation warning when `X-Forwarded-For` is present; this should be addressed with the deployment configuration.
5. **`Backend/src/controllers/authController.ts`** - there is no maximum length for `email` or `password`. The body-parser default limit of 100 kb bounds the cost, and bcryptjs only uses the first 72 bytes, so the risk is small. A sensible cap (for example email <= 254 characters) would be a cheap guard against abuse.
6. **`Backend/src/server.ts`** - no `listen` error handling or graceful shutdown (`pool.end()` on `SIGTERM`). The port-conflict behaviour is already listed in `backend.md` as a known gap; the pool shutdown is not.
7. **Docs and tests housekeeping** - the Structure and Tests tables in `docs/context/backend.md` do not list `tests/login.acceptance.test.ts`. Parsing of `LOGIN_RATE_LIMIT_WINDOW_MS` and window expiry have no test (already stated in `backend-tester.md`). The builder report cites 19 tests and the tester report 49, which is consistent (19 existing plus 30 new); no action needed except the missing table row.

## Notes (no action)
- `npm audit` high advisory on transitive `body-parser` (via `express`) is reported by the builder and left out of scope; it should be handled in a follow-up (`npm audit fix`).
- Case-sensitive uniqueness of `email` means hand-inserted users must have a lower-case email; this is documented in `database.md` and `backend.md`.
- The migration includes no rollback by design (D1/R1); the human applies it.
