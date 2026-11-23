# TDD frontend - task 650 (mode red)

Verdict: red-ready (with no failing frontend test; see "Why nothing is red")
Suite: `npm run test:ci` -> 261 of 261 SUCCESS (247 existing + 14 new). No compile or setup error.
Added: [desk-numbering.spec.ts](../../../Frontend/src/app/features/booking/desk-numbering.spec.ts) (14 specs). No application code changed.

## Red baseline
- Failing: 0.
- already-green: all 14. The plan and booking page are data-driven (`desks` come from `GET /api/desks`, `row`/`col` go to `grid-row`/`grid-column`, labels from `label`), so the new ids `A1`-`D4` and the 2 x 2 positions render without a frontend change. The tests are not weak: they assert 16 buttons, label order, one 2 x 2 group per letter, A/B above C/D, no headings, C3 select/book/withdraw, booked-by on D4/B2 and a booking with `desk: null`; they fail if the component hard-coded 12 desks, dropped `row`/`col` or showed a label for a missing desk.
- The red state of 650 sits in the backend (`GET /api/desks` still returns `D01`-`D12`; see `tdd-backend.md`).

## Why nothing is red
The spec defines the frontend change only as data (ids, labels, row/col) plus "blocks separated visually (A3), no headings (D3)". There is no selector, class or text for a block, so a test of the visual separation cannot be written without guessing.

## deferred-to-green
- Visual separation of the four blocks (A3, spacing between blocks): needs the block markup/class chosen by the Implementer; the spec gives none. Test at green (or a manual layout check, as in earlier tasks).
- Adapt existing specs that still use `D01`-`D12` and 12 desks (AC6): `booking.component.desks.spec.ts`, `desk-plan.component.spec.ts`, `desk.service.spec.ts`, `booking.component.toggle.spec.ts`. They pass today; they are updated to 16 desks / new labels when the implementation lands (not changed now to keep them as the guard).
- If the Implementer changes `DeskPlanComponent` markup (e.g. wraps blocks in elements), re-run `desk-numbering.spec.ts`; the position tests read `grid-row-start`/`grid-column-start` from `button.desk`, so a wrapper that moves the grid placement needs those tests adjusted (contradiction with the markup, not weakening).

## AC coverage matrix
| AC | Test (desk-numbering.spec.ts) | State |
| --- | --- | --- |
| AC1 (API, 16 desks) | backend; frontend: 16 desks loaded from `GET /desks` | already-green (frontend part) |
| AC2 | 16 labels in order; labels only, no headings; 2 x 2 per letter; A/B upper, C/D lower; no overlap | already-green |
| AC3 | C3 select/deselect/yours (plan); POST `{date, desk: 'C3'}`, withdraw (page); D4/B2 booked by someone else | already-green |
| AC4 | `desk: null` booking: Withdraw shown, no desk yours/booked, no "null"/"undefined", withdraw works | already-green |
| AC5 | backend migration only | n/a |
| AC6 | new specs cover 16 desks, labels, 2 x 2 blocks, booking without desk; adaptation of old specs deferred | partly (see above) |

## Notes
- Fixed "today" 6 Nov 2026 via `BOOKING_NOW`, no real HTTP or database.
- Test layout uses the approved assumption A2 (A top-left, B top-right, C bottom-left, D bottom-right) with a 4 x 4 `row`/`col` grid; the real values come from the migration (`grid_row`/`grid_col` 1-4).
