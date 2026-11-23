# e2e - 650 desk numbering
Result: skipped: no e2e runner (no Playwright/Cypress in Frontend/, no e2e folder in Backend/tests/). Adding one needs an approved spec.

## Journeys to automate (follow-up)
1. Register/login, open booking, see 16 desks A1-D4 in 4 blocks of 2x2 with a visible gap, labels only (AC1, AC2).
2. Pick a day, select C3, book, see "yours", withdraw, see available again (AC3).
3. Booking from before the migration is listed without desk label and blocks no desk (AC4).

## Not covered
- Real migration run and idempotency (AC5): human applies it after a `pg_dump`.
- Visual spacing (14 px margins) and layout at 320 px / 200% zoom: manual check.
