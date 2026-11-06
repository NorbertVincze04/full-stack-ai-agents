# CD build report: manual-ci-on-dev-push-then-cd-after-ci-success

Verdict: done (documentation and verification only; no workflow change)

## Inspection (AC1)

| Check | Result |
| --- | --- |
| `ci.yml` name and triggers | `name: CI`; `push` to `dev`, `pull_request` into `dev`, `main`. Push to `dev` starts CI. |
| `cd.yml` trigger | `workflow_run` of `[CI]`, `types: [completed]`, `branches: [dev]`; plus `workflow_dispatch`. Name matches `CI`. |
| `verify` condition | `conclusion == 'success'` and `event == 'push'` and `head_branch == 'dev'` (or dispatch); red, cancelled and PR runs skip `verify`, so `merge` (`needs: verify`) is skipped. |
| `merge` job | Checks out `main`, merges exactly `workflow_run.head_sha` with `--no-ff` after ancestor check against `origin/dev`; `contents: write` only here; push by explicit refspec to `main`. |
| Workflow change needed | None. |

## Files changed

| File | Change |
| --- | --- |
| `docs/context/pipelines.md` | Removed the false "`dev` is pushed (done)" claim; added ordered enablement table with expected observations, safer order (R1), negative cases, M2 note, human check. |
| `docs/context/project.md` | Pipelines row: neutral wording (no run or branch-state claims), check commands, enablement per `pipelines.md`. |
| `docs/runs/manual-ci-on-dev-push-then-cd-after-ci-success/cd-build.md` | This report. |

`ci.yml`, `cd.yml` and `.github/config.json` are unchanged (AC2).

## Acceptance criteria

| AC | Status |
| --- | --- |
| AC1 | Met (inspection above) |
| AC2 | Met |
| AC3 | Met (FR1-FR4 and M2 covered; file stays under ~150 lines) |
| AC4 | Met |
| AC5 | Pending, human check |

## Human checks (AC5)

1. Ensure `dev` is on `origin` and check its `CI` run (push only if absent); confirm jobs `backend`, `frontend`, `containers (Backend)`, `containers (Frontend)`.
2. Merge the workflows into `main` once, with `.github/workflows/**` identical to `dev`; confirm `main` is the default branch and the Actions settings.
3. Push a new commit to `dev`; once `CI` is green, confirm a `CD` run (event `workflow_run`, `verify` then `merge dev into main`) and the merge commit `chore: merge dev into main (CI passed for <sha>)` on `main`; otherwise report the failing step.

## Repository settings (human, R2)

Workflow permissions "Read and write" (or not blocking job-level `contents: write`); bot bypass on `main` if protected; no linear-history rule. Agents changed none.

## Validation

Inspection only. No workflow was run, nothing committed or pushed; `actionlint` not run.

## Fix iteration 1 (review: changes-requested)

- Re-checked read-only: `origin/dev` is `3c9e1de`, `origin/main` is `df18def`; workflows exist on `origin/dev`, not on `origin/main`. So `dev` is pushed, contrary to the task claim.
- High: removed the point-in-time "local only" claim from `pipelines.md` and `project.md`; replaced with check commands (`git ls-remote origin dev`, `git ls-tree origin/main .github/workflows`).
- Medium: enablement step 1 is now "ensure `dev` is on `origin` / check the existing CI run"; "not yet run" and "not run locally" claims replaced by neutral wording (also in the Pipelines row).
- Low: PR negative case narrowed (only PRs with head branch `dev` start a skipped `CD` run); step 2 allows merge commit, fast-forward or squash with identical workflow content.
- `pipelines.md` is under 150 lines; `ci.yml`, `cd.yml`, `config.json` untouched; nothing committed or pushed.

## Required changes in other areas

None.

## Actions awaiting approval

None (R1 and R2 approved as described; both documented only).

## Known gaps

M1, M3, M4 and L1-L6 are out of scope. The first real run is the first validation of the YAML; a red `frontend` job (possible `ChromeHeadless` sandbox issue) blocks CD.
