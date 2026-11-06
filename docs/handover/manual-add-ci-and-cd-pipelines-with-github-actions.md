# Handover: Add CI and CD pipelines with GitHub Actions

Task: `manual-add-ci-and-cd-pipelines-with-github-actions` (source: manual, area: pipelines, scope: ci + cd)
Final status: `done`

## Summary
Two GitHub Actions workflows were added. `CI` builds and tests Backend and Frontend and checks that both container images build (no push). `CD` merges the exact commit CI tested on `dev` into `main` with `--no-ff` (merge-only). Nothing is deployed, published, tagged or released. The workflows have not run yet: `dev` is not pushed to `origin`, and the repository settings listed below are still to be configured by the human.

## What was implemented

### Frontend / Backend / Database
No change.

### Containers
No change to Containerfiles. CI only runs `docker build` on the runner for `Backend/Containerfile` and `Frontend/Containerfile` (tags `deskbooking-<area>:ci`, no push, login, `--build-arg`, proxy or secrets). No services or ports are added; local stack start is unchanged (`podman compose up -d --build`, `.env` per `docs/context/containers.md`).

### Pipelines
- `.github/workflows/ci.yml`, workflow `CI`
  - Triggers: `push` to `dev`; `pull_request` into `dev` and `main`.
  - Permissions: `contents: read`. Concurrency per ref with cancel-in-progress. `timeout-minutes` on all jobs.
  - Jobs: `backend` (`npm ci`, `npm run build`, `npm test`), `frontend` (`npm ci`, `npm run build`, `npm run test:ci`), `containers` (matrix Backend, Frontend; `docker build` only). Node 22.18, npm cache on each lockfile. Jobs are independent.
- `.github/workflows/cd.yml`, workflow `CD`
  - Triggers: `workflow_run` of `CI` (completed, branch `dev`) and `workflow_dispatch` (no inputs).
  - `verify` (`contents: read`, `actions: read`): automatic runs proceed only for `conclusion == success`, `event == push`, `head_branch == dev`. Dispatch must come from `dev` and requires a successful CI push run for the `dev` head. The SHA must be 40 hex characters.
  - `merge` (`needs: verify`, the only job with `contents: write`): checks out `main` (full history), requires the SHA to be an ancestor of `origin/dev`, does nothing if `main` already contains it, otherwise `git merge --no-ff <sha>`, `git merge --abort` and fail on a failed merge, then `git push origin HEAD:refs/heads/main` (explicit refspec).
  - Concurrency `cd-merge` (no cancel). Event data reaches shell only through `env:`. Identity `github-actions[bot]`.
  - What CD does not do: deploy, push images, log in to registries, tag, release, rebase, reset, force-push, write other branches, use secrets other than `GITHUB_TOKEN`.
- Only `actions/checkout@v4` and `actions/setup-node@v4` are used.
- Repository settings the human must configure (agents changed none), details in `docs/context/pipelines.md`:
  1. Push `dev` to `origin` (only `origin/main` exists remotely).
  2. Merge the workflows into `main` by hand once; `workflow_run` runs only from the default branch. Confirm `main` is the default branch.
  3. Settings > Actions > General: workflow permissions must not block the job-level `contents: write` (an organisation policy may forbid it).
  4. If `main` is protected: add `github-actions[bot]` to the bypass list; merge commits must be allowed (no linear history).
  5. Optional: make CI jobs required checks on PRs into `dev`/`main`, not on the direct CD push.

## Files changed
Commit `507168c34c84eee449b15277b14acc2742a68fef` on local branch `dev` (10 files, 646 insertions):
- `.github/workflows/ci.yml` (new)
- `.github/workflows/cd.yml` (new)
- `docs/context/pipelines.md` (new)
- `docs/context/project.md` (Pipelines row added)
- `docs/tasks/manual-add-ci-and-cd-pipelines-with-github-actions.md`, `docs/specs/manual-add-ci-and-cd-pipelines-with-github-actions.md` (new)
- `docs/runs/manual-add-ci-and-cd-pipelines-with-github-actions/` (`ci-builder.md`, `cd-builder.md`, `pipeline-review.md`, `pr-pipelines.md`)

Not part of the commit (uncommitted in the working tree, outside this task): modified `.github/agents/handover.agent.md`, `principle-orchestrator.agent.md`, `spec.agent.md`, `.github/config.json`, `docs/context/README.md`, `docs/risk-gate.md`, `docs/workflow.md`; untracked `.github/agents/cd-pipeline`, `ci-pipeline`, `pipeline-orchestrator`, `pipeline-reviewer`, `pipeline-task-to-pr` agent files. `.github/config.json` (`pipelines` block) is the source of truth the pipeline docs refer to and should be committed separately.

## Tools and technologies
GitHub Actions, `actions/checkout@v4`, `actions/setup-node@v4`, Node 22.18, npm (`npm ci`), Docker on the `ubuntu-latest` runner, `gh api` / `GITHUB_TOKEN` (read-only lookup in `verify`), git.

## Dependencies added
None. No `package.json` or lockfile change.

## API contract / migration
None.

