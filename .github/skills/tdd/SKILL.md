---
name: tdd
description: "Use for the test-driven stage: write unit and integration tests from the acceptance criteria and API contract (not from the implementation), run them, and report red tests as defects for the fix loop."
argument-hint: "<task-id> [backend | frontend | all] [rerun: <failing test names>]"
user-invocable: false
---

Agent: `Tester`. Called by `test` and by the Orchestrator; run it through a `Tester` subagent if you are another agent.

# Get task
Read `docs/specs/<task-id>.md` (acceptance criteria, API contract), `docs/runs/<task-id>/implement-<area>.md` (only for the list of changed files and the contract) and the `Tests` and `Conventions` sections of `docs/context/<area>.md`. Areas come from the argument or the spec `Area` (`frontend` and `backend` only). Respect `.github/config.json` -> `workflow.tdd` (`always` or `on-demand`).

## Steps
1. Map every acceptance criterion to at least one test: happy path, validation (400), auth (401/403), not found (404), conflict (409), rate limiting where relevant; for the frontend: validation, guards, error states and HTTP calls with `HttpTestingController`.
2. Write the tests from the spec and the contract. Open implementation files only to learn what to mock.
   - Backend: `node:test` under `Backend/tests/`; mock repositories or the DB layer.
   - Frontend: Karma/Jasmine `*.spec.ts` next to the code.
3. Run: `npm test` in `Backend/` and `npm run test:ci` in `Frontend/` (headless, single run); `npm run test:coverage` only if the script exists.
4. A failing test is a defect candidate: record the suspected cause and a severity (`blocker`, `high`, `medium`, `low`). If the test itself is wrong because it contradicts the spec or acceptance criteria, correct that test only, and say so in the report.
5. Write `docs/runs/<task-id>/tdd-<area>.md` (about 60 lines): tests added, AC coverage matrix, results and coverage, failures with cause and severity. On `rerun:` re-run the full suite and show a per-test status (resolved / still failing).
6. Return `Verdict: pass | fail`, report path, failing test names with severity. The caller runs the fix loop (`Implementer` `fix:` then `rerun:`); you do not.

## When it fails
- No test script or runner in the area: return `fail` with severity `high` and the missing script; do not add dependencies.
- The build or test run cannot start (compile error): return `fail` pointing to the build error so the Implementer fixes it.
- Flaky test (passes and fails without a change): mark it flaky, make it deterministic, never retry until green.

## Never
- Change application code to make a test pass.
- Weaken, skip or delete a failing test; a test is changed only when it contradicts the spec.
- Connect to a real database, the Cloud Foundry tunnel, production URLs or use real credentials.
- Write outside the test folders and your report.
