# Release Manager - context

Agent: `.github/agents/release-manager.agent.md` | Skills: `create-pr`, `approve-pr` | Replaces: Frontend, Backend, Container and Pipeline Task-to-PR agents, and Handover.

Prepare, commit and push are separate human-gated steps. It never creates or switches branches and never pushes `main` or the release branch.

> Read this file first instead of re-reading old reports. Update it at the end of every task (rules: `docs/context/README.md`, Agent context files). Keep it under ~80 lines.
> Updated: 2026-11-16 (task 649 proposal prepared)

## Tasks

| Task | Result |
| --- | --- |
| 601 | Done without a git repository; changes listed from the run reports |
| 602 | Commit `25717dd` on `feature/602-test-version-control` (12 files), local, not pushed; Azure `System.State` set to `Done` |
| header | Commit `08771c8` on `feature/manual-header-with-app-name-and-login-button`, stacked on the 602 branch, no remote, no PR |
| info page | Commit `ff713ae` on `feature/manual-info-page-info-page` (19 files), local, not pushed |
| backend login endpoint | Commit `a4cc66f` on `feature/manual-backend-login-endpoint-backend-login-endpoint`, local, not pushed |
| login and register pages | Backend and frontend commits skipped by the human; changes uncommitted on `main` |
| 648 | Backend and frontend commit proposals skipped by the human; uncommitted on `main`; Azure state `Done` |
| create a mockup office | `pr.md` and handover written; not committed, current branch `dev`; excluded the git-ignored `db-backups/` file |
| containerize | Proposal prepared (`pr-containers.md`); base proposed as the login branch (stacked PR); `.gitignore` additions (`/certs/*.crt`, `/db-backups/`) need a human decision because the file is outside the allowed list |
| add CI and CD pipelines | Commit `507168c` on `dev` (10 files); push declined: `dev` is the integration branch, not on `origin`, `gh` not installed; manual push command given |
| CI on dev, CD after CI | Commit skipped by the human; docs changes uncommitted |
| 649 | Proposal prepared on `dev` (frontend only, ~25 files, 247/247 tests, code and UX approved, e2e skipped); `pr.md` and `docs/handover/649.md` written; not committed |

## Defects and lessons

- Unrelated tooling changes (`.github/config.json`, `.vscode/mcp.json`, `scripts/ado-mcp.mjs`, agent files) mixed into the working tree; kept out of task commits.
- The 602 handover found that `.github/agents` changes had landed in a later commit (`5ccc65c`) on the same branch.
- Info page: the task file status and handover were written on a different branch than the commit; handover warns to commit on the right branch.
- Pipelines commit could not be pushed, so CI/CD never ran remotely.
- Work items 602, 648 and 649 lack the `deskbookingPrj` tag.
- 649: `docs/context/frontend.md` (lines 55, 58) and `project.md` (line 10) still had stale counts and "pending" wording at PR time; owned by other agents, so reported, not edited.

## Open items

- Many branches are local only; a stacked PR chain (602 -> header, backend login -> containers) needs pushes in order.
- `create-pr` now writes the handover before the commit, so it is part of the commit (previously uncommitted).
- `approve-pr` sets `done` only after a successful push; a local-only commit leaves `implemented`.
- 649: current branch is `dev` (integration branch, tracks `origin/dev`); a commit there is pushed by the human decision only.
