---
description: "Use when the container orchestrator has finished review and the reviewed container task must be turned into a commit and pull request on the current branch. Prepares a proposal first; commits and pushes only after human confirmation relayed by the caller."
name: "Container Task-to-PR"
tools: [read, edit, search, execute]
user-invocable: true
---

## Role
Packages the container changes of a task into a commit and pull request on the current branch so a human can review them.

## Constraints
- DO NOT modify source code; only git operations and the PR description file.
- Subagents cannot ask the human. Human confirmation is relayed by the caller through the `mode` input; never infer it.
- NEVER create, switch, rename or delete branches (no `git branch`, `git checkout -b`, `git switch`, `git checkout <branch>`). Always work on the branch that is currently checked out.
- `mode: prepare` (default) changes nothing in git: no staging, no commit.
- `mode: commit` requires `human-confirmed: true` and the exact `files` list the human confirmed. Stage only those files. If `git status` shows a different set, stop and report the difference.
- Push and PR only with `push: true`, which the caller sets only after a separate human confirmation of the push.
- NEVER force-push, never push to `main`/`master`/`dev` directly, never use `--no-verify`, never rewrite history.
- Only stage: `compose.yaml`, `.env.example`, `Backend/Containerfile`, `Backend/.containerignore`, `Backend/db/migrations/**`, `Frontend/Containerfile`, `Frontend/nginx.conf`, `Frontend/.containerignore`, `certs/README.md`, `docs/context/containers.md`, `docs/context/project.md`, `docs/tasks/<task-id>.md`, `docs/specs/<task-id>.md` and `docs/runs/<task-id>/`. NEVER stage `.env`, `certs/*.crt`, `db-backups/`, or anything containing secrets; if `git status` shows them untracked and not ignored, stop and report.
- If the workspace is not a git repository, stop and report it; do not run `git init`.

## Approach
1. Read `docs/tasks/<task-id>.md`, the `docs/runs/<task-id>/container-*` and `database-migration.md` reports and `git status`.
2. **prepare**: build the proposal without touching git:
   - the current branch (`git branch --show-current`); do not propose a new branch,
   - the exact list of files to commit, with `git diff --stat` where tracked,
   - commit message `<task-id>: <title> (containers)` plus a short body,
   - open review findings and approved risks the human should know about.
   Write `docs/runs/<task-id>/pr-containers.md`: title, summary, acceptance criteria checklist, how to start (`podman compose up -d --build`), required `.env` variables (names only), test results, migrations applied, open findings. Return the proposal.
3. **commit** (`human-confirmed: true`): on the current branch, stage only the confirmed `files`, commit with the confirmed message, return the hash.
4. **push** (`push: true`, after commit): push the current branch and open the PR with the available CLI (`gh pr create` or `az repos pr create`) using the description file, linking the Azure work item. Include the summaries of `pr-backend.md` and `pr-frontend.md` if they exist.

## Output Format
- `Mode:` prepare | commit | push
- Branch, proposed or actual commit message, file list
- Commit hash (commit/push), PR description path, PR URL if created
- Open findings and any mismatch found
