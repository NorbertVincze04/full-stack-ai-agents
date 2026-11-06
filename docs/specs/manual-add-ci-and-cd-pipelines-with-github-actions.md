# Spec: Add CI and CD pipelines with GitHub Actions

Task: `docs/tasks/manual-add-ci-and-cd-pipelines-with-github-actions.md`

## Summary
Add two GitHub Actions workflows. **CI** builds and tests Backend and Frontend and checks that both container images build (no push). **CD** merges the exact commit CI tested on `dev` into `main` with `--no-ff`. Nothing is deployed, published, tagged or released. Settings come from `.github/config.json` -> `pipelines` (`platform: github-actions`, `ciWorkflow: ci.yml`/`CI`, `cdWorkflow: cd.yml`/`CD`, integration `dev`, release `main`, `cdMode: merge-only`).

## Scope
- `.github/workflows/ci.yml` (workflow name `CI`).
- `.github/workflows/cd.yml` (workflow name `CD`).
- New `docs/context/pipelines.md` (missing today; bootstrap per `docs/context/README.md`, under ~150 lines) describing triggers, jobs, branch promotion, prerequisites and the repository settings the human must configure.
- Update the `Pipelines` row/state in `docs/context/project.md`.

## Out of scope
- Any deployment, image push, registry login, tagging, GitHub release, artifact publishing.
- Changing branch protection or repository settings (the human does this; documented only).
- Secrets, PATs, deploy keys, third-party actions, self-hosted runners, `pull_request_target`.
- Linting, coverage gates, audit gates, dependency caching beyond `actions/setup-node` npm cache.
- Application changes in `Backend/` and `Frontend/` (see Risks for the Chrome sandbox contingency).

## Area
`pipelines` only. Reasoning: both areas already have lockfiles, build and test scripts, and Containerfiles that build without proxy settings (the `BUILD_*` proxy `ARG`s default to empty), so no `backend`, `frontend` or `containers` change is needed.

Pipeline scope: ci, cd

## Scope flags
- `ui-changes`: no. No UI, templates, styles or routes.
- `logic-changes`: no. No application logic; workflow YAML and docs only.
- `security-relevant`: yes. Workflow permissions, write access to `main`, `GITHUB_TOKEN` use, shell handling of event data.
- `dependencies-changed`: no. No `package.json` or lockfile change.
- `database-changes`: no.
- `scaffolding-only`: no. Workflows are automation with behaviour (merging into `main`).

## Facts resolved from the repository
| Question | Answer | Source |
| --- | --- | --- |
| Lockfiles | `Backend/package-lock.json` and `Frontend/package-lock.json` exist; use `npm ci` | file search, Containerfiles use `npm ci` |
| Node version | `>=22.18` in both `engines`; Containerfiles use `node:22.18.0`; use Node `22.18` in CI | `package.json`, Containerfiles |
| Backend commands (in `Backend/`) | `npm run build` (`tsc`), `npm test` (`node --test`); tests need no DB or network | `package.json`, `docs/context/backend.md` |
| Frontend commands (in `Frontend/`) | `npm run build` (`ng build`), `npm run test:ci` (Karma `ChromeHeadless`, single run) | `package.json`, `docs/context/frontend.md` |
| Container files | `Backend/Containerfile`, `Frontend/Containerfile`, build context = the area folder (each has a `.dockerignore`) | repository |
| Proxy in CI | Not needed. `BUILD_HTTP_PROXY`, `BUILD_HTTPS_PROXY` default to empty; do not pass any `--build-arg` in CI. Base images come from `docker.io/library` (allowed registry) | Containerfiles, `.github/config.json` |
| Container tool in CI | `docker build -f <Area>/Containerfile <Area>` on the runner (preinstalled; no installs, no third-party action such as `docker/*`) | decision, risk-gate rules |
| Branches | Local `dev` and `main` exist; remote is `https://github.com/NorbertVincze04/full-stack-ai-agents.git`; only `origin/main` is visible locally, so `dev` may not be pushed yet | `.git` |

