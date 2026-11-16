---
name: create-pr
description: "Use to prepare the commit and pull request of a finished, reviewed task: verify the acceptance criteria against the evidence, write the PR description and handover, and propose branch, commit message and files. Changes nothing in git."
argument-hint: "<task-id>"
user-invocable: true
---

Agent: `Release Manager`. If you are another agent, run this skill through a `Release Manager` subagent.

# Get task
Read `docs/tasks/<task-id>.md`, `docs/specs/<task-id>.md` and every report in `docs/runs/<task-id>/`; run `git status`, `git diff --stat` and `git branch --show-current`. Read `.github/config.json` -> `pipelines.branches` and `azureDevOps`. Take `approved-risks`, the `Review selection` and, if given, the human's `human-accepted: true` from the caller.

## Steps
1. Confirm the workspace is a git repository and note the current branch. Do not propose a new branch.
2. Verify each acceptance criterion with evidence (test result, build output, reviewer report, or `human-accepted`). Unverified criteria stay `Not verified`; do not upgrade them.
3. Build the exact file list from the reports and `git status`. Allowed: `Backend/`, `Frontend/`, `compose.yaml`, `.env.example`, container files (`Containerfile`, `.containerignore`, `.dockerignore`, `nginx.conf`, `certs/README.md`), `.github/workflows/`, `docs/context/*`, `docs/tasks/<id>.md`, `docs/specs/<id>.md`, `docs/runs/<id>/`, `docs/handover/<id>.md`. Anything else is reported, not proposed.
4. Write `docs/runs/<task-id>/pr.md`: title, summary per area, acceptance criteria checklist, test results (tdd/e2e), `Review coverage` (each scope run or skipped and why), `Approved risks` and the human's decisions, migration to apply, how to start and verify, repository settings the human must configure (pipelines), open findings.
5. Write `docs/handover/<task-id>.md` (about 80 lines max): what was implemented per area, tools and technologies, dependencies added, files changed, acceptance criteria table (`AC`, `Verified | Not verified | Partially`, evidence), open findings, follow-ups.
6. Return the proposal: branch, commit message `<task-id>: <title>` plus a short body, file list with diffstat, open findings, unverified criteria, paths of `pr.md` and the handover.

## When it fails
- Not a git repository: report it and stop; do not run `git init`.
- Files in `git status` that are not in the allowed list, or `.env`, certificates, `db-backups/` untracked and not ignored: list them and stop until the caller decides.
- A secret-looking value in a file to be committed: stop, reference file and line only.
- A `blocker` finding still open, or no tests run for a logic change: list it prominently in the proposal; the human decides.

## Never
- Stage, commit, push or run any git command that writes; create, switch or delete branches.
- Modify source code, tests or other agents' reports.
- Mark an acceptance criterion verified without evidence.
- Include `.env`, certificates, backups or anything containing secrets.
