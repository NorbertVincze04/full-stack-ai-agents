# 650: desk numbering

## Summary
- **Backend**: new migration 006 replaces the 12 desks (D01-D12) with 16 desks `A1`-`D4`. Existing bookings are kept; their `booking_desk` is set to NULL (no desk label, block no desk). API shape unchanged (`id`, `label`, `row`, `col`).
- **Frontend**: the desk plan shows 4 blocks of 2x2 desks (one per letter A-D), labels only, no headings. Blocks are separated by spacing (`block-left-edge`, `block-top-edge`, `data-block`).
- **Database**: `Backend/migrations/006_renumber_desks.sql` (public schema) and `Backend/db/migrations/006_ico_env_desks_renumber.sql` (init SQL, records `schema_migrations`).

## Acceptance criteria
- [x] AC1: GET /api/desks returns 16 desks A1-D4, ordered (`desks.api.test.ts`, `desksRenumber.test.ts`)
- [x] AC2: 4 blocks of 2x2, labels only (`desk-numbering.spec.ts`)
- [x] AC3: select, book, withdraw, availability for every desk, e.g. C3 (`desk-numbering.spec.ts`, `bookings.api.test.ts`)
- [x] AC4: pre-change bookings listed without desk label, block no desk (`desk-numbering.spec.ts`)
- [ ] AC5: no booking deleted, idempotent: **Not verified** (static review and `desksRenumber.test.ts` only; the human verifies after `pg_dump`)
- [x] AC6: specs adapted and pass; tests cover 16 desks, labels, 2x2 blocks, booking without desk

## Test results
- Backend `npm test`: 308 tests, 306 pass, 0 fail, 2 skipped (Windows signals, pre-existing).
- Frontend `npm run test:ci`: 263 of 263 pass.
- e2e: skipped (no runner). No migration was executed, no database touched.

## Review coverage
- code: run, approved. ux: run, approved. security: skipped (no security-relevant flag, static SQL, no new input, no dependency change).

## Approved risks
- R1: destructive migration (UPDATE `bookings.booking_desk` to NULL, DELETE desks, INSERT 16), approved as described.
- R2: migration is applied by the human, not by an agent.
- Decisions: D1 delete and recreate all desks; D2 2x2 blocks per letter; D3 labels only; D4 missing Azure tag ignored.

## Migration to apply (human)
1. Back up: `pg_dump` of the database (restore the dump to roll back).
2. Stop the backend (the migration takes no lock).
3. Apply `Backend/migrations/006_renumber_desks.sql` (or `Backend/db/migrations/006_ico_env_desks_renumber.sql` on the tracked schema).
4. Run it a second time: the result must be identical (guard on desk `A1`).
5. Check: 16 desks `A1`-`D4`, booking count unchanged.

## Start and verify
`podman compose up` (or `docker compose up`), log in, open the booking page: 4 blocks of 2x2 desks, book and withdraw desk `C3`, check older bookings show no desk label. Check the layout at 320 px and desktop width.

## Repository settings
None.

## Open findings
- medium: migrations take no table lock; a booking for an old desk inserted between UPDATE and DELETE rolls the run back (safe). Mitigation: stop the backend first.
- medium: block gap built with margins on desk buttons; column 3 is 14 px narrower, row 4 taller; at 320 px column 3 is about 53 px wide. Fix: build the gap in the grid.
- low: guard checks only desk `A1`.
- low: reports disagree on whether `D01` fixtures were left or mapped.
- low: magic numbers `col === 3`, `row === 3` in `desk-plan.component.html`.
- low: counts in docs stale again.
- low: block separation is subtle; no automated spacing check.
