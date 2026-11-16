# Task Analyst - context

Agent: `.github/agents/task-analyst.agent.md` | Skills: `get-task`, `spec` | Replaces: Task Ingestion, Spec.

Turns a work item into `docs/tasks/<id>.md` and `docs/specs/<id>.md`. Azure DevOps project `WebTools`, tag filter `deskbookingPrj` (`.github/config.json`).

> Read this file first instead of re-reading old reports. Update it at the end of every task (rules: `docs/context/README.md`, Agent context files). Keep it under ~80 lines.
> Updated: 2026-11-16 (task 649 answers merged, specified)

## Tasks

| Task | Source | Type | Spec highlights |
| --- | --- | --- | --- |
| 601 | Azure | feature (setup) | 6 acceptance criteria: Angular 18 NgModule, `ng serve` on 4200, Express backend, `hello world`, build, git-ignored files |
| 602 | Azure | feature | 7 ACs: sticky footer, runtime year, unit test; work item has empty `System.Tags`, so the tag filter does not find it |
| 648 | Azure | feature | Calendar, 4-weekday window, Book Now / Withdraw, JWT-protected bookings; task had 8 open questions (window rule, error wording, one booking per user, persistence, relation to the header); risks R1 JWT, R2 migrations, R3 personal data |
| header with app name and login button | manual | feature | 11 ACs, no criteria in the task file |
| info page | manual | feature | 7 spec ACs (task has 3); security review skipped by scope flags |
| backend login endpoint | manual | feature | Task asked for a destructive `users` recreate and CORS `*`; spec turned them into risks R1, R2, plus R4 rate limit and R7 dependencies; 16 criteria |
| login and register pages | manual | feature | 12 ACs; decisions D1 (validation rules), R5 Font Awesome, R6 shared rate-limit bucket behind nginx |
| create a mockup office for booking | manual | feature | 10 ACs: 12-desk plan, desk availability, `desk` required on booking, additive migrations |
| containerize the app with Podman | manual | containers | Largest spec (decisions D1-D9, risks R1-R8): only the frontend is published, nginx `/api/` proxy, Bosch proxy handling |
| add CI and CD pipelines | manual | pipelines | Pipeline scope `ci + cd`, 8 criteria plus an extra AC9 (actions pinned, `actionlint`) |
| CI on dev push, then CD after CI success | manual | pipelines | Inspection-only task; risks R1 (auto-merge on first green CI), R2 (repository settings) |
| 649 | Azure | feature | Frontend-only toggle select/deselect for calendar days and desks; 11 ACs after answers (no day on load, disabled `Book Now` without a day, own day/desk toggle = selection only); risks R1-R3 (all low); decisions D1-D3, no open questions; spec `docs/specs/649.md` |

## Defects and lessons

- Missing `deskbookingPrj` tag on work items 602, 648 and 649 (follow-up in the handovers).
- Task 649: one-line AC ignored the consequence of deselecting the day (page always had a date selected); turned into question Q1 instead of assuming. "Toggle" on an own booking is ambiguous with withdraw; the spec fixes it as selection-only (D3).
- Task 649: existing specs assume a preselected first day; the no-preselection answer requires adapting them (AC11).
- Task 648: acceptance criterion only covered the happy path; the spec added the weekend, past-date, anonymous and withdraw cases.
- Backend login task: the literal request (drop `users`, CORS from any origin) was a risk-gate item and was approved only in a safer form.

## Open items

- `/get-task` and `/spec` skills are new; `Decisions` section and `decision:` input are new and not used yet.
- Task 649 is specified; R1-R3 wait for the approval gate.
- The `list` mode depends on the `ado` MCP server (PAT prompt) being started.
