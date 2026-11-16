---
name: implement
description: "Use to implement a specified task in one area (frontend Angular, backend Express, or database PostgreSQL migrations), or to apply fixes requested by failing tests or reviews. Third stage of the standard workflow."
argument-hint: "<task-id> <frontend | backend | database> [fix: <report paths or human feedback>]"
user-invocable: true
---

Agent: `Implementer`. If you are another agent, run this skill through an `Implementer` subagent.

# Get task
Read `docs/specs/<task-id>.md`; it must have `status: specified` or `in-progress`, otherwise stop and ask for `/spec`. Take `approved-risks` from the caller. Read `docs/context/project.md` and `docs/context/<area>.md` following `docs/context/README.md` (reading rules, freshness check, bootstrap if the file is missing); for `database` read the `Data` section of `backend.md`. Open only the source files the context points to; read `.github/docs/PROJECT_OVERVIEW.md` only by section. With `fix:`, read the given tester/reviewer reports first. Read `docs/agents/implementer.md` first (what was built before, known defects and gaps) instead of older reports.

## Steps
1. Set the task `status` to `in-progress`.
2. **database**: follow [database.md](./database.md) (migration file, rules, applying it to the local db container) and write `docs/runs/<task-id>/implement-database.md`. The backend builds on it.
3. **backend** (`Backend/`, Node.js, Express 5, TypeScript ESM; routes -> controllers -> services -> repositories): implement routes, controllers, services, repositories, validation, middleware and error handling with correct HTTP codes; keep the `{ success, payload?, message?, errors? }` response shape; config from `src/config`; parameterised queries only.
4. **frontend** (`Frontend/`, Angular 18 NgModule, RxJS; PrimeNG only if the spec requires it): components, services, models, routes/guards, API calls, validation, loading and error states, accessible and responsive markup; follow `core/`, `features/`, `shared/`, route `data`, reactive forms, plain CSS per component. Use only the API contract from the spec or the backend report; URLs from `environment*.ts`.
5. **fix**: for failing tests diagnose the root cause first (read the failing test and the code under test, reproduce with the test command) and fix the application code. If the test contradicts the spec or acceptance criteria, do not edit it: report it so the Tester corrects it. For review findings fix exactly those, nothing more.
6. Add dependencies only if the spec requires them and list each one (name, version, reason).
7. Run `npm run build` (and lint if configured) in the area; fix the errors you introduced. Do not write tests: the Tester owns them (TDD stage).
8. Update `docs/context/<area>.md` and the status line in `docs/context/project.md` for what changed.
9. Write `docs/runs/<task-id>/implement-<area>.md` (about 60 lines): acceptance criteria -> how implemented, API contract (method, path, auth, request, response, errors) for backend, files changed (including the context files), dependencies, commands run and results, diagnosis and fix for failing tests, known gaps.
10. **Update context**: update `docs/agents/implementer.md` per `docs/context/README.md` (Agent context files): this task's row (area, what was built), defects fixed or found, lessons, refresh `Open items`.
11. Return `Verdict: done | blocked | needs-approval`, report path, files changed, API contract summary, blockers or assumptions.

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
