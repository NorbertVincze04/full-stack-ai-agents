# PR proposal (pipelines): manual-add-ci-and-cd-pipelines-with-github-actions

Mode: prepare (nothing staged, committed or pushed)

## Branch

Current branch: `dev`. This is the configured integration branch (`.github/config.json` -> `pipelines.branches.integration`). A commit on it is possible, but it cannot be pushed directly and a PR from `dev` cannot target `dev`. See "Mismatches" below.

## Commit

Message: `manual-add-ci-and-cd-pipelines-with-github-actions: Add CI and CD pipelines with GitHub Actions (pipelines)`

Body:

```
CI builds and tests Backend and Frontend and builds both container images
(no push) on push to dev and on PRs into dev and main. CD merges the commit
CI tested on dev into main with --no-ff after a green CI run. Nothing is
deployed, published, tagged or released. Read-only permissions by default;
contents: write only on the CD merge job.
```

## Files to commit

| File | State |
| --- | --- |
| `.github/workflows/ci.yml` | new |
| `.github/workflows/cd.yml` | new |
| `docs/context/pipelines.md` | new |
| `docs/context/project.md` | modified (+1 line, Pipelines row) |
| `docs/tasks/manual-add-ci-and-cd-pipelines-with-github-actions.md` | new |
| `docs/specs/manual-add-ci-and-cd-pipelines-with-github-actions.md` | new |
| `docs/runs/manual-add-ci-and-cd-pipelines-with-github-actions/ci-builder.md` | new |
| `docs/runs/manual-add-ci-and-cd-pipelines-with-github-actions/cd-builder.md` | new |
| `docs/runs/manual-add-ci-and-cd-pipelines-with-github-actions/pipeline-review.md` | new |
| `docs/runs/manual-add-ci-and-cd-pipelines-with-github-actions/pr-pipelines.md` | new (this file) |

## Mismatches found (decide before committing)

- The working tree has other changes outside the allowed staging list; they are NOT proposed for this commit:
  - modified: `.github/agents/handover.agent.md`, `.github/agents/principle-orchestrator.agent.md`, `.github/agents/spec.agent.md`, `.github/config.json`, `docs/context/README.md`, `docs/risk-gate.md`, `docs/workflow.md`
  - untracked: `.github/agents/cd-pipeline.agent.md`, `ci-pipeline.agent.md`, `pipeline-orchestrator.agent.md`, `pipeline-reviewer.agent.md`, `pipeline-task-to-pr.agent.md`
- `.github/config.json` (`pipelines` block: workflow files/names, branches, `cdMode`) is the source of truth the pipeline docs refer to, but it is not stageable by this mode. Commit it separately if wanted.
- The current branch is `dev`, which is the integration branch. Pushing it directly is not allowed for this mode, and CD/CI expect `dev` to be pushed by the human. Either the human pushes `dev` themselves (this also satisfies setting 1 below), or the caller checks out a feature branch first (this mode does not create branches).
- `gh` CLI was not found in the terminal; `gh pr create` would not work for a push step as-is.
- Remote: `origin` = `https://github.com/NorbertVincze04/full-stack-ai-agents.git`; only `origin/main` exists remotely.

## PR title

Add CI and CD pipelines with GitHub Actions (pipelines)

## PR description

### Summary

- `CI` (`.github/workflows/ci.yml`): build and test Backend and Frontend (own jobs, `npm ci`, Node 22.18) and build both Containerfiles (no push, no secrets, no proxy) on push to `dev` and PRs into `dev` and `main`.
- `CD` (`.github/workflows/cd.yml`): after a successful CI push run on `dev` (or manual dispatch from `dev` with a successful CI run for the head), merge exactly the tested SHA into `main` with `--no-ff`. Aborts on conflict; never force-pushes. Nothing is deployed, published, tagged or released.
- Docs: `docs/context/pipelines.md` (new) and the Pipelines row in `docs/context/project.md`.

### Acceptance criteria

