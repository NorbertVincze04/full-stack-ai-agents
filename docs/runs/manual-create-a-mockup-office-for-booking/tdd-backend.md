# TDD report: backend - manual-create-a-mockup-office-for-booking

Verdict: pass (`npm test`: 289 tests, 287 pass, 0 fail, 2 skipped; the 2 skips are the existing Windows-only skips). `npm run build`: passes.

## Tests added or adapted
| File | Change |
| --- | --- |
| `Backend/tests/bookingRepository.test.ts` | Adapted: `create(user, date, desk)` (INSERT with `booking_desk`, desk bound as `$3`), `listByUser` returns `{ date, desk }`; new: legacy `desk: null`, only `date` and `desk` exposed |
| `Backend/tests/bookingService.test.ts` | Adapted: `book(user, date, desk)`, `listMine` objects; new: pg 23505 on `ux_bookings_date_desk` -> `DeskAlreadyBookedError`, 23505 otherwise -> `BookingAlreadyExistsError`, 23503 on `bookings_booking_desk_fkey` -> `UnknownDeskError`, 23503 otherwise -> `UnknownUserError` |
| `Backend/tests/bookings.api.test.ts` | Adapted: fake store behaves like the DB (FK user and desk, unique `(date,user)`, partial unique `(date,desk)`); all bodies carry `desk`; `mine` returns `{ date, desk }`; new: 9 invalid-desk cases (400, `field: desk`), 409 `Desk already booked`, same desk other date, other desk same date, desk freed after withdraw, legacy booking occupies no desk, withdraw of a legacy booking, user id from body ignored |
| `Backend/tests/desks.api.test.ts` (new) | `GET /api/desks` public (12 desks, 4 x 3, only `id,label,row,col`, no booking/user data); `GET /api/desks/availability` (booked/`bookedBy`, no ids or e-mails, 5 kinds of 401, 10 kinds of 400, 500 generic) |
| `Backend/tests/deskRepository.test.ts` (new) | desk repository mapping and parameterised SQL (SELECT list has `full_name` only), schema quoting, invalid schema; `deskService` date window (same as booking) |
| `Backend/tests/desksMigrations.test.ts` (new) | static checks of `migrations/004_*.sql` and `db/migrations/005_*.sql`: no DROP/DELETE/UPDATE/TRUNCATE, idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`), 12 seed rows D01..D12 in a 4 x 3 grid, partial unique index, FK to `desks(id)`, inserts only into `desks`/`schema_migrations` |

## AC coverage
| AC | Tests |
| --- | --- |
| AC1 (backend part) | `desks.api`: 12 desks, rows 1-3, cols 1-4, unique positions |
| AC6 | `desks.api` (public layout, no booking/user data; availability fields, 401, 400, no id/e-mail), `deskRepository` |
| AC7 | `bookings.api` (400 missing/unknown/malformed desk, 409 desk taken, user id from token only, legacy `desk: null`, legacy occupies no desk), `bookingService`, `bookingRepository` |
| AC8 | existing booking tests adapted only for `desk` (window, weekend, one per user and date, withdraw by date, ownership, auth); rest of the suite unchanged and green |
| AC9 | `desksMigrations` (static; no database run) |
| AC10 (backend) | `npm test` and `npm run build` pass |

## Results
All green. No failing test, so no defect to report.

## Notes (not defects)
- Corrected one of my own new tests: precedence between a date-window error and a missing desk is not defined by the spec; it now asserts only 400.
- Constraint names (`ux_bookings_date_desk`, `bookings_booking_desk_fkey`) come from the implement report and migrations, not from the spec; the fake store raises them like Postgres would. The mapping is not verified against a real database (no real DB in tests).
- Not covered: concurrent double booking against a real unique index, real SQL execution of the migrations (AC9 verified statically only).
