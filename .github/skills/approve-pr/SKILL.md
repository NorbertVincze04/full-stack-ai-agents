---
name: approve-pr
description: "Use after the human approved the proposal from /create-pr: commit the confirmed files on a task branch (created from the integration branch when needed), then (after a separate confirmation) push that branch and open the pull request on GitHub into the integration branch, and close the task."
argument-hint: "<task-id> [commit | push] [message: <commit message>] [files: <confirmed file list>]"
user-invocable: true
---

Agent: `Release Manager`. If you are another agent, run this skill through a `Release Manager` subagent.

# Get task
Read `docs/runs/<task-id>/pr.md` (the proposal; if it is missing run `create-pr` first), `docs/tasks/<task-id>.md` and `git status`. Confirmation comes from the caller as `human-confirmed: true` (commit) and `push: true` (push), or because the human typed `/approve-pr` themselves in this chat. Default mode is `commit`; `push` runs only on its own explicit confirmation. Read `.github/config.json` -> `pipelines.branches`, `pullRequests` (`baseBranch`, `branchPrefix`) and `azureDevOps.doneState`. Read `docs/agents/release-manager.md` first.

## Steps
1. Check the confirmation. Without it, stop and return the proposal again.
2. **commit**: use the confirmed `files` (or the proposal's list) and message. If `git status` shows a different set of changed files, stop and report the difference. If the checked-out branch is the integration branch, the release branch or `main`/`master`, first create the task branch `<pullRequests.branchPrefix><task-id>` from it with `git switch -c` (uncommitted changes come along; local `dev` stays untouched); if a non-protected branch is checked out, use it. Stage only the confirmed files and commit; return the hash and branch.
3. **push** (`push: true`, after a commit exists): never push the integration branch, the release branch or `main`/`master`. Push the task branch with `git push -u origin <branch>`, then open the PR into `pullRequests.baseBranch` so it appears in the GitHub Pull requests tab: `gh pr create --base <baseBranch> --head <branch> --title "<commit subject>" --body-file docs/runs/<task-id>/pr.md` (the title must be `<task-id>: <title>` and the body non-empty: the `CI - PR Check` workflow enforces both). Add the Azure work item link to the body when the task has one. Return the PR URL.
4. **close the task**: if all acceptance criteria in the handover are `Verified` and no `blocker` finding and no non-dependency `high` finding is open (dependency advisories block only when `critical`), set the task file `status` to `done` and, for `source: azure`, `System.State` to `azureDevOps.doneState` via the `ado` update tool. Otherwise set `implemented` and list what blocks `done`. Do this only after a successful push; after a local-only commit leave the status `implemented`.
5. **Update context**: in this task's row of `docs/agents/release-manager.md` record the commit hash, PR URL or the reason there is none, and the final status; a one-line edit that stays uncommitted and rides along with the next task's commit.
6. Return `Mode`, branch, commit message, files, commit hash, PR URL or the reason there is none, final task status (local and Azure).

## When it fails
- Staged or changed files differ from the confirmed list: stop and report; do not guess.
- A git hook fails: report the output and fix the cause; never bypass it.
- Push rejected (non-fast-forward, branch protection): report it; never force-push.
- `gh` missing or not logged in (`gh auth status`): push the branch anyway, then give the pre-filled link `https://github.com/<owner>/<repo>/compare/<baseBranch>...<branch>?expand=1` (owner and repo from `git remote get-url origin`) and the description path; the human opens the PR.
- `ado` tools unavailable: say so and leave the Azure state unchanged.

## Never
- Commit or push without the human's confirmation; combine the commit and push confirmations or confirm on the human's behalf.
- Force-push, use `--no-verify`, rewrite history, or push `main`/`master`/the release branch.
- Create a branch other than `<branchPrefix><task-id>` from a protected branch, or rename, delete or switch between existing branches.
- Stage `.env`, certificates, `db-backups/` or files outside the confirmed list; run `git init`.
- Change anything in Azure DevOps except `System.State`, or print the PAT.
