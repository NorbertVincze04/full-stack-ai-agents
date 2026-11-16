# Review: code - manual-create-a-mockup-office-for-booking

Verdict: approved (0 blocker, 0 high, 2 medium, 3 low).

Inputs: spec, implement-backend/frontend, tdd-backend (289 tests pass, build ok), tdd-frontend (191 specs pass), implement-frontend (build ok). e2e.md: skipped (no runner). Changed files from `git status`.

## Acceptance criteria
AC1-AC9 are implemented and covered by tests per the TDD reports. AC9 (migrations) checked by reading the SQL: idempotent, insert-only seed, no DROP/UPDATE/DELETE, partial unique index, FK. AC10 build and tests pass.

## Findings
- medium - `Frontend/.../booking.component.ts` `toggleBooking()` success handlers: `markDesk()` patches `this.availability`, which belongs to the currently selected date, not the date of the request. The calendar (`select()`) stays active while `busy`, so a date change during a book/withdraw request shows the desk as booked/free on the wrong date until the next reload. Fix: ignore the local patch when `this.selected !== date`, or reload availability instead.
- medium - `Frontend/.../booking.component.ts`: same race for `selectedDesk = null` and 409 handling (`loadAvailability()` reloads the new date, message refers to the old one). Fix with the same date check.
- low - `Backend/src/services/bookingService.ts`: constraint names (`ux_bookings_date_desk`, `bookings_booking_desk_fkey`) are string-coupled to the migrations; only tested against a fake store (tdd-backend note). Fix: one integration check against the local container, or a shared constant plus a comment in the migrations.
- low - `Backend/src/controllers/bookingController.ts`: `DESK_PATTERN` (`^[A-Za-z0-9_-]{1,10}$`) duplicates the desk id format; unknown ids rely on the FK for the 400. Acceptable, no change needed unless more desks formats appear.
- low - `Backend/src/services/deskService.ts` imports `InvalidBookingDateError` from `bookingService.ts` (cross-service coupling). Fix: move the error to `bookingDates.ts` or a shared errors file.

## Checked, no issue
- Layering routes -> controllers -> services -> repositories; `{ success, payload, message, errors }` shape; Express 5 forwards async rejections to `errorHandler`.
- All SQL parameterised; schema names pass `parseDbSchema`; user id only from the token.
- Unique and FK violations mapped by `code` + `constraint`; other violations keep the old behaviour.
- Migrations: local `005` uses `NOT VALID` FK (no table scan), registers in `schema_migrations`; Cloud Foundry `004` adds the column; both idempotent with rollback in the header.
- Frontend: subscriptions use `takeUntilDestroyed`; availability request cancelled on date change; logout on 401; booker names bound by interpolation; `DeskPlanComponent` declared in `BookingModule`.

## Follow-ups
- e2e journeys skipped (no runner); a real-DB check of the unique index and FK mapping is not covered anywhere.
- No ESLint configured in `Frontend/` (lint result not available).
