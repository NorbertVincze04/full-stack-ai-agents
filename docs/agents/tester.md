# Tester - context

Agent: `.github/agents/tester.agent.md` | Skills: `tdd`, `test` | Replaces: Frontend Tester, Backend Tester (and the test half of Container Tester).

Backend tests: `node:test` in `Backend/tests/` (`npm test`). Frontend: Karma/Jasmine (`npm run test:ci`). There is no e2e runner in the repository.

> Read this file first instead of re-reading old reports. Update it at the end of every task (rules: `docs/context/README.md`, Agent context files). Keep it under ~80 lines.
> Updated: 2026-11-23 (terms page)

## Tasks

| Task | Backend | Frontend | Notes |
| --- | --- | --- | --- |
| 601 | 10 tests (`app`, `server`), exact `hello world` output | 3 specs (builder) | Tester found no `test` script in `Backend/package.json` |
| 602 | n/a | 4 specs (builder) | Tester not run (`on-demand`); layout verified by the human |
| header | n/a | 7 specs (builder) | Tester not run |
| info page | n/a | 13/13, added `info-route.spec.ts` | Run on request |
| backend login endpoint | 49 tests, fake repository, no database | n/a | `login.acceptance.test.ts`; not covered: rate-limit window expiry, real `pg` pool, executing the migration |
| login and register pages | 122 tests (120 pass, 2 skipped: Windows signals), 48 new in `register.test.ts` | 97/97 (84 new) | |
| 648 | 216 pass, 0 fail, 2 skipped | 145/145 | |
| create a mockup office | 287 pass, 2 skipped (`tdd-backend.md`) | 191/191 (`tdd-frontend.md`) | e2e: `skipped: no e2e runner`, journeys listed in [e2e.md](../runs/manual-create-a-mockup-office-for-booking/e2e.md) |
| containerize | 72 backend tests at the AC7 check | n/a | Stack tests are in [container-engineer.md](container-engineer.md) |
| 649 select/deselect | n/a | 247/247 (56 new: calendar +8, desk plan +11, `booking.component.toggle.spec.ts` +37); 38 red specs adapted to the spec | [tdd-frontend.md](../runs/649/tdd-frontend.md); e2e `skipped: no e2e runner` ([e2e.md](../runs/649/e2e.md)) |
| terms page (green) | n/a | 270/270 (+1 signed-in order spec; 6 red at baseline now pass); build pass | [tdd-frontend.md](../runs/manual-terms-services-page/tdd-frontend.md); e2e `skipped: no e2e runner` ([e2e.md](../runs/manual-terms-services-page/e2e.md)); no defects; focus style unasserted |
| 650 desk numbering (green) | 308: 306 pass, 2 skipped; fixtures adapted to A1-D4 / 16 desks | 263/263 (+2: `data-block`, spacing classes); fixtures adapted | [tdd-green.md](../runs/650/tdd-green.md); e2e `skipped: no e2e runner` ([e2e.md](../runs/650/e2e.md)); no defects |
| 650 desk numbering (red) | see `tdd-backend.md` | 261/261, 14 new in `desk-numbering.spec.ts`, all already-green (UI is data-driven); block separation deferred-to-green | [tdd-frontend.md](../runs/650/tdd-frontend.md) |
| 650 desk numbering (red) | 308 run: 289 pass, 17 red (`desksRenumber.test.ts`: static checks of the 006+ migration, missing file) | not run | [tdd-backend.md](../runs/650/tdd-backend.md); first real `red` run |
| visible password (red) | n/a | 288 run: 270 pass, 18 red (new `*.password-toggle.spec.ts` in login and register; toggle button missing) | [tdd-frontend.md](../runs/manual-visible-password/tdd-frontend.md) |
| visible password (green) | n/a | 288/288 (18 red now pass); build pass | [tdd-frontend.md](../runs/manual-visible-password/tdd-frontend.md); e2e `skipped: no e2e runner` ([e2e.md](../runs/manual-visible-password/e2e.md)); no defects; Enter/Space and 320 px unasserted |
| hero section split (green) | n/a | 295/295 (+2 breakpoint specs 767/768 px, red specs pass); build pass | [tdd-frontend.md](../runs/manual-div-for-hero-section/tdd-frontend.md); e2e `skipped: no e2e runner` ([e2e.md](../runs/manual-div-for-hero-section/e2e.md)); no defects |
| hero section split (red) | n/a | 293 run: 291 pass, 2 red (`booking.component.hero-layout.spec.ts`: equal widths, row fill); 3 already-green guards | [tdd-frontend.md](../runs/manual-div-for-hero-section/tdd-frontend.md); 768 px media query not testable from a spec |

## Defects and lessons

- 601: no `npm test` script (added during the login endpoint task); `PORT` not validated; `tests/` not type-checked.
- Info page: `info-route.spec.ts` lacked `provideLocationMocks()`, so specs push into real browser history.
- 649: the implementer changed behaviour (no preselected day, own desk toggles) without touching specs, so 38 specs were red; the fix was in the specs (`setup` clicks a day, `day: null` = none), not a defect. No fix loop.
- No test-fix loop (`maxTestFixLoops`) was triggered in any recorded task.

## Open items

- No database-backed tests: unique index, FK mapping and migrations were only checked statically (`desksMigrations.test.ts`) or against fakes.
- No test of nginx or the container stack beyond the Container Tester checks.
- No e2e runner; adding Playwright or Cypress is a dependency and project change, so it needs an approved spec.
- Layout checks at 320 px and 200% zoom were manual or deferred.
- Enter/Space and highlight colours are only asserted by element type and CSS class, not by key events or pixels (needs an e2e runner).

## Notes for the new skills

- `tdd` writes tests from the acceptance criteria and API contract, not from the implementation; it reports, the caller runs the fix loop.
- `tdd` has modes: `red` (before implementing, `workflow.tddFirst`: tests must fail for the right reason, uncompilable ones are `deferred-to-green`) and `green` (after). The red phase has not run on a real task yet; the first run may show that UI specs need more detail in the spec (selectors, texts).
- `test` runs `tdd` first, then e2e per `workflow.e2e` (`auto`); without a runner it records `skipped`.
