# Review: ux - manual-create-a-mockup-office-for-booking

Verdict: approved (0 blocker, 0 high, 1 medium, 4 low).

Inputs: spec requirements 7-11, `desk-plan.component.{ts,html,css}`, `booking.component.{html,css}`, tdd-frontend (layout measured in headless Chrome at 1100 px and 320 px). No browser/visual check was done by the implementer; e2e skipped.

## Findings
- medium - `desk-plan.component.css` `.desk` (`font-size: 0.75rem`, 12 px) carries the state text and the booker name, the only place the spec (req 9) puts the booked-by information visibly. At 320 px each cell is about 65 px wide, so long names wrap per character (`overflow-wrap: anywhere`). Fix: raise to at least 0.875rem and use `overflow-wrap: break-word` with `hyphens`/ellipsis plus `title`, or verify real names at 320 px in a browser.
- low - `booking.component.ts` / `desk-plan.component.html`: while availability loads (signed in) all desks are neutral and disabled with no loading indicator or message; the log-in hint is correctly hidden. Spec req 11 covers errors only. Fix: short "Loading availability" text in the plan (rule: empty/loading states).
- low - `desk-plan.component.html`: a selected desk has both `aria-pressed="true"` and the name "Desk D03, selected" (state announced twice). Fix: drop "selected" from the accessible name when `aria-pressed` is set.
- low - `booking.component.html`: when the user already has a booking on the date (button reads `Withdraw booking`), free desks stay selectable and selecting one has no effect on the button. Spec UI behaviour does not define this. Fix: mark remaining desks neutral/disabled while the date is booked, or accept as is.
- low - `booking.component.css` `.booking-layout`: no heading ties the page together (calendar has none, plan has `h2`); `h2` with no preceding `h1` on `/` should be checked against the existing pages' heading pattern.

## Checked, no issue
- Req 9: every desk shows label, icon and state text besides colour; accessible names "Desk D03, available" / "Desk D04, booked by Ana"; booked and signed-out desks `disabled` + `aria-disabled`; legend lists all 4 states with icons; `focus-visible` outline present.
- Contrast: selected white on `#1f2937`, booked `#374151` on `#e5e7eb`, neutral `#6b7280` on `#f3f4f6` (about 4.6:1), yours `#1e3a8a` on `#dbeafe` all at or above 4.5:1.
- Touch targets: desks `min-height: 64px`, button `min-height: 44px`.
- Req 10: side by side on wide viewport (flex-wrap, 24rem + 22rem), stacked below, `min-width: 0`, no horizontal overflow at 320 px (measured in tests).
- Req 11 and states: error text in the existing `aria-live="polite"` area; messages for no desk selected, 409, 401 follow the spec.
- Signed-out state: neutral desks plus hint `Log in to see which desks are available and to book one.`; `Book Now` shows `You must log in first`.
- Consistency: reuses the top bar, `book-button` styles and plain CSS; NgModule convention kept.

## Follow-ups
- Visual check in a browser at 320 px and wide viewport (not performed).
