# CD builder report: manual-add-ci-and-cd-pipelines-with-github-actions

Verdict: done

## Files created/changed
- `.github/workflows/cd.yml` (new)
- `docs/context/pipelines.md` (new, under 150 lines)
- `docs/context/project.md` (Pipelines row added to the state table)
- Nothing committed, pushed or triggered.

## Workflow
- Name `CD`. Triggers: `workflow_run` of `CI` (`completed`, branch `dev`) and `workflow_dispatch` (no inputs).
- Workflow-level `permissions: contents: read`; concurrency `cd-merge`, `cancel-in-progress: false`; `timeout-minutes` on both jobs.
- `verify` (`contents: read`, `actions: read`): runs for dispatch, or for `workflow_run` only when `conclusion == success`, `event == push`, `head_branch == dev`. Dispatch must come from `refs/heads/dev`; it takes the current `dev` head via the API and requires a successful `CI` push run for that SHA, otherwise it fails. The SHA must be 40 hex chars. Output `sha`.
- `merge` (`needs: verify`; the only job with `contents: write`): checkout `main`, `fetch-depth: 0`; `git fetch origin dev`; fail if the SHA is not an ancestor of `origin/dev`; notice and exit 0 if `main` already contains it; `git merge --no-ff <sha>` with message `chore: merge dev into main (CI passed for <short>)`; on failure `git merge --abort` and fail; then `git push origin HEAD:refs/heads/main`.
- Event data goes to shell only through `env:`. Identity `github-actions[bot]`. Only `actions/checkout@v4`.

## Approved risks
- R1: implemented as described (`--no-ff` merge of the tested SHA into `main`).
- R2 (safer alternative): `contents: write` only on `merge`; push is by explicit refspec to `main` only (replaces the plain push in the spec); no force, no tags, no other branches. The `merge` checkout keeps credentials persisted because it fetches and pushes with `GITHUB_TOKEN`. All other checkouts (CI jobs) use `persist-credentials: false`; `verify` has no checkout.
- R3: manual dispatch implemented with the dev-only and CI-success guards.
- R4: settings documented in `docs/context/pipelines.md`; none changed.

## Acceptance criteria
- AC4: `workflow_run` + `workflow_dispatch` with the conditions above.
- AC5: exact SHA, `--no-ff`, abort on conflict, no-op if already merged, no force/rebase/reset.
- AC6: no deploy, publish, image push, tag or release step.
- AC7: `contents: write` only on `merge`; `actions: read` only on `verify`.
- AC8: `pipelines.md` and `project.md` updated.
- AC9: only `actions/*` at a major tag; event data via `env:`.

## Repository settings the human must configure
Push `dev` to `origin`; manually merge the workflows into `main` once (`workflow_run` runs only from the default branch); workflow permissions must allow the job-level `contents: write` ("Read and write"); if `main` is protected, add `github-actions[bot]` to the bypass list (or supply a token secret via a new spec); allow merge commits (no linear history). Details in `docs/context/pipelines.md`.

## Local validation
`actionlint` is not installed and no YAML parser is available (no Python `yaml`, no Node `yaml` module). The file was read back and checked manually only. Nothing was run locally.

## Required changes in other areas
None. `cd.yml` depends on the CI workflow name staying `CI`.

## Actions awaiting approval
None.

## Known gaps
- Not machine-validated; run `actionlint` or observe the first run.
- `gh api` workflow lookup uses `ci.yml`; a rename requires updating `cd.yml`.
- Concurrency: a pending CD run can be replaced by a newer one; the newer run merges its own SHA, which contains the older one.
- Frontend ChromeHeadless sandbox risk and Docker Hub rate limits (from CI report).
