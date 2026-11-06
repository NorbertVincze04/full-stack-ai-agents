# 648: booking_calendar (backend)

Azure work item: https://dev.azure.com/CljP-LOM1-Automation/41ef1050-2f6b-4935-9e1a-15b8c70fe8c4/_workitems/edit/648

## Summary
Adds JWT-protected booking endpoints so a logged-in user can book, list and withdraw desk dates. Dates are validated on the server (4 weekdays starting today, or the next weekday if today is a weekend). Bookings are keyed by the user id from the token; no e-mail is stored. Adds the JWT-verifying middleware, bookings repository/service/controller/routes, and migrations for `public.bookings` and `"ico-env".bookings`.

## Acceptance criteria (backend part)
- [x] AC1: logged-in user can book a bookable date; stored for that user (`POST /api/bookings`).
- [x] AC5: withdraw removes only the caller's booking for that date; other dates/users untouched.
- [x] AC6: date rules and JWT enforced server-side; keyed by user id, no e-mail stored; no cross-user read/delete; two users may book the same date, one user cannot book a date twice.
- [x] AC7 (backend): `GET /api/bookings/mine` returns own bookings so state survives reload.
- [x] AC8 (backend): tests cover FR2, FR8-FR12, FR14.
- [x] AC9 (backend): migrations added (not run); `docs/context/backend.md` and `project.md` updated.
- Frontend criteria (AC2, AC3, AC4) are covered by the frontend PR (`pr-frontend.md`, if present).

## API contract
| Method, path | Auth | Request | Responses |
| --- | --- | --- | --- |
| `POST /api/bookings` | Bearer JWT | `{ date: "YYYY-MM-DD" }` | 201 `{ success, payload: { booking: { date } } }`; 400 validation; 401; 409 duplicate |
| `DELETE /api/bookings/:date` | Bearer JWT | none | 200 `{ success: true }`; 400 bad format; 401; 404 |
| `GET /api/bookings/mine` | Bearer JWT | none | 200 `{ success, payload: { bookings: [{ date }] } }`; 401 |

Unexpected errors return 500 `Internal server error` (also if the migration is not applied).

## Migrations to apply (by a human, not run by agents)
- `Backend/migrations/002_create_bookings.sql` - Cloud Foundry `ico-env` (schema `public`), after `001_create_users.sql`. Create-only.
- `Backend/db/migrations/004_ico_env_bookings_user_id.sql` - local container schema `"ico-env"`; idempotent, transactional, registered in `schema_migrations`. Adds `user_id`, makes `booking_desk`/`user_name` nullable, drops the unused `(booking_date, booking_desk)` unique, adds `(booking_date, user_id)` unique. No column dropped, no data deleted. Empty volumes apply it automatically; existing volumes need:
  `podman exec -i <db-container> psql -U <POSTGRES_USER> -d <POSTGRES_DB> -v ON_ERROR_STOP=1 < Backend/db/migrations/004_ico_env_bookings_user_id.sql`
- Back up before applying on a volume with data. Until applied, booking calls return 500.

## Test results
- `npm run build` (Backend): OK.
- `npm test` (Backend): 218 tests, 216 pass, 0 fail, 2 skipped (POSIX signals on Windows, pre-existing). 96 new tests (dates, service, authenticate, repository, HTTP API).
- Real SQL (`to_char`, constraints, `RETURNING`) is verified only against fakes.

## Open review / security findings
Code review: approved (0 blocker, 0 high, 2 medium, 4 low). Security: approved (0 blocker, 0 high, 2 medium, 4 low).
- Medium: malformed JSON body on `POST /api/bookings` returns 400 before the 401 check (`express.json()` runs before `authenticate`).
- Medium: date window uses the server-local date; depends on process `TZ` (unpinned).
- Medium: no rate limit on `/api/bookings`.
- Medium (dependency): `body-parser` 2.0.0-2.3.0 via `express`, GHSA-27r3-jxmh-p828 (npm `high`); not introduced by this task, fix in a dependency task.
- Low: `JWT_SECRET` read on every request; duplicated 401 helper and repeated casts in the controller; DELETE does not check the date window; stateless token keeps access after user deletion until expiry; no minimum `JWT_SECRET` length; minor outdated packages.
- Low: `docs/context/backend.md` Tests section still says "120 pass" (now 216 pass).

## How to verify
1. Apply the migration for the target DB (see above).
2. In `Backend/`: `npm run build`, `npm test`.
3. With the stack running, log in to get a token, then:
   - `POST /api/bookings` with `{ "date": "<bookable date>" }` -> 201; again -> 409; weekend/past/out-of-window -> 400; no token -> 401.
   - `GET /api/bookings/mine` -> contains the date.
   - `DELETE /api/bookings/<date>` -> 200; again -> 404.
