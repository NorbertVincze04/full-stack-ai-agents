# TDD green - 650 desk numbering
Verdict: pass | Mode: green | Areas: backend, frontend

## Results
- Backend `npm test`: 308 tests, 306 pass, 0 fail, 2 skipped (Windows signals, pre-existing). Red baseline `desksRenumber.test.ts` (17) is green.
- Frontend `npm run test:ci`: 263 of 263 SUCCESS (261 + 2 new).
- No migration was executed; no database was touched.

## Specs adapted to A1-D4 / 16 desks (AC6)
Fixtures `D01`-`D12` mapped to `A1`-`C4` (sequential), generated ids now 16 (`A1`..`D4`), unknown-desk fixtures `D00`/`D99` -> `A0`/`Z9`.
- Backend: `desks.api.test.ts` (16 desks, order A1..D4, 4 x 4 grid), `deskRepository.test.ts`, `bookings.api.test.ts`, `bookingService.test.ts`, `bookingRepository.test.ts`.
- Frontend: `desk-plan.component.spec.ts` (16 buttons, 4 x 4 grid, aria-label pattern), `booking.component.desks.spec.ts`, `booking.component.toggle.spec.ts`, `booking.component.spec.ts`, `booking.service.spec.ts`, `desk.service.spec.ts`.
- Unchanged on purpose: `desksMigrations.test.ts` (checks the historic 004/005 seeds of 12 desks), `desksRenumber.test.ts`, `desk-numbering.spec.ts` (task 650).

## Tests added (deferred-to-green)
`desk-numbering.spec.ts`:
- `data-block` equals the desk letter.
- `block-left-edge` only on column-3 cells, `block-top-edge` only on row-3 cells (4 each).
The 14 px spacing itself (CSS) is not asserted; no pixel check without an e2e runner.

## AC coverage
| AC | Tests |
| --- | --- |
| AC1 | `desks.api.test.ts` (16, order, grid), `desksRenumber.test.ts` |
| AC2 | `desk-numbering.spec.ts` (labels only, 2x2 blocks, data-block, spacing classes) |
| AC3 | `desk-numbering.spec.ts` C3/D4, `bookings.api.test.ts`, booking component specs |
| AC4 | `desk-numbering.spec.ts` (booking without desk), existing `desk: null` specs |
| AC5 | static only (`desksRenumber.test.ts`); real idempotency needs a database (human) |
| AC6 | adapted specs above |

## Failures
None.
