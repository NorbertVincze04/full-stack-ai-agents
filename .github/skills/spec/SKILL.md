---
name: spec
description: "Use when an ingested task needs a written specification: scope, area, acceptance criteria, risk gate and the open questions for the human. Also merges the human's answers or decisions into the spec. Second stage of the standard workflow."
argument-hint: "<task-id> [answers: <human answers>] [decision: <human decision>]"
user-invocable: true
---

Agent: `Task Analyst`. If you are another agent, run this skill through a `Task Analyst` subagent.

# Get task
Read `docs/tasks/<task-id>.md` (if it is missing, run `get-task` first). Then read `docs/context/project.md`, `docs/discovery.md` and the context file of each likely area (`backend.md`, `frontend.md`, `containers.md`, `pipelines.md`) following `docs/context/README.md`. `docs/discovery.md` is the fact base: dependencies, commands, routes, components, tables, variables and what exists or does not (`Not found`). Name only packages, files, routes and tables that appear in it or in the context files; anything else is new work in the spec or an open question, never an assumption. If it is missing (or the caller says it is stale), say so in the return (`Discovery: missing | stale`) and read the minimum code needed. Open source files only for what these cannot answer; read `.github/docs/PROJECT_OVERVIEW.md` only by section. If `docs/specs/<task-id>.md` exists, update it instead of starting over. Read `docs/agents/task-analyst.md` first (history, known defects, open items) instead of older specs.

## Steps
1. If the caller passed `answers:`, merge them into the spec and remove the answered questions. If it passed `decision:`, add it under a `Decisions` section (one line: what was decided and why) and change the spec only if the decision requires it.
2. Write `docs/specs/<task-id>.md` with: summary, scope and out-of-scope, `Area`, `Pipeline scope` (only if `pipelines` is in the area), `Scope flags`, functional requirements, API/data changes, UI behaviour, numbered acceptance criteria (`AC1`, `AC2`, ...), `Risk gate`, `Decisions`, `Open Questions`. One line per requirement; no code; do not restate the task.
3. `Area` is the smallest set of `frontend`, `backend`, `containers`, `pipelines`:
   - `frontend`: no backend, API or database change needed. `backend`: no UI change needed (includes database changes).
   - `containers`: Podman/Docker images, compose, `.env`, db container, local environment (`docs/context/containers.md`). Name the runtime if the task asks for one.
   - `pipelines`: CI/CD workflows, build/test automation, branch promotion (`docs/context/pipelines.md`). `ci` = verification, `cd` = promotion (merge only, no deployment; needs a CI workflow).
   - Say explicitly when containerizing needs an app change (health route, DB connection code, `apiUrl`) so it lands in `backend`/`frontend`.
4. `Scope flags` (yes/no each, one-line reason): `ui-changes`, `logic-changes`, `security-relevant`, `dependencies-changed`, `database-changes`, `scaffolding-only`. Reviewers and testers are chosen from these.
5. `Risk gate`: list every risky item (`R1`, `R2`, ...) per `docs/risk-gate.md` with impact and a safer alternative; `none` if there are none.
6. Questions: only those that block implementation or change the outcome, each with 2-4 suggested options and one recommended.
7. Set the task `status` to `specified` only when there are no blocking questions; otherwise leave it `new`.
8. **Update context**: update `docs/agents/task-analyst.md` per `docs/context/README.md` (Agent context files): add or update this task's row, defects or lessons (for example a risky request turned into a safer one), refresh `Open items`.
9. Return: `Spec file`, `Area`, `Pipeline scope`, `Scope flags`, `Risk gate`, `Discovery: used | missing | stale`, `Ready: yes | no`, `Questions for human` (numbered, with options), `Acceptance criteria`.

## When it fails
- Task file missing: run `get-task`; if that also fails, return `Ready: no` with the reason.
- Acceptance criteria missing or contradictory: list them as questions, do not invent them.
- Area cannot be decided from the context: ask a question with the candidate areas as options.
- Context file missing: report it and read the minimum code needed; the area's `implement` run bootstraps it.

## Never
- Write implementation code or touch `Backend/` or `Frontend/`.
- Answer your own open questions or assume answers; the Orchestrator relays them to the human.
- Cite a package, route, component, table or command that is not in `docs/discovery.md` or the context files as if it existed.
- Write outside `docs/specs/` except the task `status` and `docs/agents/task-analyst.md`.
- Pad the spec: it stays short and every acceptance criterion stays testable.
