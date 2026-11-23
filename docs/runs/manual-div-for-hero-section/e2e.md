# e2e - manual-div-for-hero-section

Verdict: skipped: no e2e runner

No Playwright/Cypress in `Frontend/` and no `e2e` folder in `Backend/tests/`; adding one needs an approved spec (dependency).

## Journeys (follow-up)
- J1 (AC1/AC2): open `/booking` at 1280 px: calendar left, desk plan right, equal widths.
- J2 (AC3): at 375 px: calendar above desk plan, no horizontal scroll.
- J3 (AC4): select a day and a desk, book: behaviour unchanged.

## Coverage meanwhile
AC1-AC3 are measured in headless Chrome by `booking.component.hero-layout.spec.ts` (7 specs).
