# 648: booking_calendar (frontend)

Work item: https://dev.azure.com/CljP-LOM1-Automation/41ef1050-2f6b-4935-9e1a-15b8c70fe8c4/_workitems/edit/648

## Summary
Home page (`/`) now shows an always-visible booking calendar and a top bar. The selected date is shown on the left of the bar; the button on the right toggles `Book Now` / `Withdraw booking` and books or withdraws the selected date through the backend (`POST /bookings`, `DELETE /bookings/:date`, `GET /bookings/mine`).

- Lazy `BookingModule` on `/` (`BookingComponent` top bar, `CalendarComponent`, `BookingService`, `booking-dates.ts`).
- Only the current day and the next 3 weekdays are selectable (4 in total); past days and weekends are disabled.
- Anonymous click on `Book Now`: no API call, message `You must log in first`.
- A 401 on any booking call logs the user out and shows the same message; other errors show a generic message.
- `AuthService.getToken()` added. No dependencies added. Existing header untouched.

## Acceptance criteria
- [x] Logged-in users can select a date and book it (AC1)
- [x] Top bar and calendar on `/` only (AC2)
- [x] Weekend, past and out-of-window days not selectable (AC3)
- [x] Not logged in: `You must log in first`, no request (AC4)
- [x] Withdraw removes the booked date (AC5)
- [x] Booked dates reloaded on page load / login (AC7)
- [x] Frontend specs for the feature (AC8, frontend part)
- [ ] Context docs updated (AC9): done but partly stale, see open findings

## Test results (Frontend)
| Command | Result |
| --- | --- |
| `npm run test:ci` | 145/145 pass (97 existing + 48 new) |
| `npm run build` | OK, new lazy `booking-module` chunk |
| lint | not run (no ESLint configured) |
| e2e | none (no runner configured) |

Not covered by specs: "no bar on other routes" (FR1), keyboard-only flow beyond native buttons, 320 px layout (visual).

## Open review findings (all verdicts: approved, 0 blocker, 0 high)
Code review (2 medium, 8 low):
- M1 `currentUser$` handler calls `listMine()` without `switchMap`; a stale response after quick logout/login can set the wrong user's bookings.
- M2 An in-flight book/withdraw resolving after logout can re-add a date; request not tied to component lifetime.
- L5 `docs/context/frontend.md` is stale: still says 97 specs and "no frontend specs for the booking feature yet".
- L1-L4, L6-L8: constants location, mixed DI styles, unreachable fallback, stale window past midnight, no resync on 409, redundant `disabled` + `aria-disabled`, no route spec.

UX review (3 medium, 7 low):
- No loading state for `GET /bookings/mine` (booked date shows `Book Now` until loaded; failed load has no retry).
- Success (booked/withdrawn) is not announced to screen readers; only errors use the live region.
- `[disabled]` while in flight drops keyboard focus.
- Low: day cells 40 px (not 44 px), booked marker is a colour-only dot, unbounded month navigation, no "Selected date" label, `aria-live` vs `role="alert"`, bar/calendar width mismatch, low contrast of disabled days.

Security review (1 medium, 3 low):
- `npm audit --omit=dev`: 8 advisories (4 high, 4 moderate) in Angular 18.2.14, existing, none added; upgrade tracked in `docs/handover/601.md`.
- JWT in `sessionStorage` (existing, approved earlier); token attached manually in `BookingService` (no interceptor); dev `apiUrl` is plain http (dev only).

Known gaps: window uses the browser date (server may disagree near midnight); bookings return 500 (generic message) until the DB migrations are applied by a human.

## How to verify
1. `cd Frontend; npm ci; npm run test:ci` (expect 145/145) and `npm run build`.
2. Start the stack (`podman compose up -d`) after applying the bookings migration, open `http://127.0.0.1:4200/`.
3. Not logged in: click `Book Now`; expect `You must log in first`, no request in the network tab.
4. Log in, return to `/`: calendar shows the 4 bookable weekdays; weekends and past days are disabled.
5. Click `Book Now`: button becomes `Withdraw booking`; reload the page, state persists.
6. Click `Withdraw booking`: button returns to `Book Now`.
7. Open `/info`, `/login`: no top bar or calendar.
8. Narrow the window to 320 px: top bar wraps, controls stay usable.

## Backend
The backend part (bookings API, migrations) is covered by `docs/runs/648/pr-backend.md`; the frontend needs it to work end to end.
