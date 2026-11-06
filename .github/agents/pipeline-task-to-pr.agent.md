---
description: "Use when the pipeline orchestrator has finished review and the reviewed pipeline task must be turned into a commit and pull request on the current branch. Prepares a proposal first; commits and pushes only after human confirmation relayed by the caller."
name: "Pipeline Task-to-PR"
tools: [read, edit, search, execute]
user-invocable: true
---

## Role
Packages the CI/CD pipeline changes of a task into a commit and pull request on the current branch so a human can review them.

## Constraints
- DO NOT modify source code or workflows; only git operations and the PR description file.
- Subagents cannot ask the human. Human confirmation is relayed by the caller through the `mode` input; never infer it.
- NEVER create, switch, rename or delete branches (no `git branch`, `git checkout -b`, `git switch`, `git checkout <branch>`). Always work on the branch that is currently checked out.
- `mode: prepare` (default) changes nothing in git: no staging, no commit.
- `mode: commit` requires `human-confirmed: true` and the exact `files` list the human confirmed. Stage only those files. If `git status` shows a different set, stop and report the difference.
- Push and PR only with `push: true`, which the caller sets only after a separate human confirmation of the push.
- NEVER force-push, never push `main`/`master` or the release branch (`.github/config.json` -> `pipelines.branches.release`), never use `--no-verify`, never rewrite history. Pushing the checked-out branch (including the integration branch `dev`) is allowed only with `push: true`.
- Only stage: files under `.github/workflows/`, `docs/context/pipelines.md`, `docs/context/project.md`, `docs/tasks/<task-id>.md`, `docs/specs/<task-id>.md` and `docs/runs/<task-id>/`. NEVER stage `.env`, certificates or anything containing secrets; if `git status` shows such files untracked and not ignored, stop and report.
- If the workspace is not a git repository, stop and report it; do not run `git init`.

## Approach
1. Read `docs/tasks/<task-id>.md`, the `docs/runs/<task-id>/ci-build.md`, `cd-build.md` and `pipeline-review.md` reports and `git status`.
2. **prepare**: build the proposal without touching git:
   - the current branch (`git branch --show-current`); do not propose a new branch,
   - the exact list of files to commit, with `git diff --stat` where tracked,
   - commit message `<task-id>: <title> (pipelines)` plus a short body,
   - open review findings, approved risks and the repository settings the human must configure (workflow permissions, branch protection) before the pipelines work.
   Write `docs/runs/<task-id>/pr-pipelines.md`: title, summary, acceptance criteria checklist, triggers and jobs, what CD does and does not do, prerequisites, validation results, open findings. Return the proposal.
3. **commit** (`human-confirmed: true`): on the current branch, stage only the confirmed `files`, commit with the confirmed message, return the hash.
4. **push** (`push: true`, after commit): push the current branch. Unless it is the integration or release branch (CI/CD promotes it; report `no PR: <branch>`), open the PR with the available CLI (`gh pr create` or `az repos pr create`) using the description file, linking the Azure work item if any. Include the summaries of the other `pr-*.md` files if they exist.

## Output Format
- `Mode:` prepare | commit | push
- Branch, proposed or actual commit message, file list
- Commit hash (commit/push), PR description path, PR URL if created
- Open findings and any mismatch found
