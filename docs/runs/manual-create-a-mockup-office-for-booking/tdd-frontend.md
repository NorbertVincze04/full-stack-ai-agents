# TDD report: frontend - manual-create-a-mockup-office-for-booking

Verdict: pass (`npm run test:ci`: 191 of 191 pass, headless Chrome). Before: 145; 46 specs added. The 145 existing specs (booking specs already adapted by the implementer for `desk`) all still pass.

## Tests added
| File | Specs | Content |
| --- | --- | --- |
| `desk-plan/desk-plan.component.spec.ts` (new) | 19 | signed out: 12 buttons, `row`/`col` grid placement, neutral, `disabled` + `aria-disabled`, no state text, log-in hint, no emit; signed in: "Desk D03, available", "Desk D04, booked by Ana", text + icon, booker name shown, legend with 4 states, selected (`aria-pressed`), yours, booked not selectable, not loaded -> neutral, empty layout, HTML in a booker name rendered as text only |
| `desk.service.spec.ts` (new) | 5 | `list()` GET `/desks` without token; `availability()` GET with `date` param and Bearer token; no token -> synthetic 401 without a request; server errors propagate |
| `booking.component.desks.spec.ts` (new) | 22 | page level through the DOM and HTTP: layout load, signed-out plan, no `Authorization` on `/desks`, layout error message, side by side at 1100 px, stacked and no horizontal overflow at 320 px (measured in the browser), availability on load/date change/stale response/500/401/logout, selection and reset on date change, `POST { date, desk }` (only those two keys), yours after booking, withdraw frees the desk, legacy booking, no desk -> message and no request, booked desk not selectable, 409 -> message + availability reload, 500 |

## AC coverage
| AC | Specs |
| --- | --- |
| AC1 | `booking.component.desks.spec` (12 desks, signed out neutral, wide/narrow layout), `desk-plan` (grid placement, neutral) |
| AC2 | `booking.component.desks.spec` (availability on load and date change, booker name, stale response), `desk.service.spec` |
| AC3 | `desk-plan` (label, state text and icon, accessible names, legend, `aria-disabled`, `aria-pressed`) |
| AC4 | `booking.component.desks.spec` (select, POST body, yours, Withdraw booking, no request without desk) |
| AC5 | `desk-plan` and `booking.component.desks.spec` (booked disabled, 409 message and refresh) |
| AC8 | existing specs (calendar, header, info, login, register, auth, booking dates/service) pass |
| AC10 (frontend) | `npm run test:ci` passes; `npm run build` passed in the implement stage (specs do not enter the build) |

## Results
All green, no defect found. Layout specs measure real boxes (`getBoundingClientRect`, `scrollWidth`) with component CSS applied, so spec 10 (side by side / stacked / 320 px) is verified in headless Chrome.

## Not covered
- Visual quality (colour contrast, focus styling) and real browser flows across the stack: see `e2e.md` (skipped).