## How to run and verify
1. Push the commit manually: `git push origin 507168c34c84eee449b15277b14acc2742a68fef:refs/heads/feature/ci-cd-pipelines` (Pipeline Task-to-PR declined to push: `dev` is the integration branch, `dev` is not on origin, `gh` is not installed). Open a PR from that branch.
2. Configure the repository settings above, push `dev`, merge the workflows into `main` once by hand.
3. Push to `dev` and watch `CI` (jobs `backend`, `frontend`, `containers`); after it succeeds, `CD` should create a `--no-ff` merge commit on `main`.
4. Optionally run `actionlint` on both files first (it was not available during the task).

## Acceptance criteria
Evidence: `pipeline-review.md` (reviewer confirmed each criterion against the files), builder reports, and human acceptance (`human-accepted: true`). No workflow was executed, so runtime behaviour is not yet exercised.

| AC | Status | Evidence |
| --- | --- | --- |
| 1. `ci.yml` named CI, triggers on push to `dev` and PRs into `dev`/`main` | Verified | `ci-builder.md`, `pipeline-review.md` (AC1), human acceptance |
| 2. Backend and Frontend built and tested in separate jobs, lockfile install | Verified | `ci-builder.md`, `pipeline-review.md` (AC2; script names match `package.json`), human acceptance |
| 3. Containerfiles built without push; no secrets or proxy | Verified | `pipeline-review.md` (Containers check), human acceptance |
| 4. `cd.yml` runs only after CI success on `dev` (or manual dispatch) | Verified | `cd-builder.md`, `pipeline-review.md` (Triggers, CD behaviour), human acceptance |
| 5. CD merges the tested commit with `--no-ff`, aborts on conflict, never force-pushes | Verified | `pipeline-review.md` (CD behaviour), human acceptance |
| 6. Nothing deployed, published, tagged or released | Verified | `pipeline-review.md` (no such step in either file), human acceptance |
| 7. Read-only default permissions; write only on the merge job | Verified | `pipeline-review.md` (Permissions: write only at `cd.yml` L68-69) |
| 8. `docs/context/pipelines.md` describes workflows and repository settings | Verified | `pipeline-review.md` (Docs: matches both files, settings 1-6), human acceptance |
| Spec AC9 (extra): only `actions/*` at major tags, event data via `env:`, YAML valid and `actionlint`-clean | Partially | Actions and `env:` handling verified by the reviewer; YAML parse and `actionlint` not run (tools unavailable) |

Task acceptance criteria: 8 / 8 verified. Spec-only AC9: partially verified (machine validation pending); the human accepted the implementation and no reviewer finding depends on it.

## Open findings (none blocker or high)
- M1: CD workflow-level concurrency can drop a pending green promotion when a later failed/cancelled CI run takes the pending slot (delay only, nothing unsafe is merged). Fix: move `concurrency` to the `merge` job.
- M2: `GITHUB_TOKEN` cannot push commits that change `.github/workflows/**`; such promotions fail at the push step. Workflow-file changes must be merged into `main` by hand, or a PAT/app token is needed under a new spec. Not yet in `pipelines.md`.
- M3: bot bypass on `main` plus `workflow_dispatch` lets any writer push to `main` via a modified workflow on another branch. Mitigate with a ruleset restricting branch creation/updates, a protected `environment` with reviewers on `merge`, or dropping dispatch. Not yet in `pipelines.md`.
- M4: Frontend `ChromeHeadless` may need `--no-sandbox` on `ubuntu-latest`; a red `frontend` job blocks CD. Follow-up `frontend` task.
- L1-L6: not machine-validated; `cd.yml` hard-codes `ci.yml`; every merge failure is worded "Merge conflict"; redundant `git fetch origin dev`; workflow-permissions wording in `pipelines.md`; actions pinned to major tags and floating `ubuntu-latest`.

## Review coverage
- Pipeline Orchestrator: ran (area pipelines, ci + cd).
- Pipeline Reviewer: ran; 0 fix iterations; 0 blocker, 0 high, 4 medium, 6 low open.
- Frontend, backend, container reviewers/agents: not run (no change in those areas).
- Pipeline Task-to-PR: ran in prepare/commit mode; declined to push or create a PR (see How to run and verify).
- Tests: none runnable (workflows not run; `actionlint` and a YAML parser unavailable).

## Approved risks
- R1 (CD merges tested `dev` commit into `main`): approved as described; implemented as a `--no-ff` merge of the tested SHA.
- R2 (`contents: write`): human chose the safer alternative; implemented with write only on the `merge` job and push of `main` only through an explicit refspec (`HEAD:refs/heads/main`).
- R3 (manual `workflow_dispatch`): approved as described; implemented with dev-only and CI-success guards.
- R4 (document repository settings): approved as described; documented in `docs/context/pipelines.md`, none changed.

## Follow-ups
- Human: push the commit/branch, push `dev`, configure repository settings, merge the workflows into `main` once.
- Run `actionlint` and observe the first CI run (covers L1 and M4).
- Address M1 (move concurrency to `merge`), and document M2 and M3 in `docs/context/pipelines.md`.
- Commit `.github/config.json` and the pipeline agent files separately.
- Frontend follow-up task if `ChromeHeadless` fails without `--no-sandbox`.
