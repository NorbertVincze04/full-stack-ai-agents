# Review: security - manual-create-a-mockup-office-for-booking

Verdict: approved (0 blocker, 0 high, 2 medium, 2 low). Risks R1-R4 are approved as described by the human; they are not re-reported as findings.

Dependencies: none changed (`dependencies-changed: no`, implement reports). `npm audit` / `npm outdated` not run: no dependency change in this task.

## R4 check (personal data)
- `GET /api/desks` (public) returns only `id, label, row, col`; no booking or user data (`deskRepository.list` selects those four columns).
- `GET /api/desks/availability` is behind `authenticate` (HS256 Bearer, claim `id` must be a UUID) and returns `id`, `booked`, `bookedBy` = `users.full_name` only; no user id or e-mail. The SQL selects `u.full_name` only.
- Frontend renders `bookedBy` by interpolation only (no `innerHTML`, no `bypassSecurityTrust*`); a spec covers HTML in a name.

## Findings
- medium - `Backend/src/app.ts` `/api/desks` and `/api/bookings`: no rate limit (only login/register have one). The public `GET /api/desks` and the availability endpoint (a DB join per call) can be hit freely; availability also allows any logged-in account to scrape names by date. Fix: a modest `express-rate-limit` on `/api/desks` (package already present), as a follow-up.
- medium - `Backend/migrations/004_create_desks_and_booking_desk.sql` / `db/migrations/005_...sql`: the local FK is `NOT VALID`, so legacy rows with an unknown `booking_desk` stay unchecked (implement-backend, known gap), and the Cloud Foundry migration must be applied by a human after `pg_dump`. Fix: run `VALIDATE CONSTRAINT` after checking for orphan rows; keep the manual apply procedure.
- low - `Backend/src/controllers/bookingController.ts`: a token for a deleted user gives 401 via FK mapping (existing behaviour, unchanged); `desk` is a type-checked string matched against `^[A-Za-z0-9_-]{1,10}$` and bound as `$3`. No issue, noted for completeness.
- low - `Backend/src/app.ts`: authenticated availability responses carry no `Cache-Control: no-store`; names of other users could be kept by a shared browser cache. Fix: set `Cache-Control: private, no-store` on the availability route.

## Checked, no issue
- SQL: all queries parameterised (`$1..$3`); schema identifiers pass `parseDbSchema` before quoting.
- Access control: user id only from the token; `DELETE` filters by `user_id`; availability needs a valid token (401 tests for 5 token cases); no IDOR path (no user ids in responses).
- Input validation: date format and bookable window checked before any query (400); desk validated by pattern and FK.
- Errors: generic 500 via `errorHandler`; 409/400 messages do not expose internals or other users; the 409 for a taken desk does not reveal the booker.
- Frontend: token only sent to `/desks/availability`, `/bookings`; `/desks` is sent without `Authorization`; no new storage, logging or URLs with personal data (date only as query param).
- CORS unchanged; no secrets, no `child_process`, no new packages.
- Migrations: no DROP/DELETE/UPDATE, insert-only seed; backup `db-backups/202611161106_005_ico_env_desks.sql` is git-ignored (`.gitignore` line 10) and not tracked.

## Follow-ups
- Real-DB verification of the unique index and FK error mapping (concurrent double booking) is not covered by tests.
