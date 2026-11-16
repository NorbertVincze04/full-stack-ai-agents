# Risk gate

Some changes must not be implemented without an explicit human decision. Subagents cannot ask the human, so they stop and report; the `Orchestrator` (or the top-level chat when a command is started directly) asks.

## What counts as risky

| Category | Examples |
| --- | --- |
| Security | Authentication/authorization logic, JWT/session handling, password or secret storage and hashing, roles/permissions, route guards, CORS or rate-limit changes, token storage in the browser, weakening or removing any existing security control, handling of personal data |
| Database | `DROP`, `TRUNCATE`, `DELETE`/`UPDATE` without a narrow `WHERE`, removing or retyping columns, adding `NOT NULL`/`UNIQUE`/FK constraints on tables with data, data migrations or backfills, anything that rewrites or loses existing data, running anything against a real database |
| Major functionality | Removing or changing the behaviour of an existing endpoint, route or flow (login, booking, admin), breaking an API contract, replacing core libraries, major dependency upgrades, changing the project structure or build pipeline |
| Local environment / containers | `podman machine init/rm/reset/set`, `podman system prune/reset`, `podman volume rm/prune`, `compose down -v` (Podman or Docker), `docker system prune`, `docker volume rm/prune`, removing containers/images/volumes outside the `deskbooking` compose project; overwriting an existing `.env`, printing or committing secrets; installing a CA certificate; changing proxy or Podman/Docker/WSL settings; converting the setup to another runtime and moving database data between runtimes; binding a port to a non-loopback address; privileged containers or host mounts outside the repo; pulling images from registries not in `containers.allowedRegistries`; installing tools (for example a runtime or compose provider) |
| Pipelines / CI-CD | A workflow that pushes or merges into a branch (including the CD merge into the release branch), `contents: write` or any permission above read, `secrets.*`/tokens, third-party actions outside `actions/*`, `pull_request_target`, self-hosted runners, any deployment, publishing, tagging or release, making a check non-blocking or removing it, changing branch protection or repository settings, changing the triggers on the release branch |

When in doubt, treat it as risky.

## Rules

1. `/spec` lists every risky item it foresees under `Risk gate` in the spec (`R1`, `R2`, ...), with impact and a safer alternative when one exists.
2. `/clarify-task` (Orchestrator) asks the human about each item at the approval gate (approve, use the safer alternative, skip/edit spec). The approved items are passed down as `approved-risks`.
3. A skill implements a risky change only if it is in `approved-risks`. If it discovers one that is not (or the approval does not cover what it is about to do), it must not implement it: it returns `Verdict: needs-approval` with the change, impact, alternatives and a question; the Orchestrator asks the human.
4. Approval covers exactly what was described. Anything wider needs a new question.
5. Agents never run SQL against any database except the local `db` container of this project (never Cloud Foundry or any remote host). `implement database` only writes migration files and applies them to the local container (`.github/skills/implement/database.md`). Risky statements (see Database) are applied only if approved exactly as described, after a `pg_dump` backup, and are marked `RISK` in the report.
6. Container and environment actions from the `Local environment / containers` row need approval before they run; routine actions (build, `compose up -d`, `compose down` without `-v`, creating a missing `.env`, reading logs) do not.
7. Pipeline actions from the `Pipelines / CI-CD` row need approval before they are written; plain verification jobs with read-only permissions do not.
8. `/create-pr` records every approved risk and who approved it under `Approved risks` in `pr.md`.
