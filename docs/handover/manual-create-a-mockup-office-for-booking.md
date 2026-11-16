# Handover: manual-create-a-mockup-office-for-booking - Mockup office for booking

Task: `docs/tasks/manual-create-a-mockup-office-for-booking.md` | Spec: `docs/specs/manual-create-a-mockup-office-for-booking.md` | Source: manual | Area: frontend + backend (incl. database)
Branch: `dev` (current), not yet committed. PR text: `docs/runs/manual-create-a-mockup-office-for-booking/pr.md`.

## What was implemented
### Frontend
- Floor plan (`DeskPlanComponent`, in `BookingModule`) on `/` beside the calendar: 12 desks, 4 x 3 grid, from `GET /api/desks`; side by side wide, stacked narrow.
- Signed out: neutral disabled desks and a log-in hint. Signed in: states `available`, `booked` (with booker display name), `selected`, `yours`; availability reloads on date change.
- Label + icon + text state, accessible names, legend, `aria-disabled`, `aria-pressed`.
- `Book Now` posts `{ date, desk }`; message when no desk; 409 message plus reload; `Withdraw booking` frees the desk.
- `DeskService`, `booking.models.ts`; `BookingService.book(date, desk)`, `listMine()` returns `{ date, desk | null }`.

### Backend
- `GET /api/desks` (public), `GET /api/desks/availability?date=` (Bearer; `booked`, `bookedBy` = full name only).
- `POST /api/bookings` requires `desk` (400 invalid, 409 taken); `GET /api/bookings/mine` returns `{ date, desk }`.
- New desk routes, controller, service and repository.

### Database
- `desks` table with 12 seed rows; `bookings.booking_desk` nullable FK; partial unique index `ux_bookings_date_desk`. Idempotent, no drops or backfill.
- Local `Backend/db/migrations/005_ico_env_desks.sql` (applied to the local container); Cloud Foundry `Backend/migrations/004_create_desks_and_booking_desk.sql` (human applies after `pg_dump`).

## Tools and technologies
Angular 18 (NgModules, plain CSS, Jasmine/Karma), Express 5 + TypeScript, `node:test`, PostgreSQL, Podman.

## Dependencies added
None.

## Files changed (18 modified, 29 new including docs)
- Backend src: `app.ts`, `server.ts`, `controllers/bookingController.ts`, `services/bookingService.ts`, `repositories/bookingRepository.ts`; new `routes/deskRoutes.ts`, `controllers/deskController.ts`, `services/deskService.ts`, `repositories/deskRepository.ts`.
- Backend tests: adapted `bookingRepository`, `bookingService`, `bookings.api`; new `deskRepository`, `desks.api`, `desksMigrations`.
- Migrations: `Backend/db/migrations/005_ico_env_desks.sql`, `Backend/migrations/004_create_desks_and_booking_desk.sql`.
- Frontend (`features/booking/`): `booking.component.{ts,html,css}`, `booking.module.ts`, `booking.service.ts`, adapted specs; new `booking.models.ts`, `desk.service.ts`, `desk.service.spec.ts`, `booking.component.desks.spec.ts`, `desk-plan/*`.
- Docs: `docs/context/{backend,frontend,project}.md`, task, spec, `docs/runs/manual-create-a-mockup-office-for-booking/`, this handover.
- Excluded: `db-backups/202611161106_005_ico_env_desks.sql` (git-ignored backup).

## Acceptance criteria
| AC | Status | Evidence |
| --- | --- | --- |
| AC1 plan, 12 desks, 4 x 3, responsive, signed-out neutral | Verified | tdd-frontend specs (layout measured in headless Chrome at 1100/320 px), tdd-backend `desks.api`; no manual browser check |
| AC2 availability with booker name, reload on date | Verified | `booking.component.desks.spec`, `desk.service.spec` |
| AC3 text/icon state, accessible names, legend | Verified | `desk-plan` specs; ux review |
| AC4 book with `{ date, desk }`, yours, withdraw | Verified | `booking.component.desks.spec` |
| AC5 booked not selectable, 409 handling | Verified | `desk-plan` and `booking.component.desks.spec` |
| AC6 desks and availability endpoints | Verified | `desks.api`, `deskRepository` tests; security review |
| AC7 desk required, 409, token user id, legacy null | Verified | `bookings.api`, `bookingService`, `bookingRepository` tests |
| AC8 existing behaviour unchanged | Verified | Existing tests/specs pass (adapted only for `desk`) |
| AC9 migrations idempotent, no destructive SQL | Verified | `desksMigrations.test.ts` (static), code and security review; not executed on a real DB beyond the local apply |
| AC10 tests and builds pass | Verified | Backend 287 pass / 2 skipped, build ok; Frontend 191/191, build ok |

Result: 10/10 verified; E2E skipped (no runner).

## Open findings
Medium (5): date race in `toggleBooking()` success handlers and in selection reset/409 handling (code); 12 px desk text wraps names at 320 px (ux); no rate limit on `/api/desks` and `/api/bookings` (security); local FK `NOT VALID` and manual Cloud Foundry apply (security).
Low (9): constraint names string-coupled to migrations; duplicated `DESK_PATTERN`; `deskService` imports error from `bookingService`; no loading indicator; "selected" duplicated with `aria-pressed`; free desks selectable when date already booked; `h2` without `h1`; no `Cache-Control: no-store` on availability; deleted-user token 401 (noted only). Details in `pr.md`.

## Follow-ups
- Fix the date race; raise desk font size; rate-limit and `no-store` the desk routes; `VALIDATE CONSTRAINT` after an orphan check.
- Add an E2E runner and a real-DB check of index, FK mapping and migrations; browser check at 320 px.
- Apply `004` to Cloud Foundry (human, after `pg_dump`); apply `005` to other existing local volumes.
