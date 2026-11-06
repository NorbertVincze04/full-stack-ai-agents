# Frontend build report - task 648 (booking_calendar)

Verdict: done

## Acceptance criteria -> implementation
| Criterion | How |
| --- | --- |
| FR1/AC2 top bar + calendar on `/` only | lazy `BookingModule` on `{ path: '', pathMatch: 'full' }`; top bar is inside `BookingComponent`, so other routes show none; header untouched |
| FR2/AC3 bookable window | `booking-dates.ts` `bookableDates(now)`: 4 weekdays from today/next weekday; other days `disabled` + `aria-disabled`, `select()` also ignores them |
| FR3 preselect, date label | first bookable date selected on init; label `Mon, 9 Nov 2026` via `formatDate` |
| FR4-FR6/AC1/AC5/AC7 button | label follows selected date (`isBooked`); `POST /bookings` or `DELETE /bookings/:date`; several dates supported; disabled while in flight |
| FR7/AC4 anonymous | `isAuthenticated()` false -> no API call, `You must log in first` in the `aria-live` area, no redirect |
| FR8 reload | `currentUser$` subscription loads `GET /bookings/mine` when a user is present; clears booked dates on logout |
| FR12 | non-401 errors (incl. 409) -> generic message |
| FR13/FR14 | 401 from any call -> `AuthService.logout()` + `You must log in first`; no token -> synthetic 401, no request |
| UI | wraps at 320 px (`flex-wrap`), 44 px targets, focus outlines, `aria-pressed` on selected day, month prev/next buttons |

## Files created/changed
- Created: `Frontend/src/app/features/booking/` -> `booking.module.ts`, `booking-routing.module.ts`, `booking.component.{ts,html,css}`, `booking.service.ts`, `booking-dates.ts`, `calendar/calendar.component.{ts,html,css}`.
- Changed: `Frontend/src/app/app-routing.module.ts` (home route), `Frontend/src/app/core/auth.service.ts` (`getToken()`).
- Context: `docs/context/frontend.md`, `docs/context/project.md`.

## Dependencies
None added.

## Commands
- `npm run build` (Frontend): OK, new lazy chunk `booking-module`.
- `npm run test:ci`: 97/97 pass (existing suite).

## Known gaps
- No new frontend specs (AC8 frontend part is for the Frontend Tester); injectable `BOOKING_NOW` token allows a fixed date in tests.
- Window uses the browser date; server may disagree near midnight/time zones (shows generic error).
- Bookings return 500 (generic message) until the DB migrations are applied by a human.
- No ESLint configured, so lint was not run.
