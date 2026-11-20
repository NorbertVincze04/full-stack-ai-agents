---
name: test
description: "Use to run the test stage of a task: the TDD suite first, then end-to-end tests of the user flows in the acceptance criteria. Reports failing tests for the fix loop."
argument-hint: "<task-id> [tdd | e2e | all] [rerun: <failing test names>]"
user-invocable: true
---

Agent: `Tester`. If you are another agent, run this skill through a `Tester` subagent.

# Get task
Read `docs/runs/<task-id>/brief.md` first if it exists (acceptance criteria, `Scope flags`, limits), else `docs/specs/<task-id>.md`; then the `implement-*.md` reports; read `.github/config.json` -> `workflow` (`tdd`, `e2e`). Default mode is `all`. Read `docs/agents/tester.md` first (test history, known gaps, e2e status). e2e tests run against the local stack only.

## Steps
1. Run the `tdd` skill in mode `green` for the areas of the task (mode `tdd` or `all`); it writes the tests that were deferred at the red phase and checks the red baseline in `tdd-<area>.md`. If it fails, return the failing tests and stop: e2e is not run on red unit tests.
2. e2e (mode `e2e` or `all`, per `workflow.e2e`: `auto` = when the spec has `ui-changes` or API changes and an e2e runner exists; `always`; `off`):
   - Find the runner (Playwright/Cypress in `Frontend/`, or an `e2e` folder in `Backend/tests/`). Without a runner, record `skipped: no e2e runner` and list it as a follow-up.
   - Use the running local stack (`http://localhost:<FRONTEND_PORT>` from `.env`, default 4200; start it with `<runtime> compose up -d` from `containers.runtime` if it exists and is not running). If there is no stack, record `skipped: no stack`.
   - Map each user-visible acceptance criterion to one journey (for example register -> login -> book a desk). Test data is created and removed by the test, with dummy values.
3. Write `docs/runs/<task-id>/e2e.md` (about 60 lines): journeys, AC coverage, results, failures with cause and severity, skipped items and why.
4. **Update context**: update `docs/agents/tester.md` per `docs/context/README.md` (Agent context files): this task's row (tests and results, e2e status), defects found, coverage gaps in `Open items`.
5. Return `Verdict: pass | fail | skipped`, report paths (`tdd-*.md`, `e2e.md`), failing tests with severity. The caller runs the fix loop and calls this skill again with `rerun:`.

## When it fails
- Stack does not start or is unhealthy: return `fail` with `Root cause in: containers` (not an app defect) and the stack logs summary.
- Spec requires a UI journey but there is no e2e runner: return `needs-human` asking whether to add one (a dependency and project change, risk gate).
- A failing e2e test points at an application defect: return it as a failing test with suspected cause; do not patch the app.

## Never
- Change application code, weaken or delete failing tests.
- Run tests against production URLs, remote databases or real credentials; print `.env` values.
- Add an e2e runner or any dependency without an approved spec.
- Leave test data in the database.
