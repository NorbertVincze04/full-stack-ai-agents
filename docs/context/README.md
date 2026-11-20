# Context files protocol

Agents keep a short, current description of the app in `docs/context/` so they do not re-analyse the codebase on every task.

| File | Content | Owner (updates it) |
| --- | --- | --- |
| `project.md` | What the app is, what exists today, cross-cutting conventions | `Implementer`, `Container Engineer`, `Pipeline Engineer` (status table), humans |
| `backend.md` | Backend map: commands, structure, config, API, DB, conventions, tests | `Implementer` (`implement backend`, `implement database`) |
| `frontend.md` | Frontend map: commands, structure, routes, components, services, conventions, tests | `Implementer` (`implement frontend`) |
| `containers.md` | Docker/Podman compose stack: services, files, env vars, Bosch proxy handling, conventions | `Container Engineer` (`containerize`) |
| `pipelines.md` | CI/CD workflows: triggers, jobs, branch promotion, prerequisites, conventions | `Pipeline Engineer` (`ci-cd`) |

`.github/docs/PROJECT_OVERVIEW.md` is the **target design**. The context files describe the **actual current state** and win on any conflict.

## Reading rules (every agent)

1. Read `docs/context/project.md` and the context file of your area first. Open source files only when the context file points to them as relevant to the task, or the implement report lists them.
2. Do not glob/scan whole folders to "understand the app". Use the structure tables in the context file.
3. Freshness check (cheap, once per task, `implement`, `containerize`, `ci-cd` and `spec` only):
   - `ref` = `git log -1 --format=%H -- docs/context/<area>.md`
   - changed files = `git diff --name-only <ref> -- <Area>/` plus `git status --short <Area>/`
   - If nothing changed, trust the file. If files changed outside the workflow, read only those files and fix the affected sections before using them.
   - If the file has no commit yet, use `git status --short <Area>/` the same way.
4. If a context file is missing, the area's skill (`implement`, `containerize`, `ci-cd`) creates it by analysing the area once (bootstrap); other skills report it as missing and continue with the minimum reading needed.

## Update rules (implement, containerize, ci-cd)

At the end of each task, update only the sections that changed (new/removed files in the structure table, routes/endpoints, config, dependencies, commands, conventions, decisions). Keep every file under ~150 lines: tables and one-line entries, no code listings, no history. Do not record secrets or personal data. List the context file in the build report and keep it in the commit file list.

## Agent context files (`docs/agents/`)

Each agent keeps its own file (`orchestrator.md`, `task-analyst.md`, `implementer.md`, `tester.md`, `reviewer.md`, `release-manager.md`, `container-engineer.md`, `pipeline-engineer.md`): what it did per task, defects and lessons, open items. It replaces re-reading old specs, reports and handovers, which saves tokens and thinking time.

**Reading rules**
1. Every skill reads its agent's file first, together with `project.md` and the area context file. Treat it as the history of this agent: do not re-derive what it already says.
2. Open a linked report or handover only when the file points to it and the current task needs that detail. Never scan `docs/runs/`, `docs/handover/` or `docs/specs/` for history.
3. Read only your own agent's file. If something is missing or wrong, fix it at the end of the task.

**Update rules (end of every task, as the last step before returning)**
1. Edit only your own file, with targeted edits (do not rewrite it).
2. `## Tasks`: add one row for this task (or update the row you added earlier: task ID, type feature/bug/chore, one-line result, report link). Keep columns as they are.
3. `## Defects and lessons`: one row per defect found or fixed, decision taken, or lesson for next time (task, what, resolution). Skip routine success.
4. `## Open items`: add what stays open, delete what this task resolved.
5. Refresh the `Updated:` line (date and task ID).
6. Keep the file under ~80 lines: when a table passes ~12 rows, merge the oldest rows into one `Earlier tasks` row (`node scripts/compact-agent-context.mjs --write docs/agents/<your file>`; agents without `execute` do it by hand) and drop detail that a report link already holds. One line per entry; no code, no logs, no secrets or personal data, no copied report text.
7. Add the file to the commit list (`create-pr` allows `docs/agents/*.md`). Updates made after the commit (`Orchestrator` before `/create-pr` excepted, `Release Manager` recording the commit hash) stay in the working tree and ride along with the next task's commit.

## Template

```markdown
# <Area> context

## Stack and commands
## Structure (path -> role)
## Config / environment
## API or routes
## Data (backend only)
## Conventions
## Tests
## Decisions and known gaps
```
