---
name: approve-pr
description: "Use after the human approved the proposal from /create-pr: commit the confirmed files on the current branch, then (after a separate confirmation) push and open the pull request on Azure DevOps or GitHub, and close the task."
argument-hint: "<task-id> [commit | push] [message: <commit message>] [files: <confirmed file list>]"
user-invocable: true
---

Agent: `Release Manager`. If you are another agent, run this skill through a `Release Manager` subagent.

# Get task
Read `docs/runs/<task-id>/pr.md` (the proposal; if it is missing run `create-pr` first), `docs/tasks/<task-id>.md` and `git status`. Confirmation comes from the caller as `human-confirmed: true` (commit) and `push: true` (push), or because the human typed `/approve-pr` themselves in this chat. Default mode is `commit`; `push` runs only on its own explicit confirmation. Read `.github/config.json` -> `pipelines.branches` and `azureDevOps.doneState`. Read `docs/agents/release-manager.md` first.

## Steps
1. Check the confirmation. Without it, stop and return the proposal again.
2. **commit**: use the confirmed `files` (or the proposal's list) and message. If `git status` shows a different set of changed files, stop and report the difference. Stage only those files on the checked-out branch and commit; return the hash.
3. **push** (`push: true`, after a commit exists): if the checked-out branch is the release branch or `main`/`master`, do not push; report it. Push any other branch. If it is the integration branch (`dev`), report `no PR: dev` (CI/CD promotes it). Otherwise open the PR with `gh pr create` or `az repos pr create`, using `docs/runs/<task-id>/pr.md` as the description and linking the Azure work item.
4. **close the task**: if all acceptance criteria in the handover are `Verified` and no `blocker` finding and no non-dependency `high` finding is open (dependency advisories block only when `critical`), set the task file `status` to `done` and, for `source: azure`, `System.State` to `azureDevOps.doneState` via the `ado` update tool. Otherwise set `implemented` and list what blocks `done`. Do this only after a successful push; after a local-only commit leave the status `implemented`.
5. **Update context**: in this task's row of `docs/agents/release-manager.md` record the commit hash, PR URL or the reason there is none, and the final status; a one-line edit that stays uncommitted and rides along with the next task's commit.
6. Return `Mode`, branch, commit message, files, commit hash, PR URL or the reason there is none, final task status (local and Azure).

## When it fails
- Staged or changed files differ from the confirmed list: stop and report; do not guess.
- A git hook fails: report the output and fix the cause; never bypass it.
- Push rejected (non-fast-forward, branch protection): report it; never force-push.
- `gh`/`az` missing or not logged in: give the PR description path and the exact manual command.
- `ado` tools unavailable: say so and leave the Azure state unchanged.

## Never
- Commit or push without the human's confirmation; combine the commit and push confirmations or confirm on the human's behalf.
- Force-push, use `--no-verify`, rewrite history, or push `main`/`master`/the release branch.
- Create, switch, rename or delete branches (no `git branch`, `git checkout -b`, `git switch`).
- Stage `.env`, certificates, `db-backups/` or files outside the confirmed list; run `git init`.
- Change anything in Azure DevOps except `System.State`, or print the PAT.
