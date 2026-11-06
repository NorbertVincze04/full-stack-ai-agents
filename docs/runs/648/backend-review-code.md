# Backend code review - task 648 (booking_calendar)

Verdict: approved

Inputs: spec `docs/specs/648.md`, `backend-build.md` (build OK), `backend-tests.md` (216 pass, 0 fail, 2 skipped), `database.md`, Conventions in `docs/context/backend.md`.
Reviewed: `middleware/authenticate.ts`, `repositories/bookingRepository.ts`, `services/bookingDates.ts`, `services/bookingService.ts`, `controllers/bookingController.ts`, `routes/bookingRoutes.ts`, `app.ts`, `server.ts`, `migrations/002_create_bookings.sql`, `db/migrations/004_ico_env_bookings_user_id.sql`.

## Findings
Blocker: 0 | High: 0 | Medium: 2 | Low: 4

### Medium
- M1 `app.ts:46-47` (+ `controllers/bookingController.ts`): `express.json()` runs before `authenticate`, so a malformed JSON body on `POST /api/bookings` returns 400 before the 401 check (FR10 expects 401 for a missing token). Fix: mount `authenticate` before body parsing on `/api/bookings`, or add a parse-error handler that defers to auth.
- M2 `services/bookingDates.ts:21,27`: window and "today" use the server-local date (`getFullYear/getDate`); the result depends on the process TZ (container default is UTC, a dev machine may differ). Documented risk, but unpinned. Fix: pin `TZ` in the container or derive the date explicitly in one configured zone; add a test for a non-UTC `TZ` if kept local.

### Low
- L1 `middleware/authenticate.ts:17-19`: `JWT_SECRET` is read and checked on every request, and a missing secret throws into a 500. `server.ts` already fails fast, so move the lookup out of the handler (read once in `createAuthenticate`).
- L2 `controllers/bookingController.ts:21-23` duplicates `unauthorized` from `middleware/authenticate.ts:12-14`. Fix: share one helper or constant for the 401 body.
- L3 `controllers/bookingController.ts` casts `res.locals.user as AuthenticatedUser` three times; a small `getUser(res)` helper or typed `res.locals` would remove the casts and guard an injected middleware that sets nothing.
- L4 `docs/context/backend.md` Tests section still says "120 pass"; the suite now has 216 pass (`backend-tests.md`). Update the count.

## Checks (no issue)
- Acceptance: FR2/FR9 (4-weekday window, server date, 400), FR10 (token only, uuid `id`, HS256 only), FR11 (`DELETE ... WHERE booking_date AND user_id`, 404), FR12 (23505 -> 409), FR14 (23503 -> 401), FR8 (`/mine`, own rows) all implemented and tested.
- Layering routes -> controller -> service -> repository is clean; repository is injectable; app/server wiring matches `userRepository` pattern, including schema-aware table via `parseDbSchema`.
- SQL is parameterised; table name comes only from the validated schema; `to_char` avoids the pg Date time-zone shift; no e-mail stored.
- Race on double booking is handled by the DB unique constraint, not a check-then-insert.
- Response shape and status codes match the spec table; unexpected errors reach `errorHandler`.
- Route order is safe (`GET /mine` vs `DELETE /:date` differ by method).
- `public` migration is create-only; `004` is idempotent, transactional, registered in `schema_migrations`, drops only the unused unique, constraint/index names match the repository and the spec; `003` untouched.
- `DELETE /:date` validates format only (no window re-check); acceptable, as it lets a user withdraw any own date and the spec only requires 400/404.
- Real SQL is verified only against fakes (noted in the tests report); needs a manual smoke test after the migrations are applied.
