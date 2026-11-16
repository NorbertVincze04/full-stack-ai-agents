# Implement report: frontend - manual-create-a-mockup-office-for-booking

Verdict: done. approved-risks R1, R2, R3, R4 implemented as described (desk required, names shown to logged-in users as text).

## Acceptance criteria -> implementation
| AC | How |
| --- | --- |
| AC1 | `BookingComponent` loads `GET /desks` on init and renders `DeskPlanComponent` (grid `repeat(4, minmax(0, 1fr))`, placement from `row`/`col`) in `.booking-layout` beside the calendar (flex-wrap: side by side wide, stacked narrow, `min-width: 0` for 320 px). Signed out: neutral, disabled desks plus a log-in hint |
| AC2 | Signed in, `GET /desks/availability?date=` loads on login and on every date change; `booked` desks show `bookedBy` as text; selection resets on date change |
| AC3 | Each desk shows label + icon + state text; `aria-label` "Desk D03, available" / "Desk D04, booked by Ana" / "selected" / "yours"; legend list of the 4 states |
| AC4 | Select a free desk, `Book Now` -> `POST /bookings {date, desk}`; the desk becomes `yours`, button `Withdraw booking`. No desk -> `Please select a desk first`, no request. Withdraw frees the desk locally |
| AC5 | Booked and own desks are `disabled` + `aria-disabled`; selected uses `aria-pressed`. 409 on book -> `This desk or date is already booked. Please choose another desk.` and availability reload |
| AC8 | Calendar, header, `/info`, `/login`, `/register`, withdraw by date unchanged; existing specs adapted only for the desk contract |

## Behaviour notes
- 401 on any call: `AuthService.logout()` + `You must log in first`. Availability or layout errors: generic message in the existing `aria-live` area.
- Availability request is cancelled when the date changes (no stale response).
- Own book/withdraw updates the plan locally (no extra request); other users' changes appear on date change, login or 409.
- Booker names bound with interpolation only.

## Files changed
- New: `Frontend/src/app/features/booking/{booking.models.ts,desk.service.ts}`, `desk-plan/desk-plan.component.{ts,html,css}`.
- Edited: `booking.component.{ts,html,css}`, `booking.module.ts`, `booking.service.ts` (`listMine` -> `{date, desk|null}[]`, `book(date, desk)`).
- Specs adapted (no new tests): `booking.component.spec.ts`, `booking.service.spec.ts`.
- Context: `docs/context/frontend.md`, `docs/context/project.md`.

## Dependencies
None.

## Commands
- `npm run build` (Frontend): passes.
- `npm run test:ci` (Frontend): 145 of 145 pass.

## Known gaps
- No specs for `DeskPlanComponent`, `DeskService` or the desk flows (TDD stage).
- No visual check in a browser at 320 px / wide viewport (CSS written for it, not manually verified).
- No ESLint configured.
