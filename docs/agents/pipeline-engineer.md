# Pipeline Engineer - context

Agent: `.github/agents/pipeline-engineer.agent.md` | Skill: `ci-cd` | Replaces: CI Pipeline Builder, CD Pipeline Builder (Pipeline Reviewer is now `Reviewer` scope `pipelines`).

Design and repository prerequisites: `docs/context/pipelines.md`. Settings: `.github/config.json` -> `pipelines` (integration `dev`, release `main`, `cdMode: merge-only`).

> Read this file first instead of re-reading old reports. Update it at the end of every task (rules: `docs/context/README.md`, Agent context files). Keep it under ~80 lines.
> Updated: 2026-11-16 (initial history from handovers)

## Tasks

| Task | Delivered |
| --- | --- |
| add CI and CD pipelines (commit `507168c` on `dev`) | `.github/workflows/ci.yml` (`CI`: push to `dev`, PRs into `dev` and `main`; jobs `backend`, `frontend`, `containers` matrix, Node 22.18, read-only permissions, concurrency, timeouts). `.github/workflows/cd.yml` (`CD`: `workflow_run` of CI plus dispatch; `verify` job, then a `merge` job that is the only one with `contents: write` and merges the CI-tested SHA `--no-ff` into `main`). Only `actions/checkout@v4` and `actions/setup-node@v4`. No deployment, publishing, tags or releases |
| CI on dev push, then CD after CI success | No workflow change: inspection showed the files already satisfy the requirement. Corrected `docs/context/pipelines.md` (91 lines: enablement order, negative cases, `GITHUB_TOKEN` cannot push workflow-file changes, human settings) and the pipelines row in `project.md` |
| agent setup hardening (no task ID, 2026-11-16) | `ci.yml`: `npm audit --omit=dev --audit-level=critical` before build in `backend` and `frontend` (both exit 0 locally), `containers` now `needs: [backend, frontend]`, new `agents` job running `node scripts/check-agents.mjs`. Not run on GitHub yet |

## Defects and lessons

| Id | Finding | Status |
| --- | --- | --- |
| Review round 1 (CI-on-dev) | False "dev pushed" claim and missing enablement order in `pipelines.md` (1 high), 2 medium, 2 low | Fixed, re-review approved |
| M1 | Workflow-level `concurrency` in CD can drop a pending green promotion | Open: move it to the `merge` job |
| M2 | `GITHUB_TOKEN` cannot push commits that change `.github/workflows/**` | Documented in `pipelines.md`; such changes must be merged by hand |
| M3 | Bot bypass on `main` plus `workflow_dispatch` lets a writer push to `main` through a modified workflow | Open: ruleset, protected environment or drop dispatch |
| M4 | Frontend `ChromeHeadless` may need `--no-sandbox` on `ubuntu-latest`; a red `frontend` job blocks CD | Open follow-up |
| L1-L6 | Not machine-validated (`actionlint` unavailable), `cd.yml` hard-codes `ci.yml`, floating `ubuntu-latest`, wording | Open, low |

## Open items

- The workflows have never run: `dev` was not pushed to `origin`, and the repository settings (push `dev`, merge workflows into `main` once, workflow permissions, bot bypass) are the human's. AC5 of the CI-on-dev task is not verified.
- The `ci.yml` security step blocks only on `critical`; today Backend has 1 high (body-parser) and Frontend 8 (4 high, 4 moderate), all tracked as follow-ups. Remember CD promotes automatically once CI is green.
- First CI run validates the YAML for real; expect small fixes.
