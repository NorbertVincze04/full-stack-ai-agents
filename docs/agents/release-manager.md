# Release Manager - context

Agent: `.github/agents/release-manager.agent.md` | Skills: `create-pr`, `approve-pr` | Replaces: Frontend, Backend, Container and Pipeline Task-to-PR agents, and Handover.

Prepare, commit and push are separate human-gated steps. It commits on a `task/<task-id>` branch (created from `dev` when `dev` is checked out), pushes that branch and opens the GitHub PR into `dev`. It never pushes `dev`, `main` or the release branch.

> Read this file first instead of re-reading old reports. Update it at the end of every task (rules: `docs/context/README.md`, Agent context files). Keep it under ~80 lines.
> Updated: 2026-11-23 (manual-shadow-borders proposal)

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
| 649 | Commit `b6cecb0` on `dev` (29 files, frontend only, 247/247 tests, code and UX approved, e2e skipped); pushed to `origin/dev` (`057cabe..b6cecb0`), no PR (`dev`, CI/CD promotes); AC10 accepted manually by the human 2026-11-16, all ACs Verified, no blocker/high open: task file `done`; docs commit `06bf2ed` pushed to `origin/dev` (`b6cecb0..06bf2ed`); Azure `System.State` set to `Done` (rev 2) |
| 650 | Commit `de2ccbf` on `task/650`, pushed; PR https://github.com/NorbertVincze04/full-stack-ai-agents/pull/1 into `dev`; status `done` (AC5 verified by human), Azure state unchanged; proposal: (`pr.md`, handover); branch `task/650` from `dev`; 5 backend tests, 8 frontend files, 2 migrations 006, docs; AC5 Verified (human `pg_dump`, applied twice, identical result, bookings kept); 2 medium open (no lock, margin gap); untracked `build-output.txt`/`test-output.txt` excluded |
| desk labeling | Proposal prepared on `dev` (`pr.md`, handover); docs only, no code; AC1-AC5 Verified (AC4 by human); `db-backups/` dump git-ignored, excluded; commit `407a6a2` on `dev` (11 files), local, not pushed; status stays `implemented` |
| terms page | Proposal prepared on `dev` (`pr.md`, handover); frontend only, 270/270 tests, build pass, code and UX approved, e2e skipped (no runner); AC1-AC6 Verified (AC4 focus style by human); 3 low open; commit `07d1c0f` on `dev` (frontend, docs), pushed to `origin/dev` (`1124d06..07d1c0f`), no PR; status `done` |
| visible password | Proposal prepared (`pr.md`, handover); branch `task/manual-visible-password` from `dev`; frontend only, 288/288 tests, build pass, code and UX approved, e2e skipped (no runner); AC1-AC8 Verified (AC7 and 320 px by human); 1 medium open (identical accessible name on register toggles); commit `c3a30c2` on `task/manual-visible-password`, pushed; PR https://github.com/NorbertVincze04/full-stack-ai-agents/pull/2 into `dev` (merged, `3cb3983`); status `done`; branch deleted |
| div for hero section | Proposal prepared (`pr.md`, handover); branch `task/manual-div-for-hero-section` from `dev` (`dev` checked out); frontend CSS only plus 1 spec, 295/295, build pass, ux approved, code/security skipped, e2e skipped (no runner); AC1-AC5 Verified (AC1, AC3 by human in a browser); 4 low open; commit `8008389` on `task/manual-div-for-hero-section`, pushed; PR https://github.com/NorbertVincze04/full-stack-ai-agents/pull/3 into `dev`; status `done` |
| shadow borders | Proposal prepared (`pr.md`, handover); branch `task/manual-shadow-borders` from `dev` (`dev` checked out); frontend CSS only plus 1 spec, 310/310, build pass, code and ux approved, e2e skipped (no runner); AC1-AC9 Verified except AC3 Partially; AC4-AC6, AC8, AC9 by human; 2 medium (header shadow hidden, container padding), 4 low open; excluded stray `$f`, `Frontend/build-output.txt`, `test-output.txt`, `live-ui/state.json`; state `proposal prepared` |

## Defects and lessons

- Unrelated tooling changes (`.github/config.json`, `.vscode/mcp.json`, `scripts/ado-mcp.mjs`, agent files) mixed into the working tree; kept out of task commits.
- The 602 handover found that `.github/agents` changes had landed in a later commit (`5ccc65c`) on the same branch.
- Info page: the task file status and handover were written on a different branch than the commit; handover warns to commit on the right branch.
- Pipelines commit could not be pushed, so CI/CD never ran remotely.
- Work items 602, 648 and 649 lack the `deskbookingPrj` tag.
- 649: `docs/context/frontend.md` (lines 55, 58) and `project.md` (line 10) still had stale counts and "pending" wording at PR time; owned by other agents, so reported, not edited.

- 650: `Backend/build-output.txt`, `test-output.txt` and the Frontend equivalents are untracked and not git-ignored; not committed.

## Open items

- Many branches are local only; a stacked PR chain (602 -> header, backend login -> containers) needs pushes in order.
- Earlier tasks were committed straight on `dev` and never produced a GitHub PR (`no PR: dev`). Since 2026-11-23 `approve-pr` uses a `task/<id>` branch and `gh pr create --base dev`; `gh` is not installed on this machine yet (without it the agent gives a compare link).
- `create-pr` now writes the handover before the commit, so it is part of the commit (previously uncommitted).
- `approve-pr` sets `done` only after a successful push; a local-only commit leaves `implemented`.
- 649: current branch is `dev` (integration branch, tracks `origin/dev`); a commit there is pushed by the human decision only.
