---
name: ci-cd
description: "Use to create or update the GitHub Actions files: CI per area (Backend and Frontend: security check, npm build, npm test, container build check) plus a CI PR Check on pull requests, and CD (after both area CI workflows succeed, merge the tested commit from dev into main; no deployment). Validates, reviews and hands over to the PR stage."
argument-hint: "[ci | cd | both] [task-id]"
user-invocable: true
---

Agent: `Pipeline Engineer`. If you are another agent, run this skill through a `Pipeline Engineer` subagent.

# Get task
- Scope: the argument (`ci`, `cd`, `both`; default `both`). `cd` needs a CI workflow, existing or created in the same run.
- Task: the given ID (read `docs/runs/<id>/brief.md` first if it exists). Without one, ask `Task Analyst` for `/get-task manual: add CI/CD pipelines` and `/spec` so a spec with `Area: pipelines`, `Pipeline scope` and a `Risk gate` exists (the Orchestrator runs the human gates). Take `approved-risks` from the caller.
- Read `docs/agents/pipeline-engineer.md` first (what was built, known gaps, review findings), then `.github/config.json` -> `pipelines` (`workflowDir`, `ciWorkflows`, `cdWorkflow`, `branches` integration `dev` / release `main`, `cdMode: merge-only`), `containers`, `workflow`; `docs/context/project.md`, `docs/context/pipelines.md` (bootstrap it if missing, per `docs/context/README.md`), the context file of every area in `project.md`, and the existing files in `pipelines.workflowDir`. Open `package.json` only to confirm `engines`, package manager, lockfile and scripts.

## Steps
1. **CI workflows** (one file per `pipelines.ciWorkflows` entry, `name` = the entry's `name`; CD listens to the entries with `gatesCd: true`): follow "CI" in [workflows.md](./workflows.md). Summary: one workflow per area (`CI - Backend Test/Build`, `CI - Frontend Test/Build`) with triggers `push` to the integration branch and `pull_request`, jobs security check -> build -> test, then a container image build; plus `CI - PR Check` on pull requests (branches, title, description, forbidden files). Workflow names are short and human readable (`<CI|CD> - <Area or purpose>`); every check blocks.
2. **CD workflow** (`pipelines.cdWorkflow.file`): follow "CD" in [workflows.md](./workflows.md). Summary: runs after a successful `gatesCd` CI push run on the integration branch and merges exactly the SHA that passed all of them into the release branch (`--no-ff`); nothing is deployed. Writing to the release branch is a risk-gate item: only with the matching `approved-risks`, otherwise `needs-approval` (safer alternative: CD opens a pull request instead of pushing).
3. **Security review**: call `Reviewer` `/review <id> pipelines`. On `blocker` or `high` findings fix them and review again, up to `workflow.maxFixIterations` times; remaining findings are reported, then `needs-human`.
4. **Validate locally** (workflows cannot be run here): `actionlint` if installed, otherwise parse the YAML and read the file back; run the same `npm ci`, audit, build and test commands of each area locally to prove the jobs would pass. Never run the merge or push, and never touch the real branches.
5. **Record**: update `docs/context/pipelines.md` (triggers, jobs, stage order, what CD does and does not do, prerequisites) and the pipelines row in `docs/context/project.md`. Write `docs/runs/<task-id>/ci-cd.md` (about 60 lines): files, jobs and what each checks, local validation result, repository settings the human must configure (workflow permissions "Read and write", branch protection bypass or token for the release branch), required changes in other areas (for example a missing `test` script), actions awaiting approval, known gaps.
6. **Update context**: update `docs/agents/pipeline-engineer.md` per `docs/context/README.md` (Agent context files): task row (workflows, jobs, result), defects and review findings under `Defects and lessons`, refresh `Open items`.
7. Return `Status`, files, triggers and jobs, what CD does and does not do, prerequisites for the human, open findings, report path. Next step: `/create-pr <id>`.

## When it fails
- A risk-gate item (`contents: write`, release-branch push, secrets, other actions) is not in `approved-risks`: `needs-approval` to the caller; if the human started this command directly, the top-level chat asks them and repeats the step with their decision.
- Spec or config asks for deployment (SSH, cloud CLI, registry push, `gh release`, tags, Pages, environments): return `blocked`; a separate approved spec with a new `cdMode` is needed.
- No CI workflow and `ci` not in scope while `cd` is requested: return `blocked` asking for `ci`.
- No lockfile in an area: report it and use the non-lockfile install command.
- A job needs a script or Containerfile change that does not exist: list it as a required change for the owning area; do not edit it.
- Branch protection on the release branch would block the CD push: document that the human must allow the Actions bot to bypass or supply a token secret; never work around it.

## Never
- Deploy, publish images or packages, create tags or releases.
- Trigger, dispatch or run a workflow remotely, or push anything.
- Use `pull_request_target`, self-hosted runners, `secrets.*`, third-party actions outside `actions/*` (pin to a major version at least), or `permissions` above read except `contents: write` on the merge job, without approval.
- Force-push, rewrite history, delete branches, push to the integration branch, or merge anything but the CI-tested SHA.
- Make a check non-blocking, write real secrets or `.env` contents into a workflow, or edit application source, scripts, Containerfiles or `compose.yaml`.
- Install global tools or touch anything outside the repository.
