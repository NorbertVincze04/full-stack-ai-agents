# PR: manual-ci-on-dev-push-then-cd-after-ci-success

## Title
manual-ci-on-dev-push-then-cd-after-ci-success: CI on dev push, then CD after CI succeeds (pipelines)

## Summary
Verification and documentation only. The existing `ci.yml` and `cd.yml` already meet the requirement; no workflow or config change.
- Corrected `docs/context/pipelines.md`: removed the false "`dev` is pushed (done)" claim, added the ordered enablement and verification table, the safer order (R1), negative cases and the workflow-file (`GITHUB_TOKEN`) note.
- Aligned the Pipelines row in `docs/context/project.md`.
- Added the task, spec and run reports (CI build, CD build, review).

## Acceptance criteria
- [x] AC1: `ci.yml` triggers on push to `dev`; `cd.yml` triggers on completed `CI` runs on `dev` and proceeds only for `success` + `push` + `dev`; no workflow change required.
- [x] AC2: `ci.yml`, `cd.yml`, `.github/config.json` unchanged (`git diff HEAD -- .github` empty).
- [x] AC3: `pipelines.md` has no "dev pushed" claim, lists the enablement order, expected observations, negative cases and the workflow-file note; 91 lines.
- [x] AC4: `project.md` Pipelines row agrees with `pipelines.md`.
- [ ] AC5: Human check in the Actions tab (agents cannot run Actions); see Prerequisites.

## Triggers and jobs
| Workflow | Trigger | Jobs |
| --- | --- | --- |
| `CI` | `push` to `dev`; `pull_request` into `dev` and `main` | `backend`, `frontend`, `containers (Backend)`, `containers (Frontend)` |
| `CD` | `workflow_run` of `CI` (`completed`, branch `dev`); `workflow_dispatch` | `verify`, `merge dev into main` |

## What CD does and does not do
- Does: after a successful `CI` push run on `dev`, merges that exact SHA into `main` with `--no-ff` (`chore: merge dev into main (CI passed for <sha>)`); aborts on conflict; explicit refspec push to `main`.
- Does not: deploy, push images, tag, release, create PRs, use secrets other than `GITHUB_TOKEN`. Red, cancelled and PR runs skip `verify`, so nothing reaches `main`.

## Prerequisites (human)
1. `dev` on `origin` (currently `origin/dev` = `3c9e1de` = local `dev`); check its `CI` run.
2. `main` has no workflow files: merge `.github/workflows/**` into `main` once, content identical to `dev` (`GITHUB_TOKEN` cannot push workflow-file changes). Confirm `main` is the default branch.
3. Settings > Actions > General: Actions enabled; workflow permissions not blocking job-level `contents: write`.
4. If `main` is protected: bypass for `github-actions[bot]`; no linear-history rule (incompatible with `--no-ff`).
5. Then push a new commit to `dev`; expect `CI`, and when green a `CD` run and the merge commit on `main`.

## Approved risks
- R1: once `cd.yml` is on `main`, the first green push to `dev` promotes to `main` automatically. Approved; documented only. Safer order: CI-only run first, then merge workflows into `main`.
- R2: repository setting changes (bot bypass, workflow permissions) are human-only. Approved; documented only.

## Validation
- Review: approved after 1 fix iteration (`pipeline-review.md`: blocker 0, high 0, medium 0, low 0).
- Inspection only. No workflow run, no `actionlint`; the first real run validates the YAML.

## Open findings
None for this task. Out of scope and not fixed: M1 (move `concurrency` to the `merge` job), M3 (dispatch/bypass hardening), M4 (Chrome `--no-sandbox`; a red `frontend` job blocks CD), L1-L6.
