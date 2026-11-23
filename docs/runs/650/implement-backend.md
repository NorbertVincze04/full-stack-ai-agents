# Implement backend - 650 desk numbering
Spec: docs/specs/650.md | Approved risks: R1, R2 | Verdict: done

## Acceptance criteria -> implementation
| AC | How |
| --- | --- |
| AC1 | Migration inserts 16 desks A1..D4 (id = label); `GET /api/desks` is repository-driven, order by row, col unchanged |
| AC2 | Grid: A rows 1-2 cols 1-2, B rows 1-2 cols 3-4, C rows 3-4 cols 1-2, D rows 3-4 cols 3-4; inside a block A1 A2 / A3 A4 |
| AC3 | Desk id pattern `^[A-Za-z0-9_-]{1,10}$` already accepts `C3`; no source change |
| AC4 | `UPDATE bookings SET booking_desk = NULL`; listing already returns `desk: null`, availability joins on desk so no desk is taken |
| AC5 | No booking deleted; guard `IF NOT EXISTS (desk A1)` makes a second run a no-op; one transaction; FK and `ux_bookings_date_desk` untouched |
| AC6 | `desksRenumber.test.ts` (Tester) passes; old `D01`.. fixtures left as is (fakes, shape-neutral, all green), not edited |

## API contract
Unchanged. `GET /api/desks` (public) -> 200 `{ success, payload: { desks: [{ id, label, row, col }] } }`, 16 desks ordered by row, col (rows 1-4, cols 1-4). `GET /api/desks/availability?date=` (Bearer) -> `{ desks: [{ id, booked, bookedBy? }] }`. `POST /api/bookings` `{ date, desk: "C3" }` as before. Legacy bookings: `desk: null` in `GET /api/bookings/mine`.

## Frontend needs
Desk `row`/`col` is a single 4 x 4 grid; the 2 x 2 blocks are encoded by position (letter = id[0]). Blocks: rows 1-2 / 3-4, cols 1-2 / 3-4. Render labels only.

## Files changed
- Backend/migrations/006_renumber_desks.sql (new, schema `public`, Cloud Foundry, human applies)
- Backend/db/migrations/006_ico_env_desks_renumber.sql (new, schema `"ico-env"`, records `schema_migrations`)
- docs/context/backend.md, docs/agents/implementer.md

## Commands
- `npm run build`: ok. `npm test`: 308 tests, 306 pass, 0 fail, 2 skipped (Windows signals, pre-existing). Red baseline 17 now green.
- Migration NOT executed against any database.

## Operator notes
Take a `pg_dump` first. Existing volumes: apply `006_ico_env_desks_renumber.sql` manually (init SQL only runs on empty volumes). Afterwards old bookings have no desk and must be re-booked.

## Known gaps
Real idempotency run needs a database (human verifies). Rollback = restore the dump.
