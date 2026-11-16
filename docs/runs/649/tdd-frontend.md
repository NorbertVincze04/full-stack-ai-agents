# TDD report - 649 select/deselect (frontend)

Verdict: pass. `npm run test:ci` (Frontend, ChromeHeadless): 247 of 247 SUCCESS, 0 failed, 0 skipped (before: 191 total, 38 red). No production code changed. No `test:coverage` script exists.

## Specs corrected to the approved spec (contradicted D2/R2/R3, not defects)
| File | Change |
| --- | --- |
| `booking.component.spec.ts` (BookingComponent) | `setup` takes `day` (default 6, `null` = none) and clicks the day after load, flushing availability for signed-in users; "preselect first date" and "preselect next Monday" replaced by "no date on load" / Saturday window checks |
| `booking.component.desks.spec.ts` | same `setup` change; availability test now expects no request on load and a request after the day click; own desk after booking is `Yours`, enabled, `aria-pressed="false"` (was `disabled`) |
| `desk-plan.component.spec.ts` | "own desk yours and not selectable" now "selectable, not pressed" (R3, AC8) |

Spec-contradicting assertions were the only ones changed; no test was skipped, weakened or deleted. All 37 BookingComponent specs and the 1 DeskPlan spec that failed after the implementation now pass with the updated setup, which indicates they were the only cause (preselected day assumption).

## Specs added (56 total, 191 -> 247)
- `calendar.component.spec.ts` (+8): selected day emits `dateDeselected` only; unselected emits `dateSelected` only; no selection = no `aria-pressed="true"`, 4 days enabled; reselect after deselect; month anchor without selection; booked day deselect keeps `booked` marker and label; disabled days emit nothing; native `type=button`, focusable.
- `desk-plan.component.spec.ts` (+11, net): own desk selectable and `picked`/`aria-pressed` true with label still `yours`; selection cleared shows `Available`; booked desk never pressed; `deskSelected`/`deskDeselected` emit rules for free, selected, other, own, own-selected, booked and neutral desks; native buttons focusable.
- `booking.component.toggle.spec.ts` (+37, new): load without a day (signed in/out), disabled `Book Now` inert and unfocusable, calendar toggle, deselect resets desks/clears availability/no request/cancels in-flight request, desk toggle, `Please select a desk first`, own booked day toggle without `DELETE`, own desk toggle, `Withdraw booking` unchanged, signed-out and 409 flows.

## AC coverage
| AC | Specs |
| --- | --- |
| AC1 | calendar toggle; toggle spec "AC1, AC3" |
| AC2 | desk toggle; toggle spec "AC2, AC4"; desk-plan toggle |
| AC3 | toggle spec "keeps at most one day", "reset the desk selection when another day is selected" and on deselect |
| AC4 | toggle spec "ask for a desk ... after deselected"; existing desks spec "no selection" |
| AC5 | toggle spec "AC5" (5 specs), existing `selection` specs |
| AC6 | toggle spec "AC6" (6 specs: no request, cleared availability, desk reset, in-flight cancel, inert Book Now) |
| AC7 | toggle spec "AC7": no `DELETE`, `booked` marker kept, reselect, Withdraw is the only `DELETE` |
| AC8 | toggle spec "AC8" and desk-plan "own desk" specs |
| AC9 | disabled days, booked and neutral desks, 4-weekday window, 409/401/500 specs (existing and new) |
| AC10 | native `button` + `aria-label` + `aria-pressed` + focus specs; disabled `Book Now` not focusable (Enter/Space are native button behaviour, not simulated) |
| AC11 | this report: 247/247 |

## Failures
None. No defect found in the implementation.

## Notes
- Enter/Space activation is asserted by element type (native `<button type="button">`), not by synthetic key events (a browser does not fire `click` on a synthetic `keydown`).
- Visual highlight (CSS `picked`, `selected`) is checked by class only, not by colour; layout is unchanged.
