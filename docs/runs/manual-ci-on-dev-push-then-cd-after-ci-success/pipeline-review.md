# Pipeline review: manual-ci-on-dev-push-then-cd-after-ci-success

Verdict: changes-requested
Findings: blocker 0, high 1, medium 2, low 2

## Verified OK
- `.github/workflows/ci.yml`, `.github/workflows/cd.yml`, `.github/config.json`: no diff versus HEAD (`git status` shows only docs changes).
- Docs match the workflows: triggers, job names (`backend`, `frontend`, `containers (Backend|Frontend)`, `verify`, `merge dev into main`), `verify` condition, `--no-ff`, merge message `chore: merge dev into main (CI passed for <short-sha>)`, abort on conflict, explicit refspec push.
- `pipelines.md` is 91 lines (limit ~150). `project.md` row is consistent with `pipelines.md` except the state claim below.
- Enablement order (push `dev`, workflows into `main` identical to `dev`, settings, push again), M2 note and R1 safer alternative are present and correct. `main` has no workflow files (`origin/main` tree), so step 2 is still needed; `dev` is 3 commits ahead of `main` and `main` has none that `dev` lacks, so the first merge is clean.
- Workflow security standard checks: read-only top-level permissions, `contents: write` only on `merge`, no `pull_request_target`, event data via `env:`, only `actions/*@v4`, no secrets besides `GITHUB_TOKEN`, no push/deploy/tag, `timeout-minutes` on all jobs. No new issues (M1, M3, M4, L1-L6 not re-raised).

## Findings

| Sev | File / line | Problem | Suggested fix |
| --- | --- | --- | --- |
| high | docs/context/pipelines.md "Repository settings" item 1; docs/context/project.md Pipelines row ("only `origin/main` exists") | False repo-state claim: `git ls-remote --heads origin` returns `refs/heads/dev` = `3c9e1de` (equals local `dev`), and `507168c` is an ancestor of `origin/dev`. `dev` and the workflow commit are already pushed. The task's stated purpose was to remove a false "dev pushed" claim, but the replacement is false the other way. | Reword: `dev` (with the workflows) is on `origin`; `origin/main` does not contain the workflows. Update the project.md row the same way. |
| medium | docs/context/pipelines.md enablement step 1 | Step 1 "Push `dev` to `origin`" is stale given the above; the CI run on `dev` may already exist. Step 1 should read as "confirm / (re)push `dev`; check the latest `CI` run on `dev` is green". | Rephrase step 1 as a check of the existing `CI` run, with a push only if `origin/dev` is behind. |
| medium | docs/context/pipelines.md "Decisions and known gaps" last bullet; project.md row ("not yet run") | "Workflows were not run" is unverifiable and probably outdated once `dev` is on `origin` (push to `dev` triggers `CI`). | Say "agents could not run or observe Actions; human confirms run history", or drop the claim. |
| low | docs/context/pipelines.md "Negative cases" | "A `CI` run for a pull request still starts a `CD` run" is only true when the PR head branch is `dev`: `workflow_run.branches: [dev]` filters on the triggering run's head branch, so feature-branch PRs start no `CD` run. | Say "a `CI` run on a `dev` PR (e.g. `dev` into `main`) or a red/cancelled `dev` run starts `CD` with `verify` skipped". |
| low | docs/context/pipelines.md step 2 | After step 2 by squash, `main` and `dev` histories diverge in content-identical form; fine for CD, but a plain merge/fast-forward is simpler. | Optional: recommend a fast-forward/merge commit over squash. |

## Counts
blocker 0, high 1, medium 2, low 2

## Re-review (after fix iteration 1)

Verdict: approved
Findings: blocker 0, high 0, medium 0, low 0

### Previous findings
| Sev | Finding | Status |
| --- | --- | --- |
| high | False repo-state claim ("only `origin/main` exists") in pipelines.md and project.md | Fixed: no branch-state claim remains; check commands given (`git ls-remote origin dev`, `git ls-tree origin/main .github/workflows`). Both are consistent with the current state (`origin/dev` = `3c9e1de`; `origin/main` has no workflow files). |
| medium | Enablement step 1 stale | Fixed: step 1 is "ensure `dev` is on `origin`; open the existing `CI` run, otherwise push". |
| medium | "Workflows were not run" unverifiable | Fixed: now "run results not recorded here; the human confirms them in the Actions tab" (pipelines.md Decisions, project.md row). |
| low | PR negative case imprecise | Fixed: only a PR whose head branch is `dev` starts a skipped `CD` run. |
| low | Squash recommendation | Fixed: merge commit or fast-forward preferred, squash allowed if workflow content is identical. |

### Checks
- No new false repo-state claims found in `pipelines.md` or `project.md`.
- `docs/context/pipelines.md`: 91 lines (limit ~150). `project.md` Pipelines row is consistent with it (triggers, `--no-ff`, merge-only, enablement order, bot bypass).
- `ci.yml`, `cd.yml`, `.github/config.json`: no diff versus HEAD (`git diff HEAD -- .github` empty; `git status` shows only docs changes).
- R1 (safer order) and R2 (repository settings) are documented only, as approved.
- M1, M3, M4, L1-L6 not re-raised (out of scope).

### Counts
blocker 0, high 0, medium 0, low 0
