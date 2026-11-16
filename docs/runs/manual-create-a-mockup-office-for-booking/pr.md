# PR: manual-create-a-mockup-office-for-booking - Mockup office for booking

Task: `docs/tasks/manual-create-a-mockup-office-for-booking.md` | Spec: `docs/specs/manual-create-a-mockup-office-for-booking.md` | Source: manual | Area: frontend + backend (incl. database)
Base branch: `dev` (current branch; integration branch from `.github/config.json`).

## Summary
### Frontend
- Booking page `/` gains an office floor plan (`DeskPlanComponent`, declared in `BookingModule`): 12 desks in a 4 x 3 grid beside the calendar (stacked on narrow viewports), loaded from `GET /api/desks`.
- Signed out: neutral, disabled desks plus a log-in hint. Signed in: availability per selected date (`available`, `booked` with booker display name, `selected`, `yours`), reloaded on date change and login.
- State is conveyed by label, icon and text besides colour; accessible names ("Desk D03, available"); legend of the four states; `disabled` + `aria-disabled` on booked desks; `aria-pressed` on the selected desk.
- `Book Now` sends `POST /api/bookings { date, desk }`; without a desk it shows a message and sends nothing; 409 shows a message and refreshes availability. `Withdraw booking` frees the desk.
- New `DeskService`, `booking.models.ts`; `BookingService.book(date, desk)` and `listMine()` returns `{ date, desk | null }`.

### Backend
- `GET /api/desks` (public): `id, label, row, col` only.
- `GET /api/desks/availability?date=` (Bearer JWT): every desk with `booked` and `bookedBy` (`users.full_name` only); 400 for invalid or out-of-window date, 401 without a valid token.
- `POST /api/bookings` requires `desk` (400 missing, malformed or unknown; 409 `Desk already booked`); `GET /api/bookings/mine` returns `{ date, desk }` (`desk: null` for legacy bookings). User id still only from the token.
- New layers: `deskRoutes`, `deskController`, `deskService`, `deskRepository`; wired in `app.ts` and `server.ts`.

### Database
- New `desks` table (`id` PK `D01`..`D12`, `label`, `grid_row`, `grid_col`, unique position) with an insert-only, idempotent seed of 12 rows.
- `bookings.booking_desk` (nullable) with FK to `desks(id)` and partial unique index `ux_bookings_date_desk (booking_date, booking_desk) WHERE booking_desk IS NOT NULL`. No backfill, no drops.

## Acceptance criteria
- [x] AC1: plan with 12 desks in a 4 x 3 grid, side by side / stacked, signed-out without states (specs measure layout in headless Chrome at 1100 px and 320 px; no manual browser check)
- [x] AC2: availability with booker display name, reload on date change
- [x] AC3: label + icon/text state, accessible names, legend
- [x] AC4: `POST { date, desk }`, "yours", `Withdraw booking`, no request without desk
- [x] AC5: booked desks not selectable; 409 message and refresh
- [x] AC6: backend desks and availability endpoints (public layout, token for availability, no ids or e-mails)
- [x] AC7: desk required (400), taken desk 409, user id from token, legacy bookings `desk: null` and occupy no desk
- [x] AC8: existing behaviour unchanged (existing specs and tests pass, adapted only for `desk`)
- [x] AC9: migrations idempotent, no drop/update/delete, insert-only seed (static review and `desksMigrations.test.ts`; applied only to the local container)
- [x] AC10: new specs/tests cover AC1-AC7; builds and tests pass

## Test results
- TDD backend: `npm test` 289 tests, 287 pass, 0 fail, 2 skipped (existing Windows-only skips); `npm run build` passes.
- TDD frontend: `npm run test:ci` 191 of 191 pass (145 before, 46 added); `npm run build` passes.
- E2E: skipped (no Playwright/Cypress runner; adding one is a dependency change outside this spec). Journeys listed in `e2e.md` as follow-up.
- Not covered anywhere: real database (unique index, FK mapping, concurrent double booking, executed migrations) and the container stack.

