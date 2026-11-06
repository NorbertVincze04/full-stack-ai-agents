---
id: manual-ci-on-dev-push-then-cd-after-ci-success
source: manual
url:
title: CI on dev push, then CD after CI succeeds
tags: [pipelines, ci, cd]
status: implemented
---

## Description
Area: pipelines. Pipeline scope: ci, cd.

"after a push command on 'dev' branch CI pipeline should start, after CI finishes succesfully, CD pipeline should start"

Context: CI (`.github/workflows/ci.yml`) and CD (`.github/workflows/cd.yml`) were added by the task `manual-add-ci-and-cd-pipelines-with-github-actions` (commit 507168c on local `dev`, not pushed).

## Acceptance Criteria

## Open Questions
- No acceptance criteria were provided; the task text is a single statement of expected behaviour.
- No tags were provided; `pipelines`, `ci` and `cd` were taken from the stated area and pipeline scope.
- Whether the existing workflows already satisfy this task or the task is about why the pipelines do not start (e.g. workflows not yet pushed to the remote / default branch) is not stated.
- Whether "CD pipeline should start" means the existing CD workflow (merge `dev` into `main`) or something else is not stated.
- Whether CD should start only after a successful CI run, or also for failed or cancelled runs, is only implied ("finishes succesfully").
