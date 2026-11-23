# Workflow details (used by `ci-cd` steps 1 and 2)

## CI
- One workflow file per area that exists, never assumed, named `CI - <Area> Test/Build` (file `ci-<area>.yml`), plus `CI - PR Check` (`ci-pr-check.yml`). Job `name`s are unique across workflows (`<Area> - test and build`, `<Area> - container image`) so required checks are unambiguous.
- Triggers of the area workflows: `push` to the integration branch and `pull_request` targeting the integration or release branch. No `schedule`, no `workflow_dispatch`, no trigger on pushes to the release branch, no `paths` filters (CD needs a run of every gating workflow for each pushed commit).
- Area workflow, job 1 (dependencies install once), in this order:
  1. security check: `npm audit --omit=dev --audit-level=critical` (blocks only on `critical`; lower advisories are follow-ups, never hidden)
  2. build: `npm ci`, then the build script
  3. test: the test script (`npm test`, `npm run test:ci`), with dummy env values or a pinned database service container where tests need them
- Area workflow, job 2 (`needs` job 1): only builds that area's Containerfile with `push: false`, when `containers.enabled` is true and the Containerfile exists; no corporate proxy settings.
- `CI - PR Check` (`pull_request` only, no push): checks that a PR into the release branch comes from the integration branch and a PR into the integration branch comes from a task branch, that the title is `<task-id>: <title>`, that the description is not empty, and that the diff contains no `.env`, key/certificate files or `db-backups/`. PR title, body and refs reach the shell only through `env:`; the checkout is inspected with git, never executed. It does not gate CD.
- The agent-setup check (`scripts/check-agents.mjs`) is not part of CI: it validates the AI agent files, not the app. Run it locally.
- Every check blocks: no `continue-on-error`. `concurrency` with `cancel-in-progress: true` per workflow and ref and `timeout-minutes` on every job. Runtime version from `engines`, cache keyed on the lockfile.
- `permissions: contents: read`, no `secrets.*`; dummy test values only.

## CD
- Trigger: `workflow_run` of every CI workflow with `gatesCd: true` (`types: [completed]`, `branches: [<integration>]`) plus `workflow_dispatch`. Name it `CD - Merge <integration> into <release>`.
- `verify` job: proceeds only if the triggering CI conclusion is `success`, the event is `push` and `head_branch` is the integration branch. It then asks the Actions API whether every gating CI workflow succeeded for that SHA and outputs `ready`; `merge` runs only when `ready` is `true` (the run triggered by the last gating workflow to finish promotes, earlier ones skip). A manual dispatch must come from the integration branch and fails unless all gating workflows succeeded for its head. The SHA must be 40 hex characters.
- `merge` job (`needs: verify`, the only job with `contents: write`): checks out the release branch with full history, verifies that `github.event.workflow_run.head_sha` is reachable from the integration branch, exits with a notice if the release branch already contains it, runs `git merge --no-ff <sha>` (on conflict `git merge --abort` and fail), then `git push origin HEAD:refs/heads/<release>`.
- `permissions: contents: read` at top level; built-in `GITHUB_TOKEN`; `concurrency` with `cancel-in-progress: false`; identity `github-actions[bot]`; event data reaches shell only through `env:`.
- Nothing is deployed, published, tagged or released.
