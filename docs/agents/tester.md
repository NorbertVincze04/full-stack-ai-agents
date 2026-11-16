# Tester - context

Agent: `.github/agents/tester.agent.md` | Skills: `tdd`, `test` | Replaces: Frontend Tester, Backend Tester (and the test half of Container Tester).

Backend tests: `node:test` in `Backend/tests/` (`npm test`). Frontend: Karma/Jasmine (`npm run test:ci`). There is no e2e runner in the repository.

> Read this file first instead of re-reading old reports. Update it at the end of every task (rules: `docs/context/README.md`, Agent context files). Keep it under ~80 lines.
> Updated: 2026-11-16 (initial history from handovers)

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

## Defects and lessons

- 601: no `npm test` script (added during the login endpoint task); `PORT` not validated; `tests/` not type-checked.
- Info page: `info-route.spec.ts` lacked `provideLocationMocks()`, so specs push into real browser history.
- No test-fix loop (`maxTestFixLoops`) was triggered in any recorded task.

## Open items

- No database-backed tests: unique index, FK mapping and migrations were only checked statically (`desksMigrations.test.ts`) or against fakes.
- No test of nginx or the container stack beyond the Container Tester checks.
- No e2e runner; adding Playwright or Cypress is a dependency and project change, so it needs an approved spec.
- Layout checks at 320 px and 200% zoom were manual or deferred.

## Notes for the new skills

- `tdd` writes tests from the acceptance criteria and API contract, not from the implementation; it reports, the caller runs the fix loop.
- `test` runs `tdd` first, then e2e per `workflow.e2e` (`auto`); without a runner it records `skipped`.
