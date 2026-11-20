---
name: implement
description: "Use to implement a specified task in one area (frontend Angular, backend Express, or database PostgreSQL migrations), or to apply fixes requested by failing tests or reviews. Third stage of the standard workflow."
argument-hint: "<task-id> <frontend | backend | database> [fix: <report paths or human feedback>]"
user-invocable: true
---

Agent: `Implementer`. If you are another agent, run this skill through an `Implementer` subagent.

# Get task
Read `docs/runs/<task-id>/brief.md` first if it exists (scope, approved risks, decisions, context files to read, reports so far), then `docs/specs/<task-id>.md` for the requirement sections it lacks (functional requirements, API/data changes, UI behaviour); it must have `status: specified` or `in-progress`, otherwise stop and ask for `/spec`. Take `approved-risks` from the caller. Read `docs/agents/implementer.md`, `docs/context/project.md` and `docs/context/<area>.md` following `docs/context/README.md` (reading rules, freshness check, bootstrap if the file is missing); for `database` read the `Data` section of `backend.md`. Open only the source files the context points to; read `.github/docs/PROJECT_OVERVIEW.md` only by section. With `fix:`, read the given tester/reviewer reports first. If `docs/runs/<task-id>/tdd-<area>.md` has a `Red baseline`, those failing tests are your target: make them pass without editing them (a test that contradicts the spec is reported, not edited).

## Steps
1. Set the task `status` to `in-progress`.
2. Open only the annex of your area and follow it: [database.md](./database.md) (migration file, rules, applying it to the local db container; write `implement-database.md`), [backend.md](./backend.md) or [frontend.md](./frontend.md).
3. **fix**: for failing tests diagnose the root cause first (read the failing test and the code under test, reproduce with the test command) and fix the application code. If the test contradicts the spec or acceptance criteria, do not edit it: report it so the Tester corrects it. For review findings fix exactly those, nothing more.
4. Add dependencies only if the spec requires them and list each one (name, version, reason).
5. Run `npm run build` (and lint if configured) in the area; fix the errors you introduced. Do not write tests: the Tester owns them (TDD stage).
6. Update `docs/context/<area>.md` and the status line in `docs/context/project.md` for what changed.
7. Write `docs/runs/<task-id>/implement-<area>.md` (about 60 lines): acceptance criteria -> how implemented, API contract (method, path, auth, request, response, errors) for backend, files changed (including the context files), dependencies, commands run and results, diagnosis and fix for failing tests, known gaps.
8. **Update context**: update `docs/agents/implementer.md` per `docs/context/README.md` (Agent context files): this task's row (area, what was built), defects fixed or found, lessons, refresh `Open items`.
9. Return `Verdict: done | blocked | needs-approval`, report path, files changed, API contract summary, blockers or assumptions.

## When it fails
- Spec missing or not `specified`: return `blocked`.
- Missing API contract for the frontend: return `blocked`; do not guess endpoints.
- A risky change (`docs/risk-gate.md`: auth, JWT, passwords, CORS, destructive SQL, behaviour of existing endpoints or flows) is not in `approved-risks` or goes beyond what was approved: do not implement it, return `needs-approval` with the change, impact, safer alternatives and a question.
- Build errors you cannot fix, or a test that contradicts the spec: return `blocked` with the diagnosis.

## Never
- Touch another area, `.github/`, test files or other agents' reports; run git write commands.
- Hard-code secrets, tokens or URLs; concatenate SQL; run anything against a database other than the local db container.
- Invent API endpoints or add dependencies the spec does not ask for.
- Weaken or delete a test to make it pass.
