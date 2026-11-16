# Review (ux) - 649 select/deselect (frontend)

Verdict: approved. Findings: 0 blocker, 0 high, 1 medium, 2 low.

## Review selection
- ux: run (`ui-changes: yes`: day and desk toggles, no-date state, disabled `Book Now`, own desk highlight).
- code: run, see `review-code.md`. security: skipped (no auth, API, storage or dependency change).

Inputs: spec `docs/specs/649.md`, `implement-frontend.md`, `tdd-frontend.md`, `e2e.md` (skipped, no runner); templates and CSS of `booking`, `calendar`, `desk-plan`. Visual check in a browser was not possible (read-only review); findings are from markup and CSS.

## Requirements checked
- Toggle state exposed: day and desk buttons keep `aria-pressed` (true/false) and `aria-label`; own desk keeps the label `Desk D03, yours` (requirements 3, 7, AC8, AC10).
- Keyboard: all controls are native `<button type="button">`; disabled days, booked and neutral desks, and `Book Now` without a day are `disabled` (skipped by Tab, AC9, AC10). Desk DOM is tracked by `cell.id`, so focus survives a toggle.
- No-date state: top bar text `No date selected`, desks neutral, `Book Now` disabled with `cursor: not-allowed` (`progress` only while `aria-busy`), matches D1.
- Own desk (R3): `picked` fill (`#1e3a8a`, white text, contrast above 4.5:1) differs from `yours` (`#dbeafe`); no request on toggle.
- Layout unchanged (grid, `min-height: 64px` desks, 44 px `Book Now`), so the existing 320 px behaviour is not affected.

## Findings
- medium | `desk-plan.component.html` `plan-hint` (only shown when `!signedIn`) | A signed-in user with no day selected sees 12 grey, disabled desks and no explanation in the plan; the only cue is `No date selected` in the top bar. The signed-out neutral state already uses a hint in the plan (existing pattern, spec "neutral" state). Fix: show a hint such as "Select a date to see available desks" when `signedIn` and `availability` is `null`.
- low | `desk-plan.component.css` `.desk.yours.picked`, legend | The picked own desk differs from the unpicked one by fill colour only: the text stays `Yours` (the `selected` state gets the text `Selected`) and the legend does not list it. Screen readers get `aria-pressed`; sighted users rely on the luminance change (WCAG 1.4.1, spec R3 mitigation against mistaking a selection for a withdraw). Fix: optional text or icon cue for the picked own desk.
- low | `booking.component.html` `.selected-date` | The text changes to `No date selected` on deselect without a live region; the day button's `aria-pressed` change is announced, the top-bar change is not. Fix: optional `aria-live="polite"` on `.selected-date`.

## Not reported
- Disabled `Book Now` at `opacity: 0.6` (existing style, disabled controls are exempt from contrast rules).
- Accessible-name redundancy (`Desk D03, selected` plus `aria-pressed`): existing pattern from the mockup-office task.
