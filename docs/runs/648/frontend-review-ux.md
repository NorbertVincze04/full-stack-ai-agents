# Frontend UX review - task 648 (booking_calendar)

Verdict: approved

Scope: `Frontend/src/app/features/booking/` (top bar, calendar), checked against `docs/specs/648.md`, `docs/runs/648/frontend-build.md`, `frontend-tests.md`, `docs/context/frontend.md`, the shell styles and the auth forms. Static review only; no browser run.

Count: blocker 0, high 0, medium 3, low 7.

## Spec conformance (no findings)
- FR1-FR4, FR7: top bar below the header on `/` only, date left, button right, `flex-wrap` for 320 px, `aria-live` message, label follows selected date.
- FR2: disabled days are `disabled` (not focusable, not clickable) plus `aria-disabled`, greyed and struck through; selected day has `aria-pressed`.
- Palette (#1f2937, #e5e7eb, white), 2 px blue `focus-visible` outline and `font: inherit` buttons match the shell. Error red #b91c1c on #e5e7eb is about 5:1.

## Findings

| # | Sev | File | Problem | Suggested fix |
| --- | --- | --- | --- | --- |
| 1 | medium | `booking.component.ts` (`ngOnInit`/`loadBooked`), `booking.component.html` | No loading state for `GET /bookings/mine` (FR8/AC7): until it resolves, a booked date shows `Book Now` and is clickable, leading to a 409 and the generic error. A failed load leaves a wrong label with no retry. | Disable the button (or show a short "Loading bookings" status) until the load settles; offer a retry or keep the button disabled on load failure. |
| 2 | medium | `booking.component.html` L8, `booking.component.ts` (`toggleBooking` next) | Success is only a label swap and a dot; the live region carries errors only, so screen-reader users get no confirmation that a booking was made or withdrawn (usability rule: status messages, WCAG 4.1.3). | Write a short status ("Booked Mon, 9 Nov 2026" / "Booking withdrawn") into the existing live region, or a second `role="status"` region. |
| 3 | medium | `booking.component.html` L4 | `[disabled]="busy"` on the focused button drops keyboard focus while the request runs (focus falls to `body`), so keyboard users lose their place (FR/UI: disabled while in flight, keyboard operable). | Use `aria-disabled` plus a guard in the handler (already present via `busy`) and a "disabled" class, keeping focus on the button. |
| 4 | low | `calendar.component.css` `.day` | Day cells use `min-height: 40px`; the build report claims 44 px targets and the shell uses 44 px for all controls. | Raise to 44 px (height only; width is about 41 px at 320 px). |
| 5 | low | `calendar.component.css` `.day.booked::after` | Booked marker is a 6 px green dot only (colour-only, tiny, no legend); the booked state is otherwise exposed only through `aria-label`. WCAG 1.4.1. | Add a non-colour cue (e.g. check mark or border style) and a short legend. |
| 6 | low | `calendar.component.ts` `shiftMonth` | Month navigation is unbounded; users can reach months in which every day is struck through with no hint why. | Disable previous/next when the target month has no bookable day, or show a hint "Only the next 4 weekdays can be booked". |
| 7 | low | `booking.component.html` L3 | Selected date is a bare `<p>` with no label or association to the button; assistive tech hears a date with no context. | Add a visually hidden prefix ("Selected date:") or `aria-describedby` on the button. |
| 8 | low | `booking.component.html` L8, `booking.component.css` `.top-bar-message` | The message uses `aria-live="polite"` while the auth forms use `role="alert"` for errors; an always-present empty `min-height: 1.5rem` strip adds blank space under the bar. Spec requires `aria-live`, so keep it but align. | Use `role="alert"` (implies live) for the login-required/error text, or `role="status"` for both; collapse the empty height or accept it deliberately. |
| 9 | low | `booking.component.css` vs `calendar.component.css` | The top bar spans the full width (date and button at opposite screen edges) while the calendar is a centred 24 rem column, so on wide screens the bar and calendar do not align. | Constrain `.top-bar-row` to the same max-width and centre it, or keep the full-width bar by explicit design decision. |
| 10 | low | `calendar.component.css` `.day:disabled` | Disabled day text #9ca3af on #f3f4f6 is about 2.3:1; exempt from WCAG, but the line-through on most of the month makes numbers hard to read and adds visual noise. | Keep the strike-through, darken the text slightly (about #6b7280), or drop the strike-through on weekends. |

## Navigation and states
- No route `data` is used by the header in this app; header untouched, nothing to align.
- Empty/error states: error text is covered; no empty state is needed (window always has 4 dates). Loading state is missing (finding 1).
- Keyboard: Tab reaches nav buttons and the 4 enabled days only; no arrow-key grid navigation (acceptable, spec requires keyboard operable, not roving focus).