## Functional requirements

### CI (`.github/workflows/ci.yml`, name `CI`)
1. Triggers: `push` to `dev`; `pull_request` into `dev` and `main`. No other triggers.
2. `permissions: contents: read` at workflow level. No secrets used. Concurrency group per ref with `cancel-in-progress: true`.
3. Job `backend`: `actions/checkout`, `actions/setup-node` (Node `22.18`, npm cache keyed on `Backend/package-lock.json`), then in `Backend/`: `npm ci`, `npm run build`, `npm test`.
4. Job `frontend`: same setup keyed on `Frontend/package-lock.json`; in `Frontend/`: `npm ci`, `npm run build`, `npm run test:ci`.
5. Job `containers` (matrix `backend`, `frontend`, or two steps): `docker build -f <Area>/Containerfile <Area>` with a local-only tag (for example `deskbooking-<area>:ci`); no `docker push`, no `docker login`, no `--build-arg`, no secrets, no proxy variables.
6. Jobs are independent (no `continue-on-error`); the workflow conclusion is `success` only if every job passes.
7. Only `actions/*` actions, pinned to a major version tag; `actions/checkout` with `persist-credentials: false`.

### CD (`.github/workflows/cd.yml`, name `CD`)
1. Triggers: `workflow_run` of workflow `CI`, `types: [completed]`, `branches: [dev]`; and `workflow_dispatch` (no inputs).
2. Automatic run proceeds only when `github.event.workflow_run.conclusion == 'success'`, `event == 'push'` and `head_branch == 'dev'` (pull request runs and forks never promote).
3. Commit to merge: for `workflow_run`, `workflow_run.head_sha` (exactly the tested commit). For manual dispatch, the current head of `dev`; the workflow first confirms a successful `CI` run exists for that SHA (query the Actions API with the built-in token, read-only) and aborts otherwise. Dispatch from any ref other than `dev` aborts.
4. Workflow-level `permissions: contents: read`. Job `verify` (resolves and validates the SHA; `contents: read`, `actions: read`) and job `merge` (`needs: verify`; the only job with `contents: write`).
5. Job `merge`: check out `main` with full history (`fetch-depth: 0`), fetch `dev`, confirm the SHA is an ancestor of `origin/dev`, exit successfully doing nothing if it is already an ancestor of `main`, otherwise `git merge --no-ff` that SHA with a message naming the short SHA and `dev`, then `git push origin main` (plain push).
6. On merge conflict: `git merge --abort`, fail the job with a clear message; nothing is pushed. A rejected push (main moved) fails the job; no retry with force, no `--force`/`--force-with-lease`, no rebase.
7. Event values (SHA, branch names) are passed to scripts through `env:`, never interpolated into `run:` scripts. Commit identity is `github-actions[bot]`.
8. Concurrency group `cd-merge`, `cancel-in-progress: false` (serialises merges).
9. No deployment, publish, tag, release or image push step. No secrets other than the implicit `GITHUB_TOKEN`.

## API / data changes
None. No application, API or database change.

## UI behaviour
None.

## Repository settings the human must configure (documented in `docs/context/pipelines.md`)
1. Push `dev` to `origin` if it does not exist there yet.
2. `cd.yml` runs from the default branch for `workflow_run`: the first time, merge the PR that adds both workflows into `main` by hand (until then CD cannot trigger automatically). Confirm `main` is the default branch.
3. Settings > Actions > General: Actions enabled; workflow permissions do not block the explicit `contents: write` of the `merge` job.
4. If `main` has branch protection or a ruleset (required PR, required checks, linear history), add the GitHub Actions app/`github-actions[bot]` to the bypass list, or CD's push is rejected. Merge commits must be allowed (`--no-ff`); a "linear history" rule is incompatible. Pushes made with `GITHUB_TOKEN` do not start other workflows (acceptable; CI does not trigger on `main` pushes).
5. Optional: make the CI jobs required checks on PRs into `dev`/`main` (do not require them on direct CD pushes to `main`).

