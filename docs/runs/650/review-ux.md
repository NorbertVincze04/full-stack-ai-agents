# Review UX - 650 desk numbering
Verdict: approved | Findings: 0 blocker, 0 high, 1 medium, 2 low

Files: Frontend/src/app/features/booking/desk-plan/desk-plan.component.html and .css. Build and tests from reports (frontend 263/263). No visual check was possible (no e2e runner); findings come from the CSS.

## Findings
- medium: desk-plan.component.css (`.desk.block-left-edge`, `.desk.block-top-edge`): the block gap is made with `margin-left`/`margin-top` on the desk buttons inside 4 equal `minmax(0, 1fr)` tracks. The margin shrinks the buttons: column 3 is 14 px narrower than the other columns, and row 3 grows the track by 14 px so row 4 buttons stretch taller than row 3. At 320 px a column 3 button is about 53 px wide for 0.75rem text such as `Available`/`Booked` plus a user name (frontend.md: 320 px must stay usable). Fix: build the gap in the grid (`grid-template-columns: 1fr 1fr 14px 1fr 1fr` with explicit columns, or `row-gap`/`column-gap` on block wrappers) so all desks keep equal size.
- low: desk-plan.component.html: the blocks are separated by space only (about 20 px incl. the 6 px gap against 6 px); with the 2x2 labels-only decision (D3) this is the only cue, so it is subtle. Fix: larger gap, or a subtle block background, after the medium fix.
- low: no automated check of the spacing (class presence only); layout needs a manual check at 320 px and desktop widths.

## Checked, no finding
Labels only, no headings (D3); `aria-label`, `aria-pressed`, disabled states, focus outline, legend and the plan hint are unchanged; DOM order follows the grid order (A1..D4 by row/col) so keyboard order is row by row, as before; state cues keep icon plus text.
