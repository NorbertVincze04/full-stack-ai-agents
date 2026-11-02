# Agent workflow

Entry point: `Principle Orchestrator` (or the `/start-workflow` prompt).

```mermaid
flowchart TD
  H[Human] --> PO[Principle Orchestrator]
  PO --> TI[Task Ingestion]
  PO --> SP[Spec]
  SP -. questions .-> H
  PO --> FO[Frontend Orchestrator]
  PO --> BO[Backend Orchestrator]
  PO --> CO[Container Orchestrator]
  CO --> CB[Container Builder] --> DM[Database Migrator] --> CT[Container Tester] --> CR[Container Reviewer]
  FO --> FB[Frontend Builder] --> FT[Frontend Tester - on demand] --> FR[UI/UX + Code + Security reviewers]
  BO --> DB[Database Builder] --> BB[Backend Builder] --> BT[Backend Tester] --> BR[Code Reviewer + Security]
  PO --> HO[Handover]
  FR --> PR1[Frontend Task-to-PR: prepare]
  BR --> PR2[Backend Task-to-PR: prepare]
  PR1 & PR2 --> PO
  PO -. confirm commit / push .-> H
  PO --> PRC[Task-to-PR: commit, then push]
```

## Artifacts (all under `docs/`)

| Path | Written by |
| --- | --- |
| `tasks/<task-id>.md` | Task Ingestion (status updated by later agents) |
| `specs/<task-id>.md` | Spec |
| `runs/<task-id>/<step>.md` | Each builder/tester/reviewer, one report per step |
| `handover/<task-id>.md` | Handover |

## Configuration

`.github/config.json` -> `workflow`: `frontendTester` / `backendTester` accept `always` or `on-demand`; `backendSecurity` accepts `always`, `auto` or `on-demand`; `reviewers` is `auto` (the orchestrators pick only the reviewers the task needs, based on the spec `Scope flags`) or `all` (run every reviewer); `maxFixIterations` bounds the review-fix loop; `maxTestFixLoops` bounds the test-fix loop per failing test.

## Risk gate

Security changes, anything that can damage the database, and changes to major functionality need your approval first (`docs/risk-gate.md`). `Spec` lists them under `Risk gate`; the principle orchestrator asks you per item before any build. If a builder finds an unapproved risky change mid-build, it stops with `needs-approval`, the orchestrator returns `needs-human`, and you are asked. Agents never run SQL against anything except the local `db` container; `Database Migrator` applies migrations there (backup first for risky ones), so you do not run migration files by hand. `Handover` records the approved risks.

## Test-fix loop

When a tester reports a failing test, the orchestrator does not go on to the reviewers. Per failing test, up to `maxTestFixLoops` (2) rounds: builder diagnoses the root cause and fixes it, then the tester re-runs. If a test still fails afterwards, the orchestrator returns `needs-human` with the root cause, what was tried and a question with options; the principle orchestrator asks you, passes your answer back, and the counter for those tests restarts.

## Context files

`docs/context/` (`project.md`, `backend.md`, `frontend.md`, `containers.md`) hold a compact, current map of the app so agents do not re-analyse the codebase per task. Builders update them at the end of each task and they are committed with the code; every other agent reads them first and opens only the files they point to. Protocol, freshness check and template: `docs/context/README.md`.

## Containers (Podman, local)

Tasks with `containers` in the spec `Area` go to `Container Orchestrator`: `Container Builder` (compose file, Containerfiles for frontend/backend/db, nginx, `.env`), `Database Migrator` (applies `Backend/db/migrations` to the `db` container), `Container Tester` (`podman compose up -d --build`, health and connectivity checks), `Container Reviewer`. Design, ports, env variables and the Bosch proxy/CA handling: `docs/context/containers.md`; settings: `.github/config.json` -> `containers`. Sensitive actions (creating the Podman machine, volume/prune/`down -v`, overwriting `.env`, installing a CA, proxy changes) go through the risk gate. Order when several areas are involved: backend, frontend, containers.

## Scope-based routing

- The spec chooses the smallest `Area`. A `frontend` task never calls any backend agent (orchestrator, builder, tester, reviewers, Task-to-PR) and vice versa.
- Each orchestrator selects reviewers from the spec `Scope flags` (`ui-changes`, `logic-changes`, `security-relevant`, `dependencies-changed`, `database-changes`, `scaffolding-only`) and reports every run/skip with a reason; `Handover` records it under `Review coverage`.

## Prerequisites

- VS Code setting `chat.subagents.allowInvocationsFromSubagents` = `true` (set in `.vscode/settings.json`); orchestrators call sub-agents from sub-agents.
- Start the `ado` server from the MCP view and enter the PAT when prompted (Azure tasks only).

## Task-to-PR

Runs after the reviewers, in three human-gated stages:

1. **prepare** (called by each orchestrator): no git changes; writes `runs/<task-id>/pr-<area>.md` and returns the proposed branch, commit message and file list.
2. **commit**: the principle orchestrator shows the proposals and asks the human to confirm; only then it calls the Task-to-PR agents with `mode: commit`, `human-confirmed: true` and the confirmed files. Both areas commit on one branch `feature/<task-id>-<title>`.
3. **push**: a separate confirmation; only then `push: true` pushes and opens one PR (`gh` or `az repos pr create`).

The workspace must be a git repository; otherwise the step is skipped. `Handover` runs after the commit step, so `docs/handover/` and the final task status are not part of the commits.
