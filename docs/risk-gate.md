# Risk gate

Some changes must not be implemented without an explicit human decision. Subagents cannot ask the human, so they stop and report; the principle orchestrator asks.

## What counts as risky

| Category | Examples |
| --- | --- |
| Security | Authentication/authorization logic, JWT/session handling, password or secret storage and hashing, roles/permissions, route guards, CORS or rate-limit changes, token storage in the browser, weakening or removing any existing security control, handling of personal data |
| Database | `DROP`, `TRUNCATE`, `DELETE`/`UPDATE` without a narrow `WHERE`, removing or retyping columns, adding `NOT NULL`/`UNIQUE`/FK constraints on tables with data, data migrations or backfills, anything that rewrites or loses existing data, running anything against a real database |
| Major functionality | Removing or changing the behaviour of an existing endpoint, route or flow (login, booking, admin), breaking an API contract, replacing core libraries, major dependency upgrades, changing the project structure or build pipeline |

When in doubt, treat it as risky.

## Rules

1. `Spec` lists every risky item it foresees under `Risk gate` in the spec (`R1`, `R2`, ...), with impact and a safer alternative when one exists.
2. `Principle Orchestrator` asks the human about each item at the approval gate (approve, use the safer alternative, skip/edit spec). The approved items are passed down as `approved-risks`.
3. A builder implements a risky change only if it is in `approved-risks`. If it discovers one that is not (or the approval does not cover what it is about to do), it must not implement it: it returns `Verdict: needs-approval` with the change, impact, alternatives and a question; the orchestrator returns `needs-human`.
4. Approval covers exactly what was described. Anything wider needs a new question.
5. Database changes are never executed by agents, approved or not: the SQL is delivered as a migration file for the human to apply, with each risky statement marked `RISK` in `docs/runs/<task-id>/database.md`.
6. `Handover` records every approved risk and who approved it under `Approved risks`.
