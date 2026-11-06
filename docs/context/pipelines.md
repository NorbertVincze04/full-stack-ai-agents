# Pipelines context

GitHub Actions, `cdMode: merge-only` (`.github/config.json` -> `pipelines`). Delivery means promoting code: a green CI run on `dev` is followed by a merge of that exact commit into `main`. Nothing is deployed, published, tagged or released.

## Workflows

| File | Name | Purpose |
| --- | --- | --- |
| `.github/workflows/ci.yml` | `CI` | Build and test Backend and Frontend, build both container images (no push) |
| `.github/workflows/cd.yml` | `CD` | Merge the CI-tested `dev` commit into `main` (`--no-ff`) |

## CI (`ci.yml`)

- Triggers: `push` to `dev`; `pull_request` into `dev` and `main`. Nothing else.
- `permissions: contents: read`; concurrency per workflow and ref, `cancel-in-progress: true`.
- Jobs (independent, no `continue-on-error`):

| Job | Steps |
| --- | --- |
| `backend` | in `Backend/`: `npm ci`, `npm run build`, `npm test` (Node 22.18, npm cache) |
| `frontend` | in `Frontend/`: `npm ci`, `npm run build`, `npm run test:ci` (Node 22.18, npm cache) |
| `containers` (matrix `Backend`, `Frontend`) | `docker build -f <Area>/Containerfile <Area>`, local tag only; no push, login, `--build-arg`, proxy |

- Only `actions/checkout@v4` (`persist-credentials: false`) and `actions/setup-node@v4`. No secrets.

## CD (`cd.yml`)

- Triggers: `workflow_run` of `CI` (`completed`, branch `dev`); `workflow_dispatch` (no inputs).
- Automatic run proceeds only if the CI run `conclusion == success`, `event == push` and `head_branch == dev` (PR runs and forks never promote).
- Workflow-level `permissions: contents: read`; concurrency group `cd-merge`, `cancel-in-progress: false`.

| Job | Permissions | What it does |
| --- | --- | --- |
| `verify` | `contents: read`, `actions: read` | Resolves the SHA: `workflow_run.head_sha`, or for a manual run the current head of `dev` (dispatch must be from `dev`) after confirming a successful `CI` push run exists for that SHA via the Actions API. Checks it is a 40-char SHA. |
| `merge` (`needs: verify`) | `contents: write` (only job) | Checks out `main` (full history), fetches `dev`, requires the SHA to be an ancestor of `origin/dev`, no-op if `main` already contains it, otherwise `git merge --no-ff <sha>`, then `git push origin HEAD:refs/heads/main`. |

- Merge commit message: `chore: merge dev into main (CI passed for <short-sha>)`; identity `github-actions[bot]`.
- Conflict: `git merge --abort`, job fails, nothing is pushed. Rejected push (main moved) fails the job; no force, no rebase, no reset, no retry.
- Push is by explicit refspec to `main` only: no other branch and no tag is written.
- Event data (SHA, ref, repository) reaches shell steps only through `env:`.
- The `merge` job keeps the checkout credentials persisted (it fetches and pushes with the built-in `GITHUB_TOKEN`); every other checkout in both workflows uses `persist-credentials: false`.
- Deliberately not done: deploy, image push, registry login, tags, releases, Pages, secrets other than `GITHUB_TOKEN`, third-party actions, PR creation.

```mermaid
flowchart LR
  push[push to dev] --> CI --> ok{success?}
  ok -- yes --> verify --> merge --> main[main updated]
  ok -- no --> stop[no promotion]
```

## Repository settings the human must configure

Agents change none of these.

