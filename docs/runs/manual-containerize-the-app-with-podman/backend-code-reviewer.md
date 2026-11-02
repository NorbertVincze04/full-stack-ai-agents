# Backend code review - manual-containerize-the-app-with-podman

Verdict: approved

Findings: blocker 0, high 0, medium 0, low 7.

Round 2 re-review. Both medium findings of round 1 (M1 pool timeouts, M2 graceful shutdown) are resolved.

## Scope reviewed
Spec FR11-FR14 (backend part of FR13/AC6/AC7) and init SQL FR8/FR9. Files: `Backend/src/{app,server}.ts`, `config/dbSchema.ts`, `routes|controllers|services|repositories/health*`, `repositories/userRepository.ts`, `Backend/tests/server.test.ts` (changed since round 1), `health.schema.test.ts` and `health.extra.test.ts` (unchanged per tester report), `Backend/Containerfile` (CMD only, for signal handling), `Backend/db/migrations/001..003_ico_env_*.sql` (unchanged, `database-builder.md`).

## Build and tests
- `npm run build` (Backend): success, exit 0.
- `npm test` (Backend): 74 tests, 72 pass, 0 fail, 2 skipped (exit 0). The 2 skipped are the new SIGTERM/SIGINT tests, skipped on Windows by design (see N2).

## Acceptance criteria (backend scope)
| Item | Result |
| --- | --- |
| FR11 `GET /api/health`: `SELECT 1`, 2000 ms timeout, 200/503 fixed bodies, no detail in body or log, public, no rate limit | met |
| FR12 injectable probe, 503 without probe, `server.ts` passes the Pool, login unchanged | met |
| FR13 `DB_SCHEMA` default `public`, validated `^[A-Za-z0-9_-]+$` at startup, quoted identifier, default query unchanged | met |
| FR14 / AC7 tests without a DB (200, 503 reject, 503 timeout, no leak, schema accept/reject, existing tests green) | met |
| AC6 `"ico-env".users` in the container, `public` elsewhere | met (query-level tests; no DB run) |
| FR8/FR9 init SQL: idempotent, no DROP/TRUNCATE/DELETE, columns match the spec and `public.users`, `UNIQUE (booking_date, booking_desk)`, versions recorded | met |

## Round 1 findings - status
| Id | Status |
| --- | --- |
| M1 pool without timeouts | Resolved: `server.ts:21-24` sets `connectionTimeoutMillis: 5000` and `query_timeout: 5000`. A hung DB now frees pool clients and queued requests fail within about 5 s. Residual: N3. |
| M2 no graceful shutdown | Resolved: `server.ts:33-42` handles `SIGTERM`/`SIGINT` (`server.close`, `closeIdleConnections`, `pool.end`, exit 0; forced exit 1 after 5 s). `Backend/Containerfile` runs `node src/server.ts` directly (no `npm start` wrapper), so Node is PID 1 and receives the signal. |
| L1-L5 | Still open, see below (L3/L4 tests unchanged). |

## Findings

### Low

**L1. `Queryable` is owned by `userRepository.ts` but used by `healthRepository.ts` and `app.ts`**
- Files: `Backend/src/repositories/userRepository.ts:15`, `healthRepository.ts:1`, `app.ts:12`.
- Problem: health depends on the user repository module for a shared DB type. Works, but couples unrelated repositories.
- Fix: move `Queryable` into a small shared module (for example `src/repositories/db.ts`) and re-export or update imports and tests.

**L2. Pool error handler logs `err.message`, unlike the health path**
- File: `Backend/src/server.ts:25-27`.
- Problem: driver messages can contain host/address text. FR11 only requires this for health, so it is not a violation, but it is inconsistent with the rationale in `healthController.ts`.
- Fix: optional; log a fixed message or keep as is and note it.

