# Backend build report - manual-containerize-the-app-with-podman

Verdict: done

## Acceptance criteria -> implementation
| Criterion | How |
| --- | --- |
| FR11 / AC3 health | `GET /api/health` via `healthRoutes` -> `healthController` -> `healthService` (2000 ms `Promise.race` timeout) -> `healthRepository` (`SELECT 1` on the injected `Queryable`). Public, no rate limit. |
| FR12 | `createApp({ dbProbe?, healthTimeoutMs? })`; no probe -> `unconfiguredHealthRepository` -> 503. `server.ts` passes the `pg.Pool` as `dbProbe`. Login unchanged. |
| FR13 / AC6 | `DB_SCHEMA` (default `public`) validated by `parseDbSchema` in `src/config/dbSchema.ts` (`^[A-Za-z0-9_-]+$`); `server.ts` exits 1 on invalid (message does not echo the value). `createUserRepository(db, schema)` re-validates and builds the query once. |
| FR14 / AC7 | `tests/health.schema.test.ts` (13 tests, no DB). |
| Context | `docs/context/backend.md` updated. `containers.md` and `project.md` not touched. |
| Review improvements (round 2) | `server.ts`: Pool `connectionTimeoutMillis`/`query_timeout` 5000 ms; SIGTERM/SIGINT handler (`server.close`, `closeIdleConnections`, `pool.end`, exit 0; forced exit 1 after 5 s). No behaviour change otherwise. |

## API contract
| Method, path | Auth | Request | Responses |
| --- | --- | --- | --- |
| `GET /api/health` | none | none | 200 `{ "success": true, "payload": { "status": "ok" } }`; 503 `{ "success": false, "message": "Database unavailable" }` (DB error, timeout, or no probe) |

No error detail in bodies; the only log line is the fixed `Health check failed: database unavailable` (driver messages can contain hosts/addresses, so even `err.message` is not logged).

## Decisions / assumptions
- For `DB_SCHEMA=public` the query stays textually `public.users` (unquoted), because the existing acceptance test asserts `FROM public\.users WHERE email = \$1` and must pass unchanged. Any other schema is double-quoted (`"ico-env".users`). `public` is equivalent either way; the schema is validated before interpolation.
- Empty `DB_SCHEMA` is treated as unset (`public`), so a compose-supplied empty value does not break startup.
- A timed-out probe query is not cancelled (it completes in the background); acceptable for `SELECT 1`.

## Files created/changed
Created: `Backend/src/config/dbSchema.ts`, `Backend/src/repositories/healthRepository.ts`, `Backend/src/services/healthService.ts`, `Backend/src/controllers/healthController.ts`, `Backend/src/routes/healthRoutes.ts`, `Backend/tests/health.schema.test.ts`.
Changed: `Backend/src/app.ts`, `Backend/src/server.ts` (also round 2), `Backend/src/repositories/userRepository.ts`, `Backend/.env.example` (documents `DB_SCHEMA`), `docs/context/backend.md`.
Not touched: `Backend/db/migrations/*`, existing tests, container files, `.env`, `containers.md`, `project.md`.

## Dependencies
None added.

## Commands and results
- `npm run build` (Backend): success.
- `npm test` (Backend): 72 tests, 72 pass, 0 fail (round 2 run; no test files changed).
- No database connection was made.

## Known gaps
- Login rate limit / `trust proxy` behind nginx unchanged (R6), documented in `backend.md`.
- `Backend/dist` was rebuilt by `npm run build` (ignored build output).
