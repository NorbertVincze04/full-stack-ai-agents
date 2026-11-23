---
name: start-task
description: "Use to run the standard workflow for a task: task -> spec (clarification) -> implement -> TDD -> e2e tests -> review -> task-to-PR. Review failures are retried up to 2 times, then the human decides."
argument-hint: "<azure task id | list | manual task text> [stop-after=spec|implement|test|review|pr]"
user-invocable: true
---

Agent: `Orchestrator`. If you are another agent, run this skill through the `Orchestrator` agent.

# Get task
Take the argument: Azure task ID, `list`, or manual text. Run `Task Analyst` `/get-task`; if it returns candidates, ask the human to pick one and call it again. If `docs/tasks/<task-id>.md` already exists, resume from its `status` (`new` -> spec, `specified` -> implement, `in-progress` -> test/review, `implemented` -> PR) instead of starting over. Read `.github/config.json` -> `workflow` for the limits (`maxTestFixLoops`, `maxFixIterations` = review retries, `tdd`, `tddFirst`, `e2e`, `security`, `reviewers`). Track the stages with the todo list. Read `docs/agents/orchestrator.md` first (past decisions, loop outcomes, open items); the specialist agents read their own files.

## Steps
1. **Task**: `/get-task`. Relay its open questions.
2. **Spec**: first the discovery gate (see the `Orchestrator` definition): `Discovery Analyst` `discover-update check`, and pass the `Discovery` state to the spec call. Then `Task Analyst` `/spec <id>`. While `Ready: no`, run `/clarify-task <id> spec` to ask the questions. Stop here if the human asked `stop-after=spec`.
3. **Approval gate**: always run `/clarify-task <id> spec` once more when `Ready: yes`, even if no question was ever open: it skips the questions and asks for approval to implement and for every risk one by one. Stop if the human does not approve. Keep `approved-risks`. Then write `docs/runs/<id>/brief.md` per [brief.md](./brief.md) (the later stages read it first instead of the whole spec) and create `docs/runs/<id>/metrics.md` per [metrics.md](./metrics.md). After every later stage add one metrics row and update the brief's `Reports so far`.
4. **Implement**: first, if `workflow.tddFirst` is true and the area has `frontend` or `backend`, call `Tester` `/tdd <id> <area> red` (tests from the acceptance criteria, run, expected to fail for the right reason); `needs-human` (spec too vague to write tests) goes to the human. Then for each area in the spec `Area`, in this order, call `Implementer` `/implement <id> <area>` with `approved-risks`: `database` (if `database-changes`), `backend`, `frontend` (needs the API contract), then `Container Engineer` `/containerize` if `containers`, then `Pipeline Engineer` `/ci-cd` if `pipelines`. A `needs-approval` result goes to the human (risk question), then the same call is repeated with the decision. `containerize` and `ci-cd` test and review their own output, so steps 5-7 apply only to `frontend`, `backend` and `database`.
5. **TDD green + e2e**: `Tester` `/test <id>` (runs `tdd` in mode `green`, then e2e when `workflow.e2e` allows it). While tests fail, do not review. **Test-fix loop**: keep a counter per failing test; per round call `Implementer` `/implement <id> <area> fix: <tester report path + failing test names>` (it diagnoses the root cause; a test that contradicts the spec is reported, not edited), then `Tester` `/test` again. After `maxTestFixLoops` rounds a test still failing -> `/clarify-task <id> decision`.
6. **Review**: choose scopes from the spec `Scope flags` and the implement reports: `code` if `logic-changes`; `ux` if `ui-changes`; `security` if `security-relevant` or `dependencies-changed` (per `workflow.security`); all of them if `workflow.reviewers` is `all`. Call `Reviewer` `/review <id> <scopes>`. Record every run or skip with a one-line reason (`Review selection`).
7. **Review retry** (maximum `maxFixIterations`, default 2): if any scope returns `changes-requested` (blocker or high findings), retry the process: `Implementer` `/implement <id> <area> fix: <review report paths>` -> `Tester` `/test` (the test-fix loop applies) -> `Reviewer` again for the scopes that had findings. When the retries are used up and the review is still not approved, run `/clarify-task <id> decision` (human discussion). Medium and low findings are carried to the PR, not retried.
8. **Manual checks**: list the acceptance criteria that no test or review verified (manual checks such as applying a migration or a backup restore). Ask the human, per criterion, to run it and confirm: verified (with the evidence), failed (back to step 4 with the feedback), or skip (stays `Not verified`). Pass the confirmed ones to `/create-pr` as `manual-verified`.
9. **PR**: first update `docs/agents/orchestrator.md` per `docs/context/README.md` (Agent context files): this task's row, decisions and loop outcomes, `Open items` (the specialist agents have already updated their own files). Then `Release Manager` `/create-pr <id>`. Show the human the proposal (branch, commit message, files, open findings, how to verify) and ask: commit as proposed, edit message/files, changes needed (free text -> back to step 4 with the feedback, maximum 3 rounds), stop.
10. **Commit**: after the confirmation call `Release Manager` `/approve-pr <id> commit` with `human-confirmed: true`, the exact message and file list.
11. **Push + PR**: ask separately whether to push the task branch and open the PR into `dev` (push, keep local). Only if confirmed call `/approve-pr <id> push` with `push: true`. Tell the human to merge the PR; CI then runs on `dev` and CD merges `dev` into `main` and deletes the merged task branch on GitHub.
12. **Cleanup**: when the human reports the PR merged and CD finished, call `/approve-pr <id> cleanup` (deletes the local task branch, switches back to `dev`, checks the remote branch is gone).
13. Fill the `Totals` line of `metrics.md`, then finish with a short summary: task, area, outcome per stage, commits, PR URL, unresolved findings, report paths.

## When it fails
- Spec still `Ready: no` after 3 clarification rounds: ask the human how to proceed; do not implement.
- An implementer, tester or reviewer returns `blocked`: show the reason and ask the human before continuing.
- Retry limits reached (tests or review): `/clarify-task <id> decision`; apply the decision, then continue from the stage concerned.
- Not a git repository or `dev` (or `task/<id>`) not checked out: the PR stage reports it and the proposal stays in `docs/runs/<id>/pr.md`.
- A subagent needs another area: stop, ask the human to approve widening the area, update the spec, then continue.

## Never
- Write code, specs, reports or commits yourself; delegate every stage.
- Skip the spec, implement while a blocking question or unapproved risk is open, or approve a risk for the human.
- Run the reviewers while tests fail, or loop more than the configured limits.
- Commit or push without the human's explicit confirmation in this conversation, or combine the commit and push confirmations.
- Let any agent create, push, switch to or delete a branch other than the task's `task/<id>` branch (created by `approve-pr` from `dev`); implementation work happens on `dev` before the commit stage.
- Call agents of areas that are not in the spec `Area`.