- [x] AC1: `ci.yml` named `CI`, triggers push to `dev` and PRs into `dev`/`main`
- [x] AC2: separate `backend` and `frontend` jobs, lockfile install, build and test
- [x] AC3: Backend and Frontend Containerfiles built without push; no secrets or proxy
- [x] AC4: `cd.yml` runs only after CI success on `dev` (or manual dispatch)
- [x] AC5: merges the CI-tested SHA with `--no-ff`, aborts on conflict, no force-push
- [x] AC6: no deploy, publish, tag or release
- [x] AC7: `contents: read` by default; `contents: write` only on the `merge` job
- [x] AC8: `docs/context/pipelines.md` describes workflows and repository settings
- [x] AC9: only `actions/*` at major tags; event data passed via `env:`

### Triggers and jobs

| Workflow | Trigger | Jobs |
| --- | --- | --- |
| `CI` | push `dev`; PR into `dev`/`main` | `backend`, `frontend`, `containers` (matrix Backend, Frontend) |
| `CD` | `workflow_run` of `CI` (completed, `dev`, success, push); `workflow_dispatch` | `verify` (`contents: read`, `actions: read`), `merge` (`contents: write`) |

### What CD does and does not do

- Does: resolve the tested SHA, require it to be an ancestor of `origin/dev`, skip if `main` already contains it, `git merge --no-ff <sha>`, `git push origin HEAD:refs/heads/main` (explicit refspec).
- Does not: deploy, push images, log in to registries, create tags or releases, rebase, reset, force-push, write other branches, use secrets other than `GITHUB_TOKEN`, use third-party actions.

### Repository settings you must configure (agents change none of these)

1. Push `dev` to `origin` (only `origin/main` exists remotely).
2. Merge the change adding `ci.yml` and `cd.yml` into `main` by hand once: `workflow_run` runs only from the default branch. Confirm `main` is the default branch.
3. Settings > Actions > General: Actions enabled; workflow permissions must not block the job-level `contents: write` of the `merge` job (an organisation policy may forbid it).
4. If `main` has branch protection or a ruleset: add `github-actions[bot]` to the bypass list, or CD's push is rejected. Merge commits must be allowed ("linear history" is incompatible with `--no-ff`).
5. Optional: make the CI jobs required checks on PRs into `dev` and `main`, but not on the direct CD push to `main`.
6. Pushes with `GITHUB_TOKEN` start no other workflows (acceptable: CI does not run on `main` pushes).

### Validation

- `pipeline-review.md`: verdict approved; 0 blocker, 0 high, 4 medium, 6 low open.
- Not machine-validated: `actionlint` and a YAML parser were unavailable; nothing was run or dispatched. The first real run is the validation.

### Open medium findings (accepted or to follow up)

- M1. CD workflow-level concurrency (`cd-merge`, no cancel) keeps one pending run. A later failed or cancelled CI run on `dev` still fires `workflow_run`, takes the pending slot and replaces a pending green run, which is then skipped. Nothing unsafe is merged; a promotion can be delayed until the next green run. Fix: move `concurrency` to the `merge` job, or document the gap.
- M2. `GITHUB_TOKEN` cannot push commits that change `.github/workflows/**`. Promotions that include workflow-file changes fail at the push step (fail closed). Those changes must be merged into `main` by hand, or a PAT/app token is needed under a new spec. Not yet stated in `pipelines.md`.
- M3. Bot bypass on `main` plus `workflow_dispatch` is a privilege path: dispatch uses the `cd.yml` of the selected ref, so any writer could push a branch with a modified workflow and push to `main` as the bypassed bot. Inherent to the approved design (R3/R4). Mitigate with a ruleset limiting who can create/update branches, a protected `environment` with required reviewers on `merge`, or dropping `workflow_dispatch`. Not yet stated in `pipelines.md`.
- M4. Frontend `ChromeHeadless` may need `--no-sandbox` on `ubuntu-latest`; if it fails the `frontend` job is red and CD never fires. Follow-up `frontend` task adds a launcher.

### Open low findings (summary)

L1 not machine-validated; L2 `cd.yml` hard-codes `ci.yml`; L3 any merge failure is reported as "Merge conflict"; L4 redundant `git fetch origin dev`; L5 workflow permissions wording in `pipelines.md`; L6 actions pinned to major tags, `ubuntu-latest` floats. Details in `pipeline-review.md`.

### Approved risks

- R1: `--no-ff` merge of the tested SHA into `main` by CD.
- R2: `contents: write` only on `merge`; push by explicit refspec to `main`.
- R3: manual dispatch with dev-only and CI-success guards.
- R4: repository settings documented, not changed.

### Work item

None (manual task; no Azure work item).
