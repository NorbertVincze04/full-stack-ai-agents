# Frontend tests - task 648 (booking_calendar)

Verdict: pass

## Tests added (48; suite 97 -> 145)
| File (`Frontend/src/app/features/booking/`) | Specs | Focus |
| --- | --- | --- |
| `booking-dates.spec.ts` | 9 | `bookableDates` (Fri, Mon, Sat, Sun starts, month boundary, never weekend), `formatDate`, ISO round-trip |
| `calendar/calendar.component.spec.ts` | 9 | enabled/disabled days, `aria-disabled`, `aria-pressed`, emit/no-emit, booked marker, month navigation |
| `booking.service.spec.ts` | 5 | `HttpTestingController`: GET mine, POST, DELETE, Bearer header, no token -> 401 with no request, error propagation |
| `booking.component.spec.ts` | 25 | selection, anonymous click, book/withdraw, several dates, in-flight disable, 409/500/404 errors, reload state, 401 expiry |

Fixed clock via `BOOKING_NOW` (Fri 6 Nov 2026); `AuthService` is real, session seeded in `sessionStorage`; HTTP mocked.

## Coverage matrix
| Criterion | Tests |
| --- | --- |
| FR2 / AC3 bookable window | dates spec (all 4 start cases), calendar enabled/disabled/aria-disabled, component click on weekend/past/out-of-window ignored, Saturday start |
| FR3 preselect + label | component preselect, label `Fri, 6 Nov 2026` / `Mon, 9 Nov 2026`, label left / button right, `formatDate` |
| FR4 label follows date | component (`Book Now` / `Withdraw booking` per selected date) |
| FR5 / AC1 book | component + service POST `{ date }`, Bearer, button switches, several dates |
| FR6 / AC5 withdraw | component + service DELETE `/bookings/<date>`, returns to `Book Now`, other date untouched |
| FR7 / AC4 anonymous | message `You must log in first`, no HTTP call, no redirect, `aria-live`, cleared on new selection |
| FR8 / AC7 reload | `GET /bookings/mine` on load maps to booked state; cleared on logout; 500 on load -> generic error |
| FR12 | 409 -> generic message, state unchanged |
| FR13 | 401 on book, withdraw and load -> `AuthService` session cleared + `You must log in first`; no call after expiry |

## Results
| Command (in `Frontend/`) | Result |
| --- | --- |
| `npm run test:ci` | 145/145 pass |
| `npm run build` | OK (lazy `booking-module` chunk) |
| `npm test` | not run separately (same Karma suite, watch mode) |
| e2e | none: no e2e runner configured |

## Failures
None.

## Not covered
- FR1 "no bar on other routes" (route-level spec not requested).
- FR9-FR12, FR14 server rules (backend tests).
- Keyboard-only interaction beyond native `<button>` semantics; 320 px layout (visual).
