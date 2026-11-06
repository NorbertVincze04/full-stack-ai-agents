# Spec: CI on dev push, then CD after CI succeeds

Task: `docs/tasks/manual-ci-on-dev-push-then-cd-after-ci-success.md`

## Summary
The requirement is already implemented by `.github/workflows/ci.yml` and `.github/workflows/cd.yml` (commit 507168c, local `dev`, not pushed). No workflow code change is needed. What is missing is repository state (nothing is on `origin` except `main`, so no run can start) and a corrected, explicit enablement/verification procedure in the docs. Proposed scope: verification and documentation only.

## Gap analysis
| Requirement | Existing behaviour | Satisfied |
| --- | --- | --- |
| Push to `dev` starts CI | `ci.yml` (`name: CI`): `on.push.branches: [dev]`; a push trigger uses the workflow file from the pushed commit, so it does not need the file on `main` | Yes, once `dev` is pushed to `origin` |
| CD starts after CI finishes | `cd.yml`: `on.workflow_run` `workflows: [CI]`, `types: [completed]`, `branches: [dev]` (name matches `CI`) | Yes in code, but `workflow_run` fires only if `cd.yml` exists on the default branch |
| Only after CI success | `verify` job `if`: `conclusion == 'success'`, `event == 'push'`, `head_branch == 'dev'`; failed, cancelled and PR runs are skipped | Yes |
| "CD" = existing CD | Merge of the tested `dev` SHA into `main` (`--no-ff`), merge-only, no deployment | Yes (per `.github/config.json` `cdMode: merge-only`) |

Remaining gaps (all repository state or docs, none in workflow code):
1. `dev` and the workflows are not on `origin`; only `origin/main` exists.
2. `cd.yml` must be on the default branch (confirm it is `main`) before CD can trigger; until the human merges the workflows into `main` once, a push to `dev` runs CI only.
3. The merge of the workflows into `main` must contain the same `.github/workflows/**` content as `dev`: `GITHUB_TOKEN` cannot push commits that change workflow files (handover finding M2), so CD's push would be rejected otherwise.
4. Repository settings from `docs/context/pipelines.md` (Actions enabled, workflow permissions allow job-level `contents: write`, bot bypass on `main` if protected, no linear-history rule) are unverified.
5. `docs/context/pipelines.md` says "`dev` is pushed to `origin` (done)", which contradicts the real state (not pushed). M2 is not documented there.

## Scope
- Verify by inspection that `ci.yml` and `cd.yml` meet the requirement (done in this spec; recorded in the run report).
- Fix `docs/context/pipelines.md`: correct the `dev`-pushed claim, add an ordered enablement and end-to-end verification sequence, add the M2 note (workflow-file changes must be merged into `main` by hand).
- Keep the `Pipelines` row in `docs/context/project.md` consistent with the above.

## Out of scope
- Any change to `ci.yml`, `cd.yml` or `.github/config.json`.
- Pushing branches, merging into `main`, changing repository settings or branch protection (human only; no `gh` available).
- Handover findings M1 (move `concurrency` to the `merge` job), M3 (dispatch/bypass hardening), M4 (Chrome `--no-sandbox`), L1-L6.
- Any deployment, publishing, tagging or release.

## Area
`pipelines` only (documentation of the pipelines area; no script, Containerfile or application change).

Pipeline scope: ci+cd

## Scope flags
- `ui-changes`: no. No UI.
- `logic-changes`: no. Docs only.
- `security-relevant`: no for this scope (no permission, token or trigger change); the underlying CD write access was approved in the previous task.
- `dependencies-changed`: no.
- `database-changes`: no.
- `scaffolding-only`: no (documentation and verification, no project setup).

## Functional requirements
- FR1: Document that a push to `dev` starts `CI` and that `CD` starts only from the `workflow_run` of a successful `CI` push run on `dev`.
- FR2: Document the enablement order: push `dev`; merge workflows into `main` once, identical to `dev`'s workflow files; check default branch and Actions settings; then push to `dev`.
- FR3: Document the expected observation per step: `CI` run on `dev` (jobs `backend`, `frontend`, `containers (Backend)`, `containers (Frontend)`), then a `CD` run with event `workflow_run`, jobs `verify` then `merge dev into main`, and a `--no-ff` merge commit `chore: merge dev into main (CI passed for <sha>)` on `main`.
- FR4: Document the negative cases: red or cancelled CI and PR runs start a `CD` run whose `verify` job is skipped; nothing reaches `main`.

## API/data changes
None.

## UI behaviour
None.

## Acceptance criteria
- [ ] AC1: Inspection result recorded: `ci.yml` triggers on push to `dev`; `cd.yml` triggers on completed `CI` runs on `dev` and proceeds only for `success` + `push` + `dev`; no workflow change required.
- [ ] AC2: `ci.yml`, `cd.yml` and `.github/config.json` are unchanged.
- [ ] AC3: `docs/context/pipelines.md` no longer claims `dev` is pushed; it lists the enablement order (FR2), the expected observations (FR3), the negative cases (FR4) and the M2 note; file stays under ~150 lines.
- [ ] AC4: `docs/context/project.md` Pipelines row agrees with `pipelines.md`.
- [ ] AC5: Human confirms after pushing `dev` (workflows merged into `main`) that `CI` starts on the push and, once green, `CD` starts and updates `main`; or reports the failing step. Agents cannot run Actions, so this is a human check.

## Risks
- Once `cd.yml` is on `main`, the first green push to `dev` promotes `dev` to `main` automatically (intended).
- Workflow files in `main` differing from `dev` make CD's push fail (M2); a squash or merge commit with identical content is fine.
- First real run is also the first validation of the YAML (no `actionlint` run yet); frontend `ChromeHeadless` may fail without `--no-sandbox` (M4) and a red `frontend` job blocks CD.
- Branch protection on `main` without a bot bypass rejects CD's push.

## Risk gate
- R1: The first green CI run on `dev` after `cd.yml` is on `main` writes to `main` (pipelines row: CD merge into the release branch). Impact: untested-in-practice automation modifies the release branch. Already approved in the previous task (R1/R2 there); no new workflow change here. Safer alternative: push `dev` first while `cd.yml` is not yet on `main` (CI only), confirm green, then merge the workflows into `main`.
- R2: The human-performed repository setting changes (bot bypass on `main`, workflow permissions). Impact: weakens protection of `main` for the bot. Agents change none; documented only. Safer alternative: keep protection and use a ruleset restricted to `github-actions[bot]` only.

## Open Questions
Non-blocking; defaults apply if unanswered.
1. Is verification and documentation only the intended scope, or should the known issues be fixed now?
   - A (recommended): docs and verification only, as specified.
   - B: also fix M1 (move `concurrency` to the `merge` job in `cd.yml`); would add a `cd.yml` change needing risk approval.
   - C: also fix M4 (Chrome `--no-sandbox`) as a separate `frontend` task.
2. Is `main` the repository's default branch? Cannot be determined offline; the human confirms in Settings > General. If not, `cd.yml` must reach the actual default branch.
