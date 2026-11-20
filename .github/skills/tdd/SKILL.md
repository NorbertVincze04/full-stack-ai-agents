---
name: tdd
description: "Use for the test-driven stage: write unit and integration tests from the acceptance criteria and API contract (not from the implementation). Mode red runs before implementing (tests must fail for the right reason); mode green runs after implementing and reports failing tests as defects for the fix loop."
argument-hint: "<task-id> [backend | frontend | all] [red | green] [rerun: <failing test names>]"
user-invocable: false
---

Agent: `Tester`. Called by `start-task` (mode `red`) and by `test` (mode `green`); run it through a `Tester` subagent if you are another agent.

# Get task
Read `docs/specs/<task-id>.md` (acceptance criteria, API contract) and the `Tests` and `Conventions` sections of `docs/context/<area>.md`. Areas come from the argument or the spec `Area` (`frontend` and `backend` only). Mode: the argument; default `green`. Respect `.github/config.json` -> `workflow.tdd` (`always` or `on-demand`) and `workflow.tddFirst` (the Orchestrator calls `red` only when it is true). Read `docs/agents/tester.md` first (test history, known gaps).
- `red`: no implementation exists yet. Do not read implementation files beyond what is needed to compile (existing public surface, mocks).
- `green`: also read `docs/runs/<task-id>/tdd-<area>.md` (the red baseline, if any) and `docs/runs/<task-id>/implement-<area>.md` (only the changed files and the contract).

## Steps
1. Map every acceptance criterion to at least one test: happy path, validation (400), auth (401/403), not found (404), conflict (409), rate limiting where relevant; for the frontend: validation, guards, error states and HTTP calls with `HttpTestingController`.
2. Write the tests from the spec and the contract.
   - Backend: `node:test` under `Backend/tests/`; mock repositories or the DB layer.
   - Frontend: Karma/Jasmine `*.spec.ts` next to the code.
   - `red`: the suite must still compile (one compile error stops the whole Karma/Node run). Test through the nearest existing public surface (HTTP route, DOM text/role/`aria-*` named in the spec, router path). A test that needs a symbol or file that does not exist yet is written at `green` and listed as `deferred-to-green`.
3. Run: `npm test` in `Backend/` and `npm run test:ci` in `Frontend/` (headless, single run); `npm run test:coverage` only if the script exists.
4. `red`: the new tests must fail, and for the right reason (missing behaviour, not a compile or setup error). Tests that already pass are listed as `already-green` (the behaviour exists or the test is too weak: say which). Failing tests here are the target of the implementation, not defects, and there is no fix loop.
5. `green`: all tests must pass. A failing test is a defect candidate: record the suspected cause and a severity (`blocker`, `high`, `medium`, `low`). If the test is wrong because it contradicts the spec, acceptance criteria or an approved risk, correct that test only (never weaken the assertion) and say so in the report. Write the `deferred-to-green` tests now.
6. Write `docs/runs/<task-id>/tdd-<area>.md` (about 60 lines). `red`: section `Red baseline` (tests added, expected failures with the reason, `already-green`, `deferred-to-green`, AC coverage matrix). `green`: results and coverage, tests added or corrected since red, failures with cause and severity. On `rerun:` re-run the full suite and show a per-test status (resolved / still failing).
7. **Update context**: only when run on its own (`red` called by `start-task`, or `green` called by `test`: the caller's stage records it once): update `docs/agents/tester.md` per `docs/context/README.md` (Agent context files).
8. Return `Verdict`: `red-ready` (mode `red`: failing for the right reasons) | `pass` | `fail` (mode `green`), report path, failing test names with severity. The caller runs the fix loop (`Implementer` `fix:` then `rerun:`); you do not.

## When it fails
- No test script or runner in the area: return `fail` with severity `high` and the missing script; do not add dependencies.
- `red` suite does not compile or fails for a setup reason: fix the test; if the spec gives too little to write the test (names, texts, routes), return `needs-human` with the missing detail instead of guessing.
- `green` build or test run cannot start (compile error in the application): return `fail` pointing to the build error so the Implementer fixes it.
- Flaky test (passes and fails without a change): mark it flaky, make it deterministic, never retry until green.

## Never
- Change application code to make a test pass, or create production stubs so a red test compiles.
- Weaken, skip or delete a failing test; a test is changed only when it contradicts the spec.
- Connect to a real database, the Cloud Foundry tunnel, production URLs or use real credentials.
- Write outside the test folders, your reports and `docs/agents/tester.md`.
