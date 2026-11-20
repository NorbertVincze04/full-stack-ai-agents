---
name: review
description: "Use to review the changes of a task (code quality, security, UX, container setup, CI/CD workflows) and report findings with severities and a verdict. Read-only; scopes are chosen from the spec scope flags."
argument-hint: "<task-id> [code | security | ux | containers | pipelines | all]"
user-invocable: true
---

Agent: `Reviewer`. If you are another agent, run this skill through a `Reviewer` subagent.

# Get task
Read `docs/runs/<task-id>/brief.md` first if it exists (acceptance criteria, `Scope flags`, approved risks; else `docs/specs/<task-id>.md`), the reports it lists in `docs/runs/<task-id>/` (`implement-*.md`, `tdd-*.md`, `e2e.md`, `containerize.md`, `ci-cd.md`) and the `Conventions` section of the area context file. Read `docs/agents/reviewer.md` first (past findings, recurring issues) and do not re-report an item it lists as accepted or already tracked unless this change worsens it. Inspect only the files the reports list (`git diff --name-only`, `git status`). Without a task ID (on-demand audit), use the structure table of the context file instead of scanning blindly and write `docs/runs/review-<yyyymmdd>-<scope>.md`.

## Steps
1. Scopes: use the argument; for `all` or no argument pick from the `Scope flags` and files changed, and give a one-line reason for every scope run or skipped (`Review selection`):
   - `code`: application logic changed (routes, controllers, services, repositories, components, guards, migrations); skip scaffolding-only, config-only or text-only changes
   - `security`: `security-relevant` or `dependencies-changed`, or the change touches auth, input, SQL, secrets/config, CORS, storage, `innerHTML`, dependencies (per `.github/config.json` -> `workflow.security`)
   - `ux`: `ui-changes` (templates, styles, components, routes users see)
   - `containers` / `pipelines`: when the area includes them
   `workflow.reviewers: all` runs every scope that applies to the changed areas.
2. For each scope apply the matching checklist in [checklists.md](./checklists.md), for each area changed (backend, frontend, containers, pipelines).
3. Take build and test results from the implement/tdd/e2e reports; run `npm run build` or `npm run lint` only if the reports lack them.
4. Write one report per scope, `docs/runs/<task-id>/review-<scope>.md` (about 60 lines): findings only, one line each: severity (`blocker`, `high`, `medium`, `low`), file/line or package, problem, suggested fix. No code listings.
5. Dependency advisories: npm `critical` -> `blocker`; `high`, `moderate`, `low` -> `medium` at most (listed as follow-ups, never blocking).
6. **Update context**: update `docs/agents/reviewer.md` per `docs/context/README.md` (Agent context files): this task's row (scopes, verdicts, counts), new or recurring findings under `Defects and lessons`, refresh `Open items`.
7. Return per scope `Verdict: approved | changes-requested` (changes-requested only with `blocker` or `high` findings), report path, count per severity, plus the `Review selection`.

## When it fails
- Reports missing: fall back to `git diff --name-only` and say which report was missing.
- `npm audit` or `npm outdated` cannot reach the registry (proxy, offline): record "not run: <reason>" as a `medium` finding; do not guess results.
- `actionlint` not installed: parse the YAML and read the file back instead.
- Scope cannot be decided: run it; an unnecessary review is cheaper than a missed one.

## Never
- Modify any file except your reports and `docs/agents/reviewer.md`; run `npm audit fix`; install tools.
- Run or dispatch a workflow, push, or run mutating container commands (`down -v`, `prune`, `rm`).
- Print secret values; reference file and line only.
- Report personal taste: every UX finding cites a spec requirement, an existing pattern or an accessibility rule.
- Scan external systems; only code and dependencies of this repository.
