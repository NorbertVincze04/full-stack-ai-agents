# Pipeline review: manual-add-ci-and-cd-pipelines-with-github-actions

Verdict: approved

Scope: `.github/workflows/ci.yml`, `.github/workflows/cd.yml`, `docs/context/pipelines.md`, `docs/context/project.md`, `.github/config.json` -> `pipelines`, builder reports. Read-only review; `actionlint` is not installed, nothing was run or dispatched.

Findings: blocker 0, high 0, medium 4, low 6.

## Checks that passed

- Permissions: both workflows default to `contents: read`; `contents: write` only on CD `merge` (`cd.yml` L68-69); `actions: read` only on `verify`; no `write-all`, no `pull_request_target`.
- Secrets: only the implicit `GITHUB_TOKEN` (`cd.yml` L35); no hard-coded values, nothing echoed, no `.env`.
- Actions: only `actions/checkout@v4` and `actions/setup-node@v4`.
- Injection: no `${{ }}` inside `run:` scripts in either file. `matrix.area`, `github.ref`, `head_sha`, repo and the `verify` output all go through `env:`. `head_sha` is validated as 40 hex chars (`cd.yml` L56). `head_branch` is used only in `if:`.
- Triggers: CI is push to `dev` and PRs into `dev`/`main` only. CD is `workflow_run` (CI, `completed`, `dev`) plus `workflow_dispatch`. No `schedule`. CD's push to `main` cannot re-trigger CI or CD.
- CD behaviour: promotes only the CI-tested SHA, gated on `success` + `push` + `dev`. Dispatch is checked against a successful CI push run for the `dev` head. Ancestor check against `origin/dev`, no-op if already merged, `--no-ff`, `merge --abort` on failure, push by explicit refspec. No force, rebase, reset, delete, tag, release, deploy or publish.
- Containers: `docker build` only, no push, login, `--build-arg`, proxy or secrets. Both `.dockerignore` files exist and the Containerfile proxy ARGs default to empty.
- Reliability: `concurrency` and `timeout-minutes` on all jobs, `npm ci`, cache keyed on each lockfile, correct `working-directory`, script names match `Frontend/package.json` (`test:ci`) and the spec.
- AC1-AC9: all satisfied by the files, with the caveat that YAML validity and first-run behaviour are unverified (see L1).

## Medium

### M1. CD concurrency can drop a pending promotion
`cd.yml` L13-15: the workflow-level group `cd-merge` (`cancel-in-progress: false`) keeps only one pending run. `workflow_run` fires for every completed `CI` run on `dev`, including `failure` and `cancelled` runs. CI cancels runs itself (`ci.yml` L11-13), and a PR from branch `dev` also fires it. Such a run is skipped by the `verify` `if`, but it already took the pending slot and replaced a pending run for a green SHA. Sequence: A green (CD running), B green (CD pending), C failed or cancelled (CD replaces B, then skips). B is not promoted until a later green run. Nothing unsafe is merged; the promotion is only delayed or missed.
Fix: remove the workflow-level `concurrency` and put `concurrency: { group: cd-merge, cancel-in-progress: false }` on the `merge` job (skipped jobs do not queue). Alternatively keep it and accept the gap, documenting it in `pipelines.md`.

### M2. `GITHUB_TOKEN` cannot push commits that change `.github/workflows/**`
`cd.yml` L98 (`git push origin HEAD:refs/heads/main`): GitHub rejects pushes made with `GITHUB_TOKEN` that create or update workflow files (no `workflows` permission exists for it). Any `dev` promotion that includes a change to `ci.yml` or `cd.yml` will fail at the push step after a successful merge. It fails closed and the job is red, but `pipelines.md` does not say so, and the failure is easy to misread as a protection problem.
Fix: document in `pipelines.md` (Repository settings or Decisions) that workflow-file changes must be merged into `main` by hand, or that a PAT or app token is needed under a new spec. No workflow change is required.

### M3. Bot bypass on `main` plus dispatch from any ref is a privilege path
`pipelines.md` item 4 (and spec R4) tell the human to add `github-actions[bot]` to the bypass list of `main`. `workflow_dispatch` runs the `cd.yml` of the selected ref, so the "must be dispatched from `dev`" guard (`cd.yml` L43) lives in a file the dispatcher can edit. Any user with write access can push a branch that contains a modified workflow with `contents: write`, dispatch it, and push to `main` as the bypassed bot. This is inherent to the approved R3/R4 design, but the doc does not state it.
Fix: add a sentence to `pipelines.md` that the bot bypass lets any writer push to `main` through a workflow, and recommend a ruleset that restricts who can create or update branches, or running the `merge` job in a protected `environment` with required reviewers. Optionally drop `workflow_dispatch` (R3 alternative).

### M4. Frontend headless Chrome sandbox (known, accepted in spec)
`ci.yml` L45-52 runs `npm run test:ci` (`ng test --watch=false --browsers=ChromeHeadless`; no custom launcher, no `karma.conf.js`). Chrome on `ubuntu-latest` often needs `--no-sandbox`; if it fails the `frontend` job is red and CD never fires. Fix is a follow-up `frontend` task, as the spec says. Because this blocks the first promotion, treat the first real CI run as the validation.

## Low

- L1. Not machine-validated: no `actionlint`, no YAML parse (both builder reports). Run `actionlint` or push to `dev` and watch the first run.
- L2. `cd.yml` L48 hard-codes `ci.yml` in the API path; `.github/config.json` -> `pipelines.ciWorkflow.file` is the source of truth. `pipelines.md` Conventions mentions the `name` coupling only, not the file name coupling.
- L3. `cd.yml` L93-96: `git merge --abort || true` is correct, but any merge failure (for example unrelated histories) is reported as a "Merge conflict". Reword to "Merge failed".
- L4. `cd.yml` L84: `git fetch origin dev` is redundant after `fetch-depth: 0`. Harmless.
- L5. `pipelines.md` item 3 says workflow permissions must be "Read and write or otherwise not blocking". A job-level `permissions:` block normally grants write even under the restricted default, unless an organisation policy forbids it. Clarify, and mention that an organisation policy may block it.
- L6. Actions are pinned to major tags (as the spec allows) and `runs-on: ubuntu-latest` floats. Pinning official actions to a SHA would harden the write-capable `merge` job's `actions/checkout` (L72), which is the one step that holds a write token.

## Docs

- `docs/context/pipelines.md` (about 85 lines) matches both workflow files: triggers, jobs, permissions, refspec push, conflict handling, settings 1-6.
- `docs/context/project.md` Pipelines row is accurate and states "not yet run".
- Gaps: M1, M2, M3 and L2 above.
- The prerequisites (push `dev`, first manual merge into `main`, branch-protection bypass, merge commits allowed) are stated. `origin/dev` does not exist yet (`git branch -a` shows only `origin/main`), as the doc notes.

## Required before first use (human, not review defects)

Push `dev`; merge the workflows into `main` once by hand; configure workflow permissions and the `main` ruleset bypass.
