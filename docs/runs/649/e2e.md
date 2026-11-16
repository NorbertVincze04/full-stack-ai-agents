# e2e report - 649 select/deselect

Verdict: skipped: no e2e runner (`workflow.e2e` = `auto`; spec has `ui-changes`). No Playwright or Cypress config in `Frontend/`, no `e2e` folder in `Backend/tests/`. Adding a runner is a dependency change and needs an approved spec; none was added.

## Journeys to automate when a runner exists
| Journey | ACs |
| --- | --- |
| Load `/` signed out: no day highlighted, `No date selected`, desks neutral, `Book Now` disabled | AC5 |
| Login -> click a weekday -> click it again: selected then deselected, desks neutral again, no request on deselect | AC1, AC5, AC6 |
| Select day -> select desk -> click desk again -> `Book Now` shows `Please select a desk first` | AC2, AC4 |
| Book a desk -> deselect the booked day -> reselect it: booked marker stays, booking intact, only `Withdraw booking` withdraws | AC7 |
| Booked day: click own desk (`Yours`) twice: highlight toggles, `Withdraw booking` stays enabled | AC8 |
| Tab to a day/desk, Enter and Space toggle it; disabled `Book Now` is skipped by Tab | AC10 |

## Coverage today
The same flows are covered at component level against `HttpTestingController` in `tdd-frontend.md` (247/247). Not covered: real browser key events, real backend and DB, CSS highlight colours.

## Follow-up
- Decision for the human: add an e2e runner (Playwright) for the journeys above (risk gate: dependency).
