# E2E report - manual-create-a-mockup-office-for-booking

Verdict: skipped: no e2e runner (`workflow.e2e` = `auto`; spec has `ui-changes` and API changes).

## Check
- No Playwright or Cypress config or dependency in `Frontend/package.json`; no `Backend/tests/e2e/` folder.
- Adding a runner is a dependency and project change (risk gate, needs an approved spec), so none was added. The stack was not started.

## Journeys that need a runner (follow-up)
| Journey | ACs |
| --- | --- |
| Signed out: open `/`, see 12 desks without state and the log-in hint; `Book Now` -> "You must log in first" | AC1, AC8 |
| Register -> login -> select a date -> see availability and booker names | AC2, AC3 |
| Select a free desk -> `Book Now` -> desk "yours", `Withdraw booking` -> desk free | AC4 |
| Second user sees the first user's desk as booked, cannot select it; forced 409 shows the message and refreshes | AC5 |
| Viewport 320 px and wide: layout and no horizontal scroll | AC1 |

## Covered instead
Component-level specs cover these flows with HTTP mocked (`tdd-frontend.md`), including layout measured in headless Chrome; backend behaviour is covered with fake repositories (`tdd-backend.md`). Not covered anywhere: a real database (unique index, FK, migrations executed) and the nginx/container stack.
