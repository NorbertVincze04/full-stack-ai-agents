# Handover: manual-ci-on-dev-push-then-cd-after-ci-success

Task: `docs/tasks/manual-ci-on-dev-push-then-cd-after-ci-success.md` | Spec: `docs/specs/manual-ci-on-dev-push-then-cd-after-ci-success.md` | Status: `implemented` (not `done`, AC5 open)

## Summary
"Push to `dev` starts CI; after CI succeeds, CD starts." The existing `ci.yml` and `cd.yml` (commit 507168c) already satisfy this, so no workflow change was made. The work was inspection plus correcting the pipeline docs (false "dev pushed" claim, missing enablement order and `GITHUB_TOKEN` workflow-file note).

## What was implemented
| Area | Result |
| --- | --- |
| Frontend / backend / database / containers | Not touched |
| Pipelines | Inspection only: `CI` triggers on push to `dev` (and PRs into `dev`/`main`); `CD` triggers on `workflow_run` of `CI` (`completed`, branch `dev`) and proceeds only for `success` + `push` + `dev`; it merges the tested SHA into `main` with `--no-ff` (merge-only, no deploy). |
| Docs | `docs/context/pipelines.md` (91 lines): enablement order, expected observations per step, negative cases, safer order (R1), `GITHUB_TOKEN` cannot push workflow-file changes (M2), human settings. `docs/context/project.md`: Pipelines row aligned. |

## Files changed (uncommitted; commit skipped by the human, nothing pushed)
| File | Change |
| --- | --- |
| docs/context/pipelines.md | modified |
| docs/context/project.md | modified |
| docs/tasks/..., docs/specs/..., docs/runs/manual-ci-on-dev-push-then-cd-after-ci-success/ | new (task, spec, 4 reports) |
| docs/handover/manual-ci-on-dev-push-then-cd-after-ci-success.md | new (this file) |

`.github/workflows/ci.yml`, `.github/workflows/cd.yml` and `.github/config.json`: unchanged.

## Tools and technologies
GitHub Actions (`workflow_run`, `push`), git (read-only inspection). Dependencies added: none. API/migration: none.

## How to verify (human, AC5)
1. `git ls-remote origin dev` (expect `3c9e1de`); open its `CI` run in the Actions tab: jobs `backend`, `frontend`, `containers (Backend)`, `containers (Frontend)`.
2. Merge `.github/workflows/**` into `main` once, identical to `dev` (check with `git ls-tree origin/main .github/workflows`); confirm `main` is the default branch.
3. Settings > Actions > General: Actions enabled; workflow permissions do not block job-level `contents: write`; if `main` is protected, bypass for `github-actions[bot]` and no linear-history rule.
4. Push a new commit to `dev`; once `CI` is green expect a `CD` run (event `workflow_run`, `verify` then `merge dev into main`) and the commit `chore: merge dev into main (CI passed for <sha>)` on `main`.

## Acceptance criteria
| AC | Status | Evidence |
| --- | --- | --- |
| AC1 inspection of `ci.yml`/`cd.yml` triggers and conditions | Verified | `ci-build.md`, `cd-build.md` inspection tables; re-review approved |
| AC2 workflows and `config.json` unchanged | Verified | `git status`/`git diff --stat` show only docs changes; `pipeline-review.md` (`git diff HEAD -- .github` empty) |
| AC3 `pipelines.md` corrected, complete, under ~150 lines | Verified | `pipeline-review.md` re-review approved (91 lines); human acceptance |
| AC4 `project.md` row consistent | Verified | `pipeline-review.md` re-review; human acceptance |
| AC5 CI starts on `dev` push and CD updates `main` after green | Not verified | Requires a real Actions run by the human; none recorded |

Verified 4 / 5.

## Open findings
- Reviewer (`pipeline-review.md`): round 1 had 1 high, 2 medium, 2 low, all fixed; re-review 0 findings.
- Known and out of scope: M1 (`concurrency` on the `merge` job), M3 (dispatch/bypass hardening), M4 (Chrome without `--no-sandbox`; a red `frontend` job would block CD), L1-L6.
- The workflow YAML has never been validated by a run or `actionlint`; the first run is its first validation.

## Review coverage
- Pipeline Orchestrator: ran (pipelines, ci+cd, docs-only).
- Pipeline Reviewer: ran twice (changes-requested, then approved).
- Frontend, backend, container agents, security: skipped (no code, dependency, permission or trigger change).

## Approved risks
- R1: first green `CI` run on `dev` auto-merges into `main` once `cd.yml` is on `main`. Approved as described; implemented as documentation only (enablement order, safer CI-only-first order).
- R2: human changes repository settings (bot bypass, workflow permissions). Approved as described; documentation only, agents changed no settings.

## Follow-ups
- Human completes AC5, then set the task `status` to `done`.
- Commit `docs/` changes (skipped by the human).
- Consider separate tasks for M1, M3, M4 (`--no-sandbox`) before relying on CD.

## Blocks `done`
AC5 only (human check in the Actions tab).
