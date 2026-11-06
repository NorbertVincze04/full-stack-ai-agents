# CI builder report: manual-add-ci-and-cd-pipelines-with-github-actions

Verdict: done

## Files created/changed
- `.github/workflows/ci.yml` (new). No other file touched; `cd.yml`, `docs/context/pipelines.md` and `docs/context/project.md` are left to the CD builder.

## Workflow
- Name `CI`; triggers: `push` to `dev`, `pull_request` into `dev` and `main`. No other triggers.
- `permissions: contents: read`; concurrency `ci-<workflow>-<ref>` with `cancel-in-progress: true`; `timeout-minutes` on every job.
- `backend` (in `Backend/`): `npm ci`, `npm run build`, `npm test`; Node `22.18`, npm cache on `Backend/package-lock.json`.
- `frontend` (in `Frontend/`): `npm ci`, `npm run build`, `npm run test:ci`; Node `22.18`, npm cache on `Frontend/package-lock.json`.
- `containers` (matrix `Backend`, `Frontend`, `fail-fast: false`): `docker build -f <Area>/Containerfile -t deskbooking-<area>:ci <Area>`; no push, login, `--build-arg`, proxy or secrets. The matrix value reaches the shell through `env:`.
- Jobs are independent, no `continue-on-error`. Only `actions/checkout@v4` (`persist-credentials: false`) and `actions/setup-node@v4`.

## Acceptance criteria
- AC1: name `CI`, triggers as above.
- AC2: separate `backend` and `frontend` jobs with `npm ci`, build and test on Node 22.18.
- AC3: both Containerfiles built without push, secrets, proxy, login or build args.
- AC6: no deploy, publish, image push, tag or release step.
- AC7: only `contents: read` at workflow level; no write permission.
- AC9 (CI part): only `actions/*` at major tags; event/matrix data only via `env:`. Both Containerfile-based jobs use no `secrets.*`.

## Local validation
- `actionlint` is not installed; Python and a `yaml` module are not available (no `node_modules`), so the YAML was not machine-parsed. The file was read back and checked manually (simple, standard structure). No local run of the commands was done; no workflow was triggered.

## Required changes in other areas
None.

## Actions awaiting approval
None. R1-R4 relate to CD and docs only.

## Known gaps
- Frontend `ChromeHeadless` may need `--no-sandbox` on the runner (spec risk); a follow-up `frontend` task would add a launcher.
- Docker Hub anonymous pull rate limits may occasionally fail the `containers` job.
- Workflow was not validated by `actionlint`; run it or push to a branch to confirm.
