# Context files protocol

Agents keep a short, current description of the app in `docs/context/` so they do not re-analyse the codebase on every task.

| File | Content | Owner (updates it) |
| --- | --- | --- |
| `project.md` | What the app is, what exists today, cross-cutting conventions | builders (status table), humans |
| `backend.md` | Backend map: commands, structure, config, API, DB, conventions, tests | `Backend Builder`, `Database Builder` |
| `frontend.md` | Frontend map: commands, structure, routes, components, services, conventions, tests | `Frontend Builder` |

`.github/docs/PROJECT_OVERVIEW.md` is the **target design**. The context files describe the **actual current state** and win on any conflict.

## Reading rules (every agent)

1. Read `docs/context/project.md` and the context file of your area first. Open source files only when the context file points to them as relevant to the task, or the builder report lists them.
2. Do not glob/scan whole folders to "understand the app". Use the structure tables in the context file.
3. Freshness check (cheap, once per task, builders and `Spec` only):
   - `ref` = `git log -1 --format=%H -- docs/context/<area>.md`
   - changed files = `git diff --name-only <ref> -- <Area>/` plus `git status --short <Area>/`
   - If nothing changed, trust the file. If files changed outside the workflow, read only those files and fix the affected sections before using them.
   - If the file has no commit yet, use `git status --short <Area>/` the same way.
4. If a context file is missing, the area's builder creates it by analysing the area once (bootstrap); other agents report it as missing and continue with the minimum reading needed.

## Update rules (builders)

At the end of each task, update only the sections that changed (new/removed files in the structure table, routes/endpoints, config, dependencies, commands, conventions, decisions). Keep every file under ~150 lines: tables and one-line entries, no code listings, no history. Do not record secrets or personal data. List the context file in the build report and keep it in the commit file list.

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