## Review coverage
| Scope | Result |
| --- | --- |
| code | Run: approved (0 blocker, 0 high, 2 medium, 3 low) |
| ux | Run (`ui-changes: yes`): approved (0 blocker, 0 high, 1 medium, 4 low) |
| security | Run (`security-relevant: yes`): approved (0 blocker, 0 high, 2 medium, 2 low) |
| containers | Skipped: no container change |
| pipelines | Skipped: no workflow change |

## Approved risks and human decisions
- R1 (existing booking flow becomes desk-aware), R2 (API contract change, two new endpoints), R3 (new table, FK and unique index on `bookings`) and R4 (booker display name shown to logged-in users): approved as described by the human; no safer alternative applied.
- Decisions: mockup = working page; one floor, 12 desks, 4 x 3; fully live `desks` table; plan visible to all, availability and booking need login; desk required for new bookings, legacy bookings stay valid.

## Migrations to apply
- Local container (`"ico-env"`): `Backend/db/migrations/005_ico_env_desks.sql`. Already applied to the running `db` container after a `pg_dump` (git-ignored `db-backups/`); fresh volumes apply it automatically; other existing volumes need it by hand. FK is `NOT VALID`.
- Cloud Foundry (`public`): `Backend/migrations/004_create_desks_and_booking_desk.sql`. Human applies it after a `pg_dump`; not applied by agents. Rollback SQL is in the file headers.

## How to start and verify
1. `cd Backend; npm test; npm run build` (expect 287 pass, 2 skipped).
2. `cd Frontend; npm run test:ci; npm run build` (expect 191 of 191).
3. Start the stack (`podman compose up -d`) or `npm start` in `Frontend/` with the backend running; open `/`.
4. Signed out: 12 neutral desks and the log-in hint; `Book Now` shows `You must log in first`.
5. Register/login, pick a date: desks show available/booked; select a free desk, `Book Now`: desk shows "yours", button reads `Withdraw booking`; withdraw frees it.
6. With a second user, the first user's desk shows as booked with the name and cannot be selected.
7. Check at 320 px and a wide viewport: no horizontal scroll, plan beside/below the calendar.

## Repository settings
None required (no pipeline change).

## Open findings (carried into the PR)
Medium:
- code: `booking.component.ts` `toggleBooking()` patches `availability` of the currently selected date, not the request date (date change while busy shows the desk on the wrong date).
- code: same race for `selectedDesk = null` and 409 handling (reload and message refer to different dates). Fix both with a `this.selected !== date` check.
- ux: `.desk` font size 0.75rem; booker names wrap per character at 320 px. Raise to at least 0.875rem, `overflow-wrap: break-word`, `title`; verify in a browser.
- security: no rate limit on `/api/desks` and `/api/bookings` (`express-rate-limit` already present).
- security: local FK is `NOT VALID`; run `VALIDATE CONSTRAINT` after checking for orphan rows; Cloud Foundry migration applied by a human after `pg_dump`.

Low:
- code: constraint names string-coupled to migrations, only tested against a fake store.
- code: `DESK_PATTERN` duplicates the desk id format.
- code: `deskService` imports `InvalidBookingDateError` from `bookingService` (cross-service coupling).
- ux: no loading indicator while availability loads.
- ux: "selected" in the accessible name duplicates `aria-pressed`.
- ux: free desks stay selectable when the date is already booked (no effect on the button).
- ux: `h2` in the plan without a preceding `h1` on `/`.
- security: no `Cache-Control: private, no-store` on the availability route.
- security: deleted-user token gives 401 via FK mapping (existing behaviour, noted only).

## Follow-ups
- E2E runner and journeys (`e2e.md`); a real-database check of unique index, FK mapping and migrations.
- Browser visual check at 320 px and wide viewport.
- No ESLint configured in `Frontend/`.
