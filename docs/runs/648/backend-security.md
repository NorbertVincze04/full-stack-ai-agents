# Backend security report - task 648 (booking_calendar)

Verdict: approved

Scope: `middleware/authenticate.ts`, `routes/bookingRoutes.ts`, `controllers/bookingController.ts`, `services/bookingService.ts`, `services/bookingDates.ts`, `repositories/bookingRepository.ts`, `app.ts`, `migrations/002_create_bookings.sql`, `db/migrations/004_ico_env_bookings_user_id.sql`, config/compose. Nothing was executed against a DB.

Findings: blocker 0, high 0, medium 2, low 4.

## Findings

| # | Severity | Where | Risk | Suggested fix |
| --- | --- | --- | --- | --- |
| 1 | medium | dependency `body-parser` 2.0.0-2.3.0 (via `express`), npm `high`, GHSA-27r3-jxmh-p828 | DoS via trailing bytes after a compressed body; reachable through global `express.json()` on `POST /api/bookings` | Update the lockfile (`npm update body-parser`) in a dependency task; reported only, not blocking |
| 2 | medium | `app.ts` booking mount | No rate limit on `/api/bookings`; a valid token can spam create/delete/list (DB load, noisy 409/404) | Add a per-IP or per-user limiter like `registerRateLimit`; accepted in the spec risks |
| 3 | low | `bookingController.remove` / `bookingService.withdraw` | Window is not checked on DELETE: a user can delete own past bookings (history loss); no cross-user impact | Reject dates before server today, or accept as is |
| 4 | low | `authenticate.ts` | Stateless token: a deleted or demoted user keeps `GET /mine`/`DELETE` access (empty/404) until expiry (`8h`); only `POST` hits the FK (401) | Optional: re-check user existence for sensitive routes; keep `JWT_EXPIRES_IN` short |
| 5 | low | `server.ts`, `authService.ts` | `JWT_SECRET` only checked for presence; a short/weak secret is accepted for HS256 | Enforce a minimum length (e.g. 32 chars) at startup |
| 6 | low | `express-rate-limit` 8.7.2 (wanted 8.7.3), `dotenv` 16.6.1 (latest 18.x) | Minor outdated packages; no advisory | Bump on the next dependency task |

## Checked, no issue
- JWT middleware: Bearer only, `algorithms: ["HS256"]` (no `alg none`/HS512), secret from env with no fallback, `exp` verified by default, `id` must be a uuid string, missing secret throws (500), 401 body is generic.
- Identity: user id comes only from `res.locals.user`; body `userId`/`email` ignored; `authenticate` applied with `router.use` before all three routes.
- Ownership (IDOR): `DELETE ... WHERE booking_date = $1 AND user_id = $2`; list filters by `user_id`; another user's date returns 404 without leaking existence.
- SQL: all values are `$n` parameters; table name derives from `parseDbSchema` (`^[A-Za-z0-9_-]+$`, quoted); `:date` is format- and calendar-validated before use.
- Input validation: date type/format/real calendar date; server-side window check on create.
- Errors/logging: pg `23505`/`23503` mapped to 409/401; others reach `errorHandler` (generic 500, message-only log, no body/token logged).
- Data minimisation: only `user_id` and `booking_date` stored (no e-mail/name).
- Config: no secrets in code or `.env.example`; `.env*` ignored (`.env.example` kept); compose requires `JWT_SECRET`, `POSTGRES_*` via `:?`; CORS `*` blocked in production; no `child_process` use.
- Migrations: `002` and `004` are idempotent, FK `ON DELETE CASCADE`, unique `(booking_date, user_id)`, no data deleted; `004` runs in a transaction and drops only the unused `(booking_date, booking_desk)` unique; rollbacks are commented, not executed.

## Dependency check
`npm audit --omit=dev` (Backend/): 1 high (finding 1), no critical. `npm outdated`: `express-rate-limit`, `dotenv`, `@types/node`, `typescript` (dev/major), none newly added by task 648 (no dependencies added).