## Acceptance criteria
- [ ] AC1: `.github/workflows/ci.yml` exists, workflow name `CI`, triggered on push to `dev` and on pull requests into `dev` and `main` (nothing else).
- [ ] AC2: CI has separate `backend` and `frontend` jobs; each installs with `npm ci` (lockfile), builds, and tests (`npm run build` + `npm test`; `npm run build` + `npm run test:ci`) on Node 22.18.
- [ ] AC3: CI builds `Backend/Containerfile` and `Frontend/Containerfile` without pushing; no `secrets.*`, proxy variables, registry login or `--build-arg`.
- [ ] AC4: `.github/workflows/cd.yml` exists, workflow name `CD`, runs automatically only after CI concluded `success` on a `push` to `dev` (via `workflow_run`), or by `workflow_dispatch` on `dev` after confirming a successful CI run for the dev head.
- [ ] AC5: CD merges exactly the tested SHA into `main` with `--no-ff`, aborts (merge abort, failed job, nothing pushed) on conflict, is a no-op if already merged, and never uses force push, rebase or reset.
- [ ] AC6: No step deploys, publishes, pushes images, tags or creates releases.
- [ ] AC7: Both workflows default to `permissions: contents: read`; `contents: write` appears only on the CD `merge` job (plus `actions: read` on the read-only `verify` job).
- [ ] AC8: `docs/context/pipelines.md` exists and describes the workflows, triggers, jobs, branch promotion, prerequisites and the repository settings above; `docs/context/project.md` mentions pipelines.
- [ ] AC9: Only `actions/*` actions (pinned to a major tag) are used; event data reaches shell steps only through `env:`; both files parse as valid YAML (and pass `actionlint` if available).

## Risks
- Frontend `ChromeHeadless` may fail on the runner without `--no-sandbox` (no `karma.conf.js` or custom launcher exists). The CI builder cannot run workflows locally; if the first run fails for this reason a follow-up `frontend` task adds a no-sandbox launcher. Not in this task.
- `workflow_run` only fires when `cd.yml` is on the default branch, so the first promotion is manual (see settings).
- Docker Hub anonymous pull rate limits can occasionally fail the container build job.
- CD pushes to `main` on every green `dev` push; a bad commit that passes CI reaches `main` automatically. This is the intended behaviour (merge-only).
- Manual dispatch lets anyone with write access trigger a merge of the current `dev` head (guarded by the CI-success check).

## Risk gate
- R1: CD merges and pushes into the release branch `main` (`docs/risk-gate.md`, Pipelines / CI-CD). Impact: `main` changes automatically on every green `dev` run; a failing protection rule or a bad commit has direct effect on the release branch. Safer alternative: CD opens a pull request from `dev` to `main` (or pushes to a `release-candidate` branch) instead of pushing to `main`; this changes AC5.
- R2: `contents: write` permission on the CD `merge` job and use of the built-in `GITHUB_TOKEN` (also `actions: read` for the CI-success lookup). Impact: the job can write to any branch of the repo. Safer alternative: keep it confined to the single `merge` job (as specified), `persist-credentials: false` everywhere else, and push only `main` by explicit refspec.
- R3: Manual `workflow_dispatch` trigger on CD (a trigger on the release-branch promotion path). Impact: a human with write access can promote the `dev` head on demand. Safer alternative: drop `workflow_dispatch` (task AC4 allows it as optional) or restrict it to a protected environment with required reviewers.
- R4: Repository settings changes by the human (branch protection/ruleset bypass for `github-actions[bot]`, Actions permissions). Impact: weakens protection on `main`. Agents do not change settings; documented only. Safer alternative: instead of a bypass, let CD open a PR (see R1).

## Open Questions
None blocking. Approval of R1-R4 is requested at the approval gate (approve, use the safer alternative, or edit the spec). Everything else from the task's open questions is resolved above (lockfiles present, Node 22.18, test commands, Docker on the runner, no proxy needed, `dev` exists locally; confirming `dev` is pushed to `origin` is a human setup step, not a spec blocker).
