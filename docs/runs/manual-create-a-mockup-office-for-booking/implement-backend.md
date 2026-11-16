# Implement report: backend (incl. database) - manual-create-a-mockup-office-for-booking

Verdict: done. approved-risks R1, R2, R3, R4 implemented as described (no safer alternatives).

## Acceptance criteria -> implementation
| AC | How |
| --- | --- |
| AC6 | `GET /api/desks` public, layout only; `GET /api/desks/availability` behind `authenticate`, date format and window validated (400), returns `id`, `booked`, `bookedBy` (`users.full_name` only) |
| AC7 | `POST /api/bookings` requires `desk` (400 missing/bad format/unknown via FK `bookings_booking_desk_fkey`); desk taken -> 409 `Desk already booked` (unique index `ux_bookings_date_desk`); user id only from token; `mine` returns `desk` (`null` for legacy) |
| AC9 | Idempotent migrations, no DROP/DELETE/UPDATE/backfill, insert-only seed, partial unique index, desk FK |
| AC8 | `DELETE /api/bookings/:date`, date window, weekend and one-per-user-per-date rules unchanged |

## API contract (frontend)
Errors: `{ success: false, message, errors?: [{ field, message }] }`.
| Method, path | Auth | Request | Response |
| --- | --- | --- | --- |
| `GET /api/desks` | none | - | 200 `{ success, payload: { desks: [{ id, label, row, col }] } }` (12, ordered by row, col; rows 1-3, cols 1-4) |
| `GET /api/desks/availability?date=YYYY-MM-DD` | Bearer | query `date` | 200 `{ success, payload: { desks: [{ id, booked, bookedBy? }] } }` (`bookedBy` only when booked); 400 (`errors[0].field` = `date`); 401 `Authentication required` |
| `POST /api/bookings` | Bearer | `{ date, desk }` | 201 `{ success, payload: { booking: { date, desk } } }`; 400 (`field` `date` or `desk`); 401; 409 `Booking already exists` (user has that date) or `Desk already booked` |
| `GET /api/bookings/mine` | Bearer | - | 200 `{ success, payload: { bookings: [{ date, desk }] } }` (`desk` string or `null`) |
| `DELETE /api/bookings/:date` | Bearer | - | unchanged: 200 `{ success: true }`; 400; 401; 404 |

## Database
- Schema diff: new `desks(id varchar(10) PK, label, grid_row, grid_col, UNIQUE(grid_row, grid_col))` + 12 seed rows `D01`..`D12`; `bookings.booking_desk` (nullable) FK `bookings_booking_desk_fkey` -> `desks(id)`; partial unique index `ux_bookings_date_desk (booking_date, booking_desk) WHERE booking_desk IS NOT NULL`.
- `Backend/db/migrations/005_ico_env_desks.sql` (local, `"ico-env"`; column already existed, FK `NOT VALID` so existing rows are not scanned or rewritten; registers itself in `schema_migrations`).
- `Backend/migrations/004_create_desks_and_booking_desk.sql` (Cloud Foundry `public`, adds the column; human applies after `pg_dump`; not applied by agents).
- Naming follows the numbered convention of each folder (not `<timestamp>_<task-id>`). Rollback SQL is in the file headers, not executed.
- Queries (all parameterised): desks list (no params); availability `$1` = date, `desks LEFT JOIN bookings ON desk AND date LEFT JOIN users`; insert `$1` user id, `$2` date, `$3` desk (`user_name` from `users.full_name`); delete `$1` date, `$2` user id; list `$1` user id, `$2` from-date.
- Unique/FK handling: service maps by `err.code` + `err.constraint` (`ux_bookings_date_desk`, `bookings_booking_desk_fkey`); other unique -> `Booking already exists`; other FK -> 401.
- Applied to the local `db` container only (existing volume, `004` already applied): `pg_dump` of `ico-env` to `db-backups/` (git-ignored), applied with `ON_ERROR_STOP`, re-run is a no-op. Verified: `005` row in `schema_migrations`, 12 desks, FK present (`convalidated=false` by design), index present. The container was stopped before; it is now running (`podman compose up -d db`).

## Files changed
- New: `Backend/src/{routes/deskRoutes,controllers/deskController,services/deskService,repositories/deskRepository}.ts`, `Backend/db/migrations/005_ico_env_desks.sql`, `Backend/migrations/004_create_desks_and_booking_desk.sql`.
- Edited: `Backend/src/{app,server}.ts` (desk router, `deskRepository` option), `controllers/bookingController.ts`, `services/bookingService.ts`, `repositories/bookingRepository.ts`.
- Context: `docs/context/backend.md`, `docs/context/project.md`; spec status set to `in-progress`.

## Dependencies
None.

## Commands
- `npm run build` (Backend): passes.
- `npm test` (Backend): 197 pass, 19 fail, 2 skipped. All 19 failures are existing booking tests (`bookingRepository`, `bookingService`, `bookings.api`) that call `create`/`book` without `desk` or expect `listByUser` as `string[]` / `mine` without `desk`: they encode the old contract and need the adaptation by the Tester (TDD stage). No test was edited.

## Known gaps
- No tests for desks or the desk contract yet (TDD stage).
- `public.desks` migration not applied (human, Cloud Foundry); existing volumes elsewhere need `004` and `005` by hand.
- Legacy local rows with a `booking_desk` value not in `desks` would violate the (unvalidated) FK; none checked beyond the migration succeeding.