1. `dev` must exist on `origin` with the workflow files for `CI` to run. Check: `git ls-remote origin dev` shows it; `git ls-tree origin/main .github/workflows` is empty until the workflows are merged into `main` (step 2 below). Repo state is not recorded here; verify it.
2. `workflow_run` runs only from the default branch: merge the change that adds `ci.yml` and `cd.yml` into `main` by hand once (until then CD cannot trigger automatically). Confirm `main` is the default branch. The `.github/workflows/**` files on `main` must be identical to `dev` (see "Workflow-file changes").
3. Settings > Actions > General: Actions enabled; workflow permissions set to "Read and write" or otherwise not blocking the explicit `contents: write` of the `merge` job.
4. If `main` has branch protection or a ruleset (required PR, required checks, linear history): add `github-actions[bot]` (GitHub Actions app) to the bypass list, or CD's push is rejected. Merge commits must be allowed; "linear history" is incompatible with `--no-ff`. CD never works around protection; alternatively provide your own token secret (needs a spec change).
5. Optional: make the CI jobs required checks on PRs into `dev` and `main`, but not on the direct CD push to `main`.
6. Pushes made with `GITHUB_TOKEN` start no other workflows (acceptable: CI does not run on `main` pushes).

## Enablement and verification (human, in this order)

A push to `dev` starts `CI`; `CD` starts only from the `workflow_run` of a successful `CI` push run on `dev`.

| Step | Action | Expected observation |
| --- | --- | --- |
| 1 | Ensure `dev` is on `origin` (`git ls-remote origin dev`); if it is, open the existing `CI` run for the `dev` push in the Actions tab, otherwise push `dev` | `CI` run on `dev` with jobs `backend`, `frontend`, `containers (Backend)`, `containers (Frontend)`. No `CD` run while `cd.yml` is not on `main`. |
| 2 | Merge the workflow files into `main` once (merge commit or fast-forward; squash is also fine if `.github/workflows/**` content is identical to `dev`) | `cd.yml` is on the default branch; no run starts (CI does not trigger on `main` pushes). |
| 3 | Confirm default branch is `main` and the Actions settings above (permissions, bot bypass, no linear history) | Settings match the list above. |
| 4 | Push a new commit to `dev` | `CI` run on `dev`; when green, a `CD` run with event `workflow_run`, jobs `verify` then `merge dev into main`; `main` gets a `--no-ff` merge commit `chore: merge dev into main (CI passed for <sha>)`. |

- Safer order: have `dev` on `origin` first while `cd.yml` is not on `main` (CI only), confirm it is green, then merge the workflows into `main`. Once `cd.yml` is on `main`, the first green push to `dev` promotes to `main` automatically (intended).
- Negative cases: a red or cancelled `CI` run on `dev` still starts a `CD` run, but `verify` is skipped and `merge` does not run. `workflow_run.branches` filters on the head branch, so only a PR whose head branch is `dev` starts a `CD` run (`verify` skipped); CI runs of other PRs start no `CD` run. Nothing reaches `main` in either case.
- Workflow-file changes: `GITHUB_TOKEN` cannot push commits that change `.github/workflows/**`, so CD's push is rejected if the merge would alter workflow files. Merge workflow-file changes into `main` by hand and keep them identical to `dev` before the next push to `dev`.
- Human check: after step 4, confirm `CI` started on the push and `CD` updated `main`, or report the failing step.

## Conventions

- Only `actions/*` actions at a major version tag; no `pull_request_target`.
- Every job has `timeout-minutes`.
- `contents: write` only on the CD `merge` job.
- CI changes that alter the workflow `name` must be mirrored in the `workflows:` list of `cd.yml`.

## Decisions and known gaps

- Frontend `ChromeHeadless` may need `--no-sandbox` on the runner; a follow-up `frontend` task would add a launcher.
- Docker Hub anonymous pull limits may occasionally fail the `containers` job.
- A bad commit that passes CI reaches `main` automatically (intended with `merge-only`).
- Manual dispatch lets anyone with write access promote the `dev` head (guarded by the CI-success check).
- Run results are not recorded here; the human confirms them in the Actions tab. `actionlint` and a YAML parser were unavailable locally, so the first real run is the validation.
