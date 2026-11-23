# Task Analyst - context

Agent: `.github/agents/task-analyst.agent.md` | Skills: `get-task`, `spec` | Replaces: Task Ingestion, Spec.

Turns a work item into `docs/tasks/<id>.md` and `docs/specs/<id>.md`. Azure DevOps project `WebTools`, tag filter `deskbookingPrj` (`.github/config.json`).

> Read this file first instead of re-reading old reports. Update it at the end of every task (rules: `docs/context/README.md`, Agent context files). Keep it under ~80 lines.
> Updated: 2026-11-23 (manual visible-password task ingested)

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
| 649 | Azure | feature | Frontend-only toggle select/deselect for calendar days and desks; 11 ACs after answers (no day on load, disabled `Book Now` without a day, own day/desk toggle = selection only); risks R1-R3 (all low); decisions D1-D3; spec `docs/specs/649.md`. An e2e runner follow-up (D4-D8, ACs 12-20, R4, R5, R8) was withdrawn by human decision D9: no runner, no dependency, flags back to no dependency/security change, area `frontend` with no new work; AC10 is verified manually by the human (steps in the spec), then the task may be set to `done` |
| 650 | Azure | feature | Specified 2026-11-23, status `specified`, no open questions: 16 desks A1-D4 as 4 blocks of 2 x 2, labels only; area frontend + backend; human chose Q1c (delete and recreate desks; `booking_desk` set to NULL first because the FK blocks the delete); risks R1, R2 (destructive migration, safer alternative kept), decisions D1-D4, assumptions A1-A4 (incl. Q2c vs Q3a: blocks without headings); tag ignored |
| terms-services page | manual | feature | Frontend-only static page + header link (like info/Help); no AC or content given; answers Q1-Q4 merged (header next to Help, `/terms`, label "Terms", h1 "Terms of Service", placeholder text); status `specified`, 6 ACs, no risks |
| visible password | manual | feature | Specified 2026-11-23, status `specified`: frontend-only eye toggle (inline SVG, no dependency), 8 ACs, no risks; assumptions A1-A3 (hidden on load, per-field, accessible); Q1 answered a (both register fields, independent toggles, D1) |
| desk labeling | manual | defect/verification | Same as 650 (A1-D4). Human saw D01..D12: 006 not applied to the running DB (init SQL runs only on an empty `db-data` volume; Cloud Foundry is human-applied). Specified, area containers, no code change, ACs 1-5, risks R1-R3; open: which DB, who applies |

## Defects and lessons

- Missing `deskbookingPrj` tag on work items 602, 648, 649 and 650 (follow-up in the handovers).
- Task 649: one-line AC ignored the consequence of deselecting the day (page always had a date selected); turned into question Q1 instead of assuming. "Toggle" on an own booking is ambiguous with withdraw; the spec fixes it as selection-only (D3).
- Task 649: existing specs assume a preselected first day; the no-preselection answer requires adapting them (AC11).
- Task 649 follow-up: a runner request hides three risky choices (dependency, browser download behind the proxy, CI). The human finally chose the safer alternative (no runner, manual AC10 check, D9); an option choice (D5) was never a risk approval.
- Terms-services task: "heading" is ambiguous (app header vs `<h1>`); assumed header as A1 and asked, no content for the terms was given.
- Task 648: acceptance criterion only covered the happy path; the spec added the weekend, past-date, anonymous and withdraw cases.
- Backend login task: the literal request (drop `users`, CORS from any origin) was a risk-gate item and was approved only in a safer form.

## Open items

- `decision:` input used twice (649, D4 and D9); the task `status` stays `implemented` until the human accepts AC10 after the manual browser check.
- Task 649: nothing to implement; only the human's manual AC10 check and acceptance are open (`docs/runs/649/e2e.md` still describes the runner as a follow-up; the Tester or Release Manager records the result).
- Task 650: answers merged; ready for implementation (human applies the migration after `pg_dump`). Azure DevOps `System.State` set to `Done` on 2026-11-23 (human confirmed; only the state changed).
- manual-desk-labeling: answers merged, ready; local container only, Container Engineer dumps then `compose down -v` (R1, R2 approved); lesson: a migration in `db/migrations` does not reach an existing `db-data` volume.
- manual-terms-services-page: answers merged, ready for the frontend implementer.
- manual-visible-password: answers merged (Q1 = a), ready for the frontend implementer.
- The `list` mode depends on the `ado` MCP server (PAT prompt) being started.
