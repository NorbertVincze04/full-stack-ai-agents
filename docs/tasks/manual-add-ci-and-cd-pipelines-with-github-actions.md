---
id: manual-add-ci-and-cd-pipelines-with-github-actions
source: manual
url:
title: Add CI and CD pipelines with GitHub Actions
tags: [pipelines, ci, cd]
status: done
---

## Description
Area: pipelines. Pipeline scope: ci, cd.

CI: on every push to dev and on pull requests into dev or main, build and test the backend and the frontend, and check that the container images build (no push).

CD: when CI succeeds on dev, merge the tested commit into main. Nothing is deployed anywhere.

## Acceptance Criteria
1. .github/workflows/ci.yml exists with a workflow named CI, triggered on push to dev and on pull requests into dev and main.
2. CI builds and tests Backend and Frontend, each in its own job, using the lockfile install.
3. CI builds the Backend and Frontend Containerfiles without pushing, and uses no secrets or proxy settings.
4. .github/workflows/cd.yml exists and runs only after the CI workflow succeeds on dev (or by manual dispatch).
5. CD merges exactly the commit CI tested into main with --no-ff, aborts on a merge conflict, and never force-pushes.
6. Nothing is deployed, published, tagged or released.
7. Read-only permissions by default; write access only on the merge job.
8. docs/context/pipelines.md describes the workflows and the repository settings I must configure.

## Open Questions
- No tags were provided; `pipelines`, `ci` and `cd` were taken from the stated area and pipeline scope.
- Whether a `dev` branch already exists is not stated (the CI trigger and CD merge depend on it).
- How CD pushes to `main` is not specified (branch protection on `main` may block `GITHUB_TOKEN`; a bypass rule or a dedicated token/deploy key may be needed).
- The behaviour of manual dispatch is not specified (which commit on `dev` is merged, e.g. the current `dev` head, or an input SHA, and whether CI must have passed for it).
- Whether a `package-lock.json` exists for both Backend and Frontend is not stated (lockfile install requires it).
- The Node.js version and the test commands for Backend and Frontend (e.g. `npm test`) are not specified.
- The container build tool in CI (Docker Buildx vs. Podman) is not specified; the repository uses Podman locally with Containerfiles.
- Whether the Frontend and Backend Containerfiles need build-time proxy arguments (the earlier containerization task mentions a Bosch proxy) that CI must work without is not stated.
