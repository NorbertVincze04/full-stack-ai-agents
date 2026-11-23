# manual-div-for-hero-section: div for hero section

## Summary
- Frontend (CSS only): the hero (`.booking-layout`) is split into two equal divs, `.layout-calendar` (left) and `.layout-plan` (right), 50/50 with the gap excluded (`flex: 1 1 0`, no wrap, `max-width` and `justify-content: center` removed).
- Below 768 px host width the divs stack, calendar first, each 100% wide (`@container` on `:host`, `container-type: inline-size`).
- Markup and TypeScript unchanged. No dependencies added. No backend, database or pipeline change.
- Added `booking.component.hero-layout.spec.ts` (7 specs measured in headless Chrome).

## Acceptance criteria
- [x] AC1 wide viewport: equal widths, calendar left, desks right (specs + human check in a real browser)
- [x] AC2 `app-calendar` in `.layout-calendar`, `app-desk-plan` in `.layout-plan`, inside `.booking-layout` (spec, markup unchanged)
- [x] AC3 narrow viewport: stacked, calendar first, no horizontal scroll (specs + human check in a real browser)
- [x] AC4 behaviour unchanged (existing booking specs pass)
- [x] AC5 `npm run build` and `npm test` pass (295/295, build complete)

## Test results
- tdd: red 293 run, 2 red (AC1), 3 guards already green; green 295/295 (`npm run test:ci`), build complete.
- e2e: skipped, no e2e runner in the repo (journeys J1-J3 listed in `e2e.md` as follow-up).

## Review coverage
- ux: run, approved (0 blocker, high, medium; 4 low).
- code: skipped (no logic change). security: skipped (no security relevance, no dependency change).

## Approved risks and decisions
Approved risks: none. Decisions: A1 hero = `.booking-layout`; A2 reuse existing divs, mostly CSS; A3 stack below 768 px; A4 inner markup unchanged. A first attempt was discarded by the human and the task reworded.

## Migration
None.

## Start and verify
1. `podman compose up -d --build` (or `cd Frontend; npm start`), open the app.
2. Window wider than 768 px: calendar left, desk plan right, equal widths.
3. Narrow the window below 768 px (or 375 px): calendar above desk plan, no horizontal scroll.
4. `cd Frontend; npm run test:ci; npm run build`.

## Repository settings
None.

## Open findings (all low)
- `booking.component.css`: no comment says the breakpoint is a container width on the host.
- Calendar keeps `max-width: 24rem` and may leave a gap in its 50% div on wide screens.
- Desk text 0.75rem at about 372 px plan width (768 px) not verified visually.
- No test for `.top-bar` at 320 px (unchanged).
- e2e not run (no runner).
