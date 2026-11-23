---
name: approve-pr
description: "Use after the human approved the proposal from /create-pr: commit the confirmed files on a `task/<task-id>` branch created from `dev`, then (after a separate confirmation) push that branch and open the pull request into `dev`, and close the task. Mode cleanup removes the task branch once CD has merged it into main."
argument-hint: "<task-id> [commit | push | cleanup] [message: <commit message>] [files: <confirmed file list>]"
user-invocable: true
---

Agent: `Release Manager`. If you are another agent, run this skill through a `Release Manager` subagent.

# Get task
Read `docs/runs/<task-id>/pr.md` (the proposal; if it is missing run `create-pr` first), `docs/tasks/<task-id>.md` and `git status`. Confirmation comes from the caller as `human-confirmed: true` (commit) and `push: true` (push), or because the human typed `/approve-pr` themselves in this chat. Default mode is `commit`; `push` runs only on its own explicit confirmation; `cleanup` needs no confirmation (it only removes a branch that is already merged into `main`). Read `.github/config.json` -> `pipelines.branches`, `pullRequests` (`baseBranch`) and `azureDevOps.doneState`. Read `docs/agents/release-manager.md` first.

The task branch is `task/<task-id>` (task id sanitized to `[A-Za-z0-9._-]`). It is the only kind of branch agents may create, push or delete.

## Steps
1. Check the confirmation. Without it, stop and return the proposal again (except `cleanup`).
2. **commit**: use the confirmed `files` (or the proposal's list) and message. If `git status` shows a different set of changed files, stop and report the difference. Branch handling: if the integration branch (`pullRequests.baseBranch`) is checked out, run `git switch -c task/<task-id>` (uncommitted changes come along); if `task/<task-id>` is already checked out, continue on it; any other branch: stop and report. Stage only the confirmed files and commit; return the hash and branch.
3. **push** (`push: true`, after a commit exists on `task/<task-id>`): `git push -u origin task/<task-id>`, then open the pull request with `gh pr create --base <baseBranch> --head task/<task-id> --title "<task-id>: <title>" --body-file docs/runs/<task-id>/pr.md` (if a PR for the branch already exists, return its URL). If `gh` is not installed or not authenticated, return the GitHub compare link `https://github.com/<owner>/<repo>/compare/<baseBranch>...task/<task-id>?expand=1` and say so. Never push `dev`, the release branch or `main`/`master`, never merge the PR; the human merges it (after `CI - PR Check` and the area CI pass), then CI runs on `dev` and CD merges `dev` into `main`.
4. **close the task**: if all acceptance criteria in the handover (including the manual ones the human confirmed before the commit) are `Verified` and no `blocker` finding and no non-dependency `high` finding is open (dependency advisories block only when `critical`), set the task file `status` to `done` and, for `source: azure`, `System.State` to `azureDevOps.doneState` via the `ado` update tool. Otherwise set `implemented` and list what blocks `done`. Do this only after a successful push; after a local-only commit leave the status `implemented`.
5. **cleanup** (the human reports the PR merged; run it once CD has promoted it): `git fetch --prune origin`. Check the PR is merged (`gh pr view task/<task-id> --json state,mergeCommit`, or ask the human if `gh` is unavailable) and that its merge commit is contained in `origin/<release>` (`git merge-base --is-ancestor <sha> origin/<release>`); if not, report "CD has not merged it yet" and keep the branch. Otherwise: `git switch <baseBranch>`, `git pull --ff-only origin <baseBranch>`, `git branch -d task/<task-id>` (use `-D` only after the PR is confirmed merged, since squash merges look unmerged locally). The remote branch is deleted by the CD workflow (job `cleanup`); if it still exists on `origin` after `git fetch --prune`, delete it with `git push origin --delete task/<task-id>`. Return what was deleted. Never delete any other branch.
6. **Update context**: in this task's row of `docs/agents/release-manager.md` record the commit hash, branch, push state and PR URL, and the final status; a one-line edit that rides along with the next task's commit. After `cleanup` note the branch as deleted.
7. Return `Mode`, branch, commit message, files, commit hash, push state, PR URL, final task status (local and Azure), and for `cleanup` the deleted branches.

## When it fails
- Staged or changed files differ from the confirmed list: stop and report; do not guess.
- A git hook fails: report the output and fix the cause; never bypass it.
- Push rejected (non-fast-forward, branch protection): report it; never force-push.
- `task/<task-id>` already exists with different commits: stop and ask; do not reuse or overwrite it.
- `ado` tools unavailable: say so and leave the Azure state unchanged.

## Never
- Commit or push without the human's confirmation; combine the commit and push confirmations or confirm on the human's behalf.
- Force-push, use `--no-verify`, rewrite history, or push `dev`/`main`/`master`/the release branch.
- Merge a pull request, or delete a branch that is not `task/<task-id>` or is not yet in the release branch.
- Stage `.env`, certificates, `db-backups/` or files outside the confirmed list; run `git init`.
- Change anything in Azure DevOps except `System.State`, or print the PAT.
