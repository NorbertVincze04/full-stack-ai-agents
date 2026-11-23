# Review code - 650 desk numbering
Verdict: approved | Findings: 0 blocker, 0 high, 1 medium, 4 low

Reports read: brief, implement-backend, implement-frontend, tdd-green. Build and tests taken from the reports (backend 308/306 pass, frontend 263/263); not re-run.

## Review selection
- code: run (migrations 006, desk plan template/CSS).
- ux: run (plan layout, `ui-changes`).
- security: skipped (no security-relevant flag, no dependency change; SQL is static, no new input).

## Migrations (R1/R2 approved as described)
Checked and matching the approved risk: one transaction; sets `booking_desk` to NULL, deletes all desks, inserts 16 (A1..D4, grid positions give A B / C D blocks, row by row inside a block); no booking deleted; guard on desk `A1` makes a second run a no-op; FK `bookings_booking_desk_fkey` and `ux_bookings_date_desk` (partial, NULL excluded) untouched; the `RISK` and rollback (restore dump) are in the header. `Backend/db/migrations/006` records `schema_migrations` with `ON CONFLICT DO NOTHING`; `Backend/migrations/006` (public schema) has no tracking table, consistent with 001-004. Fresh volume order 005 -> 006 works.

## Findings
- medium: Backend/migrations/006_renumber_desks.sql, Backend/db/migrations/006_ico_env_desks_renumber.sql: no table lock; a booking for an old desk inserted between UPDATE and DELETE fails the FK and rolls the whole run back (safe, but confusing). Fix: add an operator note to stop the backend or run `LOCK TABLE ... IN SHARE ROW EXCLUSIVE MODE` first.
- low: same files: guard checks only desk `A1`; a partially hand-edited desk table (A1 present, others missing) is left as is. Fix: guard on the count of the 16 ids, or accept and document.
- low: Backend/tests (`desksMigrations.test.ts`, fixtures `D01`..): `implement-backend.md` says old `D01` fixtures were left as is, `tdd-green.md` says they were mapped to `A1`..; reports contradict. Fix: align the wording.
- low: desk-plan.component.html: magic numbers `col === 3`, `row === 3` encode the block layout; a layout change needs two edits. Fix: one constant or a `blockEdge` field on the cell.
- low: counts in docs (`implement-frontend.md` 261, `tdd-green.md` 263; `docs/context/*.md`) are stale again (recurring). Fix: refresh the counts.

## Acceptance criteria
AC1-AC6 met by static review and tests; AC5 idempotency not run against a database (human verifies after the dump, as approved).
