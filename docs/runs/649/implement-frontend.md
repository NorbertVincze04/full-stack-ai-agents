# Implement report - 649 select/deselect (frontend)

Verdict: done (build passes; 38 existing specs fail by design, see Known gaps). Approved risks: R1, R2, R3 (as described in the spec).

## Acceptance criteria -> implementation
| AC | How |
| --- | --- |
| AC1 | `CalendarComponent.select()` emits `dateDeselected` when the clicked day is the selected one, else `dateSelected(iso)`; `aria-pressed` follows `selected` |
| AC2, AC3 | `DeskPlanComponent.select()` emits `deskDeselected` when the cell is `pressed`, else `deskSelected(id)`; `BookingComponent.selectDesk/deselectDesk`; `select()` and `deselect()` reset `selectedDesk` |
| AC4 | `toggleBooking()` unchanged: day selected, no desk -> `Please select a desk first`, no request |
| AC5 | `ngOnInit` no longer preselects; `selectedLabel` returns `No date selected`; `loadAvailability()` leaves `availability = null` -> desks neutral (disabled); `Book Now` has `[disabled]="busy \|\| !selected"` |
| AC6 | `deselect()` sets `selected = null`, `selectedDesk = null`, clears `error`, calls `loadAvailability()` (no request without a date) |
| AC7 | Deselecting an own booked day only changes `selected`; `booked` list untouched, no `DELETE` |
| AC8 | `yours` cells are enabled; new `pressed` flag drives `aria-pressed` and class `picked` (dark blue); state/name stay `yours` / `Desk D03, yours`; no request |
| AC9 | Disabled days, `booked` and `neutral` desks stay `enabled = false` |
| AC10 | Native `<button>`s; disabled `Book Now` is not focusable or clickable |
| AC11 | Not in scope of this stage (Tester owns specs) |

## Files changed
- `Frontend/src/app/features/booking/booking.component.ts` (`.html`, `.css`)
- `Frontend/src/app/features/booking/calendar/calendar.component.ts`
- `Frontend/src/app/features/booking/desk-plan/desk-plan.component.ts` (`.html`, `.css`)
- `docs/context/frontend.md`, `docs/context/project.md`, `docs/tasks/649.md` (status `in-progress`), `docs/agents/implementer.md`

## API contract
None (no backend, API or database change).

## Dependencies
None.

## Commands run
- `npm run build` (Frontend): passed.
- `npm run test:ci` (Frontend): 191 total, 153 passed, 38 failed.

## Known gaps / for the Tester (no spec edited by me)
- 37 `BookingComponent` specs (`booking.component.spec.ts`, `booking.component.desks.spec.ts`) assume a preselected first bookable day (expected `Fri, 6 Nov 2026` and so on, availability requested on login, `Book Now` clicks). They fail with `No date selected` or unmatched HTTP requests; they need a day click in `setup` (AC11).
- 1 `DeskPlanComponent` spec (`selected and yours` -> "should mark the own desk as yours and not selectable") contradicts the approved R3/AC8 (own desk is now selectable); the Tester corrects it.
- No new specs for the toggles (calendar, desk plan, own day/desk, no-date state).

## Deviations / assumptions
- Outputs are separate (`dateDeselected`, `deskDeselected`, both `EventEmitter<void>`) instead of emitting `null`.
- `Withdraw` success also resets `selectedDesk` so a withdrawn own desk does not reappear highlighted (not in the spec text; consistent with AC8).
- Disabled `Book Now` cursor changed to `not-allowed` (`progress` only while `aria-busy="true"`).
