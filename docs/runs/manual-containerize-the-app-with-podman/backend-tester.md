# Backend test report - manual-containerize-the-app-with-podman

Verdict: pass

## Re-run (round 2: `server.ts` pool timeouts + SIGTERM/SIGINT shutdown)
- `npm run build`: success (exit 0). `npm test`: 74 tests, 18 suites, 72 pass, 0 fail, 2 skipped (exit 0).
- Gap found and filled: graceful shutdown had no test. Added 2 tests to `Backend/tests/server.test.ts` (`shuts down gracefully with exit 0 on SIGTERM` / `on SIGINT`): spawn `src/server.ts` with a dummy `DATABASE_URL`, wait for `hello world`, send the signal, expect exit code 0 within 10 s. No DB connection is made (the pool never opens a connection).
- Caveat: both tests are skipped on Windows (child `kill(signal)` is a hard terminate there), so they were NOT executed in this run; they run on Linux/macOS/CI only. Run them in a Linux environment to confirm.
- Not testable without a database: `connectionTimeoutMillis` / `query_timeout` of 5000 ms on `pg.Pool` (config only), the forced exit 1 after 5 s, and `pool.end()` draining live connections.
- Existing 72 tests unchanged and green.

## Results (round 1)
- `npm run build` (Backend): success (exit 0).
- `npm test` (Backend): 72 tests, 18 suites, 72 pass, 0 fail, 0 cancelled, 0 skipped. Builder baseline was 62; 10 tests added here.
- `npm run test:coverage`: script does not exist; no coverage figure.
- No database connection, no real credentials. Probes are in-memory fakes; the `server.ts` DB_SCHEMA test uses a dummy `DATABASE_URL` and exits before any connection.
- Production code and existing tests not edited.

## Tests added
New file `Backend/tests/health.extra.test.ts` (10 tests):
- health is public with a bogus `Authorization` header (200)
- not rate limited: 30 rapid requests all 200
- probe that throws synchronously -> 503, fixed body, no detail
- recovery: 503 then 200 with no sticky state
- success body has exactly `success` and `payload.status`
- `POST /api/health` -> 404
- unknown route still 404, `/api/auth/login` still mounted (400 on empty body)
- `parseDbSchema` rejects whitespace, `../x`, `a/b`, quotes, backtick, non-ASCII, tab, NUL, `a--b;`
- `parseDbSchema` accepts other safe identifiers (`a`, `A_b-9`, `_x`, `-`)
- rejection message does not echo the value

Existing builder tests (`Backend/tests/health.schema.test.ts`, 13 tests) reviewed and kept.

## Coverage matrix
| Spec item | Test(s) | Status |
| --- | --- | --- |
| FR11 / AC3 health 200 `{success, payload:{status:ok}}`, `SELECT 1` only | health.schema: "returns 200 ... when SELECT 1 succeeds"; extra: "exactly the keys" | pass |
| FR11 503 when probe rejects, fixed body, no detail in body or log | health.schema: "returns 503 with a fixed body when the probe rejects, leaking nothing"; extra: sync throw | pass |
| FR11 503 on timeout (< 2 s with injected 50 ms) | health.schema: "returns 503 when the probe does not answer within the timeout" | pass |
| FR12 503 when no probe | health.schema: "returns 503 when createApp() gets no DB probe" | pass |
| FR11 public, no auth, no rate limit | health.schema: "needs no authentication"; extra: bogus Authorization, 30 rapid requests | pass |
| FR12 login unchanged / routes intact | existing `auth.test.ts`, `login.acceptance.test.ts`, `app.test.ts` (unchanged, green); extra: login mounted, unknown 404 | pass |
| FR13 schema default `public`, accepts `public` and `ico-env` | health.schema: "defaults to public", "accepts public and ico-env" | pass |
| FR13 rejects unsafe values | health.schema: "rejects unsafe values"; extra: whitespace/path/quote/non-ASCII | pass |
| FR13 startup exit 1 on invalid schema, value not echoed | health.schema: "makes server.ts exit 1 on an invalid DB_SCHEMA without echoing it" | pass |
| FR13 / AC6 users query per schema (`public.users` default, `"ico-env".users`) | health.schema: "login query schema" (4 tests) | pass |
| FR14 / AC7 full suite green, no DB | `npm test` | pass |

## Not covered (out of backend-test scope)
- AC1, AC2, AC4, AC5, AC8-AC13 (compose, images, nginx, init SQL execution, ports): container tester.
- Real timeout against `pg.Pool` and `SELECT 1` against Postgres: needs a database; not run.
- Observation, not a defect: a timed-out probe query keeps running in the background (documented by the builder; harmless for `SELECT 1`).
- Observation: the "no secret in logs" check only captures `console.error`; `console.log`/`warn` are not captured.

## Failing tests
None.