**L3. Test duplication and one weak test**
- Files: `Backend/tests/health.schema.test.ts:15-22,31-41,53-57`, `health.extra.test.ts:26-33`.
- Problem: the server-start helper is copied in both files. "needs no authentication" sends no Authorization header, so it only repeats the 200 case; the bogus-header test in `health.extra.test.ts` is the real check.
- Fix: share one helper, drop or strengthen the weak test.

**L4. "No secret in logs" check captures only `console.error`**
- File: `Backend/tests/health.schema.test.ts:26-30`.
- Problem: a future `console.log`/`console.warn` of error detail would not be caught (already noted by the tester).
- Fix: also stub `console.warn`/`console.log` in the leak test.

**L5. Schema pattern is permissive for identifiers**
- File: `Backend/src/config/dbSchema.ts:3`.
- Problem: accepts values like `-`, `pg_catalog`, `information_schema`. Injection is not possible (quoted, validated twice, tests cover it), and the spec fixed the pattern, so this is informational.
- Fix: none required; optionally require a leading letter or underscore.

**N1. Shutdown handler is not idempotent and masks `pool.end()` errors**
- File: `Backend/src/server.ts:33-42`.
- Problem: a second signal (for example `SIGINT` after `SIGTERM`) re-runs `shutdown()`: another 5 s timer and a second `pool.end()`, which rejects ("Called end on pool more than once") and is swallowed by `.finally(() => process.exit(0))`. A rejected `pool.end()` also exits 0.
- Fix: guard with a `shuttingDown` flag; use `pool.end().then(() => process.exit(0), () => process.exit(1))`.

**N2. Graceful-shutdown tests do not run on Windows**
- File: `Backend/tests/server.test.ts:94-120`.
- Problem: skipped on `win32` (child `kill(signal)` is a hard terminate), so exit 0 on `SIGTERM`/`SIGINT` is unverified in this environment. The test logic reads correct: handlers are registered synchronously after `listen()`, before the `hello world` callback fires; the pool opens no connection, so `pool.end()` resolves at once. The forced-exit path (exit 1 after 5 s) and `pool.end()` draining live connections are untested (need a DB or a held connection).
- Fix: confirm on Linux/CI or in the container tester (`podman stop` should return well before the stop timeout).

**N3. Pool timeouts are client-side only**
- File: `Backend/src/server.ts:21-24`.
- Problem: `query_timeout` stops waiting but does not cancel the server-side statement (no `statement_timeout`). With the health route public, a stalled DB can still occupy up to `max` (10) pool clients for up to 5 s each, and `/api/auth/login` queues behind them. Bounded, not a blocker for a local container.
- Fix: optional `statement_timeout: 5000` in the Pool config and/or a `query_timeout` closer to the 2 s health timeout.

## Layering, validation, error handling
- Layering routes -> controller -> service -> repository is respected; the controller does no SQL, the repository does no HTTP.
- Async errors: `repository.ping()` runs inside an `async` method and `Promise.race` handles both branches, so a late rejection after a timeout does not become an unhandled rejection; `clearTimeout` is in `finally`. The controller never throws.
- Status codes and response shape follow `{ success, payload?, message? }`; the 404 for non-GET methods is covered by a test.
- SQL: parameterised values; schema validated in `parseDbSchema`, re-validated in `createUserRepository`, query built once at construction. `public` kept unquoted so the existing acceptance regex stays valid.
- `server.ts` exits 1 on invalid `DB_SCHEMA` without echoing the value; empty `DB_SCHEMA` falls back to `public`, which suits compose interpolation.

## Migrations (`database.md` is `database-builder.md`)
- Queries in the report match the code: `SELECT id, email, password_hash, type FROM "ico-env".users WHERE email = $1`.
- Each file is transactional with its `schema_migrations` row; names sort 001 < 002 < 003 for the postgres entrypoint; all objects are schema-qualified.
- `users` mirrors `public.users` exactly. `bookings` follows D2. No FK from `bookings.user_name` to `users` by design (spec D2); not a defect.
