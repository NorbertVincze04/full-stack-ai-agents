# CI build report: manual-ci-on-dev-push-then-cd-after-ci-success

Verdict: done (inspection only, no workflow change needed)

## Files created/changed
| File | Change |
| --- | --- |
| docs/runs/manual-ci-on-dev-push-then-cd-after-ci-success/ci-build.md | created (this report) |

`ci.yml`, `cd.yml`, `.github/config.json`, `docs/context/pipelines.md` and `docs/context/project.md` were not touched (the CD Pipeline Builder owns the doc edits).

## AC1 inspection (CI side)
| Check | Result | Evidence |
| --- | --- | --- |
| Triggers on push to `dev` | Pass | `on.push.branches: [dev]` |
| Also runs on PRs | Pass | `on.pull_request.branches: [dev, main]` |
| No `schedule` / `workflow_dispatch` | Pass | not present |
| Workflow `name` is `CI` | Pass | `name: CI`; equals `pipelines.ciWorkflow.name` |
| Name matches `cd.yml` `workflow_run.workflows` | Pass | `cd.yml`: `workflows: [CI]`, `types: [completed]`, `branches: [dev]` |
| Job `backend` | Pass | `Backend`, Node 22.18, `npm ci`, `npm run build`, `npm test` |
| Job `frontend` | Pass | `Frontend`, Node 22.18, `npm ci`, `npm run build`, `npm run test:ci` |
| Jobs `containers (Backend)` / `containers (Frontend)` | Pass | matrix `area: [Backend, Frontend]`, name `containers (${{ matrix.area }})`, `docker build` only, no push |
| Blocking checks | Pass | no `continue-on-error` |
| Least privilege | Pass | top-level `permissions: contents: read`; no `secrets.*`; `persist-credentials: false` |
| Hygiene | Pass | `concurrency` per ref with `cancel-in-progress: true`; `timeout-minutes` on all jobs (15/20/20); only `actions/checkout@v4`, `actions/setup-node@v4` |
| Scripts and lockfiles exist | Pass | `Backend`: `build`, `test`; `Frontend`: `build`, `test:ci`; both `package-lock.json` present; `engines.node >=22.18` in both |

Conclusion: AC1 holds for CI. No change to `ci.yml` required.

## CI-side facts for the docs
- A push trigger uses the workflow file from the pushed commit, so `ci.yml` does not need to be on `main` for CI to start on a `dev` push; `cd.yml` must be on the default branch for `workflow_run` to fire.
- The CI run that CD reacts to is the `push` run on `dev` (`workflow_run.event == 'push'`, `head_branch == 'dev'`). PR runs (including PRs targeting `dev` or `main`) and red/cancelled runs also produce a `CD` run whose `verify` job is skipped.
- Expected CI run on `dev`: 4 check runs: `backend`, `frontend`, `containers (Backend)`, `containers (Frontend)`. All must pass for `success`.
- `concurrency` group `ci-CI-refs/heads/dev` with `cancel-in-progress: true`: a newer push to `dev` cancels the in-progress CI run; the cancelled run's CD run is skipped, and CD promotes the newest tested SHA.
- `containers` uses `fail-fast: false`, so both image builds report independently.

## Not verified (cannot be done by agents)
- No `actionlint` run and no Actions run: the first real run validates the YAML.
- Frontend `ChromeHeadless` on `ubuntu-latest` may need `--no-sandbox` (handover M4, not applied per scope); a red `frontend` job blocks CD.
- `dev` is not on `origin`; default branch, Actions settings and workflow permissions are human checks (R2).

## Required changes in other areas
None.

## Actions awaiting approval
None. R1 and R2 approved as described; both are documentation-only here (enablement order, human settings changes).
